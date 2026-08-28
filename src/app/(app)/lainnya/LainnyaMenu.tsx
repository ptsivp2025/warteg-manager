"use client";

import { canAccess } from "@/lib/permissions";
import type { MemberRole, Warung } from "@/lib/types/database";
import {
  ChevronRight,
  LogOut,
  Package,
  Paintbrush,
  Pencil,
  ShoppingBag,
  Store,
  Users,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { signOut } from "./actions";
import { AppearanceSheet } from "./AppearanceSheet";
import { WarungFormSheet } from "./WarungFormSheet";

export function LainnyaMenu({
  warung,
  email,
  role,
}: {
  warung: Warung;
  email: string | null;
  role: MemberRole | null;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const canEditWarung = canAccess(role, "editWarung");
  const canAppearance = canAccess(role, "appearance");
  const canTeam = canAccess(role, "team");

  const shortcutRows = [
    { href: "/pelanggan", icon: Users, label: "Pelanggan", show: canAccess(role, "pelanggan") },
    { href: "/bahan-baku", icon: Package, label: "Bahan Baku", show: canAccess(role, "bahan-baku") },
    { href: "/belanja", icon: ShoppingBag, label: "Belanja", show: canAccess(role, "belanja") },
  ].filter((row) => row.show);

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft text-primary"
          >
            {warung.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={warung.logo_url}
                alt={warung.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <Store className="h-6 w-6" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold text-ink">{warung.name}</p>
            <p className="truncate text-sm text-ink-soft">{email}</p>
          </div>
          {canEditWarung && (
            <button
              onClick={() => setEditOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/5 text-ink-soft active:bg-black/10"
              aria-label="Ubah profil warteg"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
        </div>

        {shortcutRows.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            {shortcutRows.map((row, i) => (
              <MenuRow
                key={row.href}
                href={row.href}
                icon={row.icon}
                label={row.label}
                last={i === shortcutRows.length - 1}
              />
            ))}
          </div>
        )}

        {canTeam && (
          <Link
            href="/lainnya/team"
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 text-left"
          >
            <UsersRound className="h-5 w-5 text-ink-soft" />
            <span className="flex-1 text-[15px] font-medium text-ink">
              Anggota Tim
            </span>
            <ChevronRight className="h-4 w-4 text-ink-faint" />
          </Link>
        )}

        {canAppearance && (
          <button
            onClick={() => setAppearanceOpen(true)}
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 text-left"
          >
            <Paintbrush className="h-5 w-5 text-ink-soft" />
            <span className="flex-1 text-[15px] font-medium text-ink">
              Tampilan Aplikasi
            </span>
            <span
              className="h-5 w-5 rounded-full border border-black/10"
              style={{ backgroundColor: warung.theme_color }}
            />
            <ChevronRight className="h-4 w-4 text-ink-faint" />
          </button>
        )}

        <form
          action={async () => {
            setLoggingOut(true);
            await signOut();
          }}
        >
          <button
            type="submit"
            disabled={loggingOut}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-danger-soft text-sm font-semibold text-danger active:bg-danger/20 disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" />
            {loggingOut ? "Keluar..." : "Keluar"}
          </button>
        </form>
      </div>

      {canEditWarung && (
        <WarungFormSheet open={editOpen} onClose={() => setEditOpen(false)} warung={warung} />
      )}
      {canAppearance && (
        <AppearanceSheet
          open={appearanceOpen}
          onClose={() => setAppearanceOpen(false)}
          warung={warung}
        />
      )}
    </>
  );
}

function MenuRow({
  href,
  icon: Icon,
  label,
  last,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  last?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-3.5 ${!last ? "border-b border-border" : ""}`}
    >
      <Icon className="h-5 w-5 text-ink-soft" />
      <span className="flex-1 text-[15px] font-medium text-ink">{label}</span>
      <ChevronRight className="h-4 w-4 text-ink-faint" />
    </Link>
  );
}
