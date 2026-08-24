"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndWarung } from "@/lib/warung";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updateWarungProfile(input: {
  name: string;
  address: string;
}) {
  const { warung } = await getCurrentUserAndWarung();
  if (!warung) return { error: "Warung tidak ditemukan." };
  if (!input.name.trim()) return { error: "Nama warteg wajib diisi." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("warungs")
    .update({ name: input.name.trim(), address: input.address.trim() || null })
    .eq("id", warung.id);

  if (error) return { error: error.message };

  revalidatePath("/lainnya");
  revalidatePath("/dashboard");
  return {};
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
