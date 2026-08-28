"use client";

import { cn } from "@/lib/utils";
import { canAccess, type PermissionKey } from "@/lib/permissions";
import type { MemberRole } from "@/lib/types/database";
import { LayoutGrid, Menu, Receipt, ShoppingBag, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// `key: null` means the item is always visible — "Lainnya" is where
// profile + logout live, so every role needs it, even a cashier who has
// no other page in the app.
const items: {
  href: string;
  label: string;
  icon: typeof LayoutGrid;
  key: PermissionKey | null;
}[] = [
  { href: "/dashboard", label: "Home", icon: LayoutGrid, key: "dashboard" },
  { href: "/transaksi", label: "Jualan", icon: Receipt, key: "transaksi" },
  { href: "/menu", label: "Menu", icon: UtensilsCrossed, key: "menu" },
  { href: "/laporan", label: "Laporan", icon: ShoppingBag, key: "laporan" },
  { href: "/lainnya", label: "Lainnya", icon: Menu, key: null },
];

export function BottomNav({ role }: { role: MemberRole | null }) {
  const pathname = usePathname();
  const visibleItems = items.filter((item) => !item.key || canAccess(role, item.key));

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "var(--safe-bottom)" }}
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-between px-1">
        {visibleItems.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || pathname.startsWith(href + "/");
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className="flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium"
              >
                <span
                  className={cn(
                    "flex h-8 w-14 items-center justify-center rounded-full transition-colors",
                    active ? "bg-primary-soft text-primary" : "text-ink-faint"
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
                </span>
                <span className={cn(active ? "text-primary" : "text-ink-faint")}>
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
