"use client";

import { EmptyState } from "@/components/ui/Card";
import type { Customer } from "@/lib/types/database";
import { Pencil, Phone, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteCustomer } from "./actions";
import { CustomerFormSheet } from "./CustomerFormSheet";

export function CustomerList({ customers }: { customers: Customer[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Customer | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  if (customers.length === 0) {
    return (
      <EmptyState
        title="Belum ada pelanggan"
        description="Tambahkan pelanggan tetap agar pencatatan transaksi lebih rapi."
      />
    );
  }

  async function handleDelete(c: Customer) {
    if (!confirm(`Hapus pelanggan "${c.name}"?`)) return;
    setPendingId(c.id);
    await deleteCustomer(c.id);
    setPendingId(null);
    router.refresh();
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        {customers.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">
              {c.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold text-ink">{c.name}</p>
              {c.phone && (
                <p className="flex items-center gap-1 text-sm text-ink-soft">
                  <Phone className="h-3.5 w-3.5" /> {c.phone}
                </p>
              )}
            </div>
            <button
              onClick={() => setEditing(c)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/5 text-ink-soft active:bg-black/10"
              aria-label="Ubah"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDelete(c)}
              disabled={pendingId === c.id}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger active:bg-danger/20"
              aria-label="Hapus"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <CustomerFormSheet
        open={!!editing}
        onClose={() => setEditing(null)}
        customer={editing}
      />
    </>
  );
}
