"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { Slider } from "@/lib/sliders";
import { cn } from "@/lib/utils";

export function HeroSlider({ slides }: { slides: Slider[] }) {
  const items = slides.filter((s) => s.is_active && s.image_url);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [items.length]);

  if (!items.length) {
    return (
      <section className="section-pad bg-cream">
        <div className="mx-auto max-w-7xl px-4 text-center md:px-6">
          <p className="font-serif text-3xl text-teal">MemoNuvia</p>
          <Button href="/shop" className="mt-6">
            Shop now →
          </Button>
        </div>
      </section>
    );
  }

  const slide = items[Math.min(index, items.length - 1)];

  return (
    <section className="section-pad relative overflow-hidden bg-cream">
      <div className="wave-orb left-[-10%] top-[-20%]" />
      <div className="wave-orb bottom-[-20%] right-[-8%] opacity-60" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 md:grid-cols-2 md:px-6">
        <div className="text-center md:text-left">
          <p className="font-serif text-lg text-teal/70">MemoNuvia.com</p>
          <h1
            key={`title-${slide.id}`}
            className="hero-fade mt-2 font-serif text-4xl font-bold leading-tight text-teal md:text-5xl lg:text-6xl"
          >
            {slide.title}
          </h1>
          {slide.subtitle && (
            <p
              key={`sub-${slide.id}`}
              className="hero-fade mx-auto mt-4 max-w-md text-base text-teal/70 md:mx-0 md:text-lg"
            >
              {slide.subtitle}
            </p>
          )}
          {(slide.button_link || slide.button_text) && (
            <div className="mt-8 flex justify-center md:justify-start">
              <Button href={slide.button_link || "/shop"}>
                {slide.button_text || "Shop now →"}
              </Button>
            </div>
          )}
          {items.length > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2 md:justify-start">
              {items.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  aria-label={`Slide ${i + 1}`}
                  onClick={() => setIndex(i)}
                  className={cn(
                    "h-2.5 rounded-full transition-all",
                    i === index ? "w-8 bg-coral" : "w-2.5 bg-teal/20 hover:bg-teal/40"
                  )}
                />
              ))}
            </div>
          )}
        </div>
        <div className="relative">
          <Image
            key={slide.id}
            src={slide.image_url}
            alt={slide.title}
            width={900}
            height={700}
            className="h-auto w-full rounded-3xl object-contain transition duration-500"
            priority={index === 0}
            unoptimized={slide.image_url.startsWith("http")}
          />
        </div>
      </div>
    </section>
  );
}
