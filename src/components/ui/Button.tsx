import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "md" | "lg" | "icon";
  loading?: boolean;
}

const variants: Record<string, string> = {
  primary: "bg-primary text-white active:bg-primary-dark",
  secondary: "bg-accent-soft text-accent active:bg-accent/20",
  ghost: "bg-transparent text-ink active:bg-black/5",
  danger: "bg-danger text-white active:bg-danger/90",
  outline: "bg-surface border border-border text-ink active:bg-black/5",
};

const sizes: Record<string, string> = {
  md: "h-11 px-4 text-[15px]",
  lg: "h-14 px-5 text-base",
  icon: "h-11 w-11",
};

export function Button({
  variant = "primary",
  size = "md",
  loading,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition-colors select-none disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}
