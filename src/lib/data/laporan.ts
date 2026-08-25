import { createClient } from "@/lib/supabase/server";

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
}

export async function getReportData(
  warungId: string,
  range: ReportRange
): Promise<ReportData> {
  const supabase = await createClient();
  const startISO = rangeStartISO(range);
  const startDate = startISO.slice(0, 10);

  const [txRes, expensesRes, itemsRes] = await Promise.all([
    supabase
      .from("transactions")
      .select("id, total, status")
      .eq("warung_id", warungId)
      .gte("created_at", startISO),
    supabase
      .from("expenses")
      .select("amount")
      .eq("warung_id", warungId)
      .gte("expense_date", startDate),
    supabase
      .from("transaction_items")
      .select("menu_name, qty, subtotal, transactions!inner(warung_id, created_at)")
      .eq("transactions.warung_id", warungId)
      .gte("transactions.created_at", startISO),
  ]);

  const omzet = (txRes.data ?? []).reduce((s, t) => s + Number(t.total), 0);
  const belanja = (expensesRes.data ?? []).reduce(
    (s, e) => s + Number(e.amount),
    0
  );
  const hutang = (txRes.data ?? [])
    .filter((t) => t.status === "unpaid")
    .reduce((s, t) => s + Number(t.total), 0);

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
    jumlahTransaksi: txRes.data?.length ?? 0,
    hutang,
    menuTerlaris,
  };
}
