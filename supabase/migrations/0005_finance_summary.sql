-- ============================================================
-- FINANCE SUMMARY LAYER — daily/monthly sales & expense summary
-- ------------------------------------------------------------
-- Transaction & expense detail TETAP source of truth / audit
-- trail (tidak dihapus, tidak diganti). Tabel & fungsi di bawah
-- murni layer agregasi supaya dashboard/laporan cukup baca
-- summary, bukan scan ulang seluruh histori transaksi.
--
-- Penyesuaian dari template prompt (Multi-Tenant):
-- Skema aplikasi ini masih per-warung (satu warung = satu unit
-- usaha; owner + staff sebagai member), belum ada konsep
-- outlet/tenant terpisah maupun role Cashier. `tenant_id +
-- outlet_id` pada prompt di-mapping menjadi `warung_id` saja.
-- ============================================================

-- ------------------------------------------------------------
-- 1. TABLES
-- ------------------------------------------------------------
create table if not exists public.daily_sales_summary (
  id uuid primary key default gen_random_uuid(),
  warung_id uuid not null references public.warungs(id) on delete cascade,
  summary_date date not null,
  gross_revenue numeric(14,2) not null default 0,
  transaction_count integer not null default 0,
  item_quantity integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (warung_id, summary_date)
);

create table if not exists public.monthly_sales_summary (
  id uuid primary key default gen_random_uuid(),
  warung_id uuid not null references public.warungs(id) on delete cascade,
  summary_month date not null, -- selalu tanggal 1 bulan tsb
  gross_revenue numeric(14,2) not null default 0,
  transaction_count integer not null default 0,
  item_quantity integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (warung_id, summary_month)
);

create table if not exists public.daily_expense_summary (
  id uuid primary key default gen_random_uuid(),
  warung_id uuid not null references public.warungs(id) on delete cascade,
  summary_date date not null,
  category text not null,
  amount numeric(14,2) not null default 0,
  updated_at timestamptz not null default now(),
  unique (warung_id, summary_date, category)
);

create table if not exists public.monthly_expense_summary (
  id uuid primary key default gen_random_uuid(),
  warung_id uuid not null references public.warungs(id) on delete cascade,
  summary_month date not null,
  category text not null,
  amount numeric(14,2) not null default 0,
  updated_at timestamptz not null default now(),
  unique (warung_id, summary_month, category)
);

create index if not exists idx_daily_sales_warung_date
  on public.daily_sales_summary(warung_id, summary_date desc);
create index if not exists idx_monthly_sales_warung_month
  on public.monthly_sales_summary(warung_id, summary_month desc);
create index if not exists idx_daily_expense_warung_date
  on public.daily_expense_summary(warung_id, summary_date desc);
create index if not exists idx_monthly_expense_warung_month
  on public.monthly_expense_summary(warung_id, summary_month desc);

-- ------------------------------------------------------------
-- 2. RLS — read-only untuk warung member.
--    Tidak ada insert/update/delete policy untuk role
--    `authenticated`: tabel summary hanya boleh ditulis oleh
--    fungsi SECURITY DEFINER di bawah (dipanggil trigger, atau
--    lewat rebuild_finance_summary yang tervalidasi membership).
-- ------------------------------------------------------------
alter table public.daily_sales_summary enable row level security;
alter table public.monthly_sales_summary enable row level security;
alter table public.daily_expense_summary enable row level security;
alter table public.monthly_expense_summary enable row level security;

drop policy if exists "daily_sales_summary_select" on public.daily_sales_summary;
create policy "daily_sales_summary_select" on public.daily_sales_summary
  for select using (public.is_warung_member(warung_id));

drop policy if exists "monthly_sales_summary_select" on public.monthly_sales_summary;
create policy "monthly_sales_summary_select" on public.monthly_sales_summary
  for select using (public.is_warung_member(warung_id));

drop policy if exists "daily_expense_summary_select" on public.daily_expense_summary;
create policy "daily_expense_summary_select" on public.daily_expense_summary
  for select using (public.is_warung_member(warung_id));

drop policy if exists "monthly_expense_summary_select" on public.monthly_expense_summary;
create policy "monthly_expense_summary_select" on public.monthly_expense_summary
  for select using (public.is_warung_member(warung_id));

-- ------------------------------------------------------------
-- 3. RECOMPUTE FUNCTIONS
--    Full recalculation dari source data (bukan increment/decrement)
--    -> idempoten, tidak pernah drift, selalu "rebuildable" persis
--    sama (lihat test #10). Volume warteg kecil jadi full recompute
--    per baris tetap murah.
-- ------------------------------------------------------------
create or replace function public.recompute_daily_sales_summary(_warung_id uuid, _date date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _revenue numeric(14,2);
  _tx_count integer;
  _item_qty integer;
begin
  select coalesce(sum(t.total), 0), count(*)
    into _revenue, _tx_count
    from public.transactions t
    where t.warung_id = _warung_id
      and t.created_at >= _date::timestamptz
      and t.created_at < (_date + 1)::timestamptz;

  select coalesce(sum(ti.qty), 0)
    into _item_qty
    from public.transaction_items ti
    join public.transactions t on t.id = ti.transaction_id
    where t.warung_id = _warung_id
      and t.created_at >= _date::timestamptz
      and t.created_at < (_date + 1)::timestamptz;

  if _tx_count = 0 then
    delete from public.daily_sales_summary
      where warung_id = _warung_id and summary_date = _date;
  else
    insert into public.daily_sales_summary
      (warung_id, summary_date, gross_revenue, transaction_count, item_quantity, updated_at)
    values
      (_warung_id, _date, _revenue, _tx_count, _item_qty, now())
    on conflict (warung_id, summary_date) do update
      set gross_revenue = excluded.gross_revenue,
          transaction_count = excluded.transaction_count,
          item_quantity = excluded.item_quantity,
          updated_at = now();
  end if;

  perform public.recompute_monthly_sales_summary(_warung_id, date_trunc('month', _date)::date);
end;
$$;

create or replace function public.recompute_monthly_sales_summary(_warung_id uuid, _month date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _month_start date := date_trunc('month', _month)::date;
  _month_end date := (date_trunc('month', _month) + interval '1 month')::date;
  _revenue numeric(14,2);
  _tx_count integer;
  _item_qty integer;
begin
  select coalesce(sum(gross_revenue), 0), coalesce(sum(transaction_count), 0), coalesce(sum(item_quantity), 0)
    into _revenue, _tx_count, _item_qty
    from public.daily_sales_summary
    where warung_id = _warung_id
      and summary_date >= _month_start
      and summary_date < _month_end;

  if _tx_count = 0 then
    delete from public.monthly_sales_summary
      where warung_id = _warung_id and summary_month = _month_start;
  else
    insert into public.monthly_sales_summary
      (warung_id, summary_month, gross_revenue, transaction_count, item_quantity, updated_at)
    values
      (_warung_id, _month_start, _revenue, _tx_count, _item_qty, now())
    on conflict (warung_id, summary_month) do update
      set gross_revenue = excluded.gross_revenue,
          transaction_count = excluded.transaction_count,
          item_quantity = excluded.item_quantity,
          updated_at = now();
  end if;
end;
$$;

create or replace function public.recompute_daily_expense_summary(_warung_id uuid, _date date, _category text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _amount numeric(14,2);
  _cnt integer;
begin
  select coalesce(sum(amount), 0), count(*)
    into _amount, _cnt
    from public.expenses
    where warung_id = _warung_id
      and expense_date = _date
      and category = _category;

  if _cnt = 0 then
    delete from public.daily_expense_summary
      where warung_id = _warung_id and summary_date = _date and category = _category;
  else
    insert into public.daily_expense_summary
      (warung_id, summary_date, category, amount, updated_at)
    values
      (_warung_id, _date, _category, _amount, now())
    on conflict (warung_id, summary_date, category) do update
      set amount = excluded.amount,
          updated_at = now();
  end if;

  perform public.recompute_monthly_expense_summary(_warung_id, date_trunc('month', _date)::date, _category);
end;
$$;

create or replace function public.recompute_monthly_expense_summary(_warung_id uuid, _month date, _category text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _month_start date := date_trunc('month', _month)::date;
  _month_end date := (date_trunc('month', _month) + interval '1 month')::date;
  _amount numeric(14,2);
  _cnt integer;
begin
  select coalesce(sum(amount), 0), count(*)
    into _amount, _cnt
    from public.daily_expense_summary
    where warung_id = _warung_id
      and summary_date >= _month_start
      and summary_date < _month_end
      and category = _category;

  if _cnt = 0 then
    delete from public.monthly_expense_summary
      where warung_id = _warung_id and summary_month = _month_start and category = _category;
  else
    insert into public.monthly_expense_summary
      (warung_id, summary_month, category, amount, updated_at)
    values
      (_warung_id, _month_start, _category, _amount, now())
    on conflict (warung_id, summary_month, category) do update
      set amount = excluded.amount,
          updated_at = now();
  end if;
end;
$$;

-- Fungsi internal di atas SENGAJA TIDAK di-grant ke `authenticated`.
-- Hanya trigger (jalan sebagai definer, tidak butuh EXECUTE grant)
-- dan rebuild_finance_summary di bawah yang memanggilnya.

-- ------------------------------------------------------------
-- 4. TRIGGERS — recompute otomatis saat source data berubah
--    (insert transaksi baru, koreksi, refund/delete, dst).
--    Section 10: transaction change -> recalc daily -> monthly.
-- ------------------------------------------------------------
create or replace function public.trg_transactions_summary()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recompute_daily_sales_summary(old.warung_id, old.created_at::date);
    return old;
  end if;

  perform public.recompute_daily_sales_summary(new.warung_id, new.created_at::date);

  if tg_op = 'UPDATE' and (
       old.warung_id <> new.warung_id
       or old.created_at::date <> new.created_at::date
     ) then
    perform public.recompute_daily_sales_summary(old.warung_id, old.created_at::date);
  end if;

  return new;
end;
$$;

drop trigger if exists on_transactions_summary on public.transactions;
create trigger on_transactions_summary
  after insert or update of total, warung_id, created_at, status or delete
  on public.transactions
  for each row execute function public.trg_transactions_summary();

create or replace function public.trg_transaction_items_summary()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _tx record;
begin
  if tg_op = 'DELETE' then
    select warung_id, created_at::date as d into _tx
      from public.transactions where id = old.transaction_id;
    if found then
      perform public.recompute_daily_sales_summary(_tx.warung_id, _tx.d);
    end if;
    return old;
  end if;

  select warung_id, created_at::date as d into _tx
    from public.transactions where id = new.transaction_id;
  if found then
    perform public.recompute_daily_sales_summary(_tx.warung_id, _tx.d);
  end if;
  return new;
end;
$$;

drop trigger if exists on_transaction_items_summary on public.transaction_items;
create trigger on_transaction_items_summary
  after insert or update of qty, transaction_id or delete
  on public.transaction_items
  for each row execute function public.trg_transaction_items_summary();

create or replace function public.trg_expenses_summary()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recompute_daily_expense_summary(old.warung_id, old.expense_date, old.category);
    return old;
  end if;

  perform public.recompute_daily_expense_summary(new.warung_id, new.expense_date, new.category);

  if tg_op = 'UPDATE' and (
       old.warung_id <> new.warung_id
       or old.expense_date <> new.expense_date
       or old.category <> new.category
     ) then
    perform public.recompute_daily_expense_summary(old.warung_id, old.expense_date, old.category);
  end if;

  return new;
end;
$$;

drop trigger if exists on_expenses_summary on public.expenses;
create trigger on_expenses_summary
  after insert or update of amount, warung_id, expense_date, category or delete
  on public.expenses
  for each row execute function public.trg_expenses_summary();

-- ------------------------------------------------------------
-- 5. MANUAL REBUILD (test #10 — "rebuild summary menghasilkan
--    angka yang sama"). Tervalidasi is_warung_member sendiri
--    karena ini satu-satunya entry point yang boleh dipanggil
--    langsung oleh client.
-- ------------------------------------------------------------
create or replace function public.rebuild_finance_summary(_warung_id uuid, _from_date date, _to_date date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _d date;
  _cat record;
begin
  if not public.is_warung_member(_warung_id) then
    raise exception 'Anda tidak memiliki akses ke warung ini.';
  end if;

  if _to_date < _from_date then
    raise exception 'Rentang tanggal tidak valid.';
  end if;

  if _to_date - _from_date > 366 then
    raise exception 'Rentang rebuild maksimal 366 hari sekali proses.';
  end if;

  _d := _from_date;
  while _d <= _to_date loop
    perform public.recompute_daily_sales_summary(_warung_id, _d);
    _d := _d + 1;
  end loop;

  for _cat in
    select distinct category from public.expenses
    where warung_id = _warung_id
      and expense_date >= _from_date
      and expense_date <= _to_date
  loop
    _d := _from_date;
    while _d <= _to_date loop
      perform public.recompute_daily_expense_summary(_warung_id, _d, _cat.category);
      _d := _d + 1;
    end loop;
  end loop;
end;
$$;

grant execute on function public.rebuild_finance_summary(uuid, date, date) to authenticated;

-- ------------------------------------------------------------
-- 6. BACKFILL — isi summary untuk data historis yang sudah ada
--    supaya dashboard/laporan tidak kosong setelah migration.
-- ------------------------------------------------------------
do $$
declare
  _r record;
begin
  for _r in
    select distinct warung_id, created_at::date as d from public.transactions
  loop
    perform public.recompute_daily_sales_summary(_r.warung_id, _r.d);
  end loop;

  for _r in
    select distinct warung_id, expense_date, category from public.expenses
  loop
    perform public.recompute_daily_expense_summary(_r.warung_id, _r.expense_date, _r.category);
  end loop;
end $$;
