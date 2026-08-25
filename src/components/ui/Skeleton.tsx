import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-ink-faint/15",
        className
      )}
    />
  );
}

export function PageSkeleton({
  statCards = 0,
  rows = 4,
}: {
  statCards?: number;
  rows?: number;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-0 z-30 border-b border-border bg-bg/90 px-5 pb-3 pt-[calc(var(--safe-top)+1rem)]">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-2 h-6 w-40" />
      </div>
      <div className="flex flex-col gap-4 px-5">
        {statCards > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: statCards }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        )}
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    </div>
  );
}
