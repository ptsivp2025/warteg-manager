"use client";

import { cn } from "@/lib/utils";
import type { Warung } from "@/lib/types/database";
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

const items = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/transaksi", label: "Transaksi", icon: Receipt },
  { href: "/menu", label: "Menu", icon: UtensilsCrossed },
  { href: "/pelanggan", label: "Pelanggan", icon: Users },
  { href: "/belanja", label: "Belanja", icon: ShoppingBag },
  { href: "/laporan", label: "Laporan", icon: MenuIcon },
  { href: "/lainnya", label: "Pengaturan", icon: Settings },
];

export function Sidebar({ warung }: { warung: Warung }) {
  const pathname = usePathname();

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
          <p className="text-xs text-ink-soft">Warteg Manager</p>
        </div>
      </div>

      <nav className="flex-1 px-3">
        <ul className="flex flex-col gap-1">
          {items.map(({ href, label, icon: Icon }) => {
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
