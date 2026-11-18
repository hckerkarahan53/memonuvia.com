"use client";

import Image from "next/image";
import { useState } from "react";

type ProductRow = {
  id: string;
  name?: string | null;
  slug?: string | null;
  image?: string | null;
  cover_image?: string | null;
  price?: number | null;
  active?: boolean | null;
  category?: string | null;
  collection?: string | null;
};

export function ProductManager({ initialProducts }: { initialProducts: ProductRow[] }) {
  const [products, setProducts] = useState(initialProducts);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggleActive(product: ProductRow) {
    setBusyId(product.id);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !(product.active !== false) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Güncellenemedi");
      setProducts((rows) =>
        rows.map((p) => (p.id === product.id ? { ...p, ...(data.product || {}) } : p))
      );
      setMessage(data.message || "Kaydedildi");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hata");
    } finally {
      setBusyId(null);
    }
  }

  async function uploadImage(product: ProductRow, file: File) {
    setBusyId(product.id);
    setMessage(null);
    setError(null);
    try {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch(`/api/admin/products/${product.id}`, { method: "PATCH", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Yükleme başarısız");
      setProducts((rows) =>
        rows.map((p) => (p.id === product.id ? { ...p, ...(data.product || {}) } : p))
      );
      setMessage("Ürün görseli güncellendi");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hata");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      {(message || error) && (
        <div className={`rounded-2xl px-4 py-3 text-sm ${error ? "bg-coral/10 text-coral" : "bg-mint text-teal"}`}>
          {error || message}
        </div>
      )}

      <div className="overflow-x-auto rounded-3xl bg-white shadow-soft">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-cream text-teal">
            <tr>
              <th className="px-4 py-3">Görsel</th>
              <th className="px-4 py-3">Ürün</th>
              <th className="px-4 py-3">Kategori</th>
              <th className="px-4 py-3">Fiyat</th>
              <th className="px-4 py-3">Durum</th>
              <th className="px-4 py-3">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {!products.length && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-teal/60">
                  Ürün yok. Printify senkronunu dashboard’dan çalıştırın.
                </td>
              </tr>
            )}
            {products.map((p) => {
              const img = p.cover_image || p.image || "/images/hero-anderson-slate.jpg";
              return (
                <tr key={p.id} className="border-t border-teal/10">
                  <td className="px-4 py-3">
                    <div className="relative h-16 w-16 overflow-hidden rounded-xl bg-cream">
                      <Image
                        src={img}
                        alt={p.name || p.id}
                        fill
                        className="object-cover"
                        unoptimized={img.startsWith("http")}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-teal">{p.name || p.id}</div>
                    <div className="text-xs text-teal/50">{p.slug || p.id}</div>
                  </td>
                  <td className="px-4 py-3">{p.category || p.collection || "—"}</td>
                  <td className="px-4 py-3">{p.price != null ? `$${p.price}` : "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        p.active !== false ? "bg-mint text-teal" : "bg-cream text-teal/50"
                      }`}
                    >
                      {p.active !== false ? "Aktif" : "Pasif"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busyId === p.id}
                        onClick={() => toggleActive(p)}
                        className="min-h-10 rounded-full border border-teal/15 px-3 text-xs font-semibold"
                      >
                        {p.active !== false ? "Pasifleştir" : "Aktifleştir"}
                      </button>
                      <label className="inline-flex min-h-10 cursor-pointer items-center rounded-full border border-teal/15 px-3 text-xs font-semibold">
                        Görsel
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          className="hidden"
                          disabled={busyId === p.id}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) void uploadImage(p, f);
                            e.currentTarget.value = "";
                          }}
                        />
                      </label>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
