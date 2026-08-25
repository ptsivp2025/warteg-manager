"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndWarung } from "@/lib/warung";
import type { InvitableRole } from "@/lib/types/database";
import { revalidatePath } from "next/cache";

export interface ActionState {
  error?: string;
  inviteToken?: string;
}

function translateError(message: string): string {
  switch (message) {
    case "not_authorized":
      return "Hanya pemilik warteg yang bisa mengelola anggota.";
    case "invalid_email":
      return "Format email tidak valid.";
    case "invalid_role":
      return "Peran tidak valid.";
    case "already_member":
      return "Email ini sudah jadi anggota warteg.";
    case "invite_not_found":
      return "Undangan tidak ditemukan.";
    case "invite_not_pending":
      return "Undangan ini sudah dipakai atau dibatalkan.";
    case "invite_expired":
      return "Undangan ini sudah kedaluwarsa.";
    case "email_mismatch":
      return "Email akun kamu tidak sama dengan email yang diundang.";
    case "not_authenticated":
      return "Silakan masuk terlebih dahulu.";
    default:
      return message;
  }
}

export async function inviteMember(input: {
  email: string;
  role: InvitableRole;
}): Promise<ActionState> {
  const { warung, isOwner } = await getCurrentUserAndWarung();
  if (!warung) return { error: "Warung tidak ditemukan." };
  if (!isOwner) return { error: translateError("not_authorized") };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_warung_invite", {
    _warung_id: warung.id,
    _email: input.email,
    _role: input.role,
  });
  if (error) return { error: translateError(error.message) };

  revalidatePath("/anggota");
  return { inviteToken: data?.token };
}

export async function revokeInvite(inviteId: string): Promise<ActionState> {
  const { warung, isOwner } = await getCurrentUserAndWarung();
  if (!warung) return { error: "Warung tidak ditemukan." };
  if (!isOwner) return { error: translateError("not_authorized") };

  const supabase = await createClient();
  const { error } = await supabase
    .from("warung_invites")
    .update({ status: "revoked" })
    .eq("id", inviteId)
    .eq("warung_id", warung.id);
  if (error) return { error: error.message };

  revalidatePath("/anggota");
  return {};
}

export async function updateMemberRole(
  memberId: string,
  role: InvitableRole
): Promise<ActionState> {
  const { warung, isOwner } = await getCurrentUserAndWarung();
  if (!warung) return { error: "Warung tidak ditemukan." };
  if (!isOwner) return { error: translateError("not_authorized") };

  const supabase = await createClient();
  const { error } = await supabase
    .from("warung_members")
    .update({ role })
    .eq("id", memberId)
    .eq("warung_id", warung.id);
  if (error) return { error: error.message };

  revalidatePath("/anggota");
  return {};
}

export async function removeMember(memberId: string): Promise<ActionState> {
  const { warung, isOwner } = await getCurrentUserAndWarung();
  if (!warung) return { error: "Warung tidak ditemukan." };
  if (!isOwner) return { error: translateError("not_authorized") };

  const supabase = await createClient();
  const { error } = await supabase
    .from("warung_members")
    .delete()
    .eq("id", memberId)
    .eq("warung_id", warung.id);
  if (error) return { error: error.message };

  revalidatePath("/anggota");
  return {};
}
