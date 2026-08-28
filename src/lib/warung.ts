import { createClient } from "@/lib/supabase/server";
import type { MemberRole, Warung } from "@/lib/types/database";

/**
 * Returns the current user + their active warung (business) + their role
 * in it. A user may belong to multiple warungs in the future; for the MVP
 * we use the first membership found (typically the one they own).
 */
export async function getCurrentUserAndWarung(): Promise<{
  userId: string | null;
  warung: Warung | null;
  role: MemberRole | null;
  memberId: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { userId: null, warung: null, role: null, memberId: null };
  }

  const { data: membership } = await supabase
    .from("warung_members")
    .select("id, role, warung_id, warungs(*)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const warung = (membership?.warungs as unknown as Warung) ?? null;
  const role = (membership?.role as MemberRole | undefined) ?? null;
  const memberId = membership?.id ?? null;

  return { userId: user.id, warung, role, memberId };
}
