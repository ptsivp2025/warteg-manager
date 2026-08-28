import { getCurrentUserAndWarung } from "@/lib/warung";
import { canAccess, type PermissionKey } from "@/lib/permissions";
import type { MemberRole, Warung } from "@/lib/types/database";

export type WarungAccessResult =
  | { ok: true; warung: Warung; role: MemberRole | null }
  | { ok: false; error: string };

/**
 * Server-action guard companion to `requireAccess` (which redirects, and
 * is meant for page.tsx). Actions can't redirect a fetch() call the way a
 * page navigation can, so this returns an `{ ok, error }` shape instead —
 * check `access.ok` and return `{ error: access.error }` as the very
 * first thing in the action, before any mutation happens.
 *
 * Why this exists in addition to the page guard: hiding a nav item and
 * redirecting away from a page stops normal navigation, but a "use server"
 * action is still just an RPC endpoint — someone with devtools access (or
 * a stale tab from before their role was downgraded) could still invoke it
 * directly. Supabase RLS is the last line of defense against
 * cross-tenant access, but RLS here is membership-based, not role-based
 * (any warung member can read/write these tables) — so role enforcement
 * has to happen in the action itself.
 */
export async function requireWarungAccess(
  key: PermissionKey
): Promise<WarungAccessResult> {
  const { warung, role } = await getCurrentUserAndWarung();
  if (!warung) return { ok: false, error: "Warung tidak ditemukan." };
  if (!canAccess(role, key)) {
    return { ok: false, error: "Anda tidak punya akses untuk melakukan aksi ini." };
  }
  return { ok: true, warung, role };
}

/**
 * Same as `requireWarungAccess`, but passes as soon as the member has ANY
 * one of the given permissions. Use this for actions genuinely shared
 * across two pages with different gates — e.g. marking a transaction paid
 * is reachable both from /transaksi ("transaksi") and from a customer's
 * detail page under /pelanggan ("pelanggan").
 */
export async function requireAnyWarungAccess(
  keys: PermissionKey[]
): Promise<WarungAccessResult> {
  const { warung, role } = await getCurrentUserAndWarung();
  if (!warung) return { ok: false, error: "Warung tidak ditemukan." };
  if (!keys.some((key) => canAccess(role, key))) {
    return { ok: false, error: "Anda tidak punya akses untuk melakukan aksi ini." };
  }
  return { ok: true, warung, role };
}
