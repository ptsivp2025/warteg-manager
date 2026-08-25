"use client";

import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Sheet } from "@/components/ui/Sheet";
import type { Customer } from "@/lib/types/database";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createCustomer, updateCustomer } from "./actions";

export function CustomerFormSheet({
  open,
  onClose,
  customer,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  customer?: Customer | null;
  /** Called with the new customer's id right after a successful create (not on edit). */
  onCreated?: (id: string) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(customer?.name ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [note, setNote] = useState(customer?.note ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName(customer?.name ?? "");
    setPhone(customer?.phone ?? "");
    setNote(customer?.note ?? "");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const payload = { name, phone, note };
    const result = customer
      ? await updateCustomer(customer.id, payload)
      : await createCustomer(payload);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
    onClose();
    if (!customer) {
      if (result.id) onCreated?.(result.id);
      setName("");
      setPhone("");
      setNote("");
    }
  }

  return (
    <Sheet
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title={customer ? "Ubah Pelanggan" : "Tambah Pelanggan"}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 pb-2">
        <Field label="Nama pelanggan">
          <Input
            autoFocus
            required
            placeholder="Contoh: Bu Siti"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="No. HP (opsional)">
          <Input
            type="tel"
            placeholder="08xxxxxxxxxx"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </Field>
        <Field label="Catatan (opsional)">
          <Textarea
            rows={2}
            placeholder="Contoh: langganan, suka pedas, dll"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>

        {error && (
          <p className="rounded-xl bg-danger-soft px-4 py-2.5 text-sm text-danger">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" loading={loading} className="mt-1 w-full">
          {customer ? "Simpan Perubahan" : "Tambah Pelanggan"}
        </Button>
      </form>
    </Sheet>
  );
}
