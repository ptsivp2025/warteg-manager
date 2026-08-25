"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function acceptInvite(token: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_warung_invite", {
    _token: token,
  });
  if (error) {
    switch (error.message) {
      case "invite_not_found":
        return { error: "Undangan tidak ditemukan." };
      case "invite_not_pending":
        return { error: "Undangan ini sudah dipakai atau dibatalkan." };
      case "invite_expired":
        return { error: "Undangan ini sudah kedaluwarsa." };
      case "email_mismatch":
        return {
          error: "Email akun kamu tidak sama dengan email yang diundang.",
        };
      case "not_authenticated":
        return { error: "Silakan masuk terlebih dahulu." };
      default:
        return { error: error.message };
    }
  }
  return {};
}

// Sign out of the wrong account, then send them back to /login with a
// `next` pointing at this same invite so they land right back here
// after signing in with the correct (invited) email.
export async function signOutAndRetryInvite(token: string) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(`/login?next=/invite/${token}`);
}
