import Link from "next/link";
import { getStoreId } from "@/lib/store";
import { tenant } from "@/lib/db/tenant";
import { getAuthedStoreAdmin } from "@/lib/admin-auth";
import { SyncPrintifyButton } from "../SyncPrintifyButton";

export default async function AdminOrdersPage() {
  const storeId = getStoreId();
  const auth = await getAuthedStoreAdmin();
  if (!auth) return null;

  const { data } = await tenant(auth.admin, "orders")
    .select("*, order_items(*)")
    .order("created_at", { ascending: false })
    .limit(100);
  const orders = (data || []) as unknown as Array<Record<string, unknown>>;

  return (
    <main className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-bold text-teal md:text-4xl">Siparişler</h1>
          <p className="mt-1 text-sm text-teal/70">
            Yalnızca <code className="rounded bg-white px-1.5 py-0.5 text-xs">{storeId}</code> mağazası
          </p>
        </div>
        <SyncPrintifyButton />
      </div>

      <div className="overflow-x-auto rounded-3xl bg-white shadow-soft">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-cream text-teal">
            <tr>
              <th className="px-4 py-3">Sipariş</th>
              <th className="px-4 py-3">Müşteri</th>
              <th className="px-4 py-3">Ödeme</th>
              <th className="px-4 py-3">Tasarım</th>
              <th className="px-4 py-3">Printify</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {!orders.length && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-teal/60">
                  Bu mağaza için henüz sipariş yok.
                </td>
              </tr>
            )}
            {orders.map((o) => (
              <tr key={String(o.id)} className="border-t border-teal/10">
                <td className="px-4 py-3">
                  <div className="font-semibold text-teal">{String(o.order_number)}</div>
                  <div className="text-xs text-teal/60">
                    {new Date(String(o.created_at)).toLocaleString("tr-TR")}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div>{String(o.customer_name || "—")}</div>
                  <div className="text-xs text-teal/60">{String(o.customer_email || "")}</div>
                </td>
                <td className="px-4 py-3">{String(o.payment_status)}</td>
                <td className="px-4 py-3">{String(o.design_status)}</td>
                <td className="px-4 py-3">{String(o.printify_status)}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/orders/${String(o.id)}`} className="font-semibold text-coral">
                    İncele
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
