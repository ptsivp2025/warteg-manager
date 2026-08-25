import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface p-4 shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  tone = "default",
  icon,
}: {
  label: string;
  value: string;
  tone?: "default" | "primary" | "danger" | "accent";
  icon?: ReactNode;
}) {
  const toneMap: Record<string, string> = {
    default: "text-ink",
    primary: "text-primary",
    danger: "text-danger",
    accent: "text-accent",
  };
  return (
    <Card className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-ink-soft">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <span className={cn("text-lg font-bold tabular-nums", toneMap[tone])}>
        {value}
      </span>
    </Card>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-surface/60 px-6 py-12 text-center">
      <p className="font-semibold text-ink">{title}</p>
      {description && (
        <p className="max-w-xs text-sm text-ink-soft">{description}</p>
      )}
      {action}
    </div>
  );
}
