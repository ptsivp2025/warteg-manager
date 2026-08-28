import { PageHeader } from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndWarung } from "@/lib/warung";
import { requireAccess } from "@/lib/permissions";
import { ChevronLeft, Phone } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CustomerHistory, type CustomerTransaction } from "./CustomerHistory";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { warung, role } = await getCurrentUserAndWarung();
  if (!warung) return null;
  requireAccess(role, "pelanggan");

  const supabase = await createClient();

  const [customerRes, txRes] = await Promise.all([
    supabase.from("customers").select("*").eq("id", id).eq("warung_id", warung.id).single(),
    supabase
      .from("transactions")
      .select("id, total, payment_method, status, created_at, transaction_items(*)")
      .eq("customer_id", id)
      .eq("warung_id", warung.id)
      .order("created_at", { ascending: false }),
  ]);

  if (!customerRes.data) {
    notFound();
  }

  const customer = customerRes.data;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="Pelanggan"
        title={customer.name}
        action={
          <Link
            href="/pelanggan"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/5 text-ink-soft"
            aria-label="Kembali"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
        }
      />
      <div className="px-5">
        {customer.phone && (
          <p className="mb-4 flex items-center gap-1.5 text-sm text-ink-soft">
            <Phone className="h-3.5 w-3.5" /> {customer.phone}
          </p>
        )}
        <CustomerHistory
          customerId={customer.id}
          transactions={(txRes.data as unknown as CustomerTransaction[]) ?? []}
        />
      </div>
    </div>
  );
}
