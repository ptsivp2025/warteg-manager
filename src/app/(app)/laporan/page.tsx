import { PageHeader } from "@/components/PageHeader";
import { Card, StatCard } from "@/components/ui/Card";
import { getReportData, type ReportRange } from "@/lib/data/laporan";
import { getCurrentUserAndWarung } from "@/lib/warung";
import { formatRupiah } from "@/lib/utils";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { PrintButton } from "./PrintButton";

export const dynamic = "force-dynamic";

const TABS: { value: ReportRange; label: string }[] = [
  { value: "today", label: "Hari Ini" },
  { value: "week", label: "7 Hari" },
  { value: "month", label: "Bulan Ini" },
];

export default async function LaporanPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { warung } = await getCurrentUserAndWarung();
  if (!warung) return null;

  const params = await searchParams;
  const range: ReportRange =
    params.range === "week" || params.range === "month" ? params.range : "today";

  const data = await getReportData(warung.id, range);
  const activeLabel = TABS.find((t) => t.value === range)?.label ?? "Hari Ini";

  return (
    <div className="flex flex-col gap-4">
      <PageHeader eyebrow="Ringkasan" title="Laporan" />

      <div className="flex flex-col gap-4 px-5 print:px-0">
        <div className="flex gap-2 print:hidden">
          {TABS.map((tab) => (
            <Link
              key={tab.value}
              href={`/laporan?range=${tab.value}`}
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

        <div className="hidden print:block">
          <p className="text-lg font-bold">{warung.name}</p>
          <p className="text-sm text-ink-soft">
            Laporan Penjualan — {activeLabel}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Omzet" value={formatRupiah(data.omzet)} tone="primary" />
          <StatCard label="Belanja" value={formatRupiah(data.belanja)} tone="danger" />
          <StatCard label="Operational Net" value={formatRupiah(data.laba)} tone="primary" />
          <StatCard label="Jumlah Transaksi" value={String(data.jumlahTransaksi)} />
        </div>
        <p className="-mt-2 text-xs text-ink-faint">
          Operational Net = Omzet − Belanja. Ini estimasi hasil operasional,
          bukan laba akuntansi resmi.
        </p>

        {data.hutang > 0 && (
          <div className="rounded-2xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
            Total hutang belum lunas: {formatRupiah(data.hutang)}
          </div>
        )}

        <Card>
          <p className="mb-3 text-sm font-bold text-ink">Menu Terlaris</p>
          {data.menuTerlaris.length === 0 ? (
            <p className="text-sm text-ink-soft">Belum ada data penjualan pada periode ini.</p>
          ) : (
            <ol className="flex flex-col gap-2.5">
              {data.menuTerlaris.map((m, i) => (
                <li key={m.name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-ink">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-soft text-[11px] font-bold text-primary">
                      {i + 1}
                    </span>
                    {m.name}
                    <span className="text-ink-faint">x{m.qty}</span>
                  </span>
                  <span className="font-semibold text-ink-soft tabular-nums">
                    {formatRupiah(m.total)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card>
          <p className="mb-3 text-sm font-bold text-ink">Belanja per Kategori</p>
          {data.belanjaPerKategori.length === 0 ? (
            <p className="text-sm text-ink-soft">Belum ada belanja pada periode ini.</p>
          ) : (
            <ol className="flex flex-col gap-2.5">
              {data.belanjaPerKategori.map((k) => (
                <li key={k.category} className="flex items-center justify-between text-sm">
                  <span className="text-ink">{k.category}</span>
                  <span className="font-semibold text-ink-soft tabular-nums">
                    {formatRupiah(k.amount)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <PrintButton />
      </div>
    </div>
  );
}
