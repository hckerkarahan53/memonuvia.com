import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireStoreAdmin } from "@/lib/db/tenant";

export async function getAuthedStoreAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  if (!admin) return null;

  const ok = await requireStoreAdmin(admin, user.id, user.email);
  if (!ok) return null;
  return { user, admin };
}
