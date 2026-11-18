import type { SupabaseClient } from "@supabase/supabase-js";
import { getStoreId, withStoreId, withStoreIdMany, type StoreScopedTable } from "@/lib/store";

type AnyQuery = {
  select: (columns?: string) => AnyQuery;
  insert: (data: unknown) => AnyQuery;
  upsert: (data: unknown, options?: { onConflict?: string }) => AnyQuery;
  update: (data: unknown) => AnyQuery;
  delete: () => AnyQuery;
  eq: (column: string, value: unknown) => AnyQuery;
  in: (column: string, values: unknown[]) => AnyQuery;
  order: (column: string, options?: { ascending?: boolean }) => AnyQuery;
  limit: (count: number) => AnyQuery;
  single: () => Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>;
  maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>;
  then: Promise<{ data: Record<string, unknown>[] | null; error: { message: string } | null }>["then"];
};

function table(client: SupabaseClient, name: string): AnyQuery {
  // Untyped on purpose — shared Supabase project has no generated Database types yet
  return client.from(name) as unknown as AnyQuery;
}

/**
 * Centralized multi-tenant query wrapper.
 * Every read/update/delete is filtered by store_id.
 * Every insert injects store_id.
 * Do NOT use for profiles / auth.users (shared).
 */
export function tenant(client: SupabaseClient, tableName: StoreScopedTable) {
  const storeId = getStoreId();
  const t = table(client, tableName);

  return {
    storeId,

    select(columns = "*") {
      return t.select(columns).eq("store_id", storeId);
    },

    insert(data: Record<string, unknown> | Record<string, unknown>[]) {
      const payload = Array.isArray(data) ? withStoreIdMany(data) : withStoreId(data);
      return t.insert(payload);
    },

    upsert(
      data: Record<string, unknown> | Record<string, unknown>[],
      options?: { onConflict?: string }
    ) {
      const payload = Array.isArray(data) ? withStoreIdMany(data) : withStoreId(data);
      return t.upsert(payload, options);
    },

    update(patch: Record<string, unknown>) {
      return t.update(patch).eq("store_id", storeId);
    },

    delete() {
      return t.delete().eq("store_id", storeId);
    },
  };
}

/** Shared tables — no store_id injection. */
export function shared(client: SupabaseClient, tableName: "profiles") {
  const t = table(client, tableName);
  return {
    select(columns = "*") {
      return t.select(columns);
    },
    update(patch: Record<string, unknown>) {
      return t.update(patch);
    },
  };
}

export async function requireStoreAdmin(
  client: SupabaseClient,
  userId: string,
  email?: string | null
): Promise<boolean> {
  const storeId = getStoreId();

  const { data: storeAdmin, error: adminErr } = await table(client, "store_admins")
    .select("id")
    .eq("store_id", storeId)
    .eq("user_id", userId)
    .eq("active", true)
    .maybeSingle();
  if (!adminErr && storeAdmin) return true;

  const { data: profile } = await shared(client, "profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (profile?.role === "admin") return true;

  const emails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (email && emails.includes(email.toLowerCase())) return true;

  return false;
}
