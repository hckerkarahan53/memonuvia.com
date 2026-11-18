"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { getProductBySlug, priceFor } from "@/lib/catalog";
import { formatMoney } from "@/lib/utils";
import { useApp } from "@/components/providers/AppProviders";

export default function PersonalizePage() {
  const { slug } = useParams<{ slug: string }>();
  const product = useMemo(() => getProductBySlug(slug), [slug]);
  const { currency, addToCart } = useApp();
  const router = useRouter();
  const [variantId, setVariantId] = useState(product?.variants[0]?.id || "");
  const [customText, setCustomText] = useState(product?.sampleText || "");
  const [photoUrl, setPhotoUrl] = useState<string | undefined>();
  const [preview, setPreview] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  if (!product) {
    return (
      <main className="section-pad mx-auto max-w-3xl px-4 text-center">
        <h1 className="font-serif text-3xl text-teal">Product not found</h1>
        <Button href="/shop" className="mt-6">
          Back to shop →
        </Button>
      </main>
    );
  }

  const variant = product.variants.find((v) => v.id === variantId) || product.variants[0];

  async function onFile(file?: File) {
    if (!file) return;
    setError("");
    if (file.size > 20 * 1024 * 1024) {
      setError("Max file size is 20MB.");
      return;
    }
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const body = new FormData();
      body.append("photo", file);
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setPhotoUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setPhotoUrl(undefined);
    } finally {
      setUploading(false);
    }
  }

  function onAdd() {
    if (!product || !variant) return;
    if (!customText.trim()) {
      setError("Please add personalization text.");
      return;
    }
    addToCart({
      productSlug: product.slug,
      productName: product.name,
      variantId: variant.id,
      variantLabel: variant.label,
      quantity: 1,
      unitPrice: priceFor(product, currency),
      currency,
      customText: customText.trim(),
      photoUrl,
      image: product.image,
    });
    router.push("/cart");
  }

  return (
    <main className="section-pad mx-auto grid max-w-7xl gap-8 px-4 md:grid-cols-2 md:px-6">
      <div className="rounded-3xl bg-white p-6 shadow-soft">
        <div className="relative mx-auto aspect-square max-w-md overflow-hidden rounded-2xl bg-cream">
          <Image src={product.image} alt={product.name} fill className="object-contain p-4" />
          {(preview || photoUrl) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview || photoUrl}
              alt="Your upload preview"
              className="absolute inset-[18%] rounded-lg object-cover"
            />
          )}
          <p className="absolute bottom-6 left-0 right-0 text-center font-serif text-lg text-white drop-shadow">
            {customText || product.sampleText}
          </p>
        </div>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-soft">
        <h1 className="font-serif text-3xl font-bold text-teal">{product.name}</h1>
        <p className="mt-1 text-teal/70">{product.subtitle}</p>
        <p className="mt-3 text-xl font-semibold text-teal">{formatMoney(priceFor(product, currency), currency)}</p>

        <label className="mt-6 block text-sm font-semibold text-teal">Size / shape</label>
        <select
          className="mt-2 min-h-11 w-full rounded-full border border-teal/15 px-4"
          value={variant.id}
          onChange={(e) => setVariantId(e.target.value)}
        >
          {product.variants.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label}
            </option>
          ))}
        </select>

        <label className="mt-5 block text-sm font-semibold text-teal">Your photo</label>
        <label className="mt-2 flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-teal/25 bg-cream px-4 text-center">
          <strong>{uploading ? "Uploading…" : "Click or drop a photo"}</strong>
          <span className="mt-1 text-xs text-teal/60">JPG / PNG / WEBP · up to 20MB · private storage</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </label>

        <label className="mt-5 block text-sm font-semibold text-teal">Names / family title</label>
        <input
          className="mt-2 min-h-11 w-full rounded-full border border-teal/15 px-4"
          value={customText}
          maxLength={60}
          onChange={(e) => setCustomText(e.target.value)}
        />

        {error && <p className="mt-3 text-sm text-coral">{error}</p>}

        <Button className="mt-6 w-full" onClick={onAdd} disabled={uploading}>
          Add to Cart →
        </Button>
      </div>
    </main>
  );
}
