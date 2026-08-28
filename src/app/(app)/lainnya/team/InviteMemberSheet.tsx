"use client";

import { Button } from "@/components/ui/Button";
import { Field, Input, Label } from "@/components/ui/Input";
import { Sheet } from "@/components/ui/Sheet";
import { ASSIGNABLE_ROLES, ROLE_LABELS } from "@/lib/permissions";
import type { MemberRole } from "@/lib/types/database";
import { useState } from "react";
import { inviteMember } from "./actions";

export function InviteMemberSheet({
  open,
  onClose,
  onInvited,
}: {
  open: boolean;
  onClose: () => void;
  onInvited: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<MemberRole>("cashier");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setEmail("");
    setPassword("");
    setRole("cashier");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await inviteMember({ email, password, role });
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    reset();
    onClose();
    onInvited();
  }

  return (
    <Sheet
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Tambah Anggota Tim"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 pb-2">
        <p className="text-sm text-ink-soft">
          Buat akun langsung untuk anggota tim — mereka bisa langsung masuk
          dengan email &amp; kata sandi ini, tanpa perlu konfirmasi email.
        </p>

        <Field label="Email anggota">
          <Input
            type="email"
            autoFocus
            required
            autoComplete="off"
            placeholder="nama@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Kata sandi awal" hint="Minimal 6 karakter. Anggota bisa menggantinya nanti.">
          <Input
            type="text"
            required
            minLength={6}
            autoComplete="off"
            placeholder="Contoh: warteg123"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <div className="flex flex-col gap-1.5">
          <Label>Peran</Label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as MemberRole)}
            className="h-12 w-full rounded-xl border border-border bg-surface px-4 text-[15px] text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          >
            {ASSIGNABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <p className="rounded-xl bg-danger-soft px-4 py-2.5 text-sm text-danger">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" loading={loading} className="mt-1 w-full">
          Tambah Anggota
        </Button>
      </form>
    </Sheet>
  );
}
