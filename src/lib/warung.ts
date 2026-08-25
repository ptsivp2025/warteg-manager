import { createClient } from "@/lib/supabase/server";
import type { Warung } from "@/lib/types/database";

/**
 * Returns the current user + their active warung (business).
 * A user may belong to multiple warungs in the future; for the MVP
 * we use the first membership found (typically the one they own).
 */
export async function getCurrentUserAndWarung(): Promise<{
  userId: string | null;
  warung: Warung | null;
  isOwner: boolean;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { userId: null, warung: null, isOwner: false };
  }

  const { data: membership } = await supabase
    .from("warung_members")
    .select("warung_id, warungs(*)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const warung = (membership?.warungs as unknown as Warung) ?? null;

  return { userId: user.id, warung, isOwner: warung?.owner_id === user.id };
}
