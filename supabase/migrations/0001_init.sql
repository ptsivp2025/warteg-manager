-- ============================================================
-- WARTEG MANAGEMENT PLATFORM — INITIAL SCHEMA + RLS
-- ============================================================
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- TABLES
-- ------------------------------------------------------------

create table if not exists public.warungs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  address text,
  created_at timestamptz not null default now()
);

create table if not exists public.warung_members (
  id uuid primary key default gen_random_uuid(),
  warung_id uuid not null references public.warungs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'staff' check (role in ('owner', 'staff')),
  created_at timestamptz not null default now(),
  unique (warung_id, user_id)
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  warung_id uuid not null references public.warungs(id) on delete cascade,
  name text not null,
  phone text,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  warung_id uuid not null references public.warungs(id) on delete cascade,
  name text not null,
  price numeric(12,2) not null default 0,
  category text not null default 'Lainnya',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  warung_id uuid not null references public.warungs(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  payment_method text not null default 'cash' check (payment_method in ('cash', 'qris', 'transfer', 'hutang')),
  status text not null default 'paid' check (status in ('paid', 'unpaid')),
  total numeric(12,2) not null default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.transaction_items (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id) on delete set null,
  menu_name text not null,
  price numeric(12,2) not null,
  qty integer not null check (qty > 0),
  subtotal numeric(12,2) not null
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  warung_id uuid not null references public.warungs(id) on delete cascade,
  category text not null default 'Belanja',
  description text,
  amount numeric(12,2) not null default 0,
  expense_date date not null default current_date,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- INDEXES
-- ------------------------------------------------------------
create index if not exists idx_members_user on public.warung_members(user_id);
create index if not exists idx_customers_warung on public.customers(warung_id);
create index if not exists idx_menu_warung on public.menu_items(warung_id);
create index if not exists idx_tx_warung_date on public.transactions(warung_id, created_at desc);
create index if not exists idx_tx_items_tx on public.transaction_items(transaction_id);
create index if not exists idx_expenses_warung_date on public.expenses(warung_id, expense_date desc);

-- ------------------------------------------------------------
-- HELPER FUNCTION (security definer, avoids recursive RLS)
-- ------------------------------------------------------------
create or replace function public.is_warung_member(_warung_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.warung_members m
    where m.warung_id = _warung_id and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_warung_owner(_warung_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.warungs w
    where w.id = _warung_id and w.owner_id = auth.uid()
  );
$$;

grant execute on function public.is_warung_member(uuid) to authenticated;
grant execute on function public.is_warung_owner(uuid) to authenticated;

-- Auto-add owner as member when a warung is created
create or replace function public.handle_new_warung()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.warung_members (warung_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (warung_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_warung_created on public.warungs;
create trigger on_warung_created
  after insert on public.warungs
  for each row execute function public.handle_new_warung();

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ------------------------------------------------------------
alter table public.warungs enable row level security;
alter table public.warung_members enable row level security;
alter table public.customers enable row level security;
alter table public.menu_items enable row level security;
alter table public.transactions enable row level security;
alter table public.transaction_items enable row level security;
alter table public.expenses enable row level security;

-- warungs
drop policy if exists "warungs_select" on public.warungs;
create policy "warungs_select" on public.warungs
  for select using (public.is_warung_member(id));

drop policy if exists "warungs_insert" on public.warungs;
create policy "warungs_insert" on public.warungs
  for insert with check (owner_id = auth.uid());

drop policy if exists "warungs_update" on public.warungs;
create policy "warungs_update" on public.warungs
  for update using (owner_id = auth.uid());

drop policy if exists "warungs_delete" on public.warungs;
create policy "warungs_delete" on public.warungs
  for delete using (owner_id = auth.uid());

-- warung_members
drop policy if exists "members_select" on public.warung_members;
create policy "members_select" on public.warung_members
  for select using (public.is_warung_member(warung_id));

drop policy if exists "members_insert" on public.warung_members;
create policy "members_insert" on public.warung_members
  for insert with check (public.is_warung_owner(warung_id));

drop policy if exists "members_delete" on public.warung_members;
create policy "members_delete" on public.warung_members
  for delete using (public.is_warung_owner(warung_id) and role <> 'owner');

-- customers
drop policy if exists "customers_all" on public.customers;
create policy "customers_all" on public.customers
  for all using (public.is_warung_member(warung_id))
  with check (public.is_warung_member(warung_id));

-- menu_items
drop policy if exists "menu_all" on public.menu_items;
create policy "menu_all" on public.menu_items
  for all using (public.is_warung_member(warung_id))
  with check (public.is_warung_member(warung_id));

-- transactions
drop policy if exists "tx_all" on public.transactions;
create policy "tx_all" on public.transactions
  for all using (public.is_warung_member(warung_id))
  with check (public.is_warung_member(warung_id));

-- transaction_items (scoped through parent transaction's warung)
drop policy if exists "tx_items_all" on public.transaction_items;
create policy "tx_items_all" on public.transaction_items
  for all using (
    exists (
      select 1 from public.transactions t
      where t.id = transaction_id and public.is_warung_member(t.warung_id)
    )
  )
  with check (
    exists (
      select 1 from public.transactions t
      where t.id = transaction_id and public.is_warung_member(t.warung_id)
    )
  );

-- expenses
drop policy if exists "expenses_all" on public.expenses;
create policy "expenses_all" on public.expenses
  for all using (public.is_warung_member(warung_id))
  with check (public.is_warung_member(warung_id));
