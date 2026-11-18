"use client";

import { cn } from "@/lib/utils";

export function Toast({
  message,
  tone = "info",
}: {
  message: string;
  tone?: "info" | "error" | "success";
}) {
  if (!message) return null;
  return (
    <div
      role="status"
      className={cn(
        "mt-4 rounded-2xl px-4 py-3 text-sm font-medium",
        tone === "error" && "bg-coral/10 text-coral",
        tone === "success" && "bg-mint text-teal",
        tone === "info" && "bg-cream-deep text-teal/80"
      )}
    >
      {message}
    </div>
  );
}
