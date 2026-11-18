"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { HeroSlider } from "@/components/home/HeroSlider";
import { collections, faqs, giftOccasions, getProductsByCategory, priceFor } from "@/lib/catalog";
import type { Slider } from "@/lib/sliders";
import { formatMoney } from "@/lib/utils";
import { useApp } from "@/components/providers/AppProviders";

const filters = ["all", "family", "couples", "pets", "kids", "portraits"] as const;

export function HomePage({ slides }: { slides: Slider[] }) {
  const { currency } = useApp();
  const [filter, setFilter] = useState<(typeof filters)[number]>("all");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const catalog = useMemo(() => getProductsByCategory(filter), [filter]);

  return (
    <main>
      <HeroSlider slides={slides} />

      {/* Transformation */}
      <section className="section-pad bg-cream-deep/40">
        <div className="mx-auto max-w-7xl px-4 text-center md:px-6">
          <h2 className="font-serif text-3xl font-bold text-teal md:text-4xl">
            From a photo to a <span className="underline-gold">keepsake.</span>
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              ["01", "Your Photo", "/images/transform-01-photo.jpg"],
              ["02", "Your Design", "/images/transform-02-design.jpg"],
              ["03", "Your Photo Slate", "/images/transform-03-slate.jpg"],
            ].map(([n, title, src]) => (
              <article key={n} className="rounded-3xl bg-white p-4 shadow-soft">
                <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-mint-bright text-sm font-bold text-white">
                  {n}
                </div>
                <h3 className="font-serif text-xl font-semibold text-teal">{title}</h3>
                <div className="mt-4 aspect-square overflow-hidden rounded-2xl bg-cream">
                  <Image src={src} alt={title} width={480} height={480} className="h-full w-full object-contain" />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Collections */}
      <section className="section-pad">
        <div className="mx-auto max-w-7xl px-4 text-center md:px-6">
          <h2 className="font-serif text-3xl font-bold text-teal md:text-4xl">
            Made for the ones you <span className="underline-gold">love.</span>
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {collections.map((c) => (
              <Link
                key={c.id}
                href={c.href}
                className="group overflow-hidden rounded-3xl bg-white shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="aspect-[3/4] overflow-hidden">
                  <Image src={c.image} alt={c.name} width={480} height={640} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                </div>
                <div className="p-4">
                  <h3 className="font-serif text-xl font-semibold text-teal">{c.name}</h3>
                  <span className="mt-3 inline-flex text-sm font-semibold text-coral">Explore →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Catalog */}
      <section className="section-pad bg-cream" id="designs">
        <div className="mx-auto max-w-7xl px-4 text-center md:px-6">
          <h2 className="font-serif text-3xl font-bold text-teal md:text-4xl">
            Find your <span className="underline-gold">favorite</span> design.
          </h2>
          <div className="mt-6 flex gap-2 overflow-x-auto pb-2 md:justify-center">
            {filters.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold capitalize transition ${
                  filter === f ? "bg-mint-bright text-white" : "bg-mint/70 text-teal hover:bg-mint"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {catalog.map((p) => (
              <article key={p.id} className="grid grid-cols-[0.9fr_1.1fr] items-center gap-3 rounded-3xl bg-white p-3 shadow-soft transition hover:-translate-y-1 hover:shadow-xl">
                <div className="aspect-square overflow-hidden rounded-2xl bg-cream">
                  <Image src={p.image} alt={p.name} width={360} height={360} className="h-full w-full object-contain" />
                </div>
                <div className="text-left">
                  <h3 className="font-serif text-lg font-bold text-teal">{p.name}</h3>
                  <p className="text-xs text-teal/60">{p.subtitle}</p>
                  <p className="mt-2 text-sm font-semibold text-teal">{formatMoney(priceFor(p, currency), currency)}</p>
                  <Button href={`/personalize/${p.slug}`} className="mt-3 px-4 py-2 text-xs" variant="primary">
                    Personalize →
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="section-pad" id="how-it-works">
        <div className="mx-auto max-w-7xl px-4 text-center md:px-6">
          <p className="font-serif text-teal/70">MemoNuvia.com</p>
          <h2 className="font-serif text-3xl font-bold text-teal md:text-4xl">
            Your memories, made <span className="underline-gold">personal.</span>
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              ["1", "Choose your design", "/images/how-step-1-design.jpg"],
              ["2", "Upload your photo", "/images/how-step-2-upload.jpg"],
              ["3", "Add your names", "/images/how-step-3-names.jpg"],
              ["4", "Place your order", "/images/how-step-4-order.jpg"],
            ].map(([n, title, src]) => (
              <article key={n} className="relative rounded-3xl border border-lavender/60 bg-white p-5 pt-8 shadow-soft">
                <span className="absolute left-1/2 top-0 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-mint-bright text-sm font-bold text-white">
                  {n}
                </span>
                <h3 className="font-serif text-lg font-semibold text-teal">{title}</h3>
                <div className="mt-4 aspect-square overflow-hidden rounded-2xl bg-cream">
                  <Image src={src} alt={title} width={420} height={420} className="h-full w-full object-contain" />
                </div>
              </article>
            ))}
          </div>
          <div className="mt-8">
            <Button href="/shop">Start Personalizing →</Button>
          </div>
        </div>
      </section>

      {/* Real slate details */}
      <section className="section-pad bg-cream">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 md:grid-cols-2 md:px-6">
          <Image
            src="/images/product-hero-slate.jpg"
            alt="Emily & James natural slate product"
            width={720}
            height={720}
            className="h-auto w-full rounded-3xl object-contain"
          />
          <div>
            <h2 className="font-serif text-3xl font-bold text-teal md:text-4xl">
              Beautiful memories.
              <br />
              <span className="underline-gold">Real natural slate.</span>
            </h2>
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                ["Natural stone edges", "/images/feature-stone-edges.jpg"],
                ["Printed photo design", "/images/feature-printed-design.jpg"],
                ["Separate display stands", "/images/feature-display-stands.jpg"],
              ].map(([label, src]) => (
                <figure key={label} className="overflow-hidden rounded-2xl bg-white shadow-soft">
                  <div className="aspect-square">
                    <Image src={src} alt={label} width={280} height={280} className="h-full w-full object-cover" />
                  </div>
                  <figcaption className="bg-lavender px-2 py-2 text-center text-xs font-semibold text-teal">{label}</figcaption>
                </figure>
              ))}
            </div>
            <p className="mt-5 text-center text-sm text-teal/70 md:text-left">The 3D effect is part of the printed design.</p>
            <div className="mt-6 flex justify-center md:justify-start">
              <Button href="/shop">Shop on MemoNuvia.com →</Button>
            </div>
          </div>
        </div>
      </section>

      {/* Gifts */}
      <section className="section-pad">
        <div className="mx-auto max-w-7xl px-4 text-center md:px-6">
          <h2 className="font-serif text-3xl font-bold text-teal md:text-4xl">
            A personal gift for every <span className="underline-gold">chapter.</span>
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {giftOccasions.map((g, i) => (
              <Link
                key={g.id}
                href={g.href}
                className={`overflow-hidden rounded-3xl transition hover:-translate-y-1 hover:shadow-xl ${
                  ["bg-[#e6f9f2]", "bg-[#fef3c7]", "bg-[#ffece6]", "bg-[#f3e8ff]"][i]
                }`}
              >
                <div className="aspect-[3/4]">
                  <Image src={g.image} alt={g.name} width={480} height={640} className="h-full w-full object-cover" />
                </div>
                <p className="py-4 font-serif text-xl font-bold text-teal">{g.name}</p>
              </Link>
            ))}
          </div>
          <div className="mt-8">
            <Button href="/shop">Shop Gift Occasions →</Button>
          </div>
        </div>
      </section>

      {/* Samples */}
      <section className="section-pad bg-cream-deep/50">
        <div className="mx-auto max-w-7xl px-4 text-center md:px-6">
          <h2 className="font-serif text-3xl font-bold text-teal md:text-4xl">
            Picture it in your <span className="underline-gold">home.</span>
          </h2>
          <p className="mt-2 text-teal/70">Explore our sample designs.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["The Anderson Family", "/images/collection-family.jpg"],
              ["Emily & James", "/images/collection-couples.jpg"],
              ["Luna", "/images/collection-pets.jpg"],
              ["Cooper", "/images/hero-pets-luna-cooper.jpg"],
            ].map(([caption, src]) => (
              <figure key={caption} className="rounded-3xl bg-white p-3 shadow-soft">
                <div className="aspect-square overflow-hidden rounded-2xl bg-cream">
                  <Image src={src} alt={caption} width={400} height={400} className="h-full w-full object-contain" />
                </div>
                <figcaption className="mt-3 font-serif text-teal">{caption}</figcaption>
              </figure>
            ))}
          </div>
          <p className="mt-4 text-sm text-teal/60">Sample designs shown for inspiration.</p>
        </div>
      </section>

      {/* FAQ */}
      <section className="section-pad" id="faq">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 md:grid-cols-2 md:px-6">
          <Image
            src="/images/faq-luna-slate.jpg"
            alt="Luna photo slate lifestyle"
            width={560}
            height={700}
            className="mx-auto h-auto w-full max-w-md rounded-3xl object-contain"
          />
          <div>
            <h2 className="text-center font-serif text-3xl font-bold text-teal md:text-left md:text-4xl">
              A few things you might be <span className="underline-gold">wondering.</span>
            </h2>
            <div className="mt-6 space-y-3">
              {faqs.map((f, i) => {
                const open = openFaq === i;
                return (
                  <details
                    key={f.q}
                    open={open}
                    className={`rounded-full bg-mint/80 transition ${open ? "rounded-3xl shadow-soft" : ""}`}
                    onToggle={(e) => {
                      const el = e.currentTarget;
                      if (el.open) setOpenFaq(i);
                      else if (openFaq === i) setOpenFaq(null);
                    }}
                  >
                    <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 font-semibold text-teal">
                      <span>{f.q}</span>
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-coral text-lg text-white">+</span>
                    </summary>
                    <p className="px-5 pb-4 text-sm text-teal/70">{f.a}</p>
                  </details>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="section-pad relative overflow-hidden bg-gradient-to-br from-mint/50 via-cream to-lavender/40">
        <div className="wave-orb left-[-5%] top-[-30%]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-4 md:grid-cols-2 md:px-6">
          <div className="text-center md:text-left">
            <h2 className="font-serif text-3xl font-bold text-teal md:text-5xl">
              Turn a favorite moment into a{" "}
              <span className="underline-gold">forever keepsake.</span>
            </h2>
            <p className="mt-4 text-teal/70">
              Personalized natural photo slates — custom printed and shipped from the US &amp; UK.
            </p>
            <div className="mt-8 flex justify-center md:justify-start">
              <Button href="/shop">Create Your Slate →</Button>
            </div>
          </div>
          <Image
            src="/images/cta-final-slates.jpg"
            alt="MemoNuvia personalized slate keepsakes"
            width={720}
            height={560}
            className="h-auto w-full rounded-3xl object-contain"
          />
        </div>
      </section>
    </main>
  );
}
