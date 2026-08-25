"use client";

import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Sheet } from "@/components/ui/Sheet";
import {
  INVITABLE_ROLES,
  MEMBER_ROLE_LABELS,
  type InvitableRole,
} from "@/lib/types/database";
import { Check, Copy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { inviteMember } from "./actions";

export function InviteSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InvitableRole>("cashier");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function reset() {
    setEmail("");
    setRole("cashier");
    setError(null);
    setLink(null);
    setCopied(false);
  }

  function handleClose() {
    reset();
    onClose();
    if (link) router.refresh();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await inviteMember({ email: email.trim(), role });
    setLoading(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    if (result?.inviteToken) {
      setLink(`${window.location.origin}/invite/${result.inviteToken}`);
    }
  }

  async function handleCopy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const waText = link
    ? encodeURIComponent(
        `Kamu diundang gabung ke aplikasi kasir warteg sebagai ${MEMBER_ROLE_LABELS[role]}. Buka link ini untuk gabung: ${link}`
      )
    : "";

  return (
    <Sheet open={open} onClose={handleClose} title="Undang Anggota">
      {link ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-soft">
            Link undangan siap. Kirim ke <strong>{email}</strong> lewat WhatsApp
            atau salin manual — link berlaku 7 hari dan hanya bisa dipakai oleh
            email tersebut.
          </p>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-bg px-3 py-2.5">
            <span className="flex-1 truncate text-sm text-ink-soft">
              {link}
            </span>
            <button
              onClick={handleCopy}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black/5 text-ink active:bg-black/10"
              aria-label="Salin link"
            >
              {copied ? (
                <Check className="h-4 w-4 text-primary" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>
          <a
            href={`https://wa.me/?text=${waText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] text-sm font-semibold text-white active:opacity-90"
          >
            Kirim lewat WhatsApp
          </a>
          <Button variant="outline" onClick={handleClose}>
            Selesai
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Email anggota" hint="Mereka daftar/masuk pakai email ini.">
            <Input
              type="email"
              required
              autoComplete="email"
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Peran">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as InvitableRole)}
              className="h-12 w-full rounded-xl border border-border bg-surface px-4 text-[15px] text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            >
              {INVITABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {MEMBER_ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </Field>

          {error && (
            <p className="rounded-xl bg-danger-soft px-4 py-2.5 text-sm text-danger">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" loading={loading} className="mt-2 w-full">
            {loading ? "Membuat link..." : "Buat Link Undangan"}
          </Button>
        </form>
      )}
    </Sheet>
  );
}
