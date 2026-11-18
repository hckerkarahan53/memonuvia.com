import type { SupabaseClient } from "@supabase/supabase-js";
import { getStoreId } from "@/lib/store";
import { tenant } from "@/lib/db/tenant";
import { randomUUID } from "crypto";

/**
 * Shared multi-tenant sliders table columns (CaseNuvia + MemoNuvia):
 * headline, eyebrow, cta_label, cta_href, order_index, ...
 * App-facing aliases: title, subtitle, button_text, button_link, sort_order
 */
export type Slider = {
  id: string;
  store_id: string;
  slug?: string | null;
  tab_label?: string | null;
  title: string;
  subtitle: string | null;
  button_text: string | null;
  button_link: string | null;
  image_url: string;
  image_path: string | null;
  alt_text?: string | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type SliderInput = {
  title: string;
  subtitle?: string | null;
  button_text?: string | null;
  button_link?: string | null;
  image_url: string;
  image_path?: string | null;
  alt_text?: string | null;
  slug?: string | null;
  tab_label?: string | null;
  sort_order?: number;
  is_active?: boolean;
};

export const DEFAULT_SLIDERS: Omit<Slider, "store_id" | "created_at" | "updated_at">[] = [
  {
    id: "slide-family",
    slug: "family",
    tab_label: "Family",
    title: "Your family. Your forever keepsake.",
    subtitle: "Turn your favorite photo into a personalized photo slate.",
    button_text: "Create Your Family Slate →",
    button_link: "/shop?category=family",
    image_url: "/images/hero-anderson-slate.jpg",
    image_path: null,
    alt_text: "Anderson Family personalized photo slate",
    sort_order: 1,
    is_active: true,
  },
  {
    id: "slide-couples",
    slug: "couples",
    tab_label: "Couples",
    title: "Your love, beautifully remembered.",
    subtitle: "A photo, two names, a keepsake made for you.",
    button_text: "Create Your Couple Slate →",
    button_link: "/shop?category=couples",
    image_url: "/images/hero-emily-james-slate.jpg",
    image_path: null,
    alt_text: "Emily & James personalized photo slate",
    sort_order: 2,
    is_active: true,
  },
  {
    id: "slide-pets",
    slug: "pets",
    tab_label: "Pets",
    title: "Little paws. A big place in your heart.",
    subtitle: "Personalized photo slates for your favorite companion.",
    button_text: "Create Your Pet Slate →",
    button_link: "/shop?category=pets",
    image_url: "/images/hero-pets-luna-cooper.jpg",
    image_path: null,
    alt_text: "Luna and Cooper personalized pet photo slates",
    sort_order: 3,
    is_active: true,
  },
  {
    id: "slide-kids",
    slug: "kids",
    tab_label: "Kids",
    title: "Their smile. A little everyday magic.",
    subtitle: "Create a photo slate with their picture and name.",
    button_text: "Create Their Slate →",
    button_link: "/shop?category=kids",
    image_url: "/images/hero-kids-sophia-oliver.jpg",
    image_path: null,
    alt_text: "Sophia and Oliver personalized kids photo slates",
    sort_order: 4,
    is_active: true,
  },
  {
    id: "slide-portraits",
    slug: "portraits",
    tab_label: "Portraits",
    title: "A keepsake as unique as you.",
    subtitle: "Your photo, your name, your favorite design.",
    button_text: "Create Your Photo Slate →",
    button_link: "/shop?category=portraits",
    image_url: "/images/hero-portraits-charlotte-james.jpg",
    image_path: null,
    alt_text: "Charlotte and James personalized portrait photo slates",
    sort_order: 5,
    is_active: true,
  },
];

function withStore(rows: typeof DEFAULT_SLIDERS): Slider[] {
  const storeId = getStoreId();
  return rows.map((r) => ({ ...r, store_id: storeId }));
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "slide";
}

function normalize(rows: Record<string, unknown>[]): Slider[] {
  return rows
    .map((r) => ({
      id: String(r.id),
      store_id: String(r.store_id || getStoreId()),
      slug: r.slug != null ? String(r.slug) : null,
      tab_label: r.tab_label != null ? String(r.tab_label) : null,
      title: String(r.headline ?? r.title ?? ""),
      subtitle:
        r.eyebrow != null
          ? String(r.eyebrow)
          : r.subtitle != null
            ? String(r.subtitle)
            : null,
      button_text:
        r.cta_label != null
          ? String(r.cta_label)
          : r.button_text != null
            ? String(r.button_text)
            : null,
      button_link:
        r.cta_href != null
          ? String(r.cta_href)
          : r.button_link != null
            ? String(r.button_link)
            : null,
      image_url: String(r.image_url || ""),
      image_path: r.image_path != null ? String(r.image_path) : null,
      alt_text: r.alt_text != null ? String(r.alt_text) : null,
      sort_order: Number(r.order_index ?? r.sort_order ?? 0),
      is_active: r.is_active !== false,
      created_at: r.created_at ? String(r.created_at) : undefined,
      updated_at: r.updated_at ? String(r.updated_at) : undefined,
    }))
    .sort((a, b) => a.sort_order - b.sort_order);
}

function toDbRow(input: Partial<SliderInput> & { id?: string }) {
  const row: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (input.title !== undefined) row.headline = input.title.trim();
  if (input.subtitle !== undefined) row.eyebrow = input.subtitle?.trim() || null;
  if (input.button_text !== undefined) row.cta_label = input.button_text?.trim() || null;
  if (input.button_link !== undefined) row.cta_href = input.button_link?.trim() || null;
  if (input.image_url !== undefined) row.image_url = input.image_url.trim();
  if (input.image_path !== undefined) row.image_path = input.image_path;
  if (input.alt_text !== undefined) row.alt_text = input.alt_text;
  if (input.slug !== undefined) row.slug = input.slug;
  if (input.tab_label !== undefined) row.tab_label = input.tab_label;
  if (input.sort_order !== undefined) row.order_index = input.sort_order;
  if (input.is_active !== undefined) row.is_active = input.is_active;
  if (input.id) row.id = input.id;
  return row;
}

async function readSettingsSliders(client: SupabaseClient): Promise<Slider[] | null> {
  const storeId = getStoreId();
  const { data, error } = await client
    .from("store_settings")
    .select("settings")
    .eq("store_id", storeId)
    .maybeSingle();
  if (error || !data) return null;
  const settings = (data.settings || {}) as Record<string, unknown>;
  const raw = settings.homepage_sliders;
  if (!Array.isArray(raw) || raw.length === 0) return null;
  return normalize(raw as Record<string, unknown>[]);
}

async function writeSettingsSliders(client: SupabaseClient, slides: Slider[]) {
  const storeId = getStoreId();
  const { data } = await client
    .from("store_settings")
    .select("settings")
    .eq("store_id", storeId)
    .maybeSingle();
  const settings = { ...((data?.settings || {}) as Record<string, unknown>), homepage_sliders: slides };
  const { error } = await client.from("store_settings").upsert(
    {
      store_id: storeId,
      settings,
      site_name: "MemoNuvia",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "store_id" }
  );
  if (error) throw new Error(error.message);
}

export async function slidersTableReady(client: SupabaseClient): Promise<boolean> {
  const { error } = await client.from("sliders").select("id").limit(1);
  return !error;
}

export async function listSliders(
  client: SupabaseClient,
  opts?: { activeOnly?: boolean }
): Promise<{ slides: Slider[]; source: "table" | "settings" | "fallback" }> {
  const storeId = getStoreId();
  const { data, error } = await client
    .from("sliders")
    .select("*")
    .eq("store_id", storeId)
    .order("order_index", { ascending: true });

  if (!error && data) {
    let slides = normalize(data as Record<string, unknown>[]);
    if (opts?.activeOnly) slides = slides.filter((s) => s.is_active);
    if (slides.length) return { slides, source: "table" };
  }

  const fromSettings = await readSettingsSliders(client);
  if (fromSettings?.length) {
    const slides = opts?.activeOnly ? fromSettings.filter((s) => s.is_active) : fromSettings;
    return { slides, source: "settings" };
  }

  const fallback = withStore(DEFAULT_SLIDERS);
  return {
    slides: opts?.activeOnly ? fallback.filter((s) => s.is_active) : fallback,
    source: "fallback",
  };
}

export async function createSlider(client: SupabaseClient, input: SliderInput): Promise<Slider> {
  const storeId = getStoreId();
  const id = randomUUID();
  const slug = input.slug?.trim() || slugify(input.title);
  const row = toDbRow({
    ...input,
    id,
    slug,
    tab_label: input.tab_label?.trim() || input.title.trim().slice(0, 24),
    alt_text: input.alt_text?.trim() || input.title.trim(),
    sort_order: input.sort_order ?? 0,
    is_active: input.is_active !== false,
  });

  if (await slidersTableReady(client)) {
    const { data, error } = await tenant(client, "sliders").insert(row).select("*").single();
    if (error) throw new Error(error.message);
    return normalize([data as Record<string, unknown>])[0];
  }

  const appRow: Slider = {
    id,
    store_id: storeId,
    slug,
    tab_label: String(row.tab_label || ""),
    title: input.title.trim(),
    subtitle: input.subtitle?.trim() || null,
    button_text: input.button_text?.trim() || null,
    button_link: input.button_link?.trim() || null,
    image_url: input.image_url.trim(),
    image_path: input.image_path || null,
    alt_text: input.alt_text || input.title.trim(),
    sort_order: input.sort_order ?? 0,
    is_active: input.is_active !== false,
  };
  const { slides } = await listSliders(client);
  await writeSettingsSliders(client, [...slides, appRow]);
  return appRow;
}

export async function updateSlider(
  client: SupabaseClient,
  id: string,
  patch: Partial<SliderInput>
): Promise<Slider> {
  const cleaned = toDbRow(patch);

  if (await slidersTableReady(client)) {
    const { data, error } = await tenant(client, "sliders")
      .update(cleaned)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return normalize([data as Record<string, unknown>])[0];
  }

  const { slides } = await listSliders(client);
  const next = slides.map((s) => {
    if (s.id !== id) return s;
    return {
      ...s,
      title: patch.title ?? s.title,
      subtitle: patch.subtitle !== undefined ? patch.subtitle : s.subtitle,
      button_text: patch.button_text !== undefined ? patch.button_text : s.button_text,
      button_link: patch.button_link !== undefined ? patch.button_link : s.button_link,
      image_url: patch.image_url ?? s.image_url,
      image_path: patch.image_path !== undefined ? patch.image_path : s.image_path,
      sort_order: patch.sort_order ?? s.sort_order,
      is_active: patch.is_active ?? s.is_active,
      updated_at: new Date().toISOString(),
    };
  });
  await writeSettingsSliders(client, next);
  const found = next.find((s) => s.id === id);
  if (!found) throw new Error("Slider not found");
  return found;
}

export async function deleteSlider(client: SupabaseClient, id: string): Promise<Slider | null> {
  if (await slidersTableReady(client)) {
    const { data: existing } = await tenant(client, "sliders").select("*").eq("id", id).maybeSingle();
    const { error } = await tenant(client, "sliders").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return existing ? normalize([existing])[0] : null;
  }

  const { slides } = await listSliders(client);
  const removed = slides.find((s) => s.id === id) || null;
  await writeSettingsSliders(
    client,
    slides.filter((s) => s.id !== id)
  );
  return removed;
}

export async function ensureDefaultSlidersSeeded(client: SupabaseClient) {
  const { slides, source } = await listSliders(client);
  if (source !== "fallback") return slides;

  if (await slidersTableReady(client)) {
    for (const s of DEFAULT_SLIDERS) {
      await tenant(client, "sliders").insert(
        toDbRow({
          title: s.title,
          subtitle: s.subtitle,
          button_text: s.button_text,
          button_link: s.button_link,
          image_url: s.image_url,
          image_path: null,
          alt_text: s.alt_text,
          slug: s.slug,
          tab_label: s.tab_label,
          sort_order: s.sort_order,
          is_active: true,
        })
      );
    }
  } else {
    await writeSettingsSliders(client, withStore(DEFAULT_SLIDERS));
  }
  return (await listSliders(client)).slides;
}
