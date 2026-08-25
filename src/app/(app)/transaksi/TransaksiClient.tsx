"use client";

import { EmptyState } from "@/components/ui/Card";
import type {
  Customer,
  MenuItem,
  PaymentMethod,
  TransactionItem,
} from "@/lib/types/database";
import { cn, formatRupiah, formatTime } from "@/lib/utils";
import { ChevronDown, Plus, Search, Trash2, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { deleteTransaction, markTransactionPaid } from "./actions";
import { TransactionSheet } from "./TransactionSheet";

export interface TransactionWithItems {
  id: string;
  total: number;
  payment_method: PaymentMethod;
  status: "paid" | "unpaid";
  created_at: string;
  customer_id: string | null;
  customers: { name: string } | null;
  transaction_items: TransactionItem[];
}

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  cash: "Tunai",
  qris: "QRIS",
  transfer: "Transfer",
  hutang: "Hutang",
};

const STATUS_FILTERS = [
  { value: "all", label: "Semua" },
  { value: "unpaid", label: "Belum Lunas" },
  { value: "paid", label: "Lunas" },
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number]["value"];

export function TransaksiClient({
  transactions,
  customers,
  recentCustomers,
  menuItems,
}: {
  transactions: TransactionWithItems[];
  customers: Customer[];
  recentCustomers: Customer[];
  menuItems: MenuItem[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(() => searchParams.get("new") === "1");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [paymentFilter, setPaymentFilter] = useState<PaymentMethod | "all">(
    "all"
  );

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      const next = new URLSearchParams(searchParams.toString());
      next.delete("new");
      const qs = next.toString();
      router.replace(qs ? `/transaksi?${qs}` : "/transaksi");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions.filter((tx) => {
      if (statusFilter !== "all" && tx.status !== statusFilter) return false;
      if (paymentFilter !== "all" && tx.payment_method !== paymentFilter)
        return false;
      if (!q) return true;
      const customerName = (tx.customers?.name ?? "Pelanggan Umum").toLowerCase();
      if (customerName.includes(q)) return true;
      return tx.transaction_items.some((it) =>
        it.menu_name.toLowerCase().includes(q)
      );
    });
  }, [transactions, query, statusFilter, paymentFilter]);

  const summary = useMemo(() => {
    const total = filtered.reduce((sum, tx) => sum + tx.total, 0);
    const unpaidCount = filtered.filter((tx) => tx.status === "unpaid").length;
    return { count: filtered.length, total, unpaidCount };
  }, [filtered]);

  const isFiltering = query.trim() !== "" || statusFilter !== "all" || paymentFilter !== "all";

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
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama pelanggan atau menu..."
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

        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold",
                statusFilter === f.value
                  ? "bg-primary text-white"
                  : "border border-border bg-surface text-ink-soft"
              )}
            >
              {f.label}
            </button>
          ))}
          <span className="my-auto h-4 w-px shrink-0 bg-border" />
          <button
            onClick={() => setPaymentFilter("all")}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold",
              paymentFilter === "all"
                ? "bg-primary text-white"
                : "border border-border bg-surface text-ink-soft"
            )}
          >
            Semua Metode
          </button>
          {(Object.keys(PAYMENT_LABEL) as PaymentMethod[]).map((pm) => (
            <button
              key={pm}
              onClick={() => setPaymentFilter(pm)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold",
                paymentFilter === pm
                  ? "bg-primary text-white"
                  : "border border-border bg-surface text-ink-soft"
              )}
            >
              {PAYMENT_LABEL[pm]}
            </button>
          ))}
        </div>

        {transactions.length > 0 && (
          <div className="flex items-center justify-between rounded-2xl bg-primary-soft px-4 py-2.5">
            <p className="text-xs font-medium text-primary">
              {summary.count} transaksi
              {summary.unpaidCount > 0 && ` · ${summary.unpaidCount} belum lunas`}
            </p>
            <p className="text-sm font-bold tabular-nums text-primary">
              {formatRupiah(summary.total)}
            </p>
          </div>
        )}

        {filtered.length === 0 ? (
          <EmptyState
            title={isFiltering ? "Tidak ditemukan" : "Belum ada transaksi"}
            description={
              isFiltering
                ? "Coba kata kunci atau filter lain."
                : "Tap tombol + di kanan bawah untuk mencatat transaksi baru."
            }
          />
        ) : (
          filtered.map((tx) => {
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
        recentCustomers={recentCustomers}
        menuItems={menuItems}
      />
    </>
  );
}
