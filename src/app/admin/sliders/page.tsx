import { getAuthedStoreAdmin } from "@/lib/admin-auth";
import { ensureDefaultSlidersSeeded, listSliders } from "@/lib/sliders";
import { SliderManager } from "./SliderManager";

export default async function AdminSlidersPage() {
  const auth = await getAuthedStoreAdmin();
  if (!auth) return null;

  await ensureDefaultSlidersSeeded(auth.admin);
  const { slides, source } = await listSliders(auth.admin);

  return (
    <main className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-bold text-teal md:text-4xl">Slider Yönetimi</h1>
        <p className="mt-1 text-sm text-teal/70">
          Ana sayfa hero slider’larını ekleyin, sıralayın, yayınlayın veya gizleyin.
        </p>
      </div>
      <SliderManager initialSlides={slides} source={source} />
    </main>
  );
}
