"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, ShoppingBag, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useApp } from "@/components/providers/AppProviders";
import { AccountMenu } from "@/components/layout/AccountMenu";
import { cn } from "@/lib/utils";

const links = [
  { href: "/shop", label: "Shop" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/track", label: "Track Your Order" },
];

export function SiteHeader() {
  const { cartCount, country, setLocale } = useApp();
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="bg-mint-bright px-4 py-2 text-center text-sm font-medium text-white">
        Custom Printed &amp; Shipped from the US &amp; UK • Handcrafted Natural Slate
      </div>
      <header className="sticky top-0 z-50 border-b border-teal/10 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-teal/10 md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>

          <Link href="/" className="font-serif text-2xl font-bold tracking-tight text-teal md:text-3xl">
            Memo<span className="text-coral">Nuvia</span>
            <span className="text-base font-sans font-medium text-teal/70">.com</span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="text-sm font-medium text-teal/80 transition hover:text-teal">
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <select
              className="hidden min-h-11 rounded-full border border-teal/10 bg-white px-3 text-sm text-teal sm:block"
              value={country}
              onChange={(e) => setLocale(e.target.value as "US" | "GB")}
              aria-label="Country and currency"
            >
              <option value="US">US / USD</option>
              <option value="GB">UK / GBP</option>
            </select>
            <AccountMenu />
            <Link href="/cart" className="relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-full hover:bg-cream-deep" aria-label="Cart">
              <ShoppingBag size={18} className="text-teal" />
              {cartCount > 0 && (
                <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-coral px-1 text-[10px] font-bold text-white">
                  {cartCount}
                </span>
              )}
            </Link>
            <Button href="/shop" className="hidden md:inline-flex" variant="primary">
              Create Your Slate →
            </Button>
          </div>
        </div>

        <div className={cn("border-t border-teal/10 bg-white px-4 py-3 md:hidden", open ? "block" : "hidden")}>
          <div className="flex flex-col gap-2">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="min-h-11 rounded-xl px-3 py-3 text-teal" onClick={() => setOpen(false)}>
                {l.label}
              </Link>
            ))}
            <select
              className="min-h-11 rounded-full border border-teal/10 bg-white px-3 text-sm text-teal"
              value={country}
              onChange={(e) => setLocale(e.target.value as "US" | "GB")}
            >
              <option value="US">US / USD</option>
              <option value="GB">UK / GBP</option>
            </select>
          </div>
        </div>
      </header>
    </>
  );
}
