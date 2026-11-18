import type { SupabaseClient, User } from "@supabase/supabase-js";

/** Upsert shared profiles row after Google / email auth (no store_id). */
export async function syncProfile(client: SupabaseClient, user: User) {
  const meta = user.user_metadata || {};
  const fullName =
    (meta.full_name as string) ||
    (meta.name as string) ||
    (meta.fullName as string) ||
    "";
  const avatarUrl = (meta.avatar_url as string) || (meta.picture as string) || null;

  const { error } = await client.from("profiles").upsert(
    {
      id: user.id,
      email: user.email,
      full_name: fullName,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (error) {
    console.error("[auth] profile sync failed", error.message);
  }

  return {
    id: user.id,
    email: user.email || "",
    fullName,
    avatarUrl,
  };
}
