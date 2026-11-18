"use client";

import Image from "next/image";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { getProductsByCategory, priceFor } from "@/lib/catalog";
import { formatMoney } from "@/lib/utils";
import { useApp } from "@/components/providers/AppProviders";
import { Suspense } from "react";

function ShopInner() {
  const params = useSearchParams();
  const category = params.get("category") || "all";
  const { currency } = useApp();
  const products = useMemo(() => getProductsByCategory(category), [category]);

  return (
    <main className="section-pad mx-auto max-w-7xl px-4 md:px-6">
      <h1 className="font-serif text-4xl font-bold text-teal">Shop designs</h1>
      <p className="mt-2 text-teal/70">Find your favorite personalized photo slate.</p>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <article key={p.id} className="overflow-hidden rounded-3xl bg-white shadow-soft transition hover:-translate-y-1">
            <div className="aspect-square bg-cream">
              <Image src={p.image} alt={p.name} width={500} height={500} className="h-full w-full object-contain" />
            </div>
            <div className="p-5">
              <h2 className="font-serif text-xl font-bold text-teal">{p.name}</h2>
              <p className="text-sm text-teal/60">{p.subtitle}</p>
              <p className="mt-2 font-semibold text-teal">{formatMoney(priceFor(p, currency), currency)}</p>
              <Button href={`/personalize/${p.slug}`} className="mt-4">
                Personalize →
              </Button>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-teal">Loading shop…</div>}>
      <ShopInner />
    </Suspense>
  );
}
