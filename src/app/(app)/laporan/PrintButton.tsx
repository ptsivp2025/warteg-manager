"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="flex h-11 items-center gap-2 rounded-xl bg-primary-soft px-4 text-sm font-semibold text-primary active:bg-primary/20 print:hidden"
    >
      <Printer className="h-4 w-4" />
      Cetak Laporan
    </button>
  );
}
