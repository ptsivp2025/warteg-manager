"use client";

import { EmptyState } from "@/components/ui/Card";
import type { Customer } from "@/lib/types/database";
import { formatRupiah } from "@/lib/utils";
import { Pencil, Phone, Search, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { deleteCustomer } from "./actions";
import { CustomerFormSheet } from "./CustomerFormSheet";

export function CustomerList({
  customers,
  hutangMap,
}: {
  customers: Customer[];
  hutangMap: Record<string, number>;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Customer | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone ?? "").toLowerCase().includes(q)
    );
  }, [customers, query]);

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
      <div className="relative mb-2">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari nama atau nomor HP..."
          className="h-11 w-full rounded-xl border border-border bg-surface pl-10 pr-9 text-[15px] text-ink placeholder:text-ink-faint outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-ink-faint active:bg-black/5"
            aria-label="Hapus pencarian"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Tidak ditemukan"
          description="Coba kata kunci lain."
        />
      ) : (
      <div className="flex flex-col gap-2">
        {filtered.map((c) => {
          const hutang = hutangMap[c.id] ?? 0;
          return (
            <div
              key={c.id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3"
            >
              <Link href={`/pelanggan/${c.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-ink">{c.name}</p>
                  {c.phone ? (
                    <p className="flex items-center gap-1 text-sm text-ink-soft">
                      <Phone className="h-3.5 w-3.5" /> {c.phone}
                    </p>
                  ) : hutang > 0 ? null : (
                    <p className="text-sm text-ink-faint">Lihat riwayat</p>
                  )}
                  {hutang > 0 && (
                    <p className="mt-0.5 text-sm font-semibold text-danger">
                      Hutang {formatRupiah(hutang)}
                    </p>
                  )}
                </div>
              </Link>
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
          );
        })}
      </div>
      )}

      <CustomerFormSheet
        open={!!editing}
        onClose={() => setEditing(null)}
        customer={editing}
      />
    </>
  );
}
