"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useApp } from "@/components/providers/AppProviders";
import { formatMoney } from "@/lib/utils";

export default function CheckoutPage() {
  const { cart, currency, clearCart, country } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const total = cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!cart.length) return;
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currency,
          country,
          customer_name: fd.get("customer_name"),
          customer_email: fd.get("customer_email"),
          shipping_address: {
            address1: fd.get("address1"),
            address2: fd.get("address2"),
            city: fd.get("city"),
            region: fd.get("region"),
            zip: fd.get("zip"),
            country: fd.get("country") || country,
            phone: fd.get("phone"),
          },
          items: cart,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout failed");
      clearCart();
      if (data.url) window.location.href = data.url;
      else window.location.href = `/order/success?order=${data.orderNumber || ""}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setLoading(false);
    }
  }

  if (!cart.length) {
    return (
      <main className="section-pad mx-auto max-w-xl px-4 text-center">
        <h1 className="font-serif text-3xl text-teal">Nothing to checkout</h1>
        <Button href="/shop" className="mt-6">
          Shop designs →
        </Button>
      </main>
    );
  }

  return (
    <main className="section-pad mx-auto max-w-2xl px-4 md:px-6">
      <h1 className="font-serif text-4xl font-bold text-teal">Checkout</h1>
      <p className="mt-2 text-teal/70">Total {formatMoney(total, currency)}</p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4 rounded-3xl bg-white p-6 shadow-soft">
        {[
          ["customer_name", "Full name"],
          ["customer_email", "Email"],
          ["address1", "Address"],
          ["address2", "Apartment (optional)"],
          ["city", "City"],
          ["region", "State / Region"],
          ["zip", "ZIP / Postcode"],
          ["phone", "Phone"],
        ].map(([name, label]) => (
          <label key={name} className="block text-sm font-semibold text-teal">
            {label}
            <input
              name={name}
              required={name !== "address2"}
              type={name === "customer_email" ? "email" : "text"}
              className="mt-1 min-h-11 w-full rounded-full border border-teal/15 px-4 font-normal"
            />
          </label>
        ))}
        <input type="hidden" name="country" value={country} />
        {error && <p className="text-sm text-coral">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Processing…" : "Pay securely →"}
        </Button>
      </form>
    </main>
  );
}
