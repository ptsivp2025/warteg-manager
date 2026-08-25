import { PageHeader } from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndWarung } from "@/lib/warung";
import { startOfTodayISO } from "@/lib/utils";
import { Suspense } from "react";
import { TransaksiClient, type TransactionWithItems } from "./TransaksiClient";

export const dynamic = "force-dynamic";

export default async function TransaksiPage() {
  const { warung } = await getCurrentUserAndWarung();
  if (!warung) return null;

  const supabase = await createClient();

  const [txRes, customersRes, menuRes] = await Promise.all([
    supabase
      .from("transactions")
      .select("id, total, payment_method, status, created_at, customers(name), transaction_items(*)")
      .eq("warung_id", warung.id)
      .gte("created_at", startOfTodayISO())
      .order("created_at", { ascending: false }),
    supabase
      .from("customers")
      .select("*")
      .eq("warung_id", warung.id)
      .order("name"),
    supabase
      .from("menu_items")
      .select("*")
      .eq("warung_id", warung.id)
      .order("category")
      .order("name"),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader eyebrow="Hari Ini" title="Transaksi" />
      <div className="px-5">
        <Suspense fallback={null}>
          <TransaksiClient
            transactions={(txRes.data as unknown as TransactionWithItems[]) ?? []}
            customers={customersRes.data ?? []}
            menuItems={menuRes.data ?? []}
          />
        </Suspense>
      </div>
    </div>
  );
}
