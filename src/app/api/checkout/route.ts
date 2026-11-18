import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { generateOrderNumber } from "@/lib/utils";
import { getStoreId } from "@/lib/store";
import { tenant } from "@/lib/db/tenant";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const storeId = getStoreId();
    const body = await req.json();
    const items = Array.isArray(body.items) ? body.items : [];
    if (!items.length) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    const currency = body.currency === "GBP" ? "GBP" : "USD";
    const orderNumber = generateOrderNumber();
    const subtotal = items.reduce(
      (sum: number, i: { unitPrice: number; quantity: number }) =>
        sum + Number(i.unitPrice) * Number(i.quantity || 1),
      0
    );

    const supabaseUser = await createClient().catch(() => null);
    const {
      data: { user },
    } = supabaseUser ? await supabaseUser.auth.getUser() : { data: { user: null } };

    const admin = createAdminClient();
    let orderId = crypto.randomUUID();

    if (admin) {
      const slugs = items.map((i: { productSlug: string }) => i.productSlug).filter(Boolean);
      if (slugs.length) {
        await tenant(admin, "products").select("slug").in("slug", slugs);
      }

      const { data: order, error } = await tenant(admin, "orders")
        .insert({
          order_number: orderNumber,
          user_id: user?.id || null,
          customer_email: body.customer_email,
          customer_name: body.customer_name,
          currency,
          subtotal,
          shipping_cost: 0,
          total: subtotal,
          payment_status: "pending",
          design_status: "awaiting_artwork",
          printify_status: "not_sent",
          shipping_address: body.shipping_address,
        })
        .select("id, order_number, store_id")
        .single();

      if (error || !order) throw error || new Error("Order insert failed");
      if (String(order.store_id) !== storeId) {
        throw new Error("Store isolation violation on order insert");
      }
      orderId = String(order.id);

      const rows = items.map(
        (i: {
          productSlug: string;
          productName: string;
          variantId: string;
          variantLabel: string;
          quantity: number;
          unitPrice: number;
          customText: string;
          photoUrl?: string;
        }) => ({
          order_id: orderId,
          product_slug: i.productSlug,
          product_name: i.productName,
          variant_id: i.variantId,
          variant_label: i.variantLabel,
          quantity: i.quantity,
          unit_price: i.unitPrice,
          custom_text: i.customText,
          photo_url: i.photoUrl || null,
        })
      );
      // order_items inherit isolation via orders.store_id FK
      const { error: itemsErr } = await admin.from("order_items").insert(rows);
      if (itemsErr) throw itemsErr;
    }

    if (stripeConfigured()) {
      const stripe = getStripe()!;
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
      const meta = {
        order_id: orderId,
        order_number: orderNumber,
        store_id: storeId,
      };

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: body.customer_email,
        line_items: items.map(
          (i: { productName: string; customText: string; unitPrice: number; quantity: number }) => ({
            quantity: i.quantity || 1,
            price_data: {
              currency: currency.toLowerCase(),
              unit_amount: Math.round(Number(i.unitPrice) * 100),
              product_data: {
                name: i.productName,
                description: i.customText ? `Personalized: ${i.customText}` : undefined,
              },
            },
          })
        ),
        success_url: `${siteUrl}/order/success?order=${orderNumber}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${siteUrl}/checkout?canceled=1`,
        metadata: meta,
        payment_intent_data: {
          metadata: meta,
        },
      });

      if (admin) {
        await tenant(admin, "orders").update({ stripe_session_id: session.id }).eq("id", orderId);
      }

      return NextResponse.json({ url: session.url, orderNumber, orderId, store_id: storeId });
    }

    if (admin) {
      await tenant(admin, "orders")
        .update({
          payment_status: "paid",
          paid_at: new Date().toISOString(),
          design_status: "awaiting_artwork",
        })
        .eq("id", orderId);
    }

    return NextResponse.json({
      demo: true,
      orderNumber,
      orderId,
      store_id: storeId,
      url: `/order/success?order=${orderNumber}`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Checkout failed" },
      { status: 500 }
    );
  }
}
