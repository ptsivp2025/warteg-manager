import { createClient } from "@/lib/supabase/server";
import { dateNDaysAgoStr, monthStartDateStr, todayDateStr } from "@/lib/utils";

export type ReportRange = "today" | "week" | "month";

export function rangeStartISO(range: ReportRange): string {
  const d = new Date();
  if (range === "today") {
    d.setHours(0, 0, 0, 0);
  } else if (range === "week") {
    d.setDate(d.getDate() - 6);
    d.setHours(0, 0, 0, 0);
  } else {
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
  }
  return d.toISOString();
}

export interface ReportData {
  omzet: number;
  belanja: number;
  laba: number;
  jumlahTransaksi: number;
  hutang: number;
  menuTerlaris: { name: string; qty: number; total: number }[];
  belanjaPerKategori: { category: string; amount: number }[];
}

/**
 * "Hari Ini" & "Bulan Ini" dibaca langsung dari
 * daily_sales_summary / monthly_sales_summary (satu row, bukan
 * agregasi ulang). "7 Hari" menjumlahkan 7 row daily_summary —
 * tetap jauh lebih murah daripada scan transaction/expense detail.
 * Detail (hutang, menu terlaris) tetap dibaca dari data mentah
 * karena tidak termasuk cakupan summary layer ini.
 */
export async function getReportData(
  warungId: string,
  range: ReportRange
): Promise<ReportData> {
  const supabase = await createClient();
  const startISO = rangeStartISO(range);

  let omzet = 0;
  let jumlahTransaksi = 0;
  let belanjaPerKategori: { category: string; amount: number }[] = [];

  if (range === "today") {
    const today = todayDateStr();
    const [salesRes, expenseRes] = await Promise.all([
      supabase
        .from("daily_sales_summary")
        .select("gross_revenue, transaction_count")
        .eq("warung_id", warungId)
        .eq("summary_date", today)
        .maybeSingle(),
      supabase
        .from("daily_expense_summary")
        .select("category, amount")
        .eq("warung_id", warungId)
        .eq("summary_date", today),
    ]);
    omzet = Number(salesRes.data?.gross_revenue ?? 0);
    jumlahTransaksi = salesRes.data?.transaction_count ?? 0;
    belanjaPerKategori = (expenseRes.data ?? []).map((r) => ({
      category: r.category,
      amount: Number(r.amount),
    }));
  } else if (range === "week") {
    const from = dateNDaysAgoStr(6);
    const to = todayDateStr();
    const [salesRes, expenseRes] = await Promise.all([
      supabase
        .from("daily_sales_summary")
        .select("gross_revenue, transaction_count")
        .eq("warung_id", warungId)
        .gte("summary_date", from)
        .lte("summary_date", to),
      supabase
        .from("daily_expense_summary")
        .select("category, amount")
        .eq("warung_id", warungId)
        .gte("summary_date", from)
        .lte("summary_date", to),
    ]);
    omzet = (salesRes.data ?? []).reduce((s, r) => s + Number(r.gross_revenue), 0);
    jumlahTransaksi = (salesRes.data ?? []).reduce(
      (s, r) => s + r.transaction_count,
      0
    );
    belanjaPerKategori = sumByCategory(expenseRes.data ?? []);
  } else {
    const month = monthStartDateStr();
    const [salesRes, expenseRes] = await Promise.all([
      supabase
        .from("monthly_sales_summary")
        .select("gross_revenue, transaction_count")
        .eq("warung_id", warungId)
        .eq("summary_month", month)
        .maybeSingle(),
      supabase
        .from("monthly_expense_summary")
        .select("category, amount")
        .eq("warung_id", warungId)
        .eq("summary_month", month),
    ]);
    omzet = Number(salesRes.data?.gross_revenue ?? 0);
    jumlahTransaksi = salesRes.data?.transaction_count ?? 0;
    belanjaPerKategori = (expenseRes.data ?? []).map((r) => ({
      category: r.category,
      amount: Number(r.amount),
    }));
  }

  const belanja = belanjaPerKategori.reduce((s, r) => s + r.amount, 0);

  const [txRes, itemsRes] = await Promise.all([
    supabase
      .from("transactions")
      .select("total, status")
      .eq("warung_id", warungId)
      .eq("status", "unpaid")
      .gte("created_at", startISO),
    supabase
      .from("transaction_items")
      .select("menu_name, qty, subtotal, transactions!inner(warung_id, created_at)")
      .eq("transactions.warung_id", warungId)
      .gte("transactions.created_at", startISO),
  ]);

  const hutang = (txRes.data ?? []).reduce((s, t) => s + Number(t.total), 0);

  const menuMap = new Map<string, { qty: number; total: number }>();
  for (const row of itemsRes.data ?? []) {
    const cur = menuMap.get(row.menu_name) ?? { qty: 0, total: 0 };
    cur.qty += row.qty;
    cur.total += Number(row.subtotal);
    menuMap.set(row.menu_name, cur);
  }
  const menuTerlaris = Array.from(menuMap.entries())
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 10);

  return {
    omzet,
    belanja,
    laba: omzet - belanja,
    jumlahTransaksi,
    hutang,
    menuTerlaris,
    belanjaPerKategori: belanjaPerKategori.sort((a, b) => b.amount - a.amount),
  };
}

function sumByCategory(
  rows: { category: string; amount: number }[]
): { category: string; amount: number }[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(r.category, (map.get(r.category) ?? 0) + Number(r.amount));
  }
  return Array.from(map.entries()).map(([category, amount]) => ({
    category,
    amount,
  }));
}
