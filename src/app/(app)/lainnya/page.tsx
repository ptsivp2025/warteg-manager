import { PageHeader } from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndWarung } from "@/lib/warung";
import { LainnyaMenu } from "./LainnyaMenu";

export const dynamic = "force-dynamic";

export default async function LainnyaPage() {
  const { warung, isOwner } = await getCurrentUserAndWarung();
  if (!warung) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader eyebrow="Pengaturan" title="Lainnya" />
      <div className="px-5">
        <LainnyaMenu warung={warung} email={user?.email ?? null} isOwner={isOwner} />
      </div>
    </div>
  );
}
