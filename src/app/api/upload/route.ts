import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { randomUUID } from "crypto";
import { getStoreId, storeStoragePath } from "@/lib/store";
import { tenant } from "@/lib/db/tenant";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const storeId = getStoreId();
    const form = await req.formData();
    const file = form.get("photo");
    const orderId = String(form.get("order_id") || "pending").trim() || "pending";
    const kindRaw = String(form.get("kind") || "raw");
    const kind =
      kindRaw === "print-ready" || kindRaw === "print-files"
        ? "print-files"
        : kindRaw === "products"
          ? "products"
          : "raw-photos";

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only images are allowed" }, { status: 400 });
    }
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: "Max file size is 20MB" }, { status: 400 });
    }

    const admin = createAdminClient();
    const supabase = await createClient().catch(() => null);
    const {
      data: { user },
    } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const fileName = `${Date.now()}-${randomUUID()}.${ext}`;

    // {store_id}/raw-photos|print-files|products/...
    const path =
      kind === "products"
        ? storeStoragePath("products", fileName)
        : kind === "print-files"
          ? storeStoragePath("print-files", orderId, fileName)
          : storeStoragePath("raw-photos", orderId, fileName);

    const buffer = Buffer.from(await file.arrayBuffer());

    if (admin) {
      const { error } = await admin.storage.from("customer-uploads").upload(path, buffer, {
        contentType: file.type,
        upsert: false,
      });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      const { data: signed } = await admin.storage
        .from("customer-uploads")
        .createSignedUrl(path, 60 * 60 * 24 * 7);

      await tenant(admin, "customer_uploads").insert({
        user_id: user?.id || null,
        storage_path: path,
        public_url: signed?.signedUrl || null,
        original_name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
      });

      return NextResponse.json({
        url: signed?.signedUrl,
        path,
        store_id: storeId,
        private: true,
      });
    }

    const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;
    return NextResponse.json({
      url: base64,
      path: `${storeId}/local-demo`,
      store_id: storeId,
      private: true,
      demo: true,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 }
    );
  }
}
