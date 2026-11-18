/**
 * Central media upload for admin (sliders / products).
 * Next.js App Router uses FormData + Buffer (multer-compatible validation).
 * Files go to Supabase Storage — never to local disk.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { getStoreId } from "@/lib/store";
import { randomUUID } from "crypto";

export const MEDIA_MAX_BYTES = 5 * 1024 * 1024; // 5MB (multer limits.fileSize)
export const MEDIA_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

export type MediaBucket = "sliders" | "products";

export type UploadedMedia = {
  bucket: MediaBucket;
  path: string;
  publicUrl: string;
  contentType: string;
  size: number;
};

export function validateImageFile(file: File): string | null {
  if (!MEDIA_MIME_TYPES.includes(file.type as (typeof MEDIA_MIME_TYPES)[number])) {
    return "Only JPEG, PNG, WebP or GIF images are allowed";
  }
  if (file.size > MEDIA_MAX_BYTES) {
    return "Max file size is 5MB";
  }
  return null;
}

function extFromMime(mime: string, fallbackName: string) {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  if (mime === "image/jpeg") return "jpg";
  return fallbackName.split(".").pop()?.toLowerCase() || "jpg";
}

export async function uploadMediaBuffer(opts: {
  bucket: MediaBucket;
  buffer: Buffer;
  contentType: string;
  originalName?: string;
  folder?: string;
}): Promise<UploadedMedia> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase service role is not configured");

  const storeId = getStoreId();
  const ext = extFromMime(opts.contentType, opts.originalName || "upload.jpg");
  const folder = (opts.folder || "uploads").replace(/^\/+|\/+$/g, "");
  const path = `${storeId}/${folder}/${Date.now()}-${randomUUID()}.${ext}`;

  const { error } = await admin.storage.from(opts.bucket).upload(path, opts.buffer, {
    contentType: opts.contentType,
    upsert: false,
  });
  if (error) throw new Error(error.message);

  const { data } = admin.storage.from(opts.bucket).getPublicUrl(path);
  return {
    bucket: opts.bucket,
    path,
    publicUrl: data.publicUrl,
    contentType: opts.contentType,
    size: opts.buffer.length,
  };
}

export async function uploadMediaFile(file: File, bucket: MediaBucket, folder?: string) {
  const invalid = validateImageFile(file);
  if (invalid) throw new Error(invalid);
  const buffer = Buffer.from(await file.arrayBuffer());
  return uploadMediaBuffer({
    bucket,
    buffer,
    contentType: file.type,
    originalName: file.name,
    folder,
  });
}

/** Delete a storage object when path belongs to our store partition. */
export async function deleteMediaPath(bucket: MediaBucket, path: string | null | undefined) {
  if (!path) return;
  const storeId = getStoreId();
  if (!path.startsWith(`${storeId}/`)) return;
  const admin = createAdminClient();
  if (!admin) return;
  await admin.storage.from(bucket).remove([path]);
}

/** Extract storage path from a public Supabase URL when possible. */
export function pathFromPublicUrl(url: string, bucket: MediaBucket): string | null {
  try {
    const marker = `/storage/v1/object/public/${bucket}/`;
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(url.slice(idx + marker.length));
  } catch {
    return null;
  }
}
