import { redirect, notFound } from "next/navigation";
import { ApproveForm } from "./ApproveForm";
import { getStoreId } from "@/lib/store";
import { tenant } from "@/lib/db/tenant";
import { getAuthedStoreAdmin } from "@/lib/admin-auth";

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const storeId = getStoreId();
  const auth = await getAuthedStoreAdmin();
  if (!auth) redirect("/auth?next=/admin");

  const { data } = await tenant(auth.admin, "orders")
    .select("*, order_items(*)")
    .eq("id", id)
    .maybeSingle();
  const order = data as unknown as Record<string, unknown> | null;
  if (!order || order.store_id !== storeId) notFound();

  const items = (order.order_items as Record<string, unknown>[]) || [];

  return (
    <main className="mx-auto max-w-5xl">
      <h1 className="font-serif text-3xl font-bold text-teal md:text-4xl">{String(order.order_number)}</h1>
      <p className="mt-1 text-xs text-teal/50">store: {String(order.store_id)}</p>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="rounded-3xl bg-white p-6 shadow-soft">
          <h2 className="font-serif text-xl font-semibold text-teal">Customer</h2>
          <p className="mt-2 text-sm">{String(order.customer_name || "")}</p>
          <p className="text-sm text-teal/70">{String(order.customer_email || "")}</p>
          <p className="mt-3 text-sm">
            Payment: <strong>{String(order.payment_status)}</strong>
          </p>
          <p className="text-sm">
            Design: <strong>{String(order.design_status)}</strong>
          </p>
          <p className="text-sm">
            Printify: <strong>{String(order.printify_status)}</strong>
          </p>
          {order.printify_error_log ? (
            <p className="mt-2 text-sm text-coral">{String(order.printify_error_log)}</p>
          ) : null}
          <pre className="mt-4 overflow-auto rounded-2xl bg-cream p-3 text-xs">
            {JSON.stringify(order.shipping_address || {}, null, 2)}
          </pre>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-soft">
          <h2 className="font-serif text-xl font-semibold text-teal">Artwork review</h2>
          {items.map((item) => (
            <article key={String(item.id)} className="mt-4 border-t border-teal/10 pt-4">
              <p className="font-semibold">{String(item.product_name)}</p>
              <p className="text-sm text-teal/70">Text: {String(item.custom_text || "—")}</p>
              {item.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={String(item.photo_url)}
                  alt="Customer upload (private)"
                  className="mt-3 h-40 w-40 rounded-2xl object-cover"
                />
              ) : (
                <p className="mt-2 text-sm text-teal/60">No photo on file</p>
              )}
              <p className="mt-2 text-xs text-teal/50">
                Raw uploads: {storeId}/raw-photos/… · Print files: {storeId}/print-files/…
              </p>
            </article>
          ))}
          <ApproveForm orderId={String(order.id)} />
        </section>
      </div>
    </main>
  );
}
