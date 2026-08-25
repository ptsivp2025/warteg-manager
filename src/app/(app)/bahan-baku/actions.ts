"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndWarung } from "@/lib/warung";
import { revalidatePath } from "next/cache";

export interface IngredientFormState {
  error?: string;
}

export async function createIngredient(input: {
  name: string;
  baseUnitId: string;
  costPerBaseUnit: number;
  minStock: number;
}): Promise<IngredientFormState> {
  const { warung } = await getCurrentUserAndWarung();
  if (!warung) return { error: "Warung tidak ditemukan." };
  if (!input.name.trim()) return { error: "Nama bahan baku wajib diisi." };
  if (!input.baseUnitId) return { error: "Satuan wajib dipilih." };
  if (input.costPerBaseUnit < 0) return { error: "Harga tidak valid." };

  const supabase = await createClient();
  const { error } = await supabase.from("ingredients").insert({
    warung_id: warung.id,
    name: input.name.trim(),
    base_unit_id: input.baseUnitId,
    cost_per_base_unit: input.costPerBaseUnit,
    min_stock: Math.max(0, input.minStock),
  });
  if (error) return { error: error.message };

  revalidatePath("/bahan-baku");
  revalidatePath("/menu");
  return {};
}

export async function updateIngredient(
  id: string,
  input: {
    name: string;
    baseUnitId: string;
    costPerBaseUnit: number;
    minStock: number;
  }
): Promise<IngredientFormState> {
  if (!input.name.trim()) return { error: "Nama bahan baku wajib diisi." };
  if (!input.baseUnitId) return { error: "Satuan wajib dipilih." };
  if (input.costPerBaseUnit < 0) return { error: "Harga tidak valid." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("ingredients")
    .update({
      name: input.name.trim(),
      base_unit_id: input.baseUnitId,
      cost_per_base_unit: input.costPerBaseUnit,
      min_stock: Math.max(0, input.minStock),
    })
    .eq("id", id);
  if (error) return { error: error.message };

  // Ingredient cost feeds HPP of every menu item that uses it — the
  // trigger on ingredients.cost_per_base_unit already recomputes HPP
  // server-side; we just need the page to show the fresh numbers.
  revalidatePath("/bahan-baku");
  revalidatePath("/menu");
  return {};
}

export async function toggleIngredientActive(id: string, isActive: boolean) {
  const supabase = await createClient();
  await supabase.from("ingredients").update({ is_active: isActive }).eq("id", id);
  revalidatePath("/bahan-baku");
}

export async function deleteIngredient(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("ingredients").delete().eq("id", id);
  revalidatePath("/bahan-baku");
  revalidatePath("/menu");
  if (error) return { error: error.message };
  return {};
}

export interface AdjustStockState {
  error?: string;
  newStock?: number;
}

export async function adjustIngredientStock(
  id: string,
  quantityChange: number,
  type: "purchase" | "adjustment" | "waste" | "opening",
  reason: string
): Promise<AdjustStockState> {
  const { warung } = await getCurrentUserAndWarung();
  if (!warung) return { error: "Warung tidak ditemukan." };
  if (!Number.isFinite(quantityChange) || quantityChange === 0) {
    return { error: "Jumlah tidak valid." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("adjust_ingredient_stock", {
    _warung_id: warung.id,
    _ingredient_id: id,
    _quantity_change: quantityChange,
    _type: type,
    _reason: reason.trim() || null,
  });
  if (error) return { error: error.message };

  revalidatePath("/bahan-baku");
  return { newStock: data ?? undefined };
}
