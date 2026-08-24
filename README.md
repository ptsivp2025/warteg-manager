# Warteg Manager — Mobile Web App

Aplikasi kasir & laporan untuk warteg. **Web app biasa** (Next.js), dibuka lewat browser di HP/tablet/desktop — bukan aplikasi native, tidak perlu APK/App Store/Play Store. Bisa ditambahkan ke Home Screen sebagai PWA.

## Stack
- Next.js 15 (App Router) + TypeScript
- Tailwind CSS v4
- Supabase (Auth + Postgres + Row Level Security)

## Menjalankan secara lokal

1. Buat project di [supabase.com](https://supabase.com).
2. Jalankan migration di `supabase/migrations/0001_init.sql` lewat Supabase SQL Editor (atau `supabase db push` bila pakai Supabase CLI).
3. Salin `.env.local.example` menjadi `.env.local`, isi dengan URL & anon key project Supabase Anda:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxxxxxxxxx
   ```

4. Install dependency & jalankan:

   ```bash
   npm install
   npm run dev
   ```

5. Buka `http://localhost:3000`, daftar akun baru → otomatis diarahkan membuat data warteg pertama.

## Struktur fitur

| Halaman | Fungsi |
|---|---|
| `/dashboard` | Ringkasan omzet, laba, belanja, customer, menu terlaris hari ini |
| `/transaksi` | Catat transaksi cepat (pilih pelanggan → pilih menu + qty → metode bayar → simpan) |
| `/menu` | Kelola menu (tambah/ubah/hapus/aktif-nonaktif) |
| `/pelanggan` | Kelola data pelanggan |
| `/belanja` | Catat pengeluaran/belanja harian |
| `/laporan` | Laporan omzet/laba per hari, 7 hari, atau bulan ini + cetak |
| `/lainnya` | Profil warteg & keluar |

## Keamanan data (RLS)

Semua tabel diproteksi Row Level Security: user hanya bisa membaca/menulis data milik warung tempat ia terdaftar sebagai member (`warung_members`). Struktur ini mendukung multi-user per warung (misalnya pemilik + karyawan kasir) tanpa hardcode akun tertentu.

## Deploy

Push ke GitHub → import ke [Vercel](https://vercel.com) → set environment variables yang sama seperti `.env.local` → deploy. Aplikasi langsung bisa diakses lewat browser di semua perangkat.

## PWA (opsional, sudah aktif)

- **Android (Chrome):** menu ⋮ → "Add to Home screen" / "Install app"
- **iPhone (Safari):** tombol Share → "Add to Home Screen"

Manifest ada di `public/manifest.json`. Tidak ada service worker/offline cache kompleks di MVP ini sesuai requirement — semua data selalu real-time dari Supabase.
