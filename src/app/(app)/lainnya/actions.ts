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

export async function updateWarungAppearance(input: {
  themeColor: string;
  logoUrl?: string | null;
}) {
  const { warung } = await getCurrentUserAndWarung();
  if (!warung) return { error: "Warung tidak ditemukan." };

  const isValidHex = /^#[0-9a-fA-F]{6}$/.test(input.themeColor);
  if (!isValidHex) return { error: "Format warna tidak valid." };

  const supabase = await createClient();
  const update: { theme_color: string; logo_url?: string | null } = {
    theme_color: input.themeColor,
  };
  if (input.logoUrl !== undefined) update.logo_url = input.logoUrl;

  const { error } = await supabase
    .from("warungs")
    .update(update)
    .eq("id", warung.id);

  if (error) return { error: error.message };

  revalidatePath("/lainnya");
  revalidatePath("/dashboard");
  revalidatePath("/", "layout");
  return {};
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
