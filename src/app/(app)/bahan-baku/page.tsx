import { PageHeader } from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndWarung } from "@/lib/warung";
import { requireAccess } from "@/lib/permissions";
import { IngredientList } from "./IngredientList";

export const dynamic = "force-dynamic";

export default async function BahanBakuPage() {
  const { warung, role } = await getCurrentUserAndWarung();
  if (!warung) return null;
  requireAccess(role, "bahan-baku");

  const supabase = await createClient();
  const [{ data: ingredients }, { data: units }] = await Promise.all([
    supabase
      .from("ingredients")
      .select("*")
      .eq("warung_id", warung.id)
      .order("name"),
    supabase.from("units").select("*").order("category").order("name"),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader eyebrow="Kelola" title="Bahan Baku" />
      <div className="px-5 pb-6">
        <IngredientList ingredients={ingredients ?? []} units={units ?? []} />
      </div>
    </div>
  );
}
