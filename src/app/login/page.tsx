"use client";

import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";
import { Mail, Store } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  // Present when arriving from an invite link (/invite/[token] -> here
  // -> back to the invite link after auth) so we don't dump an invited
  // user into "create a new warung" onboarding.
  const next = searchParams.get("next");

  const [mode, setMode] = useState<"login" | "register">("login");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNeedsConfirmation(null);
    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          if (error.message.includes("Email not confirmed")) {
            setNeedsConfirmation(email);
            return;
          }
          throw error;
        }
        router.replace(next ?? "/dashboard");
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              phone: phone.trim(),
            },
          },
        });
        if (error) throw error;

        // If Supabase requires email confirmation, there is no session yet.
        if (!data.session) {
          setConfirmationSent(true);
          return;
        }

        // Skip onboarding (which creates a brand-new warung) when this
        // signup came from an invite link — send them back to accept it.
        router.replace(next ?? "/onboarding");
        router.refresh();
      }
    } catch (err) {
      setError(
        err instanceof Error ? translateAuthError(err.message) : "Terjadi kesalahan"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!needsConfirmation) return;
    setResending(true);
    setError(null);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: needsConfirmation,
      });
      if (error) throw error;
      setConfirmationSent(true);
      setNeedsConfirmation(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengirim ulang email.");
    } finally {
      setResending(false);
    }
  }

  if (confirmationSent) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-6 py-10 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <Mail className="h-8 w-8" />
        </div>
        <h1 className="text-xl font-extrabold text-ink">Cek Email Anda</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Kami sudah mengirim link konfirmasi ke <strong>{email}</strong>.
          Buka email tersebut lalu klik link untuk mengaktifkan akun sebelum
          bisa masuk.
        </p>
        <button
          className="mt-6 text-sm font-medium text-primary"
          onClick={() => {
            setConfirmationSent(false);
            setMode("login");
          }}
        >
          Kembali ke halaman masuk
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-10">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/25">
          <Store className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-extrabold text-ink">Warteg Manager</h1>
        <p className="text-sm text-ink-soft">
          Catat jualan, belanja, dan laba warteg — langsung dari HP.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {mode === "register" && (
          <>
            <Field label="Nama pemilik">
              <Input
                required
                placeholder="Nama lengkap Anda"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </Field>
            <Field label="No. HP">
              <Input
                type="tel"
                required
                placeholder="08xxxxxxxxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </Field>
          </>
        )}
        <Field label="Email">
          <Input
            type="email"
            required
            autoComplete="email"
            placeholder="nama@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Kata sandi">
          <Input
            type="password"
            required
            minLength={6}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder="Minimal 6 karakter"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        {needsConfirmation && (
          <div className="flex flex-col gap-2 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
            <p>
              Email <strong>{needsConfirmation}</strong> belum dikonfirmasi.
              Cek inbox/spam Anda, atau kirim ulang link konfirmasinya.
            </p>
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="self-start font-semibold underline disabled:opacity-60"
            >
              {resending ? "Mengirim..." : "Kirim ulang email konfirmasi"}
            </button>
          </div>
        )}

        {error && (
          <p className="rounded-xl bg-danger-soft px-4 py-2.5 text-sm text-danger">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" loading={loading} className="mt-2 w-full">
          {loading
            ? "Memproses..."
            : mode === "login"
              ? "Masuk"
              : "Daftar Warteg Baru"}
        </Button>
      </form>

      <button
        className="mt-6 text-center text-sm font-medium text-primary"
        onClick={() => {
          setMode(mode === "login" ? "register" : "login");
          setError(null);
          setNeedsConfirmation(null);
        }}
      >
        {mode === "login"
          ? "Belum punya akun? Daftar di sini"
          : "Sudah punya akun? Masuk di sini"}
      </button>
    </div>
  );
}

function translateAuthError(message: string): string {
  if (message.includes("Invalid login credentials")) {
    return "Email atau kata sandi salah.";
  }
  if (message.includes("User already registered")) {
    return "Email ini sudah terdaftar. Silakan masuk.";
  }
  if (message.includes("Password should be at least")) {
    return "Kata sandi minimal 6 karakter.";
  }
  return message;
}
