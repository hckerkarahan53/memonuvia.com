/** @deprecated Prefer `tenant()` from `@/lib/db/tenant` */
export {
  tenant as productsQueryCompat,
  tenant,
  shared,
  requireStoreAdmin,
} from "@/lib/db/tenant";

import type { SupabaseClient } from "@supabase/supabase-js";
import { tenant } from "@/lib/db/tenant";

export function productsQuery(client: SupabaseClient) {
  return tenant(client, "products").select("*");
}
export function designsQuery(client: SupabaseClient) {
  return tenant(client, "designs").select("*");
}
export function ordersQuery(client: SupabaseClient) {
  return tenant(client, "orders").select("*");
}
export function cartItemsQuery(client: SupabaseClient) {
  return tenant(client, "cart_items").select("*");
}
export function storeSettingsQuery(client: SupabaseClient) {
  return tenant(client, "store_settings").select("*");
}
export function customerUploadsQuery(client: SupabaseClient) {
  return tenant(client, "customer_uploads").select("*");
}
export function insertForStore(
  client: SupabaseClient,
  table: "products" | "designs" | "orders" | "cart_items" | "store_settings" | "customer_uploads" | "store_admins",
  row: Record<string, unknown> | Record<string, unknown>[]
) {
  return tenant(client, table).insert(row);
}
export function updateOrderForStore(
  client: SupabaseClient,
  orderId: string,
  patch: Record<string, unknown>
) {
  return tenant(client, "orders").update(patch).eq("id", orderId);
}
export function getOrderForStore(client: SupabaseClient, orderId: string) {
  return tenant(client, "orders").select("*, order_items(*)").eq("id", orderId).maybeSingle();
}
