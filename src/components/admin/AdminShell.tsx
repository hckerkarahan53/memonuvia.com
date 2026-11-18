"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Images,
  Package,
  ShoppingBag,
  Settings,
  Menu,
  X,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/sliders", label: "Slider Yönetimi", icon: Images },
  { href: "/admin/products", label: "Ürünler", icon: Package },
  { href: "/admin/orders", label: "Siparişler", icon: ShoppingBag },
  { href: "/admin/settings", label: "Ayarlar", icon: Settings },
];

export function AdminShell({
  storeId,
  email,
  children,
}: {
  storeId: string;
  email?: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname() || "";
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-cream-deep text-teal">
      <div className="flex min-h-screen">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 w-72 border-r border-teal/10 bg-white p-5 shadow-soft transition-transform md:static md:translate-x-0",
            open ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="mb-8 flex items-start justify-between gap-3">
            <div>
              <p className="font-serif text-2xl font-bold text-teal">
                Memo<span className="text-coral">Nuvia</span>
              </p>
              <p className="mt-1 text-xs text-teal/60">Admin Panel · {storeId}</p>
              {email && <p className="mt-1 truncate text-xs text-teal/50">{email}</p>}
            </div>
            <button
              type="button"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-teal/10 md:hidden"
              onClick={() => setOpen(false)}
              aria-label="Menüyü kapat"
            >
              <X size={18} />
            </button>
          </div>

          <nav className="space-y-1">
            {nav.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm font-semibold transition",
                    active ? "bg-mint text-teal" : "text-teal/70 hover:bg-cream hover:text-teal"
                  )}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 space-y-2 border-t border-teal/10 pt-6">
            <Link
              href="/"
              className="flex min-h-11 items-center gap-2 rounded-2xl px-3 text-sm font-semibold text-coral hover:bg-cream"
            >
              <ExternalLink size={16} />
              Mağazayı gör
            </Link>
            <Link
              href="/account"
              className="flex min-h-11 items-center gap-2 rounded-2xl px-3 text-sm text-teal/60 hover:bg-cream"
            >
              Hesabım
            </Link>
          </div>
        </aside>

        {open && (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-teal/30 md:hidden"
            aria-label="Menüyü kapat"
            onClick={() => setOpen(false)}
          />
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-teal/10 bg-white/95 px-4 py-3 backdrop-blur md:px-6">
            <button
              type="button"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-teal/10 md:hidden"
              onClick={() => setOpen(true)}
              aria-label="Menüyü aç"
            >
              <Menu size={18} />
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-teal">Yönetim paneli</p>
              <p className="truncate text-xs text-teal/55">Sipariş, ürün ve ana sayfa slider yönetimi</p>
            </div>
          </header>
          <div className="flex-1 px-4 py-6 md:px-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
