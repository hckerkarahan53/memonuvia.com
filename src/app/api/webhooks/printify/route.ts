import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStoreId } from "@/lib/store";
import { tenant } from "@/lib/db/tenant";

/** Printify shipment webhook — only mutates THIS store's orders */
export async function POST(req: Request) {
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ ok: true });

  const storeId = getStoreId();
  const body = await req.json().catch(() => ({}));
  const type = body?.type || body?.event || "";
  const resource = body?.resource || body?.data || body;

  if (String(type).includes("shipment") || resource?.tracking_number) {
    const externalId = resource?.external_id || resource?.order?.external_id;
    const printifyId = String(resource?.id || resource?.order_id || "");
    const tracking = resource?.tracking_number || resource?.shipments?.[0]?.tracking_number;
    const trackingUrl = resource?.tracking_url || resource?.shipments?.[0]?.tracking_url;

    let query = tenant(admin, "orders").update({
      printify_status: "shipped",
      tracking_number: tracking || null,
      tracking_url: trackingUrl || null,
      updated_at: new Date().toISOString(),
    });

    if (externalId) {
      const rawExt = String(externalId);
      const orderNumber = rawExt.includes(":") ? rawExt.split(":").slice(1).join(":") : rawExt;
      const prefix = rawExt.includes(":") ? rawExt.split(":")[0] : null;
      if (prefix && prefix !== storeId) {
        return NextResponse.json({
          received: true,
          ignored: true,
          reason: "external_id store mismatch",
          expected: storeId,
          got: prefix,
        });
      }
      query = query.eq("order_number", orderNumber);
    } else if (printifyId) {
      query = query.eq("printify_order_id", printifyId);
    } else {
      return NextResponse.json({ ok: true, store_id: storeId });
    }

    const { data, error } = await query.select("id, store_id");
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({
      received: true,
      store_id: storeId,
      updated: data?.length || 0,
    });
  }

  return NextResponse.json({ received: true, store_id: storeId });
}
