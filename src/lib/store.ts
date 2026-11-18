/**
 * Multi-tenant store identity.
 * Auth + profiles are shared. Commerce data is always scoped by NEXT_PUBLIC_STORE_ID.
 */

const STORE_SCOPED_TABLES = [
  "products",
  "designs",
  "orders",
  "cart_items",
  "store_settings",
  "store_admins",
  "customer_uploads",
  "sliders",
] as const;

export type StoreScopedTable = (typeof STORE_SCOPED_TABLES)[number];

export function assertStoreIdConfigured(value?: string | null): string {
  const id = (value ?? process.env.NEXT_PUBLIC_STORE_ID ?? "").trim();
  if (!id) {
    throw new Error(
      "[MULTI-TENANT] NEXT_PUBLIC_STORE_ID is missing or empty. " +
        "Set a unique store id in .env.local (e.g. memonuvia) before starting the app."
    );
  }
  return id;
}

/** Server / API — always throws if unset. */
export function getStoreId(): string {
  return assertStoreIdConfigured();
}

/** Client / build — still throws if the public env was not inlined. */
export function getStoreIdClient(): string {
  return assertStoreIdConfigured(process.env.NEXT_PUBLIC_STORE_ID);
}

export function assertSameStore(orderStoreId: string | null | undefined): boolean {
  return Boolean(orderStoreId) && orderStoreId === getStoreId();
}

export function isStoreScopedTable(table: string): table is StoreScopedTable {
  return (STORE_SCOPED_TABLES as readonly string[]).includes(table);
}

/**
 * Storage partitions (never share folders across brands):
 * - raw-photos/{orderId}/…
 * - print-files/{orderId}/…
 * - products/…
 */
export type StorageKind = "raw-photos" | "print-files" | "products";

export function storeStoragePath(kind: StorageKind, ...segments: string[]): string {
  const storeId = getStoreId();
  const clean = segments
    .filter(Boolean)
    .map((s) => String(s).replace(/^\/+|\/+$/g, "").replace(/\.\./g, ""));
  return [storeId, kind, ...clean].join("/");
}

export function withStoreId<T extends Record<string, unknown>>(
  row: T
): T & { store_id: string } {
  return { ...row, store_id: getStoreId() };
}

export function withStoreIdMany<T extends Record<string, unknown>>(
  rows: T[]
): Array<T & { store_id: string }> {
  const storeId = getStoreId();
  return rows.map((r) => ({ ...r, store_id: storeId }));
}
