import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sticky top-0 z-30 border-b border-border bg-bg/90 px-5 pb-3 pt-[calc(var(--safe-top)+1rem)] backdrop-blur",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          {eyebrow && (
            <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
              {eyebrow}
            </p>
          )}
          <h1 className="text-xl font-extrabold text-ink">{title}</h1>
        </div>
        {action}
      </div>
    </div>
  );
}
