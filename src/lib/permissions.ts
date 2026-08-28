import { redirect } from "next/navigation";
import type { MemberRole } from "@/lib/types/database";

/**
 * Central role -> access matrix for the whole app.
 *
 * This is the SINGLE source of truth for what a role can see and do:
 * - Sidebar / BottomNav filter their menu items through `canAccess`.
 * - The "Lainnya" (settings) screen filters its rows through the same
 *   function.
 * - Every page.tsx calls `requireAccess(role, key)` as a server-side
 *   guard, so hiding a nav item is never the only thing standing between
 *   a role and a page — someone typing the URL directly is redirected
 *   away just the same. Hiding a menu item is a UX nicety, not security;
 *   the real enforcement lives here and in Supabase RLS.
 *
 * IMPORTANT — 'staff' is the legacy pre-RBAC role (see migration
 * 0006_outlets_and_rbac.sql). Before this change, every member — no
 * matter their `role` value — had full access to the entire app; the
 * migration deliberately left existing rows as 'staff' rather than
 * guessing them into a specific new role. To avoid silently locking out
 * real, already-invited staff the day this ships, 'staff' keeps full
 * access here (same as 'owner', minus team management). New invites
 * should always be given one of the specific roles below — never
 * 'staff' — see ASSIGNABLE_ROLES.
 */

export type PermissionKey =
  | "dashboard"
  | "transaksi"
  | "menu"
  | "pelanggan"
  | "belanja"
  | "bahan-baku"
  | "laporan"
  | "appearance"
  | "editWarung"
  | "team";

const ALL_PAGES: PermissionKey[] = [
  "dashboard",
  "transaksi",
  "menu",
  "pelanggan",
  "belanja",
  "bahan-baku",
  "laporan",
];

// Adjust freely — this table is the only place role behavior is defined.
const ROLE_PERMISSIONS: Record<MemberRole, PermissionKey[]> = {
  owner: [...ALL_PAGES, "appearance", "editWarung", "team"],
  staff: [...ALL_PAGES, "appearance", "editWarung"], // legacy full-access, see note above
  admin: [...ALL_PAGES, "appearance", "editWarung"],
  manager: [...ALL_PAGES, "appearance", "editWarung"],
  supervisor: [...ALL_PAGES],
  cashier: ["transaksi"],
  kitchen: ["transaksi", "menu"],
  inventory: ["bahan-baku", "menu", "belanja"],
  finance: ["dashboard", "laporan", "belanja"],
};

export function canAccess(
  role: MemberRole | null,
  key: PermissionKey
): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(key) ?? false;
}

// Priority order used to pick a safe landing page for a role — e.g. where
// to send a cashier who tries to open /dashboard directly.
const ROUTE_PRIORITY: { key: PermissionKey; href: string }[] = [
  { key: "dashboard", href: "/dashboard" },
  { key: "transaksi", href: "/transaksi" },
  { key: "menu", href: "/menu" },
  { key: "pelanggan", href: "/pelanggan" },
  { key: "belanja", href: "/belanja" },
  { key: "bahan-baku", href: "/bahan-baku" },
  { key: "laporan", href: "/laporan" },
];

export function defaultRouteForRole(role: MemberRole | null): string {
  for (const r of ROUTE_PRIORITY) {
    if (canAccess(role, r.key)) return r.href;
  }
  // Every authenticated member can reach Lainnya — it hosts their own
  // profile view and logout, and is never itself permission-gated.
  return "/lainnya";
}

/**
 * Server-component guard. Call at the top of a page.tsx, right after the
 * `if (!warung) return null;` check:
 *
 *   const { warung, role } = await getCurrentUserAndWarung();
 *   if (!warung) return null;
 *   requireAccess(role, "menu");
 */
export function requireAccess(role: MemberRole | null, key: PermissionKey) {
  if (!canAccess(role, key)) {
    redirect(defaultRouteForRole(role));
  }
}

export const ROLE_LABELS: Record<MemberRole, string> = {
  owner: "Pemilik",
  staff: "Staf",
  admin: "Admin",
  manager: "Manajer",
  supervisor: "Supervisor",
  cashier: "Kasir",
  kitchen: "Dapur",
  inventory: "Gudang/Stok",
  finance: "Keuangan",
};

/**
 * Roles an owner can pick when inviting a new team member. 'owner' isn't
 * here because ownership isn't transferable via invite, and 'staff' isn't
 * here because it's a legacy value only — new members should always get
 * a specific role.
 */
export const ASSIGNABLE_ROLES: MemberRole[] = [
  "admin",
  "manager",
  "supervisor",
  "cashier",
  "kitchen",
  "inventory",
  "finance",
];
