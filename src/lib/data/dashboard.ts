import { createClient } from "@/lib/supabase/server";
import { startOfTodayISO, todayDateStr } from "@/lib/utils";

export interface DashboardData {
  omzetHariIni: number;
  belanjaHariIni: number;
  labaHariIni: number;
  jumlahTransaksiHariIni: number;
  jumlahCustomer: number;
  hutangBelumLunas: number;
  menuTerlaris: { name: string; qty: number }[];
}

/**
 * Dibaca dari daily_sales_summary / daily_expense_summary (finance
 * summary layer) — bukan scan seluruh transaksi hari ini. Summary
 * di-maintain otomatis oleh trigger di setiap insert/update/delete
 * transaksi & belanja (lihat migration 0005_finance_summary.sql).
 */
export async function getDashboardData(warungId: string): Promise<DashboardData> {
  const supabase = await createClient();
  const todayISO = startOfTodayISO();
  const today = todayDateStr();

  const [dailySales, dailyExpenses, customerCount, unpaidTx, topItemsRes] =
    await Promise.all([
      supabase
        .from("daily_sales_summary")
        .select("gross_revenue, transaction_count")
        .eq("warung_id", warungId)
        .eq("summary_date", today)
        .maybeSingle(),
      supabase
        .from("daily_expense_summary")
        .select("amount")
        .eq("warung_id", warungId)
        .eq("summary_date", today),
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

  const omzetHariIni = Number(dailySales.data?.gross_revenue ?? 0);
  const jumlahTransaksiHariIni = dailySales.data?.transaction_count ?? 0;
  const belanjaHariIni = (dailyExpenses.data ?? []).reduce(
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
    jumlahTransaksiHariIni,
    jumlahCustomer: customerCount.count ?? 0,
    hutangBelumLunas,
    menuTerlaris,
  };
}
