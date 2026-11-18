import { HomePage } from "@/components/home/HomePage";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_SLIDERS, listSliders, type Slider } from "@/lib/sliders";
import { getStoreId } from "@/lib/store";

export const revalidate = 60;

export default async function Page() {
  let slides: Slider[] = DEFAULT_SLIDERS.map((s) => ({ ...s, store_id: getStoreId() }));

  try {
    const admin = createAdminClient();
    const client = admin || (await createClient());
    const result = await listSliders(client, { activeOnly: true });
    if (result.slides.length) slides = result.slides;
  } catch {
    // keep fallback slides
  }

  return <HomePage slides={slides} />;
}
