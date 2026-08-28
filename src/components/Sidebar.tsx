"use client";

import { cn } from "@/lib/utils";
import { canAccess, type PermissionKey } from "@/lib/permissions";
import type { MemberRole, Warung } from "@/lib/types/database";
import {
  LayoutGrid,
  LogOut,
  Menu as MenuIcon,
  Receipt,
  Settings,
  ShoppingBag,
  Store,
  UtensilsCrossed,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/(app)/lainnya/actions";

// `key: null` means the item is always visible (no permission gate) —
// currently only "Pengaturan", since it's where profile + logout live.
const items: {
  href: string;
  label: string;
  icon: typeof LayoutGrid;
  key: PermissionKey | null;
}[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid, key: "dashboard" },
  { href: "/transaksi", label: "Transaksi", icon: Receipt, key: "transaksi" },
  { href: "/menu", label: "Menu", icon: UtensilsCrossed, key: "menu" },
  { href: "/pelanggan", label: "Pelanggan", icon: Users, key: "pelanggan" },
  { href: "/belanja", label: "Belanja", icon: ShoppingBag, key: "belanja" },
  { href: "/laporan", label: "Laporan", icon: MenuIcon, key: "laporan" },
  { href: "/lainnya", label: "Pengaturan", icon: Settings, key: null },
];

export function Sidebar({
  warung,
  role,
}: {
  warung: Warung;
  role: MemberRole | null;
}) {
  const pathname = usePathname();
  const visibleItems = items.filter((item) => !item.key || canAccess(role, item.key));

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-surface md:flex">
      <div className="flex items-center gap-3 px-5 py-6">
        {warung.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={warung.logo_url}
            alt={warung.name}
            className="h-10 w-10 rounded-xl object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
            <Store className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate font-bold text-ink">{warung.name}</p>
          <p className="truncate text-xs text-ink-soft">Warteg Manager</p>
        </div>
      </div>

      <nav className="flex-1 px-3">
        <ul className="flex flex-col gap-1">
          {visibleItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary-soft text-primary"
                      : "text-ink-soft hover:bg-black/5"
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="px-3 pb-5">
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-danger hover:bg-danger-soft"
          >
            <LogOut className="h-[18px] w-[18px]" />
            Keluar
          </button>
        </form>
      </div>
    </aside>
  );
}
