"use server";

import { createClient } from "@/lib/supabase/server";
import { requireWarungAccess } from "@/lib/action-guard";
import { revalidatePath } from "next/cache";

export interface RecipeState {
  error?: string;
}

/**
 * Ensures a recipe row exists for this menu item and returns its id.
 * A recipe is just a BOM header (menu_item_id unique) — recipe_items
 * hold the actual ingredient lines.
 */
export async function ensureRecipe(menuItemId: string): Promise<{
  recipeId?: string;
  error?: string;
}> {
  const access = await requireWarungAccess("menu");
  if (!access.ok) return { error: access.error };
  const { warung } = access;

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("recipes")
    .select("id")
    .eq("menu_item_id", menuItemId)
    .maybeSingle();

  if (existing) return { recipeId: existing.id };

  const { data, error } = await supabase
    .from("recipes")
    .insert({ warung_id: warung.id, menu_item_id: menuItemId })
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { recipeId: data.id };
}

export async function addRecipeItem(input: {
  recipeId: string;
  ingredientId: string;
  quantity: number;
  unitId: string;
}): Promise<RecipeState> {
  const access = await requireWarungAccess("menu");
  if (!access.ok) return { error: access.error };

  if (input.quantity <= 0) return { error: "Jumlah harus lebih dari 0." };

  const supabase = await createClient();
  const { error } = await supabase.from("recipe_items").insert({
    recipe_id: input.recipeId,
    ingredient_id: input.ingredientId,
    quantity: input.quantity,
    unit_id: input.unitId,
  });
  if (error) {
    if (error.code === "23505") {
      return { error: "Bahan ini sudah ada di resep. Ubah lewat baris yang ada." };
    }
    return { error: error.message };
  }

  revalidatePath("/menu");
  return {};
}

export async function updateRecipeItem(
  id: string,
  input: { quantity: number; unitId: string }
): Promise<RecipeState> {
  const access = await requireWarungAccess("menu");
  if (!access.ok) return { error: access.error };

  if (input.quantity <= 0) return { error: "Jumlah harus lebih dari 0." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("recipe_items")
    .update({ quantity: input.quantity, unit_id: input.unitId })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/menu");
  return {};
}

export async function removeRecipeItem(id: string): Promise<RecipeState> {
  const access = await requireWarungAccess("menu");
  if (!access.ok) return { error: access.error };

  const supabase = await createClient();
  const { error } = await supabase.from("recipe_items").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/menu");
  return {};
}
