"use client";

import type { PaymentMethod, TransactionItem } from "@/lib/types/database";
import { cn, formatDateLong, formatRupiah, formatTime } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { markAllPaidForCustomer, markTransactionPaid } from "../../transaksi/actions";

export interface CustomerTransaction {
  id: string;
  total: number;
  payment_method: PaymentMethod;
  status: "paid" | "unpaid";
  created_at: string;
  transaction_items: TransactionItem[];
}

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  cash: "Tunai",
  qris: "QRIS",
  transfer: "Transfer",
  hutang: "Hutang",
};

export function CustomerHistory({
  customerId,
  transactions,
}: {
  customerId: string;
  transactions: CustomerTransaction[];
}) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const totalHutang = transactions
    .filter((t) => t.status === "unpaid")
    .reduce((sum, t) => sum + Number(t.total), 0);
  const totalBelanja = transactions.reduce((sum, t) => sum + Number(t.total), 0);

  async function handleMarkPaid(id: string) {
    setPending(true);
    await markTransactionPaid(id);
    setPending(false);
    router.refresh();
  }

  async function handleMarkAllPaid() {
    if (!confirm("Tandai semua hutang pelanggan ini sebagai lunas?")) return;
    setPending(true);
    await markAllPaidForCustomer(customerId);
    setPending(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-xs font-medium text-ink-soft">Total Belanja</p>
          <p className="mt-1 text-lg font-extrabold tabular-nums text-ink">
            {formatRupiah(totalBelanja)}
          </p>
        </div>
        <div
          className={cn(
            "rounded-2xl p-4",
            totalHutang > 0 ? "bg-danger-soft" : "border border-border bg-surface"
          )}
        >
          <p className={cn("text-xs font-medium", totalHutang > 0 ? "text-danger/80" : "text-ink-soft")}>
            Total Hutang
          </p>
          <p
            className={cn(
              "mt-1 text-lg font-extrabold tabular-nums",
              totalHutang > 0 ? "text-danger" : "text-ink"
            )}
          >
            {formatRupiah(totalHutang)}
          </p>
        </div>
      </div>

      {totalHutang > 0 && (
        <button
          onClick={handleMarkAllPaid}
          disabled={pending}
          className="h-11 w-full rounded-2xl bg-primary text-sm font-bold text-white active:bg-primary-dark disabled:opacity-60"
        >
          Tandai Semua Hutang Lunas
        </button>
      )}

      <div>
        <p className="mb-2 text-sm font-bold text-ink">Riwayat Transaksi</p>
        {transactions.length === 0 ? (
          <p className="rounded-xl bg-black/5 px-4 py-3 text-sm text-ink-soft">
            Belum ada transaksi untuk pelanggan ini.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {transactions.map((tx) => {
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
                      <p className="text-sm font-semibold text-ink">
                        {formatDateLong(tx.created_at)}
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
                          <li key={it.id} className="flex justify-between text-sm text-ink-soft">
                            <span>
                              {it.qty}x {it.menu_name}
                            </span>
                            <span className="tabular-nums">{formatRupiah(it.subtotal)}</span>
                          </li>
                        ))}
                      </ul>
                      {tx.status === "unpaid" && (
                        <button
                          onClick={() => handleMarkPaid(tx.id)}
                          disabled={pending}
                          className="mt-2.5 h-9 w-full rounded-xl bg-primary text-sm font-semibold text-white active:bg-primary-dark disabled:opacity-60"
                        >
                          Tandai Lunas
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
