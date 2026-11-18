"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function SyncPrintifyButton() {
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function sync() {
    setLoading(true);
    setMsg("Syncing Printify catalog for this store…");
    const res = await fetch("/api/admin/printify/sync", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setMsg(data.error || "Sync failed");
      return;
    }
    setMsg(`Synced ${data.synced}/${data.total} products (store ${data.store_id})`);
  }

  return (
    <div className="text-right">
      <Button type="button" variant="ghost" onClick={sync} disabled={loading}>
        Publish Printify Products →
      </Button>
      {msg && <p className="mt-1 text-xs text-teal/60">{msg}</p>}
    </div>
  );
}
