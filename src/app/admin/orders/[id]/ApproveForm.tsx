"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function ApproveForm({ orderId }: { orderId: string }) {
  const [url, setUrl] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function onFile(file?: File) {
    if (!file) return;
    setMsg("Uploading print-ready file…");
    const body = new FormData();
    body.append("photo", file);
    body.append("kind", "print-files");
    body.append("order_id", orderId);
    const res = await fetch("/api/upload", { method: "POST", body });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(data.error || "Upload failed");
      return;
    }
    setUrl(data.url || "");
    setMsg(`Stored under ${data.path || "store folder"}`);
  }

  async function approve() {
    setLoading(true);
    setMsg("Submitting…");
    const res = await fetch(`/api/admin/orders/${orderId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ final_print_file_url: url }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setMsg(data.error || "Failed");
      return;
    }
    setMsg("Approved and sent to Printify.");
    window.location.reload();
  }

  return (
    <div className="mt-6 space-y-3">
      <label className="block text-sm font-semibold text-teal">
        Upload print-ready composite (store-partitioned)
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="mt-2 block w-full text-sm font-normal"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </label>
      <label className="block text-sm font-semibold text-teal">
        Or paste final print file URL
        <input
          className="mt-1 min-h-11 w-full rounded-full border border-teal/15 px-4 font-normal"
          placeholder="https://…/print-ready.jpg"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </label>
      <Button type="button" onClick={approve} disabled={loading || !url}>
        Approve &amp; Send to Printify →
      </Button>
      {msg && <p className="text-sm text-teal/70">{msg}</p>}
    </div>
  );
}
