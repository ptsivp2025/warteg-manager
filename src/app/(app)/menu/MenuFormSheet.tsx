"use client";

import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Sheet } from "@/components/ui/Sheet";
import type { MenuItem } from "@/lib/types/database";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createMenuItem, updateMenuItem } from "./actions";

const CATEGORIES = ["Makanan", "Lauk", "Sayur", "Minuman", "Lainnya"];

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName(item?.name ?? "");
    setPrice(item ? String(item.price) : "");
    setCategory(item?.category ?? "Makanan");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const payload = {
      name,
      price: Number(price) || 0,
      category,
    };
    const result = item
      ? await updateMenuItem(item.id, payload)
      : await createMenuItem(payload);
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

        {error && (
          <p className="rounded-xl bg-danger-soft px-4 py-2.5 text-sm text-danger">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" loading={loading} className="mt-1 w-full">
          {item ? "Simpan Perubahan" : "Tambah Menu"}
        </Button>
      </form>
    </Sheet>
  );
}
