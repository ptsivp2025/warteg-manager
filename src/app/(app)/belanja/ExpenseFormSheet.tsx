"use client";

import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Sheet } from "@/components/ui/Sheet";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createExpense } from "./actions";

const CATEGORIES = ["Belanja Dapur", "Gas & Listrik", "Sewa", "Gaji", "Lainnya"];

function todayInputValue() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

export function ExpenseFormSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayInputValue());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setCategory(CATEGORIES[0]);
    setDescription("");
    setAmount("");
    setDate(todayInputValue());
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await createExpense({
      category,
      description,
      amount: Number(amount) || 0,
      expenseDate: date,
    });
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
    reset();
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Catat Belanja"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 pb-2">
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
        <Field label="Jumlah (Rp)">
          <Input
            type="number"
            inputMode="numeric"
            required
            min={0}
            placeholder="100000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
        <Field label="Tanggal">
          <Input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
        <Field label="Keterangan (opsional)">
          <Textarea
            rows={2}
            placeholder="Contoh: beli beras 20kg"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>

        {error && (
          <p className="rounded-xl bg-danger-soft px-4 py-2.5 text-sm text-danger">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" loading={loading} className="mt-1 w-full">
          Simpan Belanja
        </Button>
      </form>
    </Sheet>
  );
}
