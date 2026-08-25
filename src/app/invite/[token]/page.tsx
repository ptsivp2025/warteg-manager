import { Button } from "@/components/ui/Button";
import { MEMBER_ROLE_LABELS, type InvitableRole } from "@/lib/types/database";
import { createClient } from "@/lib/supabase/server";
import { Store } from "lucide-react";
import Link from "next/link";
import { AcceptInviteCard } from "./AcceptInviteCard";
import { signOutAndRetryInvite } from "./actions";

export const dynamic = "force-dynamic";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-10">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/25">
          <Store className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-extrabold text-ink">Undangan Warteg</h1>
      </div>
      {children}
    </div>
  );
}

function Message({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-center text-sm text-ink-soft">{text}</p>
      <Link
        href="/login"
        className="text-center text-sm font-medium text-primary"
      >
        Ke halaman masuk
      </Link>
    </div>
  );
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  const [{ data: invites, error }, { data: userRes }] = await Promise.all([
    supabase.rpc("get_invite_by_token", { _token: token }),
    supabase.auth.getUser(),
  ]);

  const invite = invites?.[0];
  const authEmail = userRes?.user?.email ?? null;

  if (error || !invite) {
    return (
      <Shell>
        <Message text="Undangan tidak ditemukan. Mungkin link-nya salah atau sudah tidak berlaku." />
      </Shell>
    );
  }

  if (invite.status === "revoked") {
    return (
      <Shell>
        <Message text="Undangan ini sudah dibatalkan oleh pemilik warteg." />
      </Shell>
    );
  }

  if (invite.status === "accepted") {
    return (
      <Shell>
        <Message text="Undangan ini sudah pernah diterima sebelumnya. Kalau ini akun kamu, silakan masuk." />
      </Shell>
    );
  }

  if (invite.expired) {
    return (
      <Shell>
        <Message text="Undangan ini sudah kedaluwarsa. Minta pemilik warteg untuk mengundang ulang." />
      </Shell>
    );
  }

  const roleLabel = MEMBER_ROLE_LABELS[invite.role as InvitableRole];

  if (!authEmail) {
    return (
      <Shell>
        <div className="flex flex-col gap-4">
          <p className="text-center text-sm text-ink-soft">
            Kamu diundang gabung ke <strong>{invite.warung_name}</strong>{" "}
            sebagai <strong>{roleLabel}</strong>. Masuk atau daftar pakai{" "}
            <strong>{invite.email}</strong> untuk menerima.
          </p>
          <Link
            href={`/login?next=${encodeURIComponent(
              `/invite/${token}`
            )}&email=${encodeURIComponent(invite.email)}`}
          >
            <Button size="lg" className="w-full">
              Masuk / Daftar
            </Button>
          </Link>
        </div>
      </Shell>
    );
  }

  if (authEmail.toLowerCase() !== invite.email.toLowerCase()) {
    return (
      <Shell>
        <div className="flex flex-col gap-4">
          <p className="text-center text-sm text-ink-soft">
            Undangan ini untuk <strong>{invite.email}</strong>, tapi kamu
            sedang masuk sebagai <strong>{authEmail}</strong>.
          </p>
          <form action={signOutAndRetryInvite.bind(null, token)}>
            <Button type="submit" size="lg" className="w-full">
              Keluar & Masuk Pakai Email Lain
            </Button>
          </form>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <AcceptInviteCard
        token={token}
        warungName={invite.warung_name}
        roleLabel={roleLabel}
      />
    </Shell>
  );
}
