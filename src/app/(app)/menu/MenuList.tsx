"use client";

import { EmptyState } from "@/components/ui/Card";
import type { MenuItem } from "@/lib/types/database";
import { formatRupiah } from "@/lib/utils";
import { Pencil, Search, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { deleteMenuItem, toggleMenuItemActive } from "./actions";
import { MenuFormSheet } from "./MenuFormSheet";

export function MenuList({ items }: { items: MenuItem[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [items, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    for (const item of filteredItems) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return Array.from(map.entries());
  }, [filteredItems]);

  if (items.length === 0) {
    return (
      <EmptyState
        title="Belum ada menu"
        description="Tambahkan menu makanan dan minuman warteg Anda dengan tombol + di bawah."
      />
    );
  }

  async function handleDelete(item: MenuItem) {
    if (!confirm(`Hapus menu "${item.name}"?`)) return;
    setPendingId(item.id);
    await deleteMenuItem(item.id);
    setPendingId(null);
    router.refresh();
  }

  async function handleToggle(item: MenuItem) {
    setPendingId(item.id);
    await toggleMenuItemActive(item.id, !item.is_active);
    setPendingId(null);
    router.refresh();
  }

  return (
    <>
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari menu atau kategori..."
          className="h-11 w-full rounded-xl border border-border bg-surface pl-10 pr-9 text-[15px] text-ink placeholder:text-ink-faint outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-ink-faint active:bg-black/5"
            aria-label="Hapus pencarian"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {grouped.length === 0 ? (
        <EmptyState title="Tidak ditemukan" description="Coba kata kunci lain." />
      ) : (
      <div className="flex flex-col gap-5">
        {grouped.map(([category, list]) => (
          <div key={category}>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-faint">
              {category}
            </p>
            <div className="flex flex-col gap-2">
              {list.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3"
                >
                  <button
                    onClick={() => handleToggle(item)}
                    disabled={pendingId === item.id}
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase transition-colors ${
                      item.is_active
                        ? "bg-primary-soft text-primary"
                        : "bg-danger-soft text-danger"
                    }`}
                    title={
                      item.is_active
                        ? "Tersedia — tap untuk tandai Kosong"
                        : "Kosong — tap untuk tandai Tersedia lagi"
                    }
                  >
                    {item.is_active ? "Tersedia" : "Kosong"}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-[15px] font-semibold ${
                        item.is_active ? "text-ink" : "text-ink-faint line-through"
                      }`}
                    >
                      {item.name}
                    </p>
                    <p className="text-sm text-ink-soft">{formatRupiah(item.price)}</p>
                  </div>
                  <button
                    onClick={() => setEditing(item)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/5 text-ink-soft active:bg-black/10"
                    aria-label="Ubah"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    disabled={pendingId === item.id}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger active:bg-danger/20"
                    aria-label="Hapus"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      )}

      <MenuFormSheet open={!!editing} onClose={() => setEditing(null)} item={editing} />
    </>
  );
}
