import { PageHeader } from "@/components/PageHeader";
import { Card, StatCard } from "@/components/ui/Card";
import { getDashboardData } from "@/lib/data/dashboard";
import { getCurrentUserAndWarung } from "@/lib/warung";
import { formatDateLong, formatRupiah } from "@/lib/utils";
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, Plus, Users, Wallet } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { warung } = await getCurrentUserAndWarung();
  if (!warung) return null;

  const data = await getDashboardData(warung.id);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader eyebrow={formatDateLong(new Date())} title={warung.name} />

      <div className="flex flex-col gap-4 px-5">
        {/* Hero: Omzet hari ini */}
        <div className="relative overflow-hidden rounded-3xl bg-primary p-5 text-white shadow-lg shadow-primary/20">
          <div className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-12 -right-2 h-28 w-28 rounded-full bg-white/10" />
          <p className="text-sm font-medium text-white/80">Omzet Hari Ini</p>
          <p className="mt-1 text-3xl font-extrabold tabular-nums">
            {formatRupiah(data.omzetHariIni)}
          </p>
          <p className="mt-2 text-xs text-white/75">
            {data.jumlahTransaksiHariIni} transaksi tercatat hari ini
          </p>
        </div>

        {data.hutangBelumLunas > 0 && (
          <div className="flex items-center gap-3 rounded-2xl bg-danger-soft px-4 py-3 text-danger">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">
              Ada hutang belum lunas {formatRupiah(data.hutangBelumLunas)}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Customer"
            value={String(data.jumlahCustomer)}
            icon={<Users className="h-3.5 w-3.5" />}
          />
          <StatCard
            label="Transaksi Hari Ini"
            value={String(data.jumlahTransaksiHariIni)}
            icon={<ArrowUpCircle className="h-3.5 w-3.5" />}
          />
          <StatCard
            label="Belanja Hari Ini"
            value={formatRupiah(data.belanjaHariIni)}
            tone="danger"
            icon={<ArrowDownCircle className="h-3.5 w-3.5" />}
          />
          <StatCard
            label="Operational Net Hari Ini"
            value={formatRupiah(data.labaHariIni)}
            tone="primary"
            icon={<Wallet className="h-3.5 w-3.5" />}
          />
        </div>
        <p className="-mt-1 px-1 text-xs text-ink-faint">
          Operational Net = Omzet − Belanja, bukan laba akuntansi resmi.
        </p>

        <Link
          href="/transaksi?new=1"
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-accent text-base font-bold text-white shadow-md shadow-accent/30 active:bg-accent/90"
        >
          <Plus className="h-5 w-5" />
          Transaksi Baru
        </Link>

        <Card>
          <p className="mb-3 text-sm font-bold text-ink">Menu Terlaris Hari Ini</p>
          {data.menuTerlaris.length === 0 ? (
            <p className="text-sm text-ink-soft">Belum ada penjualan hari ini.</p>
          ) : (
            <ol className="flex flex-col gap-2.5">
              {data.menuTerlaris.map((m, i) => (
                <li key={m.name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-ink">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-soft text-[11px] font-bold text-primary">
                      {i + 1}
                    </span>
                    {m.name}
                  </span>
                  <span className="font-semibold text-ink-soft">{m.qty} terjual</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
}
