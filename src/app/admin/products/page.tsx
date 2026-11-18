import { getAuthedStoreAdmin } from "@/lib/admin-auth";
import { tenant } from "@/lib/db/tenant";
import { SyncPrintifyButton } from "../SyncPrintifyButton";
import { ProductManager } from "./ProductManager";

export default async function AdminProductsPage() {
  const auth = await getAuthedStoreAdmin();
  if (!auth) return null;

  const { data } = await tenant(auth.admin, "products")
    .select("id,name,slug,image,cover_image,price,active,category,collection,updated_at")
    .order("updated_at", { ascending: false })
    .limit(200);

  return (
    <main className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-bold text-teal md:text-4xl">Ürünler</h1>
          <p className="mt-1 text-sm text-teal/70">
            Aktif/pasif yönetimi ve görsel yükleme. Katalog senkronu Printify üzerinden.
          </p>
        </div>
        <SyncPrintifyButton />
      </div>
      <ProductManager initialProducts={(data || []) as Parameters<typeof ProductManager>[0]["initialProducts"]} />
    </main>
  );
}
