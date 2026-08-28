"use client";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Card";
import { ROLE_LABELS, ASSIGNABLE_ROLES } from "@/lib/permissions";
import type { MemberRole } from "@/lib/types/database";
import { Crown, Plus, Trash2, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { removeMember, updateMemberRole, type TeamMember } from "./actions";
import { InviteMemberSheet } from "./InviteMemberSheet";

export function TeamClient({
  members,
  currentUserId,
}: {
  members: TeamMember[];
  currentUserId: string | null;
}) {
  const router = useRouter();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRoleChange(member: TeamMember, role: MemberRole) {
    setError(null);
    setPendingId(member.memberId);
    const result = await updateMemberRole(member.memberId, role);
    setPendingId(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function handleRemove(member: TeamMember) {
    if (!confirm(`Keluarkan ${member.email ?? "anggota ini"} dari tim?`)) return;
    setError(null);
    setPendingId(member.memberId);
    const result = await removeMember(member.memberId);
    setPendingId(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <Button onClick={() => setInviteOpen(true)} className="w-full">
        <Plus className="h-4 w-4" />
        Tambah Anggota Tim
      </Button>

      {error && (
        <p className="rounded-xl bg-danger-soft px-4 py-2.5 text-sm text-danger">
          {error}
        </p>
      )}

      {members.length === 0 ? (
        <EmptyState
          title="Belum ada anggota tim"
          description="Tambahkan kasir, admin, atau anggota lain dan atur peran mereka di sini."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {members.map((member) => {
            const isOwner = member.role === "owner";
            const isSelf = member.userId === currentUserId;
            const isPending = pendingId === member.memberId;
            return (
              <div
                key={member.memberId}
                className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3.5"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                  {isOwner ? (
                    <Crown className="h-5 w-5" />
                  ) : (
                    <UserRound className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-ink">
                    {member.email ?? "Email tidak diketahui"}
                    {isSelf && <span className="text-ink-faint"> (Anda)</span>}
                  </p>
                  {isOwner ? (
                    <p className="text-xs text-ink-soft">
                      {ROLE_LABELS[member.role]}
                    </p>
                  ) : (
                    <select
                      value={member.role}
                      disabled={isPending}
                      onChange={(e) =>
                        handleRoleChange(member, e.target.value as MemberRole)
                      }
                      className="mt-0.5 h-8 rounded-lg border border-border bg-surface px-2 text-xs font-medium text-ink outline-none disabled:opacity-60"
                    >
                      {member.role === "staff" && (
                        <option value="staff">Staf (lama)</option>
                      )}
                      {ASSIGNABLE_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                {!isOwner && (
                  <button
                    onClick={() => handleRemove(member)}
                    disabled={isPending}
                    aria-label="Keluarkan dari tim"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-danger active:bg-danger-soft disabled:opacity-60"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <InviteMemberSheet
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvited={() => router.refresh()}
      />
    </div>
  );
}
