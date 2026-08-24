import { BottomNav } from "@/components/BottomNav";
import { getCurrentUserAndWarung } from "@/lib/warung";
import { redirect } from "next/navigation";

export default async function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, warung } = await getCurrentUserAndWarung();

  if (!userId) {
    redirect("/login");
  }

  if (!warung) {
    redirect("/onboarding");
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-1 flex-col bg-bg">
      <main className="flex-1 pb-28">{children}</main>
      <BottomNav />
    </div>
  );
}
