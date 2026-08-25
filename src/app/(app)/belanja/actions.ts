"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndWarung } from "@/lib/warung";
import { revalidatePath } from "next/cache";

export interface ExpenseFormState {
  error?: string;
}

export async function createExpense(input: {
  category: string;
  description: string;
  amount: number;
  expenseDate: string;
}): Promise<ExpenseFormState> {
  const { warung } = await getCurrentUserAndWarung();
  if (!warung) return { error: "Warung tidak ditemukan." };
  if (input.amount <= 0) return { error: "Jumlah belanja tidak valid." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("expenses").insert({
    warung_id: warung.id,
    category: input.category.trim() || "Belanja",
    description: input.description.trim() || null,
    amount: input.amount,
    expense_date: input.expenseDate,
    created_by: user?.id ?? null,
  });
  if (error) return { error: error.message };

  revalidatePath("/belanja");
  revalidatePath("/dashboard");
  revalidatePath("/laporan");
  return {};
}

export async function deleteExpense(id: string) {
  const supabase = await createClient();
  await supabase.from("expenses").delete().eq("id", id);
  revalidatePath("/belanja");
  revalidatePath("/dashboard");
  revalidatePath("/laporan");
}
