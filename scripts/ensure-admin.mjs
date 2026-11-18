/**
 * Ensures MemoNuvia store admin exists in the shared Supabase Auth project.
 * Usage: node --env-file=.env.local scripts/ensure-admin.mjs
 */
import { createClient } from "@supabase/supabase-js";

const email = process.env.ADMIN_SEED_EMAIL || "admin@memonuvia.com";
const password = process.env.ADMIN_SEED_PASSWORD || "MemoNuviaAdmin2026!";
const storeId = process.env.NEXT_PUBLIC_STORE_ID || "memonuvia";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const listed = await admin.auth.admin.listUsers({ perPage: 200 });
let user = listed.data.users.find((u) => u.email === email);
if (!user) {
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "MemoNuvia Admin" },
  });
  if (created.error) throw created.error;
  user = created.data.user;
  console.log("Created user", user.id);
} else {
  const upd = await admin.auth.admin.updateUserById(user.id, {
    password,
    email_confirm: true,
  });
  if (upd.error) throw upd.error;
  console.log("Updated password for", email);
}

await admin.from("profiles").upsert({
  id: user.id,
  email,
  full_name: "MemoNuvia Admin",
  role: "admin",
  is_admin: true,
});

await admin.from("store_admins").upsert(
  {
    store_id: storeId,
    user_id: user.id,
    email,
    role: "admin",
    active: true,
  },
  { onConflict: "store_id,user_id" }
);

console.log("Admin ready:");
console.log("  URL:      /admin  (or http://localhost:3000/admin)");
console.log("  Email:   ", email);
console.log("  Password:", password);
