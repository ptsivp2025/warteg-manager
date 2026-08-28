import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

/**
 * Admin (service-role) Supabase client — SERVER-SIDE ONLY.
 *
 * This bypasses Row Level Security entirely, so it must ONLY be imported
 * from "use server" action files (never from a "use client" component).
 * `SUPABASE_SERVICE_ROLE_KEY` deliberately has no `NEXT_PUBLIC_` prefix, so
 * Next.js never inlines it into client bundles — but that's a safety net,
 * not a substitute for keeping this import server-side only.
 *
 * Today this is used for exactly one thing: creating a teammate's auth
 * account (with `email_confirm: true`) when a warung owner invites them
 * from the Team page, so the teammate can log in immediately with the
 * email + password the owner set — no confirmation email round-trip.
 * Every other operation (reading/writing warung_members, etc.) still goes
 * through the normal RLS-respecting client so Postgres policies remain the
 * real access-control boundary.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Add it to your server environment (never NEXT_PUBLIC_*) to enable team invites."
    );
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
