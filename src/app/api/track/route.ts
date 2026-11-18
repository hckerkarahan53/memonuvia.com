import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStoreId } from "@/lib/store";
import { tenant } from "@/lib/db/tenant";

export async function GET(req: Request) {
  const storeId = getStoreId();
  const { searchParams } = new URL(req.url);
  const orderNumber = (searchParams.get("order") || "").trim();
  const email = (searchParams.get("email") || "").trim().toLowerCase();
  if (!orderNumber || !email) {
    return NextResponse.json({ error: "order and email are required" }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Tracking unavailable" }, { status: 503 });
  }

  const { data, error } = await tenant(admin, "orders")
    .select(
      "order_number, payment_status, design_status, printify_status, tracking_number, tracking_url, created_at, customer_email, store_id"
    )
    .eq("order_number", orderNumber)
    .maybeSingle();

  if (error || !data || data.store_id !== storeId || String(data.customer_email || "").toLowerCase() !== email) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({
    order: {
      order_number: data.order_number,
      payment_status: data.payment_status,
      design_status: data.design_status,
      printify_status: data.printify_status,
      tracking_number: data.tracking_number,
      tracking_url: data.tracking_url,
      created_at: data.created_at,
      store_id: data.store_id,
    },
  });
}
