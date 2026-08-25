"use client";

import { CustomerFormSheet } from "@/app/(app)/pelanggan/CustomerFormSheet";
import { searchCustomers } from "@/app/(app)/pelanggan/actions";
import type { Customer } from "@/lib/types/database";
import { cn } from "@/lib/utils";
import { Check, Clock, Loader2, Phone, Search, User, UserPlus, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";

export function CustomerPicker({
  customers,
  recentCustomers,
  selectedId,
  onSelect,
}: {
  customers: Customer[];
  recentCustomers: Customer[];
  /** "" means Pelanggan Umum */
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<Customer[] | null>(null);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pencarian dijalankan di server (bukan filter array customers di
  // client) supaya tidak terbatas pada daftar "browse" awal yang
  // di-limit di halaman transaksi. Debounce dipicu dari event handler
  // input, bukan dari effect, supaya tidak ada setState sinkron di
  // dalam effect.
  function handleQueryChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const q = value.trim();
    if (!q) {
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(() => {
      searchCustomers(q).then((results) => {
        setSearchResults(results);
        setSearching(false);
      });
    }, 300);
  }

  const filtered = searchResults;

  const recentIds = useMemo(
    () => new Set(recentCustomers.map((c) => c.id)),
    [recentCustomers]
  );
  const others = useMemo(
    () => customers.filter((c) => !recentIds.has(c.id)),
    [customers, recentIds]
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
        <input
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Cari nama / nomor HP..."
          autoFocus
          className="h-11 w-full rounded-xl border border-border bg-surface pl-10 pr-9 text-[15px] text-ink placeholder:text-ink-faint outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
        {query && (
          <button
            type="button"
            onClick={() => handleQueryChange("")}
            className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-ink-faint active:bg-black/5"
            aria-label="Hapus pencarian"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => setAddOpen(true)}
        className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 py-2.5 text-sm font-semibold text-primary active:bg-primary-soft"
      >
        <UserPlus className="h-4 w-4" /> Tambah Pelanggan
      </button>

      {query.trim() === "" ? (
        <div className="flex flex-col gap-4">
          <CustomerRow
            name="Pelanggan Umum"
            subtitle="Tanpa nama, transaksi umum"
            selected={selectedId === ""}
            onClick={() => onSelect("")}
            icon={<User className="h-4 w-4" />}
          />

          {recentCustomers.length > 0 && (
            <div>
              <p className="mb-1.5 flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-ink-faint">
                <Clock className="h-3 w-3" /> Pelanggan Terakhir
              </p>
              <div className="flex flex-col gap-1.5">
                {recentCustomers.map((c) => (
                  <CustomerRow
                    key={c.id}
                    name={c.name}
                    subtitle={c.phone ?? undefined}
                    selected={selectedId === c.id}
                    onClick={() => onSelect(c.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {others.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-ink-faint">
                Semua Pelanggan
              </p>
              <div className="flex flex-col gap-1.5">
                {others.map((c) => (
                  <CustomerRow
                    key={c.id}
                    name={c.name}
                    subtitle={c.phone ?? undefined}
                    selected={selectedId === c.id}
                    onClick={() => onSelect(c.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {customers.length === 0 && (
            <p className="rounded-xl bg-black/5 px-4 py-3 text-center text-sm text-ink-soft">
              Belum ada pelanggan tersimpan.
            </p>
          )}
        </div>
      ) : searching ? (
        <p className="flex items-center justify-center gap-2 rounded-xl bg-black/5 px-4 py-6 text-center text-sm text-ink-soft">
          <Loader2 className="h-4 w-4 animate-spin" /> Mencari...
        </p>
      ) : (filtered ?? []).length === 0 ? (
        <p className="rounded-xl bg-black/5 px-4 py-6 text-center text-sm text-ink-soft">
          Pelanggan tidak ditemukan. Tap &ldquo;Tambah Pelanggan&rdquo; untuk
          membuat baru.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {(filtered ?? []).map((c) => (
            <CustomerRow
              key={c.id}
              name={c.name}
              subtitle={c.phone ?? undefined}
              selected={selectedId === c.id}
              onClick={() => onSelect(c.id)}
            />
          ))}
        </div>
      )}

      <CustomerFormSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={(id) => {
          onSelect(id);
          setAddOpen(false);
        }}
      />
    </div>
  );
}

function CustomerRow({
  name,
  subtitle,
  selected,
  onClick,
  icon,
}: {
  name: string;
  subtitle?: string;
  selected: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-2xl border p-3 text-left transition-colors",
        selected
          ? "border-primary bg-primary-soft"
          : "border-border bg-surface active:bg-black/5"
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold",
          selected ? "bg-primary text-white" : "bg-primary-soft text-primary"
        )}
      >
        {icon ?? name.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-ink">{name}</p>
        {subtitle && (
          <p className="flex items-center gap-1 truncate text-xs text-ink-soft">
            <Phone className="h-3 w-3" /> {subtitle}
          </p>
        )}
      </div>
      {selected && <Check className="h-5 w-5 shrink-0 text-primary" />}
    </button>
  );
}
