import { PageHeader } from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndWarung } from "@/lib/warung";
import { requireAccess } from "@/lib/permissions";
import { ExpenseList } from "./ExpenseList";

export const dynamic = "force-dynamic";

export default async function BelanjaPage() {
  const { warung, role } = await getCurrentUserAndWarung();
  if (!warung) return null;
  requireAccess(role, "belanja");

  const supabase = await createClient();
  const { data: expenses } = await supabase
    .from("expenses")
    .select("*")
    .eq("warung_id", warung.id)
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader eyebrow="Kelola" title="Belanja" />
      <div className="px-5">
        <ExpenseList expenses={expenses ?? []} />
      </div>
    </div>
  );
}
