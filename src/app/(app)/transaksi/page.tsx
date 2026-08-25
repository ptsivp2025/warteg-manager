import { PageHeader } from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndWarung } from "@/lib/warung";
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
  const { warung } = await getCurrentUserAndWarung();
  if (!warung) return null;

  const params = await searchParams;
  const range: TransaksiRange =
    params.range === "week" || params.range === "all" ? params.range : "today";
  const startISO = rangeStartISO(range);

  const supabase = await createClient();

  let txQuery = supabase
    .from("transactions")
    .select("id, total, payment_method, status, created_at, customers(name), transaction_items(*)")
    .eq("warung_id", warung.id)
    .order("created_at", { ascending: false })
    .limit(300);
  if (startISO) {
    txQuery = txQuery.gte("created_at", startISO);
  }

  const [txRes, customersRes, menuRes] = await Promise.all([
    txQuery,
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
            menuItems={menuRes.data ?? []}
          />
        </Suspense>
      </div>
    </div>
  );
}
