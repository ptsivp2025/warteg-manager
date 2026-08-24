"use client";

import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Sheet } from "@/components/ui/Sheet";
import type { Warung } from "@/lib/types/database";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateWarungProfile } from "./actions";

export function WarungFormSheet({
  open,
  onClose,
  warung,
}: {
  open: boolean;
  onClose: () => void;
  warung: Warung;
}) {
  const router = useRouter();
  const [name, setName] = useState(warung.name);
  const [address, setAddress] = useState(warung.address ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await updateWarungProfile({ name, address });
    setLoading(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    router.refresh();
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title="Profil Warteg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 pb-2">
        <Field label="Nama warteg">
          <Input required value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Alamat">
          <Input value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>
        {error && (
          <p className="rounded-xl bg-danger-soft px-4 py-2.5 text-sm text-danger">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" loading={loading} className="w-full">
          Simpan
        </Button>
      </form>
    </Sheet>
  );
}
