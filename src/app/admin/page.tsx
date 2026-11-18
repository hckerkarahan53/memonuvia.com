import Link from "next/link";
import { getStoreId } from "@/lib/store";
import { tenant } from "@/lib/db/tenant";
import { getAuthedStoreAdmin } from "@/lib/admin-auth";
import { listSliders } from "@/lib/sliders";
import { SyncPrintifyButton } from "./SyncPrintifyButton";

export default async function AdminDashboardPage() {
  const storeId = getStoreId();
  const auth = await getAuthedStoreAdmin();
  if (!auth) return null;

  const [{ data: orders }, { data: products }, sliderResult] = await Promise.all([
    tenant(auth.admin, "orders").select("id,payment_status,design_status,printify_status").limit(200),
    tenant(auth.admin, "products").select("id,active").limit(500),
    listSliders(auth.admin),
  ]);

  const orderRows = (orders || []) as Array<Record<string, unknown>>;
  const productRows = (products || []) as Array<Record<string, unknown>>;
  const paid = orderRows.filter((o) => String(o.payment_status) === "paid").length;
  const pendingDesign = orderRows.filter((o) => String(o.design_status) === "pending").length;
  const activeProducts = productRows.filter((p) => p.active !== false).length;
  const activeSliders = sliderResult.slides.filter((s) => s.is_active).length;

  const cards = [
    { label: "Siparişler", value: orderRows.length, href: "/admin/orders", hint: `${paid} ödendi` },
    { label: "Tasarım bekleyen", value: pendingDesign, href: "/admin/orders", hint: "Onay kuyruğu" },
    { label: "Ürünler", value: activeProducts, href: "/admin/products", hint: `${productRows.length} toplam` },
    { label: "Aktif slider", value: activeSliders, href: "/admin/sliders", hint: sliderResult.source },
  ];

  return (
    <main className="mx-auto max-w-6xl">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-bold text-teal md:text-4xl">Dashboard</h1>
          <p className="mt-1 text-sm text-teal/70">
            Mağaza <code className="rounded bg-white px-1.5 py-0.5 text-xs">{storeId}</code>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SyncPrintifyButton />
          <Link href="/admin/sliders" className="rounded-full bg-coral px-4 py-2.5 text-sm font-semibold text-white">
            Slider yönet
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="rounded-3xl bg-white p-5 shadow-soft transition hover:-translate-y-0.5"
          >
            <p className="text-sm text-teal/60">{c.label}</p>
            <p className="mt-2 font-serif text-4xl font-bold text-teal">{c.value}</p>
            <p className="mt-2 text-xs text-teal/50">{c.hint}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <section className="rounded-3xl bg-white p-5 shadow-soft">
          <h2 className="font-serif text-xl font-semibold text-teal">Hızlı işlemler</h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <Link className="font-semibold text-coral" href="/admin/sliders">
                Ana sayfa sliderlarını düzenle →
              </Link>
            </li>
            <li>
              <Link className="font-semibold text-coral" href="/admin/products">
                Ürünleri görüntüle / aktifleştir →
              </Link>
            </li>
            <li>
              <Link className="font-semibold text-coral" href="/admin/orders">
                Siparişleri incele ve Printify’a gönder →
              </Link>
            </li>
            <li>
              <Link className="font-semibold text-coral" href="/admin/settings">
                Mağaza ayarlarını kontrol et →
              </Link>
            </li>
          </ul>
        </section>
        <section className="rounded-3xl bg-white p-5 shadow-soft">
          <h2 className="font-serif text-xl font-semibold text-teal">Slider kaynağı</h2>
          <p className="mt-3 text-sm text-teal/70">
            Veri kaynağı: <strong>{sliderResult.source}</strong>
          </p>
          <p className="mt-2 text-sm text-teal/60">
            {sliderResult.source === "settings" || sliderResult.source === "fallback"
              ? "Tam tablo desteği için Supabase SQL Editor’de RUN_SLIDERS_IN_SQL_EDITOR.sql dosyasını çalıştırın."
              : "Sliders tablosu aktif — CRUD doğrudan veritabanına yazılıyor."}
          </p>
        </section>
      </div>
    </main>
  );
}
