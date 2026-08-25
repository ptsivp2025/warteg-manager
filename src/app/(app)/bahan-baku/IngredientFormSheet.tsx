"use client";

import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Sheet } from "@/components/ui/Sheet";
import type { Ingredient, Unit } from "@/lib/types/database";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createIngredient, updateIngredient } from "./actions";

export function IngredientFormSheet({
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
  const [name, setName] = useState("");
  const [baseUnitId, setBaseUnitId] = useState("");
  const [cost, setCost] = useState("");
  const [minStock, setMinStock] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(ingredient?.name ?? "");
      setBaseUnitId(ingredient?.base_unit_id ?? units[0]?.id ?? "");
      setCost(ingredient ? String(ingredient.cost_per_base_unit) : "");
      setMinStock(ingredient ? String(ingredient.min_stock) : "0");
      setError(null);
    }
  }, [open, ingredient, units]);

  const selectedUnit = units.find((u) => u.id === baseUnitId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const input = {
      name,
      baseUnitId,
      costPerBaseUnit: Number(cost) || 0,
      minStock: Number(minStock) || 0,
    };
    const result = ingredient
      ? await updateIngredient(ingredient.id, input)
      : await createIngredient(input);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={ingredient ? "Ubah Bahan Baku" : "Tambah Bahan Baku"}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 pb-2">
        <Field label="Nama bahan baku">
          <Input
            autoFocus
            placeholder="Beras, Minyak Goreng, Ayam..."
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>

        <Field label="Satuan dasar (untuk stok & harga)">
          <select
            value={baseUnitId}
            onChange={(e) => setBaseUnitId(e.target.value)}
            className="h-12 w-full rounded-xl border border-border bg-surface px-4 text-[15px] text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          >
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.code})
              </option>
            ))}
          </select>
        </Field>

        <Field label={`Harga per ${selectedUnit?.code ?? "satuan"} (Rp)`}>
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            placeholder="15000"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
          />
        </Field>

        <Field
          label={`Stok minimum (${selectedUnit?.code ?? ""})`}
          hint="Dipakai untuk peringatan stok menipis."
        >
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            placeholder="0"
            value={minStock}
            onChange={(e) => setMinStock(e.target.value)}
          />
        </Field>

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
