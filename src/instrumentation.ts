/**
 * Fails fast if the process starts without a store identity.
 * Shared Supabase credentials are OK; NEXT_PUBLIC_STORE_ID must be unique per deploy.
 */
export function register() {
  const storeId = (process.env.NEXT_PUBLIC_STORE_ID || "").trim();
  if (!storeId) {
    throw new Error(
      "[MULTI-TENANT] Refusing to start: NEXT_PUBLIC_STORE_ID is required. " +
        "Sibling sites share Supabase Auth but must use different STORE_ID / Printify / Stripe credentials."
    );
  }

  if (process.env.NODE_ENV === "production") {
    // Soft warnings only — do not leak secrets
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.warn("[MULTI-TENANT] Supabase public URL/anon key missing");
    }
  }

  console.info(`[MULTI-TENANT] Active store_id=${storeId}`);
}
