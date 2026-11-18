import { NextResponse } from "next/server";
import { listPrintifyProducts, printifyConfigured } from "@/lib/printify";
import { getStoreId } from "@/lib/store";
import { tenant } from "@/lib/db/tenant";
import { getAuthedStoreAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

/**
 * Publish / sync Printify catalog into THIS store only.
 * Uses local PRINTIFY_API_TOKEN + PRINTIFY_SHOP_ID; tags every row with store_id.
 */
export async function POST() {
  const auth = await getAuthedStoreAdmin();
  if (!auth) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const storeId = getStoreId();
  if (!printifyConfigured()) {
    return NextResponse.json(
      { error: "Printify credentials missing for this store", store_id: storeId },
      { status: 400 }
    );
  }

  try {
    const catalog = await listPrintifyProducts();
    const products = Array.isArray(catalog?.data) ? catalog.data : Array.isArray(catalog) ? catalog : [];
    let upserted = 0;

    for (const p of products) {
      const printifyId = String(p.id);
      const slug =
        String(p.title || printifyId)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || printifyId;

      const image =
        p.images?.[0]?.src || p.images?.[0]?.url || null;

      const { error } = await tenant(auth.admin, "products").upsert(
        {
          id: `${storeId}-${printifyId}`,
          slug,
          name: p.title || `Product ${printifyId}`,
          subtitle: "Personalized Photo Slate",
          category: "family",
          image,
          price_usd: Number(p.variants?.[0]?.price || 4900) / 100,
          price_gbp: Number(p.variants?.[0]?.price || 3900) / 100,
          active: true,
          printify_product_id: printifyId,
          sample_text: "Your Names",
        },
        { onConflict: "store_id,id" }
      );

      if (!error) upserted += 1;

      await tenant(auth.admin, "designs").upsert(
        {
          slug,
          name: p.title || slug,
          category: "family",
          image_url: image,
          active: true,
          printify_product_id: printifyId,
        },
        { onConflict: "store_id,slug" }
      );
    }

    await tenant(auth.admin, "store_settings").upsert({
      site_name: process.env.NEXT_PUBLIC_SITE_NAME || storeId,
      printify_shop_id: process.env.PRINTIFY_SHOP_ID || null,
      default_currency: process.env.NEXT_PUBLIC_DEFAULT_CURRENCY || "USD",
    });

    return NextResponse.json({
      ok: true,
      store_id: storeId,
      synced: upserted,
      total: products.length,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed", store_id: storeId },
      { status: 500 }
    );
  }
}
