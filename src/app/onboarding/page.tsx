"use client";

import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";
import { Store } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If the user already owns/joined a warung, skip onboarding.
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      const { data } = await supabase
        .from("warung_members")
        .select("warung_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      if (data) router.replace("/dashboard");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Nama warteg wajib diisi.");
      return;
    }
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesi login tidak ditemukan.");

      const { error } = await supabase.from("warungs").insert({
        owner_id: user.id,
        name: name.trim(),
        address: address.trim() || null,
      });
      if (error) throw error;

      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat warteg.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-10">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/25">
          <Store className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-extrabold text-ink">Buat Warteg Anda</h1>
        <p className="text-sm text-ink-soft">
          Satu langkah lagi sebelum mulai mencatat jualan.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Nama warteg">
          <Input
            required
            placeholder="Contoh: Warteg Bahagia"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="Alamat (opsional)">
          <Input
            placeholder="Contoh: Jl. Merdeka No. 10"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </Field>

        {error && (
          <p className="rounded-xl bg-danger-soft px-4 py-2.5 text-sm text-danger">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" loading={loading} className="mt-2 w-full">
          Mulai Pakai Aplikasi
        </Button>
      </form>
    </div>
  );
}
