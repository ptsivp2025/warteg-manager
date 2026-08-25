"use client";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Card";
import type { Ingredient, Unit } from "@/lib/types/database";
import { formatRupiah } from "@/lib/utils";
import { PackagePlus, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { deleteIngredient, toggleIngredientActive } from "./actions";
import { AdjustStockSheet } from "./AdjustStockSheet";
import { IngredientFormSheet } from "./IngredientFormSheet";

export function IngredientList({
  ingredients,
  units,
}: {
  ingredients: Ingredient[];
  units: Unit[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Ingredient | null>(null);
  const [adjusting, setAdjusting] = useState<Ingredient | null>(null);
  const [creating, setCreating] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const unitById = useMemo(() => {
    const map = new Map<string, Unit>();
    for (const u of units) map.set(u.id, u);
    return map;
  }, [units]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ingredients;
    return ingredients.filter((i) => i.name.toLowerCase().includes(q));
  }, [ingredients, query]);

  async function handleDelete(item: Ingredient) {
    if (
      !confirm(
        `Hapus bahan baku "${item.name}"? Bahan yang sudah dipakai di resep tidak bisa dihapus.`
      )
    )
      return;
    setPendingId(item.id);
    const result = await deleteIngredient(item.id);
    setPendingId(null);
    if (result?.error) {
      alert(result.error);
      return;
    }
    router.refresh();
  }

  async function handleToggle(item: Ingredient) {
    setPendingId(item.id);
    await toggleIngredientActive(item.id, !item.is_active);
    setPendingId(null);
    router.refresh();
  }

  if (ingredients.length === 0) {
    return (
      <>
        <EmptyState
          title="Belum ada bahan baku"
          description="Tambahkan bahan baku (beras, minyak, ayam, dst) untuk mulai hitung HPP lewat resep."
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> Tambah Bahan Baku
            </Button>
          }
        />
        <IngredientFormSheet
          open={creating}
          onClose={() => setCreating(false)}
          ingredient={null}
          units={units}
        />
      </>
    );
  }

  return (
    <>
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari bahan baku..."
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

      <div className="flex flex-col gap-2">
        {filtered.map((item) => {
          const unit = unitById.get(item.base_unit_id);
          const lowStock = item.min_stock > 0 && item.current_stock <= item.min_stock;
          return (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3"
            >
              <button
                onClick={() => handleToggle(item)}
                disabled={pendingId === item.id}
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase transition-colors disabled:opacity-70 ${
                  item.is_active
                    ? "bg-primary-soft text-primary"
                    : "bg-danger-soft text-danger"
                }`}
              >
                {item.is_active ? "Aktif" : "Nonaktif"}
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-ink">
                  {item.name}
                </p>
                <div className="flex flex-wrap items-center gap-x-2 text-sm text-ink-soft">
                  <span>{formatRupiah(item.cost_per_base_unit)}/{unit?.code}</span>
                  <span className="text-ink-faint">·</span>
                  <span className={lowStock ? "font-semibold text-danger" : undefined}>
                    Stok: {item.current_stock} {unit?.code}
                  </span>
                  {lowStock && (
                    <span className="rounded-full bg-danger-soft px-2 py-0.5 text-[10px] font-bold uppercase text-danger">
                      Stok menipis
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setAdjusting(item)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary active:bg-primary/20"
                aria-label="Sesuaikan Stok"
                title="Sesuaikan Stok"
              >
                <PackagePlus className="h-4 w-4" />
              </button>
              <button
                onClick={() => setEditing(item)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/5 text-ink-soft active:bg-black/10"
                aria-label="Ubah"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDelete(item)}
                disabled={pendingId === item.id}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger active:bg-danger/20"
                aria-label="Hapus"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-30 md:bottom-6 flex justify-center">
        <div className="flex w-full max-w-md justify-end px-5">
          <button
            onClick={() => setCreating(true)}
            className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-accent/40 active:bg-accent/90"
            aria-label="Tambah bahan baku"
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>
      </div>

      <IngredientFormSheet
        open={creating || !!editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        ingredient={editing}
        units={units}
      />
      <AdjustStockSheet
        open={!!adjusting}
        onClose={() => setAdjusting(null)}
        ingredient={adjusting}
        units={units}
      />
    </>
  );
}
