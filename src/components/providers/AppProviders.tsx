"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Currency } from "@/lib/catalog";
import { getStoreIdClient } from "@/lib/store";

export type CartItem = {
  id: string;
  productSlug: string;
  productName: string;
  variantId: string;
  variantLabel: string;
  quantity: number;
  unitPrice: number;
  currency: Currency;
  customText: string;
  photoUrl?: string;
  image: string;
};

type AppContextValue = {
  currency: Currency;
  country: "US" | "GB";
  setLocale: (country: "US" | "GB") => void;
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, "id">) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  cartCount: number;
  storeId: string;
};

const AppContext = createContext<AppContextValue | null>(null);

function storageKeys(storeId: string) {
  return {
    cart: `${storeId}_cart_v1`,
    locale: `${storeId}_locale_v1`,
  };
}

export function AppProviders({ children }: { children: ReactNode }) {
  const storeId = getStoreIdClient();
  const keys = storageKeys(storeId);
  const [currency, setCurrency] = useState<Currency>("USD");
  const [country, setCountry] = useState<"US" | "GB">("US");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const locale = localStorage.getItem(keys.locale);
      if (locale === "GB-GBP") {
        setCountry("GB");
        setCurrency("GBP");
      }
      const raw = localStorage.getItem(keys.cart);
      if (raw) setCart(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setReady(true);
  }, [keys.cart, keys.locale]);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(keys.cart, JSON.stringify(cart));
  }, [cart, ready, keys.cart]);

  const value = useMemo<AppContextValue>(
    () => ({
      storeId,
      currency,
      country,
      setLocale: (c) => {
        setCountry(c);
        setCurrency(c === "GB" ? "GBP" : "USD");
        localStorage.setItem(keys.locale, c === "GB" ? "GB-GBP" : "US-USD");
      },
      cart,
      addToCart: (item) => {
        setCart((prev) => [...prev, { ...item, id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` }]);
      },
      removeFromCart: (id) => setCart((prev) => prev.filter((i) => i.id !== id)),
      clearCart: () => setCart([]),
      cartCount: cart.reduce((n, i) => n + i.quantity, 0),
    }),
    [storeId, currency, country, cart, keys.locale]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProviders");
  return ctx;
}
