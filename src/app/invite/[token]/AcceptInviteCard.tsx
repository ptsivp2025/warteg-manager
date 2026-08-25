"use client";

import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { acceptInvite } from "./actions";

export function AcceptInviteCard({
  token,
  warungName,
  roleLabel,
}: {
  token: string;
  warungName: string;
  roleLabel: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    setLoading(true);
    setError(null);
    const result = await acceptInvite(token);
    if (result?.error) {
      setLoading(false);
      setError(result.error);
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-center text-sm text-ink-soft">
        Kamu diundang gabung ke <strong>{warungName}</strong> sebagai{" "}
        <strong>{roleLabel}</strong>.
      </p>
      {error && (
        <p className="rounded-xl bg-danger-soft px-4 py-2.5 text-center text-sm text-danger">
          {error}
        </p>
      )}
      <Button size="lg" loading={loading} onClick={handleAccept} className="w-full">
        {loading ? "Memproses..." : "Terima & Gabung"}
      </Button>
    </div>
  );
}
