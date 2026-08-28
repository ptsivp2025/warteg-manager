import { BottomNav } from "@/components/BottomNav";
import { Sidebar } from "@/components/Sidebar";
import { getCurrentUserAndWarung } from "@/lib/warung";
import { redirect } from "next/navigation";
import type { CSSProperties } from "react";

export default async function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, warung, role } = await getCurrentUserAndWarung();

  if (!userId) {
    redirect("/login");
  }

  if (!warung) {
    redirect("/onboarding");
  }

  // Derive soft/dark tints from the warung's single theme color using
  // color-mix(), so owners only ever pick ONE color.
  const themeStyle = {
    "--color-primary": warung.theme_color,
    "--color-primary-dark": `color-mix(in srgb, ${warung.theme_color} 80%, black)`,
    "--color-primary-soft": `color-mix(in srgb, ${warung.theme_color} 14%, white)`,
    ...(warung.background_url
      ? {
          backgroundImage: `linear-gradient(color-mix(in srgb, var(--color-bg) 88%, transparent), color-mix(in srgb, var(--color-bg) 88%, transparent)), url(${warung.background_url})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }
      : {}),
  } as CSSProperties;

  return (
    <div style={themeStyle} className="flex min-h-dvh w-full bg-bg md:justify-center">
      <Sidebar warung={warung} role={role} />
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-1 flex-col md:mx-0 md:max-w-3xl md:px-8 md:py-6">
        <main className="flex-1 pb-28 md:pb-6">{children}</main>
        <BottomNav role={role} />
      </div>
    </div>
  );
}
