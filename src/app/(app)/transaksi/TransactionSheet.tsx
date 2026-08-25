"use client";

import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import type { Customer, MenuItem, PaymentMethod } from "@/lib/types/database";
import { cn, formatDateLong, formatRupiah, formatTime } from "@/lib/utils";
import {
  Banknote,
  Check,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  HandCoins,
  Landmark,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createTransaction, type CartLine, type ReceiptTransaction } from "./actions";
import { CustomerPicker } from "./CustomerPicker";

const PAYMENTS: { value: PaymentMethod; label: string; icon: React.ElementType }[] = [
  { value: "cash", label: "Tunai", icon: Banknote },
  { value: "qris", label: "QRIS", icon: CreditCard },
  { value: "transfer", label: "Transfer", icon: Landmark },
  { value: "hutang", label: "Hutang", icon: HandCoins },
];

type Step = "customer" | "menu" | "cart" | "payment";

interface Receipt {
  customerName: string;
  paymentMethod: PaymentMethod;
  // Data resmi hasil dari server (harga & total sudah divalidasi
  // ulang di database) — bukan dari cart client.
  transaction: ReceiptTransaction;
}

export function TransactionSheet({
  open,
  onClose,
  customers,
  recentCustomers,
  menuItems,
}: {
  open: boolean;
  onClose: () => void;
  customers: Customer[];
  recentCustomers: Customer[];
  menuItems: MenuItem[];
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("customer");
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [customerId, setCustomerId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [menuQuery, setMenuQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("Semua");

  const categoryList = useMemo(() => {
    const set = new Set<string>();
    for (const item of menuItems) set.add(item.category);
    return Array.from(set);
  }, [menuItems]);

  const visibleMenu = useMemo(() => {
    const q = menuQuery.trim().toLowerCase();
    return menuItems.filter((item) => {
      if (categoryFilter !== "Semua" && item.category !== categoryFilter)
        return false;
      if (!q) return true;
      return item.name.toLowerCase().includes(q);
    });
  }, [menuItems, menuQuery, categoryFilter]);

  const groupedMenu = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    for (const item of visibleMenu) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return Array.from(map.entries());
  }, [visibleMenu]);

  const lines = Object.values(cart);
  const total = lines.reduce((sum, l) => sum + l.price * l.qty, 0);
  const totalQty = lines.reduce((sum, l) => sum + l.qty, 0);
  const isHutang = paymentMethod === "hutang";
  const selectedCustomer = customers.find((c) => c.id === customerId) ?? null;

  function addQty(item: MenuItem, delta: number) {
    if (!item.is_active && delta > 0) return;
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
    setStep("customer");
    setMenuQuery("");
    setCategoryFilter("Semua");
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
      // Hanya kirim menu_item_id + qty. Harga/nama tidak dikirim —
      // server yang mengambil harga resmi dari database.
      items: lines.map((l) => ({ menuItemId: l.menuItemId, qty: l.qty })),
    });
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (!result.transaction) {
      // Transaksi tersimpan tapi gagal mengambil data struk — tetap
      // anggap sukses, cukup tutup & refresh.
      router.refresh();
      handleCloseSheet();
      return;
    }

    router.refresh();
    setReceipt({
      customerName: selectedCustomer?.name ?? "Pelanggan Umum",
      paymentMethod,
      transaction: result.transaction,
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
                receipt.transaction.status === "paid" ? "bg-primary-soft text-primary" : "bg-danger-soft text-danger"
              }`}
            >
              <Check className="h-7 w-7" />
            </div>
            <p className="text-lg font-extrabold text-ink">
              {formatRupiah(receipt.transaction.total)}
            </p>
            <p
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                receipt.transaction.status === "paid"
                  ? "bg-primary-soft text-primary"
                  : "bg-danger-soft text-danger"
              }`}
            >
              {receipt.transaction.status === "paid" ? "Lunas" : "Belum Lunas (Hutang)"}
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
                {formatDateLong(new Date(receipt.transaction.createdAt))},{" "}
                {formatTime(new Date(receipt.transaction.createdAt))}
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
              {receipt.transaction.items.map((l) => (
                <li key={l.menuItemId ?? l.name} className="flex justify-between text-sm">
                  <span className="text-ink-soft">
                    {l.qty}x {l.name}
                  </span>
                  <span className="tabular-nums text-ink">
                    {formatRupiah(l.subtotal)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="my-3 border-t border-dashed border-border" />
            <div className="flex justify-between text-base font-extrabold text-ink">
              <span>Total</span>
              <span className="tabular-nums">{formatRupiah(receipt.transaction.total)}</span>
            </div>
          </div>

          {receipt.transaction.status === "unpaid" && (
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

  const stepTitle: Record<Step, string> = {
    customer: "Pilih Pelanggan",
    menu: "Pilih Menu",
    cart: "Keranjang",
    payment: "Pembayaran",
  };

  const backTarget: Partial<Record<Step, Step>> = {
    menu: "customer",
    cart: "menu",
    payment: "cart",
  };

  const back = backTarget[step];

  return (
    <Sheet
      open={open}
      onClose={handleCloseSheet}
      title={stepTitle[step]}
      headerLeft={
        back ? (
          <button
            type="button"
            onClick={() => setStep(back)}
            aria-label="Kembali"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-soft active:bg-black/5"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-4 pb-2">
        {/* ---------- STEP: CUSTOMER ---------- */}
        {step === "customer" && (
          <>
            <CustomerPicker
              customers={customers}
              recentCustomers={recentCustomers}
              selectedId={customerId}
              onSelect={(id) => {
                setCustomerId(id);
                setStep("menu");
              }}
            />
          </>
        )}

        {/* ---------- STEP: MENU ---------- */}
        {step === "menu" && (
          <>
            <SelectedCustomerBanner
              name={selectedCustomer?.name ?? "Pelanggan Umum"}
              onChange={() => setStep("customer")}
            />

            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
              <input
                value={menuQuery}
                onChange={(e) => setMenuQuery(e.target.value)}
                placeholder="Cari menu..."
                className="h-11 w-full rounded-xl border border-border bg-surface pl-10 pr-9 text-[15px] text-ink placeholder:text-ink-faint outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
              {menuQuery && (
                <button
                  type="button"
                  onClick={() => setMenuQuery("")}
                  className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-ink-faint active:bg-black/5"
                  aria-label="Hapus pencarian"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {categoryList.length > 1 && (
              <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <button
                  type="button"
                  onClick={() => setCategoryFilter("Semua")}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold",
                    categoryFilter === "Semua"
                      ? "bg-primary text-white"
                      : "border border-border bg-surface text-ink-soft"
                  )}
                >
                  Semua
                </button>
                {categoryList.map((cat) => (
                  <button
                    type="button"
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={cn(
                      "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold",
                      categoryFilter === cat
                        ? "bg-primary text-white"
                        : "border border-border bg-surface text-ink-soft"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {menuItems.length === 0 ? (
              <p className="rounded-xl bg-black/5 px-4 py-3 text-sm text-ink-soft">
                Belum ada menu. Tambahkan menu dulu di tab Menu.
              </p>
            ) : groupedMenu.length === 0 ? (
              <p className="rounded-xl bg-black/5 px-4 py-6 text-center text-sm text-ink-soft">
                Menu tidak ditemukan.
              </p>
            ) : (
              <div className="flex flex-col gap-4 pb-16">
                {groupedMenu.map(([category, items]) => (
                  <div key={category}>
                    <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-ink-faint">
                      {category}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {items.map((item) => {
                        const qty = cart[item.id]?.qty ?? 0;
                        const kosong = !item.is_active;
                        return (
                          <button
                            type="button"
                            key={item.id}
                            disabled={kosong}
                            onClick={() => addQty(item, 1)}
                            className={cn(
                              "relative flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors",
                              kosong
                                ? "cursor-not-allowed border-border bg-black/[0.03] opacity-60"
                                : qty > 0
                                  ? "border-primary bg-primary-soft"
                                  : "border-border bg-surface active:bg-black/5"
                            )}
                          >
                            {kosong && (
                              <span className="absolute right-2 top-2 rounded-full bg-ink-faint/20 px-2 py-0.5 text-[10px] font-bold uppercase text-ink-soft">
                                Kosong
                              </span>
                            )}
                            {qty > 0 && !kosong && (
                              <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white shadow">
                                {qty}
                              </span>
                            )}
                            <p
                              className={cn(
                                "text-sm font-semibold",
                                kosong ? "text-ink-faint line-through" : "text-ink"
                              )}
                            >
                              {item.name}
                            </p>
                            <p className="text-xs text-ink-soft">{formatRupiah(item.price)}</p>
                            {qty > 0 && !kosong && (
                              <div
                                className="mt-1 flex items-center gap-2"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={() => addQty(item, -1)}
                                  className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-ink shadow-sm"
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span className="text-xs font-bold tabular-nums">{qty}</span>
                                <button
                                  type="button"
                                  onClick={() => addQty(item, 1)}
                                  className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {lines.length > 0 && (
              <div className="sticky bottom-0 -mx-5 -mt-2 border-t border-border bg-surface px-5 pt-3">
                <button
                  type="button"
                  onClick={() => setStep("cart")}
                  className="mb-1 flex w-full items-center gap-3 rounded-2xl bg-primary px-4 py-3 text-white active:bg-primary-dark"
                >
                  <ShoppingBag className="h-5 w-5 shrink-0" />
                  <span className="flex-1 text-left text-sm font-semibold">
                    {totalQty} item · {formatRupiah(total)}
                  </span>
                  <span className="flex items-center gap-1 text-sm font-bold">
                    Lihat Keranjang <ChevronRight className="h-4 w-4" />
                  </span>
                </button>
              </div>
            )}
          </>
        )}

        {/* ---------- STEP: CART ---------- */}
        {step === "cart" && (
          <>
            <SelectedCustomerBanner
              name={selectedCustomer?.name ?? "Pelanggan Umum"}
              onChange={() => setStep("customer")}
            />

            {lines.length === 0 ? (
              <p className="rounded-xl bg-black/5 px-4 py-6 text-center text-sm text-ink-soft">
                Keranjang masih kosong.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {lines.map((l) => (
                  <div
                    key={l.menuItemId}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold text-ink">
                        {l.name}
                      </p>
                      <p className="text-sm text-ink-soft">
                        {formatRupiah(l.price)} / item
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setCart((prev) => {
                            const current = prev[l.menuItemId]?.qty ?? 0;
                            const nextQty = current - 1;
                            const next = { ...prev };
                            if (nextQty <= 0) delete next[l.menuItemId];
                            else next[l.menuItemId] = { ...prev[l.menuItemId], qty: nextQty };
                            return next;
                          })
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-ink active:bg-black/10"
                        aria-label={`Kurangi ${l.name}`}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-5 text-center text-sm font-bold tabular-nums">
                        {l.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setCart((prev) => ({
                            ...prev,
                            [l.menuItemId]: {
                              ...prev[l.menuItemId],
                              qty: (prev[l.menuItemId]?.qty ?? 0) + 1,
                            },
                          }))
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white active:bg-primary-dark"
                        aria-label={`Tambah ${l.name}`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="w-20 shrink-0 text-right text-sm font-bold tabular-nums text-ink">
                      {formatRupiah(l.price * l.qty)}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        setCart((prev) => {
                          const next = { ...prev };
                          delete next[l.menuItemId];
                          return next;
                        })
                      }
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger active:bg-danger/20"
                      aria-label={`Hapus ${l.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setStep("menu")}
              className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 py-2.5 text-sm font-semibold text-primary active:bg-primary-soft"
            >
              <Plus className="h-4 w-4" /> Tambah Menu Lagi
            </button>

            {lines.length > 0 && (
              <div className="sticky bottom-0 -mx-5 mt-1 border-t border-border bg-surface px-5 pt-3">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm text-ink-soft">Total ({totalQty} item)</span>
                  <span className="text-xl font-extrabold tabular-nums text-ink">
                    {formatRupiah(total)}
                  </span>
                </div>
                <Button size="lg" className="w-full" onClick={() => setStep("payment")}>
                  Lanjut ke Pembayaran
                </Button>
              </div>
            )}
          </>
        )}

        {/* ---------- STEP: PAYMENT ---------- */}
        {step === "payment" && (
          <>
            <SelectedCustomerBanner
              name={selectedCustomer?.name ?? "Pelanggan Umum"}
              onChange={() => setStep("customer")}
            />

            <div className="rounded-2xl border border-dashed border-border p-4">
              <div className="flex items-center justify-between text-sm text-ink-soft">
                <span>{totalQty} item</span>
                <span className="text-lg font-extrabold tabular-nums text-ink">
                  {formatRupiah(total)}
                </span>
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-ink-soft">
                Metode pembayaran{" "}
                {isHutang && <span className="text-danger">(wajib pilih pelanggan)</span>}
              </p>
              <div className="grid grid-cols-4 gap-2">
                {PAYMENTS.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
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

            {isHutang && !customerId && (
              <button
                type="button"
                onClick={() => setStep("customer")}
                className="flex items-center justify-between rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger"
              >
                <span>Transaksi hutang wajib memilih pelanggan.</span>
                <span className="font-semibold underline">Pilih</span>
              </button>
            )}

            {error && (
              <p className="rounded-xl bg-danger-soft px-4 py-2.5 text-sm text-danger">
                {error}
              </p>
            )}

            <div className="sticky bottom-0 -mx-5 mt-1 border-t border-border bg-surface px-5 pt-3">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm text-ink-soft">Total Bayar</span>
                <span className="text-xl font-extrabold tabular-nums text-ink">
                  {formatRupiah(total)}
                </span>
              </div>
              <Button
                size="lg"
                className="w-full"
                loading={loading}
                onClick={handleSave}
                disabled={isHutang && !customerId}
              >
                Bayar {formatRupiah(total)}
              </Button>
            </div>
          </>
        )}
      </div>
    </Sheet>
  );
}

function SelectedCustomerBanner({
  name,
  onChange,
}: {
  name: string;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="flex items-center gap-2.5 rounded-xl bg-primary-soft px-3.5 py-2.5 text-left"
    >
      <User className="h-4 w-4 shrink-0 text-primary" />
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-primary">
        {name}
      </span>
      <span className="shrink-0 text-xs font-semibold text-primary/70 underline">
        Ganti
      </span>
    </button>
  );
}
