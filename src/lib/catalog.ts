import { getStoreIdClient } from "@/lib/store";

export type Currency = "USD" | "GBP";
export type Category = "family" | "couples" | "pets" | "kids" | "portraits";

export type Product = {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  category: Category;
  image: string;
  priceUsd: number;
  priceGbp: number;
  sampleText: string;
  printifyProductId?: string;
  printifyVariantId?: string;
  variants: { id: string; label: string; shape: string; size: string }[];
};

/** Build-time / client-safe store id (always from NEXT_PUBLIC_STORE_ID). */
export const STORE_ID = getStoreIdClient();

export const products: Product[] = [
  {
    id: "family-crystal",
    slug: "family-crystal",
    name: "Family Crystal",
    subtitle: "Personalized Photo Slate",
    category: "family",
    image: "/images/collection-family.jpg",
    priceUsd: 49,
    priceGbp: 39,
    sampleText: "The Anderson Family",
    variants: [
      { id: "fc-6x6", label: 'Square 6×6"', shape: "square", size: "6x6" },
      { id: "fc-8x8", label: 'Square 8×8"', shape: "square", size: "8x8" },
    ],
  },
  {
    id: "heart-cavern",
    slug: "heart-cavern",
    name: "Heart Cavern",
    subtitle: "Personalized Photo Slate",
    category: "couples",
    image: "/images/collection-couples.jpg",
    priceUsd: 49,
    priceGbp: 39,
    sampleText: "Emily & James",
    variants: [
      { id: "hc-6x6", label: 'Square 6×6"', shape: "square", size: "6x6" },
      { id: "hc-heart", label: "Heart", shape: "heart", size: "6x6" },
    ],
  },
  {
    id: "luna-amethyst",
    slug: "luna-amethyst",
    name: "Luna Amethyst",
    subtitle: "Personalized Photo Slate",
    category: "pets",
    image: "/images/collection-pets.jpg",
    priceUsd: 45,
    priceGbp: 36,
    sampleText: "Luna",
    variants: [{ id: "la-6x6", label: 'Square 6×6"', shape: "square", size: "6x6" }],
  },
  {
    id: "fairytale-dreams",
    slug: "fairytale-dreams",
    name: "Fairytale Dreams",
    subtitle: "Personalized Photo Slate",
    category: "kids",
    image: "/images/collection-kids.jpg",
    priceUsd: 45,
    priceGbp: 36,
    sampleText: "Sophia Bennett",
    variants: [{ id: "fd-6x6", label: 'Square 6×6"', shape: "square", size: "6x6" }],
  },
  {
    id: "space-explorer",
    slug: "space-explorer",
    name: "Space Explorer",
    subtitle: "Personalized Photo Slate",
    category: "kids",
    image: "/images/product-space-explorer.jpg",
    priceUsd: 45,
    priceGbp: 36,
    sampleText: "Oliver Bennett",
    variants: [{ id: "se-6x6", label: 'Square 6×6"', shape: "square", size: "6x6" }],
  },
  {
    id: "sapphire-portrait",
    slug: "sapphire-portrait",
    name: "Sapphire Portrait",
    subtitle: "Personalized Photo Slate",
    category: "portraits",
    image: "/images/product-sapphire-portrait.jpg",
    priceUsd: 49,
    priceGbp: 39,
    sampleText: "James Anderson",
    variants: [{ id: "sp-6x6", label: 'Square 6×6"', shape: "square", size: "6x6" }],
  },
  {
    id: "just-for-you",
    slug: "just-for-you",
    name: "Just For You",
    subtitle: "Personalized Photo Slate",
    category: "couples",
    image: "/images/collection-just-for-you.jpg",
    priceUsd: 49,
    priceGbp: 39,
    sampleText: "For You",
    variants: [{ id: "jfy-6x6", label: 'Square 6×6"', shape: "square", size: "6x6" }],
  },
  {
    id: "portrait-duo",
    slug: "portrait-duo",
    name: "Portrait Duo",
    subtitle: "Personalized Photo Slate",
    category: "portraits",
    image: "/images/hero-portraits-charlotte-james.jpg",
    priceUsd: 52,
    priceGbp: 42,
    sampleText: "Charlotte & James",
    variants: [{ id: "pd-6x6", label: 'Square 6×6"', shape: "square", size: "6x6" }],
  },
];

export const collections = [
  { id: "family", name: "Family", image: "/images/collection-family.jpg", href: "/shop?category=family" },
  { id: "couples", name: "Couples", image: "/images/collection-couples.jpg", href: "/shop?category=couples" },
  { id: "kids", name: "Kids", image: "/images/collection-kids.jpg", href: "/shop?category=kids" },
  { id: "pets", name: "Pets", image: "/images/collection-pets.jpg", href: "/shop?category=pets" },
] as const;

export const giftOccasions = [
  { id: "anniversaries", name: "Anniversaries", image: "/images/gift-anniversaries.jpg", href: "/shop?category=family" },
  { id: "birthdays", name: "Birthdays", image: "/images/gift-birthdays.jpg", href: "/shop?category=couples" },
  { id: "new-homes", name: "New Homes", image: "/images/gift-new-homes.jpg", href: "/shop?category=kids" },
  { id: "just-because", name: "Just Because", image: "/images/gift-just-because.jpg", href: "/shop?category=pets" },
] as const;

export const faqs = [
  {
    q: "Which photos work best?",
    a: "Clear, well-lit photos with good focus work best. Avoid heavy filters and very dark images. High-resolution phone photos are usually perfect.",
  },
  {
    q: "Can I add names or a family name?",
    a: "Yes. Every slate includes a personalization text field — names, a family name, or a short dedication.",
  },
  {
    q: "Which sizes and shapes are available?",
    a: "Most designs offer square 6×6\" and select rectangle or heart options. Available sizes are shown on each product page.",
  },
  {
    q: "Can I see my design before printing?",
    a: "Yes. After you upload your photo and add text, you can review a live preview before checkout.",
  },
  {
    q: "When will my order arrive?",
    a: "Production typically takes 2–5 business days after artwork approval, then shipping follows your selected method.",
  },
  {
    q: "What if my slate arrives damaged?",
    a: "Contact us with photos of the packaging and product. We will arrange a replacement through our fulfillment partner.",
  },
];

export function getProductBySlug(slug: string) {
  return products.find((p) => p.slug === slug) || null;
}

export function getProductsByCategory(category?: string) {
  if (!category || category === "all") return products;
  return products.filter((p) => p.category === category);
}

export function priceFor(product: Product, currency: Currency) {
  return currency === "GBP" ? product.priceGbp : product.priceUsd;
}
