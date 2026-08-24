"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndWarung } from "@/lib/warung";
import { revalidatePath } from "next/cache";

export interface CustomerFormState {
  error?: string;
}

export async function createCustomer(input: {
  name: string;
  phone: string;
  note: string;
}): Promise<CustomerFormState> {
  const { warung } = await getCurrentUserAndWarung();
  if (!warung) return { error: "Warung tidak ditemukan." };
  if (!input.name.trim()) return { error: "Nama pelanggan wajib diisi." };

  const supabase = await createClient();
  const { error } = await supabase.from("customers").insert({
    warung_id: warung.id,
    name: input.name.trim(),
    phone: input.phone.trim() || null,
    note: input.note.trim() || null,
  });
  if (error) return { error: error.message };

  revalidatePath("/pelanggan");
  revalidatePath("/transaksi");
  return {};
}

export async function updateCustomer(
  id: string,
  input: { name: string; phone: string; note: string }
): Promise<CustomerFormState> {
  if (!input.name.trim()) return { error: "Nama pelanggan wajib diisi." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .update({
      name: input.name.trim(),
      phone: input.phone.trim() || null,
      note: input.note.trim() || null,
    })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/pelanggan");
  revalidatePath("/transaksi");
  return {};
}

export async function deleteCustomer(id: string) {
  const supabase = await createClient();
  await supabase.from("customers").delete().eq("id", id);
  revalidatePath("/pelanggan");
  revalidatePath("/transaksi");
}
