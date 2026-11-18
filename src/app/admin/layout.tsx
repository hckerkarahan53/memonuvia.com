import { redirect } from "next/navigation";
import { getAuthedStoreAdmin } from "@/lib/admin-auth";
import { getStoreId } from "@/lib/store";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const auth = await getAuthedStoreAdmin();
  if (!auth) redirect("/auth?next=/admin");

  return (
    <AdminShell storeId={getStoreId()} email={auth.user.email}>
      {children}
    </AdminShell>
  );
}
