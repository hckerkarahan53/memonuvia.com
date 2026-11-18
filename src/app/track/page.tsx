"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export default function TrackPage() {
  const [order, setOrder] = useState("");
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);
    const res = await fetch(`/api/track?order=${encodeURIComponent(order)}&email=${encodeURIComponent(email)}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Order not found");
      return;
    }
    setResult(data.order);
  }

  return (
    <main className="section-pad mx-auto max-w-xl px-4">
      <h1 className="font-serif text-4xl font-bold text-teal">Track your order</h1>
      <form onSubmit={onSubmit} className="mt-8 space-y-4 rounded-3xl bg-white p-6 shadow-soft">
        <input
          className="min-h-11 w-full rounded-full border border-teal/15 px-4"
          placeholder="Order number (MN-…)"
          value={order}
          onChange={(e) => setOrder(e.target.value)}
          required
        />
        <input
          className="min-h-11 w-full rounded-full border border-teal/15 px-4"
          type="email"
          placeholder="Email used at checkout"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Button type="submit" className="w-full">
          Track order →
        </Button>
        {error && <p className="text-sm text-coral">{error}</p>}
        {result && (
          <div className="rounded-2xl bg-cream p-4 text-sm text-teal">
            <p>
              <strong>{String(result.order_number)}</strong>
            </p>
            <p>Payment: {String(result.payment_status)}</p>
            <p>Design: {String(result.design_status)}</p>
            <p>Fulfillment: {String(result.printify_status)}</p>
            {result.tracking_number ? <p>Tracking: {String(result.tracking_number)}</p> : null}
          </div>
        )}
      </form>
    </main>
  );
}
