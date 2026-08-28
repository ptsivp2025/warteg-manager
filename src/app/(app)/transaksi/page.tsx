import { PageHeader } from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndWarung } from "@/lib/warung";
import { requireAccess } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Suspense } from "react";
import { TransaksiClient, type TransactionWithItems } from "./TransaksiClient";

export const dynamic = "force-dynamic";

export type TransaksiRange = "today" | "week" | "all";

const RANGE_TABS: { value: TransaksiRange; label: string }[] = [
  { value: "today", label: "Hari Ini" },
  { value: "week", label: "7 Hari" },
  { value: "all", label: "Semua" },
];

function rangeStartISO(range: TransaksiRange): string | null {
  if (range === "all") return null;
  const d = new Date();
  if (range === "week") {
    d.setDate(d.getDate() - 6);
  }
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export default async function TransaksiPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string; range?: string }>;
}) {
  const { warung, role } = await getCurrentUserAndWarung();
  if (!warung) return null;
  requireAccess(role, "transaksi");

  const params = await searchParams;
  const range: TransaksiRange =
    params.range === "week" || params.range === "all" ? params.range : "today";
  const startISO = rangeStartISO(range);

  const supabase = await createClient();

  let txQuery = supabase
    .from("transactions")
    .select(
      "id, total, payment_method, status, created_at, customer_id, customers(name), transaction_items(*)"
    )
    .eq("warung_id", warung.id)
    .order("created_at", { ascending: false })
    .limit(300);
  if (startISO) {
    txQuery = txQuery.gte("created_at", startISO);
  }

  const txRes = await txQuery;

  // Recent customer ids diambil dari transaksi terbaru (sudah di-fetch
  // di atas), lalu di-lookup langsung by id — supaya tidak bergantung
  // pada daftar "customers" (yang di bawah ini dibatasi/limit) dan
  // tetap benar walau pelanggan tsb di luar batas limit tersebut.
  const recentCustomerIds: string[] = [];
  for (const tx of txRes.data ?? []) {
    const cid = (tx as { customer_id: string | null }).customer_id;
    if (cid && !recentCustomerIds.includes(cid)) {
      recentCustomerIds.push(cid);
      if (recentCustomerIds.length >= 5) break;
    }
  }

  const [customersRes, menuRes, recentCustomersRes] = await Promise.all([
    supabase
      .from("customers")
      .select("*")
      .eq("warung_id", warung.id)
      .order("name")
      .limit(100),
    supabase
      .from("menu_items")
      .select("*")
      .eq("warung_id", warung.id)
      .order("category")
      .order("name"),
    recentCustomerIds.length > 0
      ? supabase
          .from("customers")
          .select("*")
          .eq("warung_id", warung.id)
          .in("id", recentCustomerIds)
      : Promise.resolve({ data: [] }),
  ]);

  const recentCustomersById = new Map(
    (recentCustomersRes.data ?? []).map((c) => [c.id, c])
  );
  const recentCustomers = recentCustomerIds
    .map((id) => recentCustomersById.get(id))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader eyebrow="Riwayat" title="Transaksi" />
      <div className="flex flex-col gap-3 px-5">
        <div className="flex gap-2">
          {RANGE_TABS.map((tab) => (
            <Link
              key={tab.value}
              href={`/transaksi?range=${tab.value}`}
              className={cn(
                "h-10 flex-1 rounded-xl text-center text-sm font-semibold leading-10",
                range === tab.value
                  ? "bg-primary text-white"
                  : "bg-surface border border-border text-ink-soft"
              )}
            >
              {tab.label}
            </Link>
          ))}
        </div>
        <Suspense fallback={null}>
          <TransaksiClient
            transactions={(txRes.data as unknown as TransactionWithItems[]) ?? []}
            customers={customersRes.data ?? []}
            recentCustomers={recentCustomers}
            menuItems={menuRes.data ?? []}
          />
        </Suspense>
      </div>
    </div>
  );
}
