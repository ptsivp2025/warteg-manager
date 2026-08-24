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
  const { data: customers } = await supabase
    .from("customers")
    .select("*")
    .eq("warung_id", warung.id)
    .order("name");

  return (
    <div className="flex flex-col gap-4">
      <PageHeader eyebrow="Kelola" title="Pelanggan" />
      <div className="px-5">
        <CustomerList customers={customers ?? []} />
      </div>
      <AddCustomerFab />
    </div>
  );
}
