import { PageHeader } from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndWarung } from "@/lib/warung";
import { AddMenuFab } from "./AddMenuFab";
import { MenuList } from "./MenuList";

export const dynamic = "force-dynamic";

export default async function MenuPage() {
  const { warung } = await getCurrentUserAndWarung();
  if (!warung) return null;

  const supabase = await createClient();
  const [{ data: items }, { data: ingredients }, { data: units }] =
    await Promise.all([
      supabase
        .from("menu_items")
        .select("*")
        .eq("warung_id", warung.id)
        .order("category")
        .order("name"),
      supabase
        .from("ingredients")
        .select("*")
        .eq("warung_id", warung.id)
        .eq("is_active", true)
        .order("name"),
      supabase.from("units").select("*").order("category").order("name"),
    ]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader eyebrow="Kelola" title="Menu" />
      <div className="px-5">
        <MenuList
          items={items ?? []}
          ingredients={ingredients ?? []}
          units={units ?? []}
        />
      </div>
      <AddMenuFab />
    </div>
  );
}
