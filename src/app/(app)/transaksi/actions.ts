"use server";

import { createClient } from "@/lib/supabase/server";
import { requireWarungAccess, requireAnyWarungAccess } from "@/lib/action-guard";
import type { PaymentMethod, TransactionStatus } from "@/lib/types/database";
import { revalidatePath } from "next/cache";

// Client hanya boleh mengirim menu_item_id + qty. Nama & harga
// TIDAK dikirim ke server — server (RPC create_transaction) yang
// mengambil harga resmi dari menu_items dan menghitung subtotal/total.
export interface CartLine {
  menuItemId: string;
  name: string;
  price: number;
  qty: number;
}

export interface ReceiptTransaction {
  id: string;
  total: number;
  status: TransactionStatus;
  createdAt: string;
  items: {
    menuItemId: string | null;
    name: string;
    price: number;
    qty: number;
    subtotal: number;
  }[];
}

export interface TransactionFormState {
  error?: string;
  transaction?: ReceiptTransaction;
}

export async function createTransaction(input: {
  customerId: string | null;
  paymentMethod: PaymentMethod;
  items: { menuItemId: string; qty: number }[];
}): Promise<TransactionFormState> {
  const access = await requireWarungAccess("transaksi");
  if (!access.ok) return { error: access.error };
  const { warung } = access;

  if (input.items.length === 0) {
    return { error: "Pilih minimal satu menu." };
  }

  const supabase = await createClient();

  // Semua price integrity / availability / ownership / atomicity
  // checks dilakukan di dalam database function ini, bukan di sini.
  const { data: txId, error: rpcError } = await supabase.rpc(
    "create_transaction",
    {
      _warung_id: warung.id,
      _customer_id: input.customerId,
      _payment_method: input.paymentMethod,
      _items: input.items.map((i) => ({
        menu_item_id: i.menuItemId,
        qty: i.qty,
      })),
    }
  );

  if (rpcError || !txId) {
    return { error: rpcError?.message ?? "Gagal menyimpan transaksi." };
  }

  revalidatePath("/transaksi");
  revalidatePath("/dashboard");
  revalidatePath("/laporan");

  // Ambil kembali data transaksi yang benar-benar tersimpan (harga
  // resmi dari server) untuk ditampilkan sebagai struk — jangan
  // percaya angka dari cart client untuk struk.
  const { data: tx } = await supabase
    .from("transactions")
    .select(
      "id, total, status, created_at, transaction_items(menu_item_id, menu_name, price, qty, subtotal)"
    )
    .eq("id", txId)
    .single();

  if (!tx) return {};

  return {
    transaction: {
      id: tx.id,
      total: tx.total,
      status: tx.status as TransactionStatus,
      createdAt: tx.created_at,
      items: (tx.transaction_items as unknown as {
        menu_item_id: string | null;
        menu_name: string;
        price: number;
        qty: number;
        subtotal: number;
      }[]).map((it) => ({
        menuItemId: it.menu_item_id,
        name: it.menu_name,
        price: it.price,
        qty: it.qty,
        subtotal: it.subtotal,
      })),
    },
  };
}

// Reachable both from /transaksi and from a customer's detail page under
// /pelanggan, so either permission is enough — see requireAnyWarungAccess.
export async function markTransactionPaid(id: string) {
  const access = await requireAnyWarungAccess(["transaksi", "pelanggan"]);
  if (!access.ok) return { error: access.error };

  const supabase = await createClient();
  await supabase.from("transactions").update({ status: "paid" }).eq("id", id);
  revalidatePath("/transaksi");
  revalidatePath("/dashboard");
  revalidatePath("/laporan");
  revalidatePath("/pelanggan");
  return {};
}

export async function markAllPaidForCustomer(customerId: string) {
  const access = await requireAnyWarungAccess(["transaksi", "pelanggan"]);
  if (!access.ok) return { error: access.error };
  const { warung } = access;

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
  return {};
}

export async function deleteTransaction(id: string) {
  const access = await requireWarungAccess("transaksi");
  if (!access.ok) return { error: access.error };

  const supabase = await createClient();
  await supabase.from("transactions").delete().eq("id", id);
  revalidatePath("/transaksi");
  revalidatePath("/dashboard");
  revalidatePath("/laporan");
  return {};
}
