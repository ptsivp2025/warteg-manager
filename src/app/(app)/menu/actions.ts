"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndWarung } from "@/lib/warung";
import { revalidatePath } from "next/cache";

export interface MenuFormState {
  error?: string;
}

export async function createMenuItem(input: {
  name: string;
  price: number;
  category: string;
}): Promise<MenuFormState> {
  const { warung } = await getCurrentUserAndWarung();
  if (!warung) return { error: "Warung tidak ditemukan." };
  if (!input.name.trim()) return { error: "Nama menu wajib diisi." };
  if (input.price < 0) return { error: "Harga tidak valid." };

  const supabase = await createClient();
  const { error } = await supabase.from("menu_items").insert({
    warung_id: warung.id,
    name: input.name.trim(),
    price: input.price,
    category: input.category.trim() || "Lainnya",
  });
  if (error) return { error: error.message };

  revalidatePath("/menu");
  revalidatePath("/transaksi");
  return {};
}

export async function updateMenuItem(
  id: string,
  input: { name: string; price: number; category: string }
): Promise<MenuFormState> {
  if (!input.name.trim()) return { error: "Nama menu wajib diisi." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("menu_items")
    .update({
      name: input.name.trim(),
      price: input.price,
      category: input.category.trim() || "Lainnya",
    })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/menu");
  revalidatePath("/transaksi");
  return {};
}

export async function toggleMenuItemActive(id: string, isActive: boolean) {
  const supabase = await createClient();
  await supabase.from("menu_items").update({ is_active: isActive }).eq("id", id);
  revalidatePath("/menu");
  revalidatePath("/transaksi");
}

export async function deleteMenuItem(id: string) {
  const supabase = await createClient();
  await supabase.from("menu_items").delete().eq("id", id);
  revalidatePath("/menu");
  revalidatePath("/transaksi");
}
