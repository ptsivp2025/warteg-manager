"use client";

import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import type { Customer, MenuItem, PaymentMethod } from "@/lib/types/database";
import { formatRupiah } from "@/lib/utils";
import { Banknote, CreditCard, HandCoins, Landmark, Minus, Plus, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createTransaction, type CartLine } from "./actions";

const PAYMENTS: { value: PaymentMethod; label: string; icon: React.ElementType }[] = [
  { value: "cash", label: "Tunai", icon: Banknote },
  { value: "qris", label: "QRIS", icon: CreditCard },
  { value: "transfer", label: "Transfer", icon: Landmark },
  { value: "hutang", label: "Hutang", icon: HandCoins },
];

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

  function reset() {
    setCart({});
    setCustomerId("");
    setPaymentMethod("cash");
    setError(null);
  }

  async function handleSave() {
    setError(null);
    if (lines.length === 0) {
      setError("Pilih minimal satu menu dulu.");
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
    reset();
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Transaksi Baru"
    >
      <div className="flex flex-col gap-5 pb-2">
        {/* Customer */}
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-ink-soft">
            <User className="h-4 w-4" /> Pelanggan (opsional)
          </p>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
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
