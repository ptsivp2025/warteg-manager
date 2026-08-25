"use client";

import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import type { Customer, MenuItem, PaymentMethod } from "@/lib/types/database";
import { formatDateLong, formatRupiah, formatTime } from "@/lib/utils";
import {
  Banknote,
  Check,
  CreditCard,
  HandCoins,
  Landmark,
  Minus,
  Plus,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createTransaction, type CartLine } from "./actions";

const PAYMENTS: { value: PaymentMethod; label: string; icon: React.ElementType }[] = [
  { value: "cash", label: "Tunai", icon: Banknote },
  { value: "qris", label: "QRIS", icon: CreditCard },
  { value: "transfer", label: "Transfer", icon: Landmark },
  { value: "hutang", label: "Hutang", icon: HandCoins },
];

interface Receipt {
  customerName: string;
  lines: CartLine[];
  total: number;
  paymentMethod: PaymentMethod;
  status: "paid" | "unpaid";
  createdAt: Date;
}

export function TransactionSheet({
  open,
  onClose,
  customers,
  menuItems,
}: {
  open: boolean;
  onClose: () => void;
  customers: Customer[];
  menuItems: MenuItem[];
}) {
  const router = useRouter();
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [customerId, setCustomerId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  const categories = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    for (const item of menuItems) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return Array.from(map.entries());
  }, [menuItems]);

  const lines = Object.values(cart);
  const total = lines.reduce((sum, l) => sum + l.price * l.qty, 0);
  const totalQty = lines.reduce((sum, l) => sum + l.qty, 0);
  const isHutang = paymentMethod === "hutang";
  const selectedCustomer = customers.find((c) => c.id === customerId) ?? null;

  function addQty(item: MenuItem, delta: number) {
    setCart((prev) => {
      const current = prev[item.id]?.qty ?? 0;
      const nextQty = Math.max(0, current + delta);
      const next = { ...prev };
      if (nextQty === 0) {
        delete next[item.id];
      } else {
        next[item.id] = {
          menuItemId: item.id,
          name: item.name,
          price: item.price,
          qty: nextQty,
        };
      }
      return next;
    });
  }

  function resetForm() {
    setCart({});
    setCustomerId("");
    setPaymentMethod("cash");
    setError(null);
  }

  function handleCloseSheet() {
    resetForm();
    setReceipt(null);
    onClose();
  }

  async function handleSave() {
    setError(null);
    if (lines.length === 0) {
      setError("Pilih minimal satu menu dulu.");
      return;
    }
    if (isHutang && !customerId) {
      setError("Transaksi hutang wajib memilih nama pelanggan.");
      return;
    }
    setLoading(true);
    const result = await createTransaction({
      customerId: customerId || null,
      paymentMethod,
      items: lines,
    });
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }

    router.refresh();
    setReceipt({
      customerName: selectedCustomer?.name ?? "Pelanggan Umum",
      lines,
      total,
      paymentMethod,
      status: paymentMethod === "hutang" ? "unpaid" : "paid",
      createdAt: new Date(),
    });
  }

  function handleNewTransaction() {
    resetForm();
    setReceipt(null);
  }

  // ---------- RECEIPT / SUMMARY VIEW ----------
  if (receipt) {
    return (
      <Sheet open={open} onClose={handleCloseSheet} title="Transaksi Berhasil">
        <div className="flex flex-col gap-5 pb-2">
          <div className="flex flex-col items-center gap-2 py-2 text-center">
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-full ${
                receipt.status === "paid" ? "bg-primary-soft text-primary" : "bg-danger-soft text-danger"
              }`}
            >
              <Check className="h-7 w-7" />
            </div>
            <p className="text-lg font-extrabold text-ink">
              {formatRupiah(receipt.total)}
            </p>
            <p
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                receipt.status === "paid"
                  ? "bg-primary-soft text-primary"
                  : "bg-danger-soft text-danger"
              }`}
            >
              {receipt.status === "paid" ? "Lunas" : "Belum Lunas (Hutang)"}
            </p>
          </div>

          <div className="rounded-2xl border border-dashed border-border p-4">
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="text-ink-soft">Pelanggan</span>
              <span className="font-semibold text-ink">{receipt.customerName}</span>
            </div>
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="text-ink-soft">Waktu</span>
              <span className="font-semibold text-ink">
                {formatDateLong(receipt.createdAt)}, {formatTime(receipt.createdAt)}
              </span>
            </div>
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="text-ink-soft">Pembayaran</span>
              <span className="font-semibold text-ink">
                {PAYMENTS.find((p) => p.value === receipt.paymentMethod)?.label}
              </span>
            </div>
            <div className="my-3 border-t border-dashed border-border" />
            <ul className="flex flex-col gap-1.5">
              {receipt.lines.map((l) => (
                <li key={l.menuItemId} className="flex justify-between text-sm">
                  <span className="text-ink-soft">
                    {l.qty}x {l.name}
                  </span>
                  <span className="tabular-nums text-ink">
                    {formatRupiah(l.price * l.qty)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="my-3 border-t border-dashed border-border" />
            <div className="flex justify-between text-base font-extrabold text-ink">
              <span>Total</span>
              <span className="tabular-nums">{formatRupiah(receipt.total)}</span>
            </div>
          </div>

          {receipt.status === "unpaid" && (
            <p className="rounded-xl bg-danger-soft px-4 py-2.5 text-sm text-danger">
              Hutang tercatat atas nama <strong>{receipt.customerName}</strong>.
              Lihat & tandai lunas kapan saja dari halaman Pelanggan.
            </p>
          )}

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={handleNewTransaction}>
              Transaksi Baru
            </Button>
            <Button className="flex-1" onClick={handleCloseSheet}>
              Selesai
            </Button>
          </div>
        </div>
      </Sheet>
    );
  }

  // ---------- CART / MENU PICKER VIEW ----------
  return (
    <Sheet open={open} onClose={handleCloseSheet} title="Transaksi Baru">
      <div className="flex flex-col gap-5 pb-2">
        {/* Customer */}
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-ink-soft">
            <User className="h-4 w-4" /> Pelanggan {isHutang && <span className="text-danger">(wajib untuk hutang)</span>}
          </p>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {!isHutang && (
              <button
                onClick={() => setCustomerId("")}
                className={`h-9 shrink-0 rounded-full px-3.5 text-sm font-medium ${
                  customerId === ""
                    ? "bg-primary text-white"
                    : "bg-primary-soft text-primary/70"
                }`}
              >
                Umum
              </button>
            )}
            {customers.map((c) => (
              <button
                key={c.id}
                onClick={() => setCustomerId(c.id)}
                className={`h-9 shrink-0 rounded-full px-3.5 text-sm font-medium ${
                  customerId === c.id
                    ? "bg-primary text-white"
                    : "bg-primary-soft text-primary/70"
                }`}
              >
                {c.name}
              </button>
            ))}
            {customers.length === 0 && (
              <span className="py-2 text-sm text-ink-faint">
                Belum ada pelanggan. Tambahkan di tab Pelanggan.
              </span>
            )}
          </div>
        </div>

        {/* Menu picker */}
        <div>
          <p className="mb-2 text-sm font-medium text-ink-soft">Pilih menu</p>
          {menuItems.length === 0 ? (
            <p className="rounded-xl bg-black/5 px-4 py-3 text-sm text-ink-soft">
              Belum ada menu aktif. Tambahkan menu dulu di tab Menu.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {categories.map(([category, items]) => (
                <div key={category}>
                  <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-ink-faint">
                    {category}
                  </p>
                  <div className="flex flex-col gap-2">
                    {items.map((item) => {
                      const qty = cart[item.id]?.qty ?? 0;
                      return (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 rounded-xl border border-border p-2.5"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-ink">
                              {item.name}
                            </p>
                            <p className="text-xs text-ink-soft">
                              {formatRupiah(item.price)}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              type="button"
                              onClick={() => addQty(item, -1)}
                              disabled={qty === 0}
                              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-ink disabled:opacity-30"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="w-5 text-center text-sm font-bold tabular-nums">
                              {qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => addQty(item, 1)}
                              className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment method */}
        <div>
          <p className="mb-2 text-sm font-medium text-ink-soft">Pembayaran</p>
          <div className="grid grid-cols-4 gap-2">
            {PAYMENTS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setPaymentMethod(value)}
                className={`flex flex-col items-center gap-1 rounded-xl border py-2.5 text-xs font-medium ${
                  paymentMethod === value
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border text-ink-soft"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="rounded-xl bg-danger-soft px-4 py-2.5 text-sm text-danger">
            {error}
          </p>
        )}

        {/* Sticky total + save */}
        <div className="sticky bottom-0 -mx-5 mt-1 border-t border-border bg-surface px-5 pt-3">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-ink-soft">
              Total ({totalQty} item)
            </span>
            <span className="text-xl font-extrabold tabular-nums text-ink">
              {formatRupiah(total)}
            </span>
          </div>
          <Button
            size="lg"
            className="w-full"
            loading={loading}
            onClick={handleSave}
          >
            Simpan Transaksi
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
