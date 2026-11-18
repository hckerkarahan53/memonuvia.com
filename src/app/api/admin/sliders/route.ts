import { NextResponse } from "next/server";
import { getAuthedStoreAdmin } from "@/lib/admin-auth";
import {
  createSlider,
  ensureDefaultSlidersSeeded,
  listSliders,
} from "@/lib/sliders";
import { uploadMediaFile } from "@/lib/storage/media-upload";

export const runtime = "nodejs";

export async function GET() {
  const auth = await getAuthedStoreAdmin();
  if (!auth) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  await ensureDefaultSlidersSeeded(auth.admin);
  const result = await listSliders(auth.admin);
  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const auth = await getAuthedStoreAdmin();
  if (!auth) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  try {
    const form = await req.formData();
    const title = String(form.get("title") || "").trim();
    const subtitle = String(form.get("subtitle") || "").trim();
    const button_text = String(form.get("button_text") || "").trim();
    const button_link = String(form.get("button_link") || "").trim();
    const image_url_field = String(form.get("image_url") || "").trim();
    const sort_order = Number(form.get("sort_order") || 0);
    const is_active = String(form.get("is_active") || "true") !== "false";
    const file = form.get("image");

    if (!title) {
      return NextResponse.json({ error: "Başlık zorunludur" }, { status: 400 });
    }

    let image_url = image_url_field;
    let image_path: string | null = null;

    if (file instanceof File && file.size > 0) {
      const uploaded = await uploadMediaFile(file, "sliders", "heroes");
      image_url = uploaded.publicUrl;
      image_path = uploaded.path;
    }

    if (!image_url) {
      return NextResponse.json(
        { error: "Görsel dosyası veya görsel URL zorunludur" },
        { status: 400 }
      );
    }

    const slide = await createSlider(auth.admin, {
      title,
      subtitle: subtitle || null,
      button_text: button_text || null,
      button_link: button_link || null,
      image_url,
      image_path,
      sort_order: Number.isFinite(sort_order) ? sort_order : 0,
      is_active,
    });

    return NextResponse.json({ slide, message: "Slider eklendi" });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Slider eklenemedi" },
      { status: 500 }
    );
  }
}
