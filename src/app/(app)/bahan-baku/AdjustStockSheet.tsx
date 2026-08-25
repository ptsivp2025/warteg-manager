"use client";

import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Sheet } from "@/components/ui/Sheet";
import type { Ingredient, Unit } from "@/lib/types/database";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { adjustIngredientStock } from "./actions";

type MoveType = "purchase" | "adjustment" | "waste";

const TYPE_LABEL: Record<MoveType, string> = {
  purchase: "Belanja / Terima Barang",
  adjustment: "Koreksi Stok",
  waste: "Terbuang / Rusak",
};

export function AdjustStockSheet({
  open,
  onClose,
  ingredient,
  units,
}: {
  open: boolean;
  onClose: () => void;
  ingredient: Ingredient | null;
  units: Unit[];
}) {
  const router = useRouter();
  const [type, setType] = useState<MoveType>("purchase");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setType("purchase");
      setAmount("");
      setReason("");
      setError(null);
    }
  }, [open]);

  if (!ingredient) return null;

  const unit = units.find((u) => u.id === ingredient.base_unit_id);
  const qty = Math.abs(Number(amount) || 0);
  const signedQty = type === "purchase" ? qty : -qty;
  const afterStock = ingredient.current_stock + signedQty;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ingredient) return;
    setError(null);
    if (qty <= 0) {
      setError("Jumlah harus lebih dari 0.");
      return;
    }
    if (afterStock < 0) {
      setError("Stok tidak boleh menjadi negatif.");
      return;
    }
    setLoading(true);
    const result = await adjustIngredientStock(
      ingredient.id,
      signedQty,
      type,
      reason
    );
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title="Sesuaikan Stok Bahan">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 pb-2">
        <div className="rounded-2xl bg-primary-soft px-4 py-3">
          <p className="text-sm font-semibold text-ink">{ingredient.name}</p>
          <p className="text-xs text-ink-soft">
            Stok saat ini: {ingredient.current_stock} {unit?.code}
          </p>
        </div>

        <Field label="Jenis pergerakan">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(TYPE_LABEL) as MoveType[]).map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => setType(t)}
                className={cn(
                  "h-9 rounded-full px-3.5 text-sm font-medium transition-colors",
                  type === t
                    ? "bg-primary text-white"
                    : "bg-primary-soft text-primary/70"
                )}
              >
                {TYPE_LABEL[t]}
              </button>
            ))}
          </div>
        </Field>

        <Field label={`Jumlah (${unit?.code ?? ""})`}>
          <Input
            autoFocus
            type="number"
            inputMode="decimal"
            min={0}
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>

        <Field label="Catatan (opsional)">
          <Input
            placeholder="Beli di Pasar Induk, Sisa nasi basi, ..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>

        <div className="flex items-center justify-between rounded-xl border border-dashed border-border px-4 py-3 text-sm">
          <span className="text-ink-soft">Setelah</span>
          <span
            className={cn(
              "font-bold tabular-nums",
              afterStock < 0 ? "text-danger" : "text-ink"
            )}
          >
            {afterStock} {unit?.code}
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
            onClick={onClose}
            disabled={loading}
          >
            Batal
          </Button>
          <Button type="submit" className="flex-1" loading={loading}>
            {loading ? "Menyimpan..." : "Simpan"}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
