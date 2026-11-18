import { NextResponse } from "next/server";
import { getAuthedStoreAdmin } from "@/lib/admin-auth";
import { deleteSlider, listSliders, updateSlider } from "@/lib/sliders";
import { deleteMediaPath, uploadMediaFile } from "@/lib/storage/media-upload";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const auth = await getAuthedStoreAdmin();
  if (!auth) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  try {
    const { id } = await ctx.params;
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const body = (await req.json()) as Record<string, unknown>;
      const slide = await updateSlider(auth.admin, id, {
        title: body.title != null ? String(body.title) : undefined,
        subtitle: body.subtitle != null ? String(body.subtitle) : undefined,
        button_text: body.button_text != null ? String(body.button_text) : undefined,
        button_link: body.button_link != null ? String(body.button_link) : undefined,
        image_url: body.image_url != null ? String(body.image_url) : undefined,
        sort_order: body.sort_order != null ? Number(body.sort_order) : undefined,
        is_active: body.is_active != null ? Boolean(body.is_active) : undefined,
      });
      return NextResponse.json({ slide, message: "Slider güncellendi" });
    }

    const form = await req.formData();
    const patch: {
      title?: string;
      subtitle?: string | null;
      button_text?: string | null;
      button_link?: string | null;
      image_url?: string;
      image_path?: string | null;
      sort_order?: number;
      is_active?: boolean;
    } = {};

    if (form.has("title")) patch.title = String(form.get("title") || "").trim();
    if (form.has("subtitle")) patch.subtitle = String(form.get("subtitle") || "").trim() || null;
    if (form.has("button_text")) patch.button_text = String(form.get("button_text") || "").trim() || null;
    if (form.has("button_link")) patch.button_link = String(form.get("button_link") || "").trim() || null;
    if (form.has("image_url")) patch.image_url = String(form.get("image_url") || "").trim();
    if (form.has("sort_order")) patch.sort_order = Number(form.get("sort_order") || 0);
    if (form.has("is_active")) patch.is_active = String(form.get("is_active")) !== "false";

    const file = form.get("image");
    if (file instanceof File && file.size > 0) {
      const { slides } = await listSliders(auth.admin);
      const existing = slides.find((s) => s.id === id);
      const uploaded = await uploadMediaFile(file, "sliders", "heroes");
      if (existing?.image_path) await deleteMediaPath("sliders", existing.image_path);
      patch.image_url = uploaded.publicUrl;
      patch.image_path = uploaded.path;
    }

    const slide = await updateSlider(auth.admin, id, patch);
    return NextResponse.json({ slide, message: "Slider güncellendi" });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Slider güncellenemedi" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const auth = await getAuthedStoreAdmin();
  if (!auth) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  try {
    const { id } = await ctx.params;
    const removed = await deleteSlider(auth.admin, id);
    if (removed?.image_path) await deleteMediaPath("sliders", removed.image_path);
    return NextResponse.json({ ok: true, message: "Slider silindi" });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Slider silinemedi" },
      { status: 500 }
    );
  }
}
