"use server";

import { createClient } from "@/lib/supabase/server";
import { requireWarungAccess } from "@/lib/action-guard";
import type { Customer } from "@/lib/types/database";
import { revalidatePath } from "next/cache";

export interface CustomerFormState {
  error?: string;
  id?: string;
}

export async function createCustomer(input: {
  name: string;
  phone: string;
  note: string;
}): Promise<CustomerFormState> {
  const access = await requireWarungAccess("pelanggan");
  if (!access.ok) return { error: access.error };
  const { warung } = access;

  if (!input.name.trim()) return { error: "Nama pelanggan wajib diisi." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .insert({
      warung_id: warung.id,
      name: input.name.trim(),
      phone: input.phone.trim() || null,
      note: input.note.trim() || null,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidatePath("/pelanggan");
  revalidatePath("/transaksi");
  return { id: data?.id };
}

export async function updateCustomer(
  id: string,
  input: { name: string; phone: string; note: string }
): Promise<CustomerFormState> {
  const access = await requireWarungAccess("pelanggan");
  if (!access.ok) return { error: access.error };

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
  const access = await requireWarungAccess("pelanggan");
  if (!access.ok) return { error: access.error };

  const supabase = await createClient();
  await supabase.from("customers").delete().eq("id", id);
  revalidatePath("/pelanggan");
  revalidatePath("/transaksi");
  return {};
}

/**
 * Server-side search dipakai oleh CustomerPicker di halaman transaksi.
 * Tidak dibatasi oleh limit daftar "browse" awal (100), jadi pelanggan
 * lama/di luar limit tetap bisa ditemukan lewat pencarian nama/HP.
 *
 * Gated by "transaksi" (not "pelanggan") on purpose: a cashier can't open
 * the Pelanggan management page, but still needs to attach an existing
 * customer to a sale — this is a read-only lookup inside the sales flow,
 * not customer-list management.
 */
export async function searchCustomers(query: string): Promise<Customer[]> {
  const access = await requireWarungAccess("transaksi");
  if (!access.ok) return [];
  const { warung } = access;

  const q = query.trim();
  if (!q) return [];

  const supabase = await createClient();
  const pattern = `%${q.replace(/[%_]/g, (m) => `\\${m}`)}%`;

  const [byName, byPhone] = await Promise.all([
    supabase
      .from("customers")
      .select("*")
      .eq("warung_id", warung.id)
      .ilike("name", pattern)
      .order("name")
      .limit(20),
    supabase
      .from("customers")
      .select("*")
      .eq("warung_id", warung.id)
      .ilike("phone", pattern)
      .order("name")
      .limit(20),
  ]);

  const byId = new Map<string, Customer>();
  for (const c of [...(byName.data ?? []), ...(byPhone.data ?? [])]) {
    byId.set(c.id, c);
  }
  return Array.from(byId.values()).slice(0, 20);
}
