import { PageHeader } from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndWarung } from "@/lib/warung";
import { AddCustomerFab } from "./AddCustomerFab";
import { CustomerList } from "./CustomerList";

export const dynamic = "force-dynamic";

export default async function PelangganPage() {
  const { warung } = await getCurrentUserAndWarung();
  if (!warung) return null;

  const supabase = await createClient();

  const [customersRes, unpaidRes] = await Promise.all([
    supabase.from("customers").select("*").eq("warung_id", warung.id).order("name"),
    supabase
      .from("transactions")
      .select("customer_id, total")
      .eq("warung_id", warung.id)
      .eq("status", "unpaid")
      .not("customer_id", "is", null),
  ]);

  const hutangMap: Record<string, number> = {};
  for (const row of unpaidRes.data ?? []) {
    if (!row.customer_id) continue;
    hutangMap[row.customer_id] = (hutangMap[row.customer_id] ?? 0) + Number(row.total);
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader eyebrow="Kelola" title="Pelanggan" />
      <div className="px-5">
        <CustomerList customers={customersRes.data ?? []} hutangMap={hutangMap} />
      </div>
      <AddCustomerFab />
    </div>
  );
}
