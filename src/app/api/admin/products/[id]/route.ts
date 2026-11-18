import { NextResponse } from "next/server";
import { getAuthedStoreAdmin } from "@/lib/admin-auth";
import { tenant } from "@/lib/db/tenant";
import { deleteMediaPath, uploadMediaFile } from "@/lib/storage/media-upload";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const auth = await getAuthedStoreAdmin();
  if (!auth) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  try {
    const { id } = await ctx.params;
    const contentType = req.headers.get("content-type") || "";
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (contentType.includes("application/json")) {
      const body = (await req.json()) as Record<string, unknown>;
      if (body.active != null) patch.active = Boolean(body.active);
      if (body.name != null) patch.name = String(body.name).trim();
      if (body.price != null) patch.price = Number(body.price);
      if (body.image != null) patch.image = String(body.image).trim();
      if (body.category != null) patch.category = String(body.category).trim();
      if (body.collection != null) patch.collection = String(body.collection).trim();
    } else {
      const form = await req.formData();
      if (form.has("active")) patch.active = String(form.get("active")) !== "false";
      if (form.has("name")) patch.name = String(form.get("name") || "").trim();
      if (form.has("price")) patch.price = Number(form.get("price") || 0);
      if (form.has("image")) patch.image = String(form.get("image") || "").trim();
      if (form.has("category")) patch.category = String(form.get("category") || "").trim();
      const file = form.get("file");
      if (file instanceof File && file.size > 0) {
        const uploaded = await uploadMediaFile(file, "products", "covers");
        patch.image = uploaded.publicUrl;
        patch.cover_image = uploaded.publicUrl;
      }
    }

    const { data: existing } = await tenant(auth.admin, "products").select("*").eq("id", id).maybeSingle();
    if (!existing) return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });

    const { data, error } = await tenant(auth.admin, "products")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    // Best-effort cleanup when replacing a storage-hosted cover
    if (
      patch.image &&
      typeof existing.image === "string" &&
      existing.image.includes("/storage/v1/object/public/products/")
    ) {
      const marker = "/storage/v1/object/public/products/";
      const idx = existing.image.indexOf(marker);
      if (idx >= 0) {
        await deleteMediaPath("products", decodeURIComponent(existing.image.slice(idx + marker.length)));
      }
    }

    return NextResponse.json({ product: data, message: "Ürün güncellendi" });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Ürün güncellenemedi" },
      { status: 500 }
    );
  }
}
