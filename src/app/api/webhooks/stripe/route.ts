import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStoreId } from "@/lib/store";
import { tenant } from "@/lib/db/tenant";

export const runtime = "nodejs";

function metadataStoreId(obj: { metadata?: Record<string, string> | null }): string | undefined {
  return obj.metadata?.store_id || undefined;
}

export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json({ error: "Stripe webhook not configured" }, { status: 400 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  try {
    const raw = await req.text();
    const event = stripe.webhooks.constructEvent(raw, signature, secret);
    const storeId = getStoreId();

    if (
      event.type === "checkout.session.completed" ||
      event.type === "payment_intent.succeeded"
    ) {
      const obj = event.data.object as {
        id: string;
        metadata?: Record<string, string> | null;
        payment_intent?: string | { id: string } | null;
      };

      const metaStore = metadataStoreId(obj);

      // Sibling-store events: acknowledge 200, do nothing
      if (!metaStore || metaStore !== storeId) {
        return NextResponse.json({
          received: true,
          ignored: true,
          reason: "store_id mismatch or missing",
          expected: storeId,
          got: metaStore || null,
        });
      }

      const orderId = obj.metadata?.order_id;
      const admin = createAdminClient();
      if (!admin || !orderId) {
        return NextResponse.json({ received: true, store_id: storeId });
      }

      const { data: existing } = await tenant(admin, "orders")
        .select("id, store_id, payment_status")
        .eq("id", orderId)
        .maybeSingle();

      if (!existing || existing.store_id !== storeId) {
        return NextResponse.json({
          received: true,
          ignored: true,
          reason: "order not found for this store",
        });
      }

      // Paid → awaiting artwork. NEVER auto-send raw photos to Printify.
      const paymentIntent =
        typeof obj.payment_intent === "string"
          ? obj.payment_intent
          : obj.payment_intent && typeof obj.payment_intent === "object"
            ? obj.payment_intent.id
            : null;

      const patch: Record<string, unknown> = {
        payment_status: "paid",
        design_status: "awaiting_artwork",
        printify_status: "not_sent",
        paid_at: new Date().toISOString(),
      };
      if (event.type === "checkout.session.completed") {
        patch.stripe_session_id = obj.id;
      }
      if (paymentIntent) patch.stripe_payment_intent = paymentIntent;

      await tenant(admin, "orders").update(patch).eq("id", orderId);
    }

    return NextResponse.json({ received: true, store_id: storeId });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Webhook error" },
      { status: 400 }
    );
  }
}
