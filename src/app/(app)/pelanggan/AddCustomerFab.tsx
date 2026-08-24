"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { CustomerFormSheet } from "./CustomerFormSheet";

export function AddCustomerFab() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-30 flex justify-center">
        <div className="flex w-full max-w-md justify-end px-5">
          <button
            onClick={() => setOpen(true)}
            className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-accent/40 active:bg-accent/90"
            aria-label="Tambah pelanggan"
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>
      </div>
      <CustomerFormSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
