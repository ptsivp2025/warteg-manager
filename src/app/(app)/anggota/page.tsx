import { PageHeader } from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndWarung } from "@/lib/warung";
import { redirect } from "next/navigation";
import { MemberList } from "./MemberList";

export const dynamic = "force-dynamic";

export default async function AnggotaPage() {
  const { warung, isOwner, userId } = await getCurrentUserAndWarung();
  if (!warung) return null;
  if (!isOwner) redirect("/lainnya");

  const supabase = await createClient();
  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase.rpc("list_warung_members", { _warung_id: warung.id }),
    supabase
      .from("warung_invites")
      .select("*")
      .eq("warung_id", warung.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader eyebrow="Kelola" title="Anggota & Peran" />
      <div className="px-5 pb-6">
        <MemberList
          members={members ?? []}
          invites={invites ?? []}
          currentUserId={userId}
        />
      </div>
    </div>
  );
}
