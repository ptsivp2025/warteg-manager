import { PageHeader } from "@/components/PageHeader";
import { getCurrentUserAndWarung } from "@/lib/warung";
import { requireAccess } from "@/lib/permissions";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { getTeamMembers } from "./actions";
import { TeamClient } from "./TeamClient";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const { warung, role, userId } = await getCurrentUserAndWarung();
  if (!warung) return null;
  requireAccess(role, "team");

  const result = await getTeamMembers();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="Pengaturan"
        title="Anggota Tim"
        action={
          <Link
            href="/lainnya"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/5 text-ink-soft active:bg-black/10"
            aria-label="Kembali"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
        }
      />
      <div className="px-5 pb-6">
        {!result.ok ? (
          <p className="rounded-xl bg-danger-soft px-4 py-2.5 text-sm text-danger">
            {result.error}
          </p>
        ) : (
          <TeamClient members={result.members} currentUserId={userId} />
        )}
      </div>
    </div>
  );
}
