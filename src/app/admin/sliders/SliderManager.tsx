"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { Slider } from "@/lib/sliders";

type Props = {
  initialSlides: Slider[];
  source: string;
};

const emptyForm = {
  title: "",
  subtitle: "",
  button_text: "",
  button_link: "/shop",
  image_url: "",
  sort_order: 0,
  is_active: true,
};

export function SliderManager({ initialSlides, source }: Props) {
  const [slides, setSlides] = useState(initialSlides);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...slides].sort((a, b) => a.sort_order - b.sort_order),
    [slides]
  );

  function flash(ok: string | null, err: string | null) {
    setMessage(ok);
    setError(err);
  }

  async function refresh() {
    const res = await fetch("/api/admin/sliders");
    const data = await res.json();
    if (res.ok) setSlides(data.slides || []);
  }

  function startEdit(slide: Slider) {
    setEditingId(slide.id);
    setForm({
      title: slide.title,
      subtitle: slide.subtitle || "",
      button_text: slide.button_text || "",
      button_link: slide.button_link || "",
      image_url: slide.image_url,
      sort_order: slide.sort_order,
      is_active: slide.is_active,
    });
    setFile(null);
    flash(null, null);
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setFile(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    flash(null, null);
    try {
      const body = new FormData();
      body.set("title", form.title);
      body.set("subtitle", form.subtitle);
      body.set("button_text", form.button_text);
      body.set("button_link", form.button_link);
      body.set("image_url", form.image_url);
      body.set("sort_order", String(form.sort_order));
      body.set("is_active", String(form.is_active));
      if (file) body.set("image", file);

      const res = await fetch(editingId ? `/api/admin/sliders/${editingId}` : "/api/admin/sliders", {
        method: editingId ? "PATCH" : "POST",
        body,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "İşlem başarısız");
      flash(data.message || "Kaydedildi", null);
      resetForm();
      await refresh();
    } catch (err) {
      flash(null, err instanceof Error ? err.message : "Hata");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(slide: Slider) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/sliders/${slide.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !slide.is_active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Güncellenemedi");
      await refresh();
      flash(slide.is_active ? "Slider gizlendi" : "Slider yayında", null);
    } catch (err) {
      flash(null, err instanceof Error ? err.message : "Hata");
    } finally {
      setBusy(false);
    }
  }

  async function move(slide: Slider, dir: -1 | 1) {
    const nextOrder = slide.sort_order + dir;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/sliders/${slide.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sort_order: nextOrder }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sıra güncellenemedi");
      await refresh();
    } catch (err) {
      flash(null, err instanceof Error ? err.message : "Hata");
    } finally {
      setBusy(false);
    }
  }

  async function remove(slide: Slider) {
    if (!window.confirm(`“${slide.title}” silinsin mi?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/sliders/${slide.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Silinemedi");
      flash(data.message || "Silindi", null);
      if (editingId === slide.id) resetForm();
      await refresh();
    } catch (err) {
      flash(null, err instanceof Error ? err.message : "Hata");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-teal/60">
        Kaynak: <span className="font-semibold text-teal">{source}</span>
      </p>

      {(message || error) && (
        <div
          className={`rounded-2xl px-4 py-3 text-sm ${
            error ? "bg-coral/10 text-coral" : "bg-mint text-teal"
          }`}
        >
          {error || message}
        </div>
      )}

      <form onSubmit={onSubmit} className="rounded-3xl bg-white p-5 shadow-soft">
        <h2 className="font-serif text-xl font-semibold text-teal">
          {editingId ? "Slider düzenle" : "Yeni slider ekle"}
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-semibold">Başlık *</span>
            <input
              required
              className="min-h-11 w-full rounded-2xl border border-teal/15 px-3"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold">Alt başlık</span>
            <input
              className="min-h-11 w-full rounded-2xl border border-teal/15 px-3"
              value={form.subtitle}
              onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold">Buton metni</span>
            <input
              className="min-h-11 w-full rounded-2xl border border-teal/15 px-3"
              value={form.button_text}
              onChange={(e) => setForm((f) => ({ ...f, button_text: e.target.value }))}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold">Buton linki</span>
            <input
              className="min-h-11 w-full rounded-2xl border border-teal/15 px-3"
              value={form.button_link}
              onChange={(e) => setForm((f) => ({ ...f, button_link: e.target.value }))}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold">Görsel URL</span>
            <input
              className="min-h-11 w-full rounded-2xl border border-teal/15 px-3"
              placeholder="/images/... veya https://..."
              value={form.image_url}
              onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold">Dosyadan yükle (max 5MB)</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="min-h-11 w-full rounded-2xl border border-teal/15 px-3 py-2"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold">Sıra</span>
            <input
              type="number"
              className="min-h-11 w-full rounded-2xl border border-teal/15 px-3"
              value={form.sort_order}
              onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))}
            />
          </label>
          <label className="flex items-center gap-3 text-sm font-semibold">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
            />
            Aktif (yayında)
          </label>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={busy}
            className="min-h-11 rounded-full bg-coral px-5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? "Kaydediliyor…" : editingId ? "Güncelle" : "Ekle"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="min-h-11 rounded-full border border-teal/15 px-5 text-sm font-semibold"
            >
              İptal
            </button>
          )}
        </div>
      </form>

      <div className="space-y-3">
        {sorted.map((slide) => (
          <article
            key={slide.id}
            className="grid gap-4 rounded-3xl bg-white p-4 shadow-soft md:grid-cols-[140px_1fr_auto]"
          >
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-cream">
              <Image
                src={slide.image_url}
                alt={slide.title}
                fill
                className="object-cover"
                unoptimized={slide.image_url.startsWith("http")}
              />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-serif text-lg font-semibold text-teal">{slide.title}</h3>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    slide.is_active ? "bg-mint text-teal" : "bg-cream text-teal/50"
                  }`}
                >
                  {slide.is_active ? "Aktif" : "Pasif"}
                </span>
                <span className="text-xs text-teal/45">Sıra {slide.sort_order}</span>
              </div>
              {slide.subtitle && <p className="mt-1 text-sm text-teal/65">{slide.subtitle}</p>}
              <p className="mt-2 truncate text-xs text-teal/45">
                {slide.button_text || "—"} → {slide.button_link || "—"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 md:flex-col md:items-stretch">
              <button
                type="button"
                disabled={busy}
                onClick={() => startEdit(slide)}
                className="min-h-10 rounded-full border border-teal/15 px-3 text-xs font-semibold"
              >
                Düzenle
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => toggleActive(slide)}
                className="min-h-10 rounded-full border border-teal/15 px-3 text-xs font-semibold"
              >
                {slide.is_active ? "Gizle" : "Yayınla"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => move(slide, -1)}
                className="min-h-10 rounded-full border border-teal/15 px-3 text-xs font-semibold"
              >
                Yukarı
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => move(slide, 1)}
                className="min-h-10 rounded-full border border-teal/15 px-3 text-xs font-semibold"
              >
                Aşağı
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => remove(slide)}
                className="min-h-10 rounded-full bg-coral/10 px-3 text-xs font-semibold text-coral"
              >
                Sil
              </button>
            </div>
          </article>
        ))}
        {!sorted.length && (
          <p className="rounded-3xl bg-white p-8 text-center text-sm text-teal/60 shadow-soft">
            Henüz slider yok. Yukarıdan ekleyin.
          </p>
        )}
      </div>
    </div>
  );
}
