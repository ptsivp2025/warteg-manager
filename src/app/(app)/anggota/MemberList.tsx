"use client";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Card";
import {
  INVITABLE_ROLES,
  MEMBER_ROLE_LABELS,
  type InvitableRole,
  type WarungInvite,
} from "@/lib/types/database";
import { Clock, Plus, Trash2, UserCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { removeMember, revokeInvite, updateMemberRole } from "./actions";
import { InviteSheet } from "./InviteSheet";

interface MemberRow {
  id: string;
  user_id: string;
  email: string;
  role: string;
  created_at: string;
}

export function MemberList({
  members,
  invites,
  currentUserId,
}: {
  members: MemberRow[];
  invites: WarungInvite[];
  currentUserId: string | null;
}) {
  const router = useRouter();
  const [inviting, setInviting] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleRoleChange(member: MemberRow, role: InvitableRole) {
    setPendingId(member.id);
    const result = await updateMemberRole(member.id, role);
    setPendingId(null);
    if (result?.error) {
      alert(result.error);
      return;
    }
    router.refresh();
  }

  async function handleRemove(member: MemberRow) {
    if (
      !confirm(
        `Keluarkan ${member.email} dari warteg? Mereka tidak akan bisa lagi mengakses aplikasi ini.`
      )
    )
      return;
    setPendingId(member.id);
    const result = await removeMember(member.id);
    setPendingId(null);
    if (result?.error) {
      alert(result.error);
      return;
    }
    router.refresh();
  }

  async function handleRevoke(invite: WarungInvite) {
    if (!confirm(`Batalkan undangan untuk ${invite.email}?`)) return;
    setPendingId(invite.id);
    const result = await revokeInvite(invite.id);
    setPendingId(null);
    if (result?.error) {
      alert(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <>
      <Button onClick={() => setInviting(true)} className="mb-4 w-full">
        <Plus className="h-4 w-4" /> Undang Anggota Baru
      </Button>

      <div className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-ink-faint">
        Anggota ({members.length})
      </div>
      <div className="mb-6 overflow-hidden rounded-2xl border border-border bg-surface">
        {members.map((member, idx) => {
          const isOwnerRow = member.role === "owner";
          const isSelf = member.user_id === currentUserId;
          return (
            <div
              key={member.id}
              className={`flex items-center gap-3 px-4 py-3.5 ${
                idx !== members.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <UserCircle2 className="h-8 w-8 shrink-0 text-ink-faint" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium text-ink">
                  {member.email}
                  {isSelf && (
                    <span className="ml-1.5 text-xs font-normal text-ink-faint">
                      (kamu)
                    </span>
                  )}
                </p>
                {isOwnerRow ? (
                  <p className="text-sm text-ink-soft">Pemilik</p>
                ) : (
                  <select
                    value={member.role}
                    disabled={pendingId === member.id}
                    onChange={(e) =>
                      handleRoleChange(member, e.target.value as InvitableRole)
                    }
                    className="mt-0.5 h-8 rounded-lg border border-border bg-surface px-2 text-sm text-ink outline-none focus:border-primary disabled:opacity-60"
                  >
                    {INVITABLE_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {MEMBER_ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              {!isOwnerRow && (
                <button
                  onClick={() => handleRemove(member)}
                  disabled={pendingId === member.id}
                  aria-label={`Keluarkan ${member.email}`}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger active:bg-danger/20 disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {invites.length > 0 && (
        <>
          <div className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-ink-faint">
            Undangan Menunggu ({invites.length})
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            {invites.map((invite, idx) => (
              <div
                key={invite.id}
                className={`flex items-center gap-3 px-4 py-3.5 ${
                  idx !== invites.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <Clock className="h-6 w-6 shrink-0 text-ink-faint" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium text-ink">
                    {invite.email}
                  </p>
                  <p className="text-sm text-ink-soft">
                    {MEMBER_ROLE_LABELS[invite.role]} · belum diterima
                  </p>
                </div>
                <button
                  onClick={() => handleRevoke(invite)}
                  disabled={pendingId === invite.id}
                  className="shrink-0 text-sm font-medium text-danger disabled:opacity-60"
                >
                  Batalkan
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {members.length <= 1 && invites.length === 0 && (
        <EmptyState
          title="Baru kamu sendirian di sini"
          description="Undang kasir, staf dapur, atau bagian gudang supaya bisa bantu catat transaksi lewat aplikasi ini juga."
        />
      )}

      <InviteSheet open={inviting} onClose={() => setInviting(false)} />
    </>
  );
}
