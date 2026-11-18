"use client";

import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { useApp } from "@/components/providers/AppProviders";
import { formatMoney } from "@/lib/utils";

export default function CartPage() {
  const { cart, removeFromCart, currency } = useApp();
  const total = cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  return (
    <main className="section-pad mx-auto max-w-4xl px-4 md:px-6">
      <h1 className="font-serif text-4xl font-bold text-teal">Your cart</h1>
      {!cart.length ? (
        <div className="mt-8 rounded-3xl bg-white p-8 text-center shadow-soft">
          <p className="text-teal/70">Your cart is empty.</p>
          <Button href="/shop" className="mt-6">
            Browse designs →
          </Button>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {cart.map((item) => (
            <article key={item.id} className="flex gap-4 rounded-3xl bg-white p-4 shadow-soft">
              <div className="relative h-24 w-24 overflow-hidden rounded-2xl bg-cream">
                <Image src={item.image} alt={item.productName} fill className="object-contain p-1" />
              </div>
              <div className="flex-1">
                <h2 className="font-serif text-xl font-semibold text-teal">{item.productName}</h2>
                <p className="text-sm text-teal/70">{item.variantLabel}</p>
                <p className="text-sm text-teal/70">Text: {item.customText}</p>
                <p className="mt-1 font-semibold">{formatMoney(item.unitPrice * item.quantity, currency)}</p>
              </div>
              <button type="button" className="text-sm text-coral" onClick={() => removeFromCart(item.id)}>
                Remove
              </button>
            </article>
          ))}
          <div className="flex items-center justify-between rounded-3xl bg-white p-5 shadow-soft">
            <strong className="text-lg text-teal">Total {formatMoney(total, currency)}</strong>
            <Button href="/checkout">Checkout →</Button>
          </div>
        </div>
      )}
    </main>
  );
}
