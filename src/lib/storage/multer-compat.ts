/**
 * Multer-compatible limits for admin image uploads.
 * Installed `multer` package is available for Express-style adapters;
 * Next.js route handlers use FormData + these same rules via media-upload.ts.
 */
import multer from "multer";
import { MEDIA_MAX_BYTES, MEDIA_MIME_TYPES } from "@/lib/storage/media-upload";

export const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MEDIA_MAX_BYTES, files: 1 },
  fileFilter(_req, file, cb) {
    if (MEDIA_MIME_TYPES.includes(file.mimetype as (typeof MEDIA_MIME_TYPES)[number])) {
      cb(null, true);
      return;
    }
    cb(new Error("Only JPEG, PNG, WebP or GIF images are allowed"));
  },
});
