"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

export function Sheet({
  open,
  onClose,
  title,
  headerLeft,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  headerLeft?: React.ReactNode;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/40 animate-fade-in"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-surface pb-[var(--safe-bottom)] shadow-2xl animate-sheet-up sm:max-w-md sm:rounded-3xl">
        <div className="flex items-center justify-between gap-2 border-b border-border px-5 py-4">
          <div className="flex min-w-0 items-center gap-1.5">
            {headerLeft}
            <h2 className="truncate text-lg font-bold text-ink">{title}</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/5 text-ink active:bg-black/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>,
    document.body
  );
}
