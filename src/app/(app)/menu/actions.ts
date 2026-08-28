"use server";

import { createClient } from "@/lib/supabase/server";
import { requireWarungAccess } from "@/lib/action-guard";
import { revalidatePath } from "next/cache";

export interface MenuFormState {
  error?: string;
}

export async function createMenuItem(input: {
  name: string;
  price: number;
  category: string;
  stockQuantity: number;
  stockUnit: string;
}): Promise<MenuFormState> {
  const access = await requireWarungAccess("menu");
  if (!access.ok) return { error: access.error };
  const { warung } = access;

  if (!input.name.trim()) return { error: "Nama menu wajib diisi." };
  if (input.price < 0) return { error: "Harga tidak valid." };
  if (input.stockQuantity < 0) return { error: "Stok tidak valid." };
  if (!input.stockUnit.trim()) return { error: "Satuan stok wajib diisi." };

  const supabase = await createClient();
  const { error } = await supabase.from("menu_items").insert({
    warung_id: warung.id,
    name: input.name.trim(),
    price: input.price,
    category: input.category.trim() || "Lainnya",
    stock_quantity: input.stockQuantity,
    stock_unit: input.stockUnit.trim(),
  });
  if (error) return { error: error.message };

  revalidatePath("/menu");
  revalidatePath("/transaksi");
  return {};
}

// Catatan: stock_quantity SENGAJA tidak bisa diubah lewat form edit ini.
// Menambah stok wajib lewat restockMenuItem (action "Tambah Stok") supaya
// tercatat sebagai stock movement dan bersifat additive (17 + 20 = 37),
// bukan menimpa langsung ke angka baru.
export async function updateMenuItem(
  id: string,
  input: { name: string; price: number; category: string; stockUnit: string }
): Promise<MenuFormState> {
  const access = await requireWarungAccess("menu");
  if (!access.ok) return { error: access.error };

  if (!input.name.trim()) return { error: "Nama menu wajib diisi." };
  if (!input.stockUnit.trim()) return { error: "Satuan stok wajib diisi." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("menu_items")
    .update({
      name: input.name.trim(),
      price: input.price,
      category: input.category.trim() || "Lainnya",
      stock_unit: input.stockUnit.trim(),
    })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/menu");
  revalidatePath("/transaksi");
  return {};
}

export interface RestockState {
  error?: string;
  newStock?: number;
}

export async function restockMenuItem(
  id: string,
  quantity: number,
  reason: string
): Promise<RestockState> {
  const access = await requireWarungAccess("menu");
  if (!access.ok) return { error: access.error };
  const { warung } = access;

  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { error: "Jumlah tambah stok tidak valid." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("restock_menu_item", {
    _warung_id: warung.id,
    _menu_item_id: id,
    _quantity: quantity,
    _reason: reason.trim() || null,
  });
  if (error) return { error: error.message };

  revalidatePath("/menu");
  revalidatePath("/transaksi");
  return { newStock: data ?? undefined };
}

export async function toggleMenuItemActive(id: string, isActive: boolean) {
  const access = await requireWarungAccess("menu");
  if (!access.ok) return { error: access.error };

  const supabase = await createClient();
  await supabase.from("menu_items").update({ is_active: isActive }).eq("id", id);
  revalidatePath("/menu");
  revalidatePath("/transaksi");
  return {};
}

/**
 * Bulk-set availability (is_active) for all menu items in the current warung,
 * optionally scoped to a single category. Reuses the existing `is_active`
 * column — it already represents "tersedia/kosong" for menu items (see
 * MenuList's Tersedia/Kosong toggle), so no schema change is needed here.
 */
export async function bulkSetMenuAvailability(
  isActive: boolean,
  category?: string
) {
  const access = await requireWarungAccess("menu");
  if (!access.ok) return { error: access.error };
  const { warung } = access;

  const supabase = await createClient();
  let query = supabase
    .from("menu_items")
    .update({ is_active: isActive })
    .eq("warung_id", warung.id);
  if (category) query = query.eq("category", category);

  const { error } = await query;
  if (error) return { error: error.message };

  revalidatePath("/menu");
  revalidatePath("/transaksi");
  return {};
}

export async function deleteMenuItem(id: string) {
  const access = await requireWarungAccess("menu");
  if (!access.ok) return { error: access.error };

  const supabase = await createClient();
  await supabase.from("menu_items").delete().eq("id", id);
  revalidatePath("/menu");
  revalidatePath("/transaksi");
  return {};
}
