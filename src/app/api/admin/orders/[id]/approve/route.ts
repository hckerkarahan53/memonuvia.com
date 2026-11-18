import { NextResponse } from "next/server";
import { createPrintifyOrder, printifyConfigured, submitPrintifyOrder } from "@/lib/printify";
import { getStoreId } from "@/lib/store";
import { tenant } from "@/lib/db/tenant";
import { getAuthedStoreAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await getAuthedStoreAdmin();
  if (!auth) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const storeId = getStoreId();
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const finalUrl = body.final_print_file_url as string | undefined;
  const { admin } = auth;

  const { data, error } = await tenant(admin, "orders")
    .select("*, order_items(*)")
    .eq("id", id)
    .maybeSingle();

  type OrderRow = {
    id: string;
    store_id: string;
    order_number: string;
    payment_status: string;
    customer_email?: string;
    customer_name?: string;
    shipping_address?: Record<string, string>;
    order_items?: Array<{
      id: string;
      final_print_file_url?: string;
      printify_product_id?: string;
      printify_variant_id?: string;
      quantity?: number;
    }>;
  };

  const order = data as unknown as OrderRow | null;

  if (error || !order) {
    return NextResponse.json(
      { error: "Order not found for this store", store_id: storeId },
      { status: 404 }
    );
  }

  if (order.store_id !== storeId) {
    return NextResponse.json({ error: "Cross-store fulfillment blocked" }, { status: 403 });
  }

  if (order.payment_status !== "paid") {
    return NextResponse.json({ error: "Order is not paid" }, { status: 400 });
  }

  if (finalUrl && order.order_items?.[0]) {
    await admin
      .from("order_items")
      .update({ final_print_file_url: finalUrl })
      .eq("id", order.order_items[0].id)
      .eq("order_id", order.id);
  }

  const items = order.order_items || [];
  const printFile = finalUrl || items[0]?.final_print_file_url;
  if (!printFile) {
    return NextResponse.json(
      { error: "Upload a print-ready composite file before sending to Printify" },
      { status: 400 }
    );
  }

  if (typeof printFile === "string") {
    const otherStore = printFile.match(/\/([a-z0-9_-]+)\/(print-files|orders)\//i)?.[1];
    if (otherStore && otherStore !== storeId) {
      return NextResponse.json(
        { error: "Print file belongs to another store", store_id: storeId },
        { status: 403 }
      );
    }
  }

  await tenant(admin, "orders").update({ design_status: "approved" }).eq("id", id);

  if (!printifyConfigured()) {
    await tenant(admin, "orders")
      .update({
        printify_status: "error",
        printify_error_log: "Printify not configured for this store",
      })
      .eq("id", id);
    return NextResponse.json({ error: "Printify not configured", approved: true }, { status: 400 });
  }

  try {
    const shipping = order.shipping_address || {};
    const name = String(order.customer_name || "Customer").split(" ");
    const lineItems = items
      .filter((i) => Boolean(i.printify_product_id && i.printify_variant_id))
      .map((i) => ({
        product_id: Number(i.printify_product_id),
        variant_id: Number(i.printify_variant_id),
        quantity: i.quantity || 1,
        print_areas: { front: printFile },
      }));

    if (!lineItems.length) {
      throw new Error("Missing Printify product/variant IDs on line items");
    }

    const externalId = `${storeId}:${order.order_number}`;

    // Uses THIS store's PRINTIFY_API_TOKEN + PRINTIFY_SHOP_ID only
    const created = await createPrintifyOrder({
      external_id: externalId,
      label: `${storeId} ${order.order_number}`,
      line_items: lineItems,
      shipping_method: 1,
      send_shipping_notification: true,
      address_to: {
        first_name: shipping.first_name || name[0] || "Customer",
        last_name: shipping.last_name || name.slice(1).join(" ") || storeId,
        email: order.customer_email,
        phone: shipping.phone || "",
        country: shipping.country || "US",
        region: shipping.region || shipping.state || "",
        address1: shipping.address1 || "",
        address2: shipping.address2 || "",
        city: shipping.city || "",
        zip: shipping.zip || "",
      },
    });

    const printifyId = created?.id;
    if (printifyId) {
      try {
        await submitPrintifyOrder(String(printifyId));
      } catch {
        /* draft until files validate */
      }
    }

    await tenant(admin, "orders")
      .update({
        printify_order_id: printifyId ? String(printifyId) : null,
        printify_status: printifyId ? "submitted" : "error",
        printify_error_log: null,
      })
      .eq("id", id);

    return NextResponse.json({ ok: true, printify_order_id: printifyId, store_id: storeId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Printify failed";
    await tenant(admin, "orders")
      .update({ printify_status: "error", printify_error_log: message })
      .eq("id", id);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
