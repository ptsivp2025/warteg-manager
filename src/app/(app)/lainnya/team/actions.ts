"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireWarungAccess } from "@/lib/action-guard";
import { ASSIGNABLE_ROLES } from "@/lib/permissions";
import type { MemberRole } from "@/lib/types/database";
import { revalidatePath } from "next/cache";

export interface TeamMember {
  memberId: string;
  userId: string;
  email: string | null;
  role: MemberRole;
  createdAt: string;
}

export interface TeamActionState {
  error?: string;
  memberId?: string;
}

export type TeamMembersResult =
  | { ok: true; members: TeamMember[] }
  | { ok: false; error: string };

export async function getTeamMembers(): Promise<TeamMembersResult> {
  const access = await requireWarungAccess("team");
  if (!access.ok) return { ok: false, error: access.error };
  const { warung } = access;

  const supabase = await createClient();
  const { data: members, error } = await supabase
    .from("warung_members")
    .select("id, user_id, role, created_at")
    .eq("warung_id", warung.id)
    .order("created_at", { ascending: true });
  if (error) return { ok: false, error: error.message };
  if (!members) return { ok: true, members: [] };

  // Emails live in auth.users, which PostgREST/RLS never exposes to the
  // regular client — fetch them via the admin API instead. One call per
  // member is fine at this scale: a single warteg's team is a handful of
  // people, not thousands, and this only runs on the owner-only Team page.
  const admin = createAdminClient();
  const withEmails = await Promise.all(
    members.map(async (m) => {
      let email: string | null = null;
      try {
        const { data } = await admin.auth.admin.getUserById(m.user_id);
        email = data.user?.email ?? null;
      } catch {
        email = null;
      }
      return {
        memberId: m.id,
        userId: m.user_id,
        email,
        role: m.role as MemberRole,
        createdAt: m.created_at,
      };
    })
  );

  return { ok: true, members: withEmails };
}

export async function inviteMember(input: {
  email: string;
  password: string;
  role: MemberRole;
}): Promise<TeamActionState> {
  const access = await requireWarungAccess("team");
  if (!access.ok) return { error: access.error };
  const { warung } = access;

  const email = input.email.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Format email tidak valid." };
  }
  if (!input.password || input.password.length < 6) {
    return { error: "Kata sandi minimal 6 karakter." };
  }
  if (!ASSIGNABLE_ROLES.includes(input.role)) {
    return { error: "Peran tidak valid." };
  }

  const admin = createAdminClient();

  // Create the teammate's login directly, pre-confirmed — no verification
  // email round-trip. This runs entirely server-side with the service-role
  // key, so it does NOT touch the owner's own browser session (unlike a
  // client-side supabase.auth.signUp(), which would sign the *owner* out
  // and into the brand-new account instead).
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
  });

  if (createError) {
    const alreadyExists = /already been registered|already exists/i.test(
      createError.message
    );
    return {
      error: alreadyExists
        ? "Email ini sudah terdaftar. Gunakan email lain untuk anggota tim ini."
        : createError.message,
    };
  }

  const newUserId = created?.user?.id;
  if (!newUserId) return { error: "Gagal membuat akun." };

  // Insert through the normal RLS-respecting client (not the admin client)
  // so Postgres's own "members_insert" policy — is_warung_owner — is the
  // thing actually deciding this is allowed, not just the check above.
  const supabase = await createClient();
  const { data: memberRow, error: memberError } = await supabase
    .from("warung_members")
    .insert({
      warung_id: warung.id,
      user_id: newUserId,
      role: input.role,
    })
    .select("id")
    .single();

  if (memberError) {
    // Roll back the orphaned auth user so a failed invite doesn't leave a
    // dangling, invisible account behind.
    await admin.auth.admin.deleteUser(newUserId).catch(() => {});
    return { error: memberError.message };
  }

  revalidatePath("/lainnya/team");
  return { memberId: memberRow.id };
}

export async function updateMemberRole(
  memberId: string,
  role: MemberRole
): Promise<TeamActionState> {
  const access = await requireWarungAccess("team");
  if (!access.ok) return { error: access.error };

  if (!ASSIGNABLE_ROLES.includes(role)) {
    return { error: "Peran tidak valid." };
  }

  const supabase = await createClient();
  // RLS ("members_update": is_warung_owner AND role <> 'owner', both
  // before and after) is the real backstop here — it silently no-ops if
  // this ever targeted the owner's own row, rather than erroring.
  const { error } = await supabase
    .from("warung_members")
    .update({ role })
    .eq("id", memberId);
  if (error) return { error: error.message };

  revalidatePath("/lainnya/team");
  return {};
}

export async function removeMember(memberId: string): Promise<TeamActionState> {
  const access = await requireWarungAccess("team");
  if (!access.ok) return { error: access.error };

  const supabase = await createClient();
  // RLS ("members_delete": is_warung_owner AND role <> 'owner') blocks
  // removing the owner's own row even if it were ever attempted here.
  const { error } = await supabase.from("warung_members").delete().eq("id", memberId);
  if (error) return { error: error.message };

  revalidatePath("/lainnya/team");
  return {};
}
