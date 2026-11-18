import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

const base =
  "inline-flex items-center justify-center gap-2 min-h-11 rounded-full px-6 py-3 text-sm font-semibold transition-all duration-300 ease-in-out active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/40";

const variants = {
  primary: "bg-coral text-white shadow-lg shadow-coral/25 hover:bg-coral-hover hover:scale-[1.03]",
  ghost: "border border-teal/15 bg-white/70 text-teal hover:bg-white",
  soft: "bg-mint text-teal hover:bg-mint/80",
};

type Props = {
  variant?: keyof typeof variants;
  href?: string;
  className?: string;
  children: React.ReactNode;
} & Omit<ComponentProps<"button">, "className">;

export function Button({ variant = "primary", href, className, children, ...props }: Props) {
  const classes = cn(base, variants[variant], className);
  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }
  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
