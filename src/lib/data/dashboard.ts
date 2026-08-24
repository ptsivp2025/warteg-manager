import { createClient } from "@/lib/supabase/server";
import { startOfTodayISO } from "@/lib/utils";

export interface DashboardData {
  omzetHariIni: number;
  belanjaHariIni: number;
  labaHariIni: number;
  jumlahTransaksiHariIni: number;
  jumlahCustomer: number;
  hutangBelumLunas: number;
  menuTerlaris: { name: string; qty: number }[];
}

export async function getDashboardData(warungId: string): Promise<DashboardData> {
  const supabase = await createClient();
  const todayISO = startOfTodayISO();

  const [txToday, expensesToday, customerCount, unpaidTx, topItemsRes] =
    await Promise.all([
      supabase
        .from("transactions")
        .select("id, total")
        .eq("warung_id", warungId)
        .gte("created_at", todayISO),
      supabase
        .from("expenses")
        .select("amount")
        .eq("warung_id", warungId)
        .gte("expense_date", todayISO.slice(0, 10)),
      supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("warung_id", warungId),
      supabase
        .from("transactions")
        .select("total")
        .eq("warung_id", warungId)
        .eq("status", "unpaid"),
      supabase
        .from("transaction_items")
        .select("menu_name, qty, transactions!inner(warung_id, created_at)")
        .eq("transactions.warung_id", warungId)
        .gte("transactions.created_at", todayISO),
    ]);

  const omzetHariIni = (txToday.data ?? []).reduce(
    (sum, t) => sum + Number(t.total),
    0
  );
  const belanjaHariIni = (expensesToday.data ?? []).reduce(
    (sum, e) => sum + Number(e.amount),
    0
  );
  const hutangBelumLunas = (unpaidTx.data ?? []).reduce(
    (sum, t) => sum + Number(t.total),
    0
  );

  const menuMap = new Map<string, number>();
  for (const row of topItemsRes.data ?? []) {
    menuMap.set(row.menu_name, (menuMap.get(row.menu_name) ?? 0) + row.qty);
  }
  const menuTerlaris = Array.from(menuMap.entries())
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  return {
    omzetHariIni,
    belanjaHariIni,
    labaHariIni: omzetHariIni - belanjaHariIni,
    jumlahTransaksiHariIni: txToday.data?.length ?? 0,
    jumlahCustomer: customerCount.count ?? 0,
    hutangBelumLunas,
    menuTerlaris,
  };
}
