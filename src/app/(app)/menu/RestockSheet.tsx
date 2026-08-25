"use client";

import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Sheet } from "@/components/ui/Sheet";
import type { MenuItem } from "@/lib/types/database";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { restockMenuItem } from "./actions";

const REASON_PRESETS = ["Produksi baru", "Kiriman supplier", "Koreksi stok"];

export function RestockSheet({
  open,
  onClose,
  item,
}: {
  open: boolean;
  onClose: () => void;
  item: MenuItem | null;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState(REASON_PRESETS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setAmount("");
    setReason(REASON_PRESETS[0]);
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  if (!item) return null;

  const addQty = Math.max(0, Number(amount) || 0);
  const afterStock = item.stock_quantity + addQty;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!item) return;
    setError(null);
    if (addQty <= 0) {
      setError("Jumlah tambah stok harus lebih dari 0.");
      return;
    }
    setLoading(true);
    const result = await restockMenuItem(item.id, addQty, reason);
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
    <Sheet open={open} onClose={handleClose} title="Tambah Stok">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 pb-2">
        <div className="rounded-2xl bg-primary-soft px-4 py-3">
          <p className="text-sm font-semibold text-ink">{item.name}</p>
          <p className="text-xs text-ink-soft">
            Stok saat ini: {item.stock_quantity} {item.stock_unit}
          </p>
        </div>

        <Field label={`Tambah (${item.stock_unit})`}>
          <Input
            autoFocus
            type="number"
            inputMode="numeric"
            min={1}
            placeholder="20"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>

        <Field label="Alasan">
          <div className="flex flex-wrap gap-2">
            {REASON_PRESETS.map((r) => (
              <button
                type="button"
                key={r}
                onClick={() => setReason(r)}
                className={`h-9 rounded-full px-3.5 text-sm font-medium transition-colors ${
                  reason === r
                    ? "bg-primary text-white"
                    : "bg-primary-soft text-primary/70"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </Field>

        <div className="flex items-center justify-between rounded-xl border border-dashed border-border px-4 py-3 text-sm">
          <span className="text-ink-soft">Setelah</span>
          <span className="font-bold tabular-nums text-ink">
            {afterStock} {item.stock_unit}
          </span>
        </div>

        {error && (
          <p className="rounded-xl bg-danger-soft px-4 py-2.5 text-sm text-danger">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={handleClose}
            disabled={loading}
          >
            Batal
          </Button>
          <Button type="submit" className="flex-1" loading={loading}>
            {loading ? "Menyimpan..." : "Tambah Stok"}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
