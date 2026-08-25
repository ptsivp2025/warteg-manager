"use client";

import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { createClient } from "@/lib/supabase/client";
import type { Ingredient, MenuItem, Unit } from "@/lib/types/database";
import { cn, formatRupiah } from "@/lib/utils";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  addRecipeItem,
  ensureRecipe,
  removeRecipeItem,
} from "./recipe-actions";

interface RecipeLine {
  id: string;
  ingredient_id: string;
  quantity: number;
  unit_id: string;
}

export function RecipeSheet({
  open,
  onClose,
  item,
  ingredients,
  units,
}: {
  open: boolean;
  onClose: () => void;
  item: MenuItem | null;
  ingredients: Ingredient[];
  units: Unit[];
}) {
  const [recipeId, setRecipeId] = useState<string | null>(null);
  const [lines, setLines] = useState<RecipeLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add-line form
  const [newIngredientId, setNewIngredientId] = useState("");
  const [newQty, setNewQty] = useState("");
  const [newUnitId, setNewUnitId] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!open || !item) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      const supabase = createClient();
      const { data: recipe } = await supabase
        .from("recipes")
        .select("id")
        .eq("menu_item_id", item.id)
        .maybeSingle();

      if (cancelled) return;

      if (!recipe) {
        setRecipeId(null);
        setLines([]);
        setLoading(false);
        return;
      }

      const { data: items } = await supabase
        .from("recipe_items")
        .select("id, ingredient_id, quantity, unit_id")
        .eq("recipe_id", recipe.id);

      if (cancelled) return;
      setRecipeId(recipe.id);
      setLines(items ?? []);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [open, item]);

  useEffect(() => {
    if (open && ingredients[0]) {
      setNewIngredientId(ingredients[0].id);
      setNewUnitId(ingredients[0].base_unit_id);
    }
  }, [open, ingredients]);

  if (!item) return null;

  const ingredientById = new Map(ingredients.map((i) => [i.id, i]));
  const unitById = new Map(units.map((u) => [u.id, u]));

  // Client-side preview of HPP: authoritative value is recomputed
  // server-side by trigger and shown on the menu row (item.hpp) after
  // refresh; this is just live feedback while editing.
  function lineCost(line: RecipeLine): number {
    const ing = ingredientById.get(line.ingredient_id);
    const fromUnit = unitById.get(line.unit_id);
    const toUnit = ing ? unitById.get(ing.base_unit_id) : undefined;
    if (!ing || !fromUnit || !toUnit) return 0;
    if (fromUnit.category !== toUnit.category) return 0;
    const qtyInBase = (line.quantity * fromUnit.to_base_factor) / toUnit.to_base_factor;
    return qtyInBase * ing.cost_per_base_unit;
  }

  const totalHpp = lines.reduce((sum, l) => sum + lineCost(l), 0);
  const margin = item.price - totalHpp;
  const marginPct = item.price > 0 ? (margin / item.price) * 100 : 0;

  async function handleAddLine(e: React.FormEvent) {
    e.preventDefault();
    if (!item) return;
    setError(null);
    const qty = Number(newQty);
    if (!newIngredientId) {
      setError("Pilih bahan baku.");
      return;
    }
    if (!qty || qty <= 0) {
      setError("Jumlah harus lebih dari 0.");
      return;
    }

    setAdding(true);
    let rid = recipeId;
    if (!rid) {
      const result = await ensureRecipe(item.id);
      if (result.error || !result.recipeId) {
        setAdding(false);
        setError(result.error ?? "Gagal membuat resep.");
        return;
      }
      rid = result.recipeId;
      setRecipeId(rid);
    }

    const result = await addRecipeItem({
      recipeId: rid,
      ingredientId: newIngredientId,
      quantity: qty,
      unitId: newUnitId,
    });
    setAdding(false);
    if (result.error) {
      setError(result.error);
      return;
    }

    setLines((prev) => [
      ...prev,
      {
        id: `${rid}-${newIngredientId}`, // temp key until reload
        ingredient_id: newIngredientId,
        quantity: qty,
        unit_id: newUnitId,
      },
    ]);
    setNewQty("");
  }

  async function handleRemove(lineId: string) {
    setLines((prev) => prev.filter((l) => l.id !== lineId));
    await removeRecipeItem(lineId);
  }

  return (
    <Sheet open={open} onClose={onClose} title={`Resep — ${item.name}`}>
      <div className="flex flex-col gap-4 pb-2">
        {ingredients.length === 0 ? (
          <p className="rounded-xl bg-primary-soft px-4 py-3 text-sm text-ink-soft">
            Belum ada bahan baku aktif. Tambahkan dulu di halaman{" "}
            <span className="font-semibold text-ink">Bahan Baku</span> sebelum
            menyusun resep.
          </p>
        ) : (
          <>
            {loading ? (
              <div className="flex items-center justify-center py-8 text-ink-faint">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {lines.length === 0 ? (
                  <p className="text-sm text-ink-soft">
                    Belum ada bahan di resep ini.
                  </p>
                ) : (
                  lines.map((line) => {
                    const ing = ingredientById.get(line.ingredient_id);
                    const unit = unitById.get(line.unit_id);
                    return (
                      <div
                        key={line.id}
                        className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-ink">
                            {ing?.name ?? "Bahan dihapus"}
                          </p>
                          <p className="text-xs text-ink-soft">
                            {line.quantity} {unit?.code} ·{" "}
                            {formatRupiah(lineCost(line))}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemove(line.id)}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger active:bg-danger/20"
                          aria-label="Hapus dari resep"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            <form
              onSubmit={handleAddLine}
              className="flex flex-col gap-2 rounded-xl border border-dashed border-border p-3"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                Tambah bahan
              </p>
              <select
                value={newIngredientId}
                onChange={(e) => {
                  setNewIngredientId(e.target.value);
                  const ing = ingredientById.get(e.target.value);
                  if (ing) setNewUnitId(ing.base_unit_id);
                }}
                className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              >
                {ingredients.map((ing) => (
                  <option key={ing.id} value={ing.id}>
                    {ing.name}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  placeholder="Jumlah"
                  value={newQty}
                  onChange={(e) => setNewQty(e.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
                <select
                  value={newUnitId}
                  onChange={(e) => setNewUnitId(e.target.value)}
                  className="h-11 w-32 shrink-0 rounded-xl border border-border bg-surface px-2 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                >
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.code}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit" variant="secondary" size="md" loading={adding}>
                <Plus className="h-4 w-4" /> Tambah ke Resep
              </Button>
            </form>
          </>
        )}

        {error && (
          <p className="rounded-xl bg-danger-soft px-4 py-2.5 text-sm text-danger">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-1.5 rounded-xl bg-primary-soft px-4 py-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-soft">HPP (estimasi)</span>
            <span className="font-bold tabular-nums text-ink">
              {formatRupiah(totalHpp)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-soft">Harga jual</span>
            <span className="font-semibold tabular-nums text-ink">
              {formatRupiah(item.price)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-soft">Margin</span>
            <span
              className={cn(
                "font-bold tabular-nums",
                margin < 0 ? "text-danger" : "text-primary"
              )}
            >
              {formatRupiah(margin)} ({marginPct.toFixed(0)}%)
            </span>
          </div>
        </div>

        <p className="text-xs text-ink-faint">
          HPP di atas dan yang tersimpan di menu akan otomatis
          diperbarui setiap resep atau harga bahan berubah.
        </p>

        <Button variant="outline" onClick={onClose}>
          Tutup
        </Button>
      </div>
    </Sheet>
  );
}
