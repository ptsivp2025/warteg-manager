"use client";

import { EmptyState } from "@/components/ui/Card";
import type { Expense } from "@/lib/types/database";
import { formatRupiah } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteExpense } from "./actions";
import { ExpenseFormSheet } from "./ExpenseFormSheet";

export function ExpenseList({ expenses }: { expenses: Expense[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleDelete(e: Expense) {
    if (!confirm("Hapus catatan belanja ini?")) return;
    setPendingId(e.id);
    await deleteExpense(e.id);
    setPendingId(null);
    router.refresh();
  }

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl bg-danger-soft px-4 py-3">
          <p className="text-xs font-medium text-danger/80">Total Belanja</p>
          <p className="text-xl font-extrabold tabular-nums text-danger">
            {formatRupiah(total)}
          </p>
        </div>

        {expenses.length === 0 ? (
          <EmptyState
            title="Belum ada catatan belanja"
            description="Catat pengeluaran harian seperti belanja bahan, gas, atau sewa."
          />
        ) : (
          <div className="flex flex-col gap-2">
            {expenses.map((e) => (
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

      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-30 flex justify-center">
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
