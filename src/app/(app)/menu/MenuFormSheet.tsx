"use client";

import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Sheet } from "@/components/ui/Sheet";
import type { MenuItem } from "@/lib/types/database";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createMenuItem, updateMenuItem } from "./actions";

const CATEGORIES = ["Makanan", "Lauk", "Sayur", "Minuman", "Lainnya"];
const STOCK_UNITS = ["porsi", "pcs", "gelas", "botol", "paket"];

export function MenuFormSheet({
  open,
  onClose,
  item,
}: {
  open: boolean;
  onClose: () => void;
  item?: MenuItem | null;
}) {
  const router = useRouter();
  const [name, setName] = useState(item?.name ?? "");
  const [price, setPrice] = useState(item ? String(item.price) : "");
  const [category, setCategory] = useState(item?.category ?? "Makanan");
  const [stockQuantity, setStockQuantity] = useState(
    item ? String(item.stock_quantity) : "0"
  );
  const [stockUnit, setStockUnit] = useState(item?.stock_unit ?? "porsi");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName(item?.name ?? "");
    setPrice(item ? String(item.price) : "");
    setCategory(item?.category ?? "Makanan");
    setStockQuantity(item ? String(item.stock_quantity) : "0");
    setStockUnit(item?.stock_unit ?? "porsi");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = item
      ? await updateMenuItem(item.id, {
          name,
          price: Number(price) || 0,
          category,
          stockUnit,
        })
      : await createMenuItem({
          name,
          price: Number(price) || 0,
          category,
          stockQuantity: Number(stockQuantity) || 0,
          stockUnit,
        });
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
    onClose();
    if (!item) {
      setName("");
      setPrice("");
      setStockQuantity("0");
    }
  }

  return (
    <Sheet
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title={item ? "Ubah Menu" : "Tambah Menu"}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 pb-2">
        <Field label="Nama menu">
          <Input
            autoFocus
            required
            placeholder="Contoh: Ayam Goreng"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="Harga (Rp)">
          <Input
            type="number"
            inputMode="numeric"
            required
            min={0}
            placeholder="15000"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </Field>
        <Field label="Kategori">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setCategory(c)}
                className={`h-9 rounded-full px-3.5 text-sm font-medium transition-colors ${
                  category === c
                    ? "bg-primary text-white"
                    : "bg-primary-soft text-primary/70"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </Field>

        {!item && (
          <Field label="Stok awal">
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="20"
              value={stockQuantity}
              onChange={(e) => setStockQuantity(e.target.value)}
            />
          </Field>
        )}

        <Field label="Satuan stok">
          <div className="flex flex-wrap gap-2">
            {STOCK_UNITS.map((u) => (
              <button
                type="button"
                key={u}
                onClick={() => setStockUnit(u)}
                className={`h-9 rounded-full px-3.5 text-sm font-medium capitalize transition-colors ${
                  stockUnit === u
                    ? "bg-primary text-white"
                    : "bg-primary-soft text-primary/70"
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </Field>

        {item && (
          <p className="rounded-xl bg-black/5 px-4 py-2.5 text-xs text-ink-soft">
            Stok saat ini: <strong>{item.stock_quantity} {item.stock_unit}</strong>.
            Untuk menambah stok, tutup form ini lalu tap tombol{" "}
            <strong>Tambah Stok</strong> pada menu ini.
          </p>
        )}

        {error && (
          <p className="rounded-xl bg-danger-soft px-4 py-2.5 text-sm text-danger">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" loading={loading} className="mt-1 w-full">
          {loading ? "Menyimpan..." : item ? "Simpan Perubahan" : "Tambah Menu"}
        </Button>
      </form>
    </Sheet>
  );
}
