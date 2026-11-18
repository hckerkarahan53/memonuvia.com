import { getAuthedStoreAdmin } from "@/lib/admin-auth";
import { getStoreId } from "@/lib/store";

export default async function AdminSettingsPage() {
  const auth = await getAuthedStoreAdmin();
  if (!auth) return null;
  const storeId = getStoreId();

  const { data: settings } = await auth.admin
    .from("store_settings")
    .select("*")
    .eq("store_id", storeId)
    .maybeSingle();

  const rows = [
    ["Store ID", storeId],
    ["Site adı", String(settings?.site_name || settings?.brand_name || "MemoNuvia")],
    ["Varsayılan para birimi", String(settings?.default_currency || settings?.currency_default || "USD")],
    ["Printify Shop ID", String(settings?.printify_shop_id || process.env.PRINTIFY_SHOP_ID || "—")],
    ["Admin e-posta (oturum)", auth.user.email || "—"],
    ["ADMIN_EMAILS", process.env.ADMIN_EMAILS || "—"],
  ];

  return (
    <main className="mx-auto max-w-3xl">
      <h1 className="font-serif text-3xl font-bold text-teal md:text-4xl">Ayarlar</h1>
      <p className="mt-1 text-sm text-teal/70">Mağaza kimliği ve entegrasyon özeti (salt okunur).</p>

      <div className="mt-6 overflow-hidden rounded-3xl bg-white shadow-soft">
        <table className="min-w-full text-sm">
          <tbody>
            {rows.map(([label, value]) => (
              <tr key={label} className="border-t border-teal/10 first:border-0">
                <th className="w-1/3 bg-cream/60 px-4 py-3 text-left font-semibold text-teal">{label}</th>
                <td className="px-4 py-3 text-teal/80 break-all">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 rounded-3xl bg-white p-5 text-sm text-teal/70 shadow-soft">
        <p className="font-semibold text-teal">Not</p>
        <p className="mt-2">
          Stripe / Printify gizli anahtarları yalnızca sunucu ortam değişkenlerinde tutulur. Değiştirmek için
          Vercel / <code>.env.local</code> üzerinden güncelleyin.
        </p>
      </div>
    </main>
  );
}
