"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/components/providers/AuthProvider";

export default function AccountPage() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.replace("/auth?next=/account");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <main className="section-pad mx-auto max-w-2xl px-4 text-center text-teal/70">Loading account…</main>
    );
  }

  return (
    <main className="section-pad mx-auto max-w-2xl px-4">
      <div className="rounded-3xl bg-white p-8 shadow-soft">
        <div className="flex items-center gap-4">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <span className="grid h-16 w-16 place-items-center rounded-full bg-mint-bright text-2xl font-bold text-white">
              {(user.fullName || user.email).charAt(0).toUpperCase()}
            </span>
          )}
          <div>
            <h1 className="font-serif text-3xl font-bold text-teal">{user.fullName || "My account"}</h1>
            <p className="mt-1 text-teal/70">{user.email}</p>
          </div>
        </div>
        <p className="mt-4 text-sm text-teal/60">
          Your session stays signed in until you sign out — including after refresh and across devices with the same account.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button href="/track">Track an order →</Button>
          <Button href="/shop" variant="ghost">
            Shop designs
          </Button>
          <button
            type="button"
            onClick={() => signOut()}
            className="min-h-11 rounded-full px-4 py-3 text-sm font-semibold text-coral"
          >
            Sign out
          </button>
          <Link href="/admin" className="min-h-11 rounded-full px-4 py-3 text-sm text-teal/50">
            Admin
          </Link>
        </div>
      </div>
    </main>
  );
}
