"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { User } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";

export function AccountMenu() {
  const { user, loading, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  if (loading) {
    return (
      <span className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-cream-deep/60" />
    );
  }

  if (!user) {
    return (
      <Link
        href="/auth"
        className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold text-teal hover:bg-cream-deep"
        aria-label="Sign in"
      >
        <User size={18} />
        <span className="hidden sm:inline">Sign in</span>
      </Link>
    );
  }

  const initial = (user.fullName || user.email || "A").charAt(0).toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="inline-flex min-h-11 items-center gap-2 rounded-full px-2 hover:bg-cream-deep"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
        ) : (
          <span className="grid h-8 w-8 place-items-center rounded-full bg-mint-bright text-sm font-bold text-white">
            {initial}
          </span>
        )}
        <span className="hidden max-w-[9rem] truncate text-sm font-semibold text-teal sm:inline">
          {user.fullName || "Account"}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-teal/10 bg-white py-2 shadow-soft"
        >
          <p className="truncate px-4 py-2 text-xs text-teal/60">{user.email}</p>
          <Link
            href="/account"
            className="block px-4 py-2.5 text-sm font-medium text-teal hover:bg-cream"
            onClick={() => setOpen(false)}
          >
            My account
          </Link>
          <Link
            href="/track"
            className="block px-4 py-2.5 text-sm font-medium text-teal hover:bg-cream"
            onClick={() => setOpen(false)}
          >
            Track order
          </Link>
          <button
            type="button"
            className="block w-full px-4 py-2.5 text-left text-sm font-semibold text-coral hover:bg-cream"
            onClick={() => signOut()}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
