"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndWarung } from "@/lib/warung";
import type { PaymentMethod, TransactionStatus } from "@/lib/types/database";
import { revalidatePath } from "next/cache";

export interface CartLine {
  menuItemId: string;
  name: string;
  price: number;
  qty: number;
}

export interface TransactionFormState {
  error?: string;
}

export async function createTransaction(input: {
  customerId: string | null;
  paymentMethod: PaymentMethod;
  items: CartLine[];
}): Promise<TransactionFormState> {
  const { warung, userId } = await getCurrentUserAndWarung();
  if (!warung) return { error: "Warung tidak ditemukan." };
  if (input.items.length === 0) {
    return { error: "Pilih minimal satu menu." };
  }
  if (input.paymentMethod === "hutang" && !input.customerId) {
    return { error: "Transaksi hutang wajib memilih nama pelanggan." };
  }

  const total = input.items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const status: TransactionStatus =
    input.paymentMethod === "hutang" ? "unpaid" : "paid";

  const supabase = await createClient();

  const { data: tx, error: txError } = await supabase
    .from("transactions")
    .insert({
      warung_id: warung.id,
      customer_id: input.customerId,
      payment_method: input.paymentMethod,
      status,
      total,
      created_by: userId,
    })
    .select("id")
    .single();

  if (txError || !tx) {
    return { error: txError?.message ?? "Gagal menyimpan transaksi." };
  }

  const { error: itemsError } = await supabase.from("transaction_items").insert(
    input.items.map((i) => ({
      transaction_id: tx.id,
      menu_item_id: i.menuItemId,
      menu_name: i.name,
      price: i.price,
      qty: i.qty,
      subtotal: i.price * i.qty,
    }))
  );

  if (itemsError) {
    // best-effort rollback
    await supabase.from("transactions").delete().eq("id", tx.id);
    return { error: itemsError.message };
  }

  revalidatePath("/transaksi");
  revalidatePath("/dashboard");
  revalidatePath("/laporan");
  return {};
}

export async function markTransactionPaid(id: string) {
  const supabase = await createClient();
  await supabase.from("transactions").update({ status: "paid" }).eq("id", id);
  revalidatePath("/transaksi");
  revalidatePath("/dashboard");
  revalidatePath("/laporan");
  revalidatePath("/pelanggan");
}

export async function markAllPaidForCustomer(customerId: string) {
  const { warung } = await getCurrentUserAndWarung();
  if (!warung) return;
  const supabase = await createClient();
  await supabase
    .from("transactions")
    .update({ status: "paid" })
    .eq("warung_id", warung.id)
    .eq("customer_id", customerId)
    .eq("status", "unpaid");
  revalidatePath("/transaksi");
  revalidatePath("/dashboard");
  revalidatePath("/laporan");
  revalidatePath("/pelanggan");
}

export async function deleteTransaction(id: string) {
  const supabase = await createClient();
  await supabase.from("transactions").delete().eq("id", id);
  revalidatePath("/transaksi");
  revalidatePath("/dashboard");
  revalidatePath("/laporan");
}
