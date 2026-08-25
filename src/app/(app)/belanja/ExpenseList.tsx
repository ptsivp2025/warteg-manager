"use client";

import { EmptyState } from "@/components/ui/Card";
import type { Expense } from "@/lib/types/database";
import { formatRupiah } from "@/lib/utils";
import { Plus, Search, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { deleteExpense } from "./actions";
import { ExpenseFormSheet } from "./ExpenseFormSheet";

export function ExpenseList({ expenses }: { expenses: Expense[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  async function handleDelete(e: Expense) {
    if (!confirm("Hapus catatan belanja ini?")) return;
    setPendingId(e.id);
    await deleteExpense(e.id);
    setPendingId(null);
    router.refresh();
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return expenses;
    return expenses.filter(
      (e) =>
        e.category.toLowerCase().includes(q) ||
        (e.description ?? "").toLowerCase().includes(q)
    );
  }, [expenses, query]);

  const total = filtered.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl bg-danger-soft px-4 py-3">
          <p className="text-xs font-medium text-danger/80">
            {query ? "Total (hasil pencarian)" : "Total Belanja"}
          </p>
          <p className="text-xl font-extrabold tabular-nums text-danger">
            {formatRupiah(total)}
          </p>
        </div>

        {expenses.length > 0 && (
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari kategori atau catatan..."
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
        )}

        {expenses.length === 0 ? (
          <EmptyState
            title="Belum ada catatan belanja"
            description="Catat pengeluaran harian seperti belanja bahan, gas, atau sewa."
          />
        ) : filtered.length === 0 ? (
          <EmptyState title="Tidak ditemukan" description="Coba kata kunci lain." />
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((e) => (
              <div
                key={e.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-ink">
                    {e.category}
                  </p>
                  {e.description && (
                    <p className="truncate text-sm text-ink-soft">{e.description}</p>
                  )}
                  <p className="text-xs text-ink-faint">
                    {new Date(e.expense_date).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <p className="shrink-0 font-bold tabular-nums text-danger">
                  {formatRupiah(e.amount)}
                </p>
                <button
                  onClick={() => handleDelete(e)}
                  disabled={pendingId === e.id}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger active:bg-danger/20"
                  aria-label="Hapus"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-30 md:bottom-6 flex justify-center">
        <div className="flex w-full max-w-md justify-end px-5">
          <button
            onClick={() => setOpen(true)}
            className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-accent/40 active:bg-accent/90"
            aria-label="Catat belanja"
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>
      </div>
      <ExpenseFormSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
