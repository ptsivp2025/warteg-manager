"use client";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Input";
import { Sheet } from "@/components/ui/Sheet";
import { createClient } from "@/lib/supabase/client";
import type { Warung } from "@/lib/types/database";
import { ImageIcon, Store, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { updateWarungAppearance } from "./actions";

const PRESET_COLORS = [
  { label: "Hijau Warteg", value: "#0f7a4d" },
  { label: "Amber", value: "#ef9d0f" },
  { label: "Merah", value: "#d64545" },
  { label: "Biru", value: "#1d63c9" },
  { label: "Ungu", value: "#7c3aed" },
  { label: "Teal", value: "#0d9488" },
];

export function AppearanceSheet({
  open,
  onClose,
  warung,
}: {
  open: boolean;
  onClose: () => void;
  warung: Warung;
}) {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [themeColor, setThemeColor] = useState(warung.theme_color);
  const [logoPreview, setLogoPreview] = useState<string | null>(warung.logo_url);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bgPreview, setBgPreview] = useState<string | null>(
    warung.background_url
  );
  const [bgFile, setBgFile] = useState<File | null>(null);
  const [bgRemoved, setBgRemoved] = useState(false);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("Ukuran logo maksimal 2MB.");
      return;
    }
    setError(null);
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  function handleBgFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setError("Ukuran background maksimal 4MB.");
      return;
    }
    setError(null);
    setBgFile(file);
    setBgRemoved(false);
    setBgPreview(URL.createObjectURL(file));
  }

  function handleRemoveBg() {
    setBgFile(null);
    setBgPreview(null);
    setBgRemoved(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let logoUrl: string | undefined;
      let backgroundUrl: string | null | undefined;

      if (logoFile) {
        const ext = logoFile.name.split(".").pop() || "png";
        const path = `${warung.id}/logo-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("warung-assets")
          .upload(path, logoFile, { upsert: true });
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from("warung-assets")
          .getPublicUrl(path);
        logoUrl = publicUrlData.publicUrl;
      }

      if (bgFile) {
        const ext = bgFile.name.split(".").pop() || "png";
        const path = `${warung.id}/background-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("warung-assets")
          .upload(path, bgFile, { upsert: true });
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from("warung-assets")
          .getPublicUrl(path);
        backgroundUrl = publicUrlData.publicUrl;
      } else if (bgRemoved) {
        backgroundUrl = null;
      }

      const result = await updateWarungAppearance({
        themeColor,
        logoUrl,
        backgroundUrl,
      });
      if (result?.error) {
        setError(result.error);
        return;
      }

      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan tampilan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Tampilan Aplikasi">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 pb-2">
        {/* Logo */}
        <Field label="Logo warteg">
          <div className="flex items-center gap-4">
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-primary-soft"
              style={{ backgroundColor: `color-mix(in srgb, ${themeColor} 14%, white)` }}
            >
              {logoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoPreview} alt="Logo" className="h-full w-full object-cover" />
              ) : (
                <Store className="h-7 w-7" style={{ color: themeColor }} />
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-10 items-center gap-2 rounded-xl border border-border px-3.5 text-sm font-medium text-ink-soft active:bg-black/5"
            >
              <Upload className="h-4 w-4" />
              Unggah logo
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </Field>

        {/* Background */}
        <Field label="Background (opsional)">
          <div className="flex flex-col gap-2.5">
            {bgPreview ? (
              <div className="relative h-24 w-full overflow-hidden rounded-2xl border border-border bg-black/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={bgPreview}
                  alt="Background"
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={handleRemoveBg}
                  aria-label="Hapus background"
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex h-24 w-full items-center justify-center rounded-2xl border border-dashed border-border bg-black/[0.02] text-ink-faint">
                <ImageIcon className="h-6 w-6" />
              </div>
            )}
            <button
              type="button"
              onClick={() => bgInputRef.current?.click()}
              className="flex h-10 items-center justify-center gap-2 rounded-xl border border-border px-3.5 text-sm font-medium text-ink-soft active:bg-black/5"
            >
              <Upload className="h-4 w-4" />
              {bgPreview ? "Ganti background" : "Unggah background"}
            </button>
            <input
              ref={bgInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleBgFileChange}
            />
          </div>
        </Field>

        {/* Theme color */}
        <Field label="Warna tema">
          <div className="flex flex-wrap gap-2.5">
            {PRESET_COLORS.map((c) => (
              <button
                type="button"
                key={c.value}
                onClick={() => setThemeColor(c.value)}
                title={c.label}
                className="h-10 w-10 rounded-full ring-offset-2 transition-shadow"
                style={{
                  backgroundColor: c.value,
                  boxShadow:
                    themeColor.toLowerCase() === c.value
                      ? `0 0 0 2px ${c.value}`
                      : "none",
                }}
              />
            ))}
            <label className="flex h-10 w-10 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-dashed border-border text-[10px] font-medium text-ink-faint">
              Lain
              <input
                type="color"
                value={themeColor}
                onChange={(e) => setThemeColor(e.target.value)}
                className="absolute h-0 w-0 opacity-0"
              />
            </label>
          </div>
        </Field>

        {error && (
          <p className="rounded-xl bg-danger-soft px-4 py-2.5 text-sm text-danger">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" loading={loading} className="w-full">
          {loading ? "Menyimpan..." : "Simpan Tampilan"}
        </Button>
      </form>
    </Sheet>
  );
}
