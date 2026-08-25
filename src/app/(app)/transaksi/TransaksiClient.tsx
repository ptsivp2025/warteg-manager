"use client";

import { EmptyState } from "@/components/ui/Card";
import type {
  Customer,
  MenuItem,
  PaymentMethod,
  TransactionItem,
} from "@/lib/types/database";
import { cn, formatRupiah, formatTime } from "@/lib/utils";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { deleteTransaction, markTransactionPaid } from "./actions";
import { TransactionSheet } from "./TransactionSheet";

export interface TransactionWithItems {
  id: string;
  total: number;
  payment_method: PaymentMethod;
  status: "paid" | "unpaid";
  created_at: string;
  customers: { name: string } | null;
  transaction_items: TransactionItem[];
}

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  cash: "Tunai",
  qris: "QRIS",
  transfer: "Transfer",
  hutang: "Hutang",
};

export function TransaksiClient({
  transactions,
  customers,
  menuItems,
}: {
  transactions: TransactionWithItems[];
  customers: Customer[];
  menuItems: MenuItem[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(() => searchParams.get("new") === "1");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      router.replace("/transaksi");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function handleDelete(id: string) {
    if (!confirm("Hapus transaksi ini?")) return;
    setPendingId(id);
    await deleteTransaction(id);
    setPendingId(null);
    router.refresh();
  }

  async function handleMarkPaid(id: string) {
    setPendingId(id);
    await markTransactionPaid(id);
    setPendingId(null);
    router.refresh();
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        {transactions.length === 0 ? (
          <EmptyState
            title="Belum ada transaksi hari ini"
            description="Tap tombol + di kanan bawah untuk mencatat transaksi baru."
          />
        ) : (
          transactions.map((tx) => {
            const expanded = expandedId === tx.id;
            return (
              <div
                key={tx.id}
                className="overflow-hidden rounded-2xl border border-border bg-surface"
              >
                <button
                  onClick={() => setExpandedId(expanded ? null : tx.id)}
                  className="flex w-full items-center gap-3 p-3 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold text-ink">
                      {tx.customers?.name ?? "Pelanggan Umum"}
                    </p>
                    <p className="text-xs text-ink-soft">
                      {formatTime(tx.created_at)} · {PAYMENT_LABEL[tx.payment_method]}
                      {tx.status === "unpaid" && (
                        <span className="ml-1.5 rounded-full bg-danger-soft px-2 py-0.5 font-medium text-danger">
                          Belum Lunas
                        </span>
                      )}
                    </p>
                  </div>
                  <p className="shrink-0 font-bold tabular-nums text-ink">
                    {formatRupiah(tx.total)}
                  </p>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-ink-faint transition-transform",
                      expanded && "rotate-180"
                    )}
                  />
                </button>

                {expanded && (
                  <div className="border-t border-border bg-black/[0.02] px-3 py-2.5">
                    <ul className="flex flex-col gap-1">
                      {tx.transaction_items.map((it) => (
                        <li
                          key={it.id}
                          className="flex justify-between text-sm text-ink-soft"
                        >
                          <span>
                            {it.qty}x {it.menu_name}
                          </span>
                          <span className="tabular-nums">
                            {formatRupiah(it.subtotal)}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-2.5 flex gap-2">
                      {tx.status === "unpaid" && (
                        <button
                          onClick={() => handleMarkPaid(tx.id)}
                          disabled={pendingId === tx.id}
                          className="h-9 flex-1 rounded-xl bg-primary text-sm font-semibold text-white active:bg-primary-dark"
                        >
                          Tandai Lunas
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(tx.id)}
                        disabled={pendingId === tx.id}
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-danger-soft text-danger active:bg-danger/20"
                        aria-label="Hapus transaksi"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-30 md:bottom-6 flex justify-center">
        <div className="flex w-full max-w-md justify-end px-5">
          <button
            onClick={() => setOpen(true)}
            className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-accent/40 active:bg-accent/90"
            aria-label="Transaksi baru"
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>
      </div>

      <TransactionSheet
        open={open}
        onClose={() => setOpen(false)}
        customers={customers}
        menuItems={menuItems}
      />
    </>
  );
}
