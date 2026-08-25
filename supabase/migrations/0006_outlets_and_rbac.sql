-- ============================================================
-- PLATFORM FOUNDATION — outlets + expanded RBAC
-- ------------------------------------------------------------
-- Per platform positioning doc: tenant/outlet/user architecture
-- must exist starting Phase 1, WITHOUT rewriting existing
-- architecture. `warungs` stays the tenant/company table
-- (source of truth, per doc instruction not to force renames).
-- This migration adds:
--   1. outlets (one warung/tenant -> many outlets)
--   2. expanded role vocabulary on warung_members (RBAC)
--   3. per-member outlet access scoping (optional; empty = all
--      outlets of the warung, so existing single-outlet warungs
--      keep working with zero behavior change)
--   4. outlet_id (nullable, additive) on operational tables,
--      backfilled to each warung's default outlet
-- No existing column is renamed or dropped. No RLS policy is
-- weakened. Nothing here changes app-visible behavior until the
-- UI starts writing outlet_id explicitly (Phase 5).
-- ============================================================

-- ------------------------------------------------------------
-- 1. OUTLETS
-- ------------------------------------------------------------
create table if not exists public.outlets (
  id uuid primary key default gen_random_uuid(),
  warung_id uuid not null references public.warungs(id) on delete cascade,
  name text not null,
  address text,
  is_active boolean not null default true,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_outlets_warung on public.outlets(warung_id);

-- Exactly one default outlet per warung
create unique index if not exists uq_outlets_one_default_per_warung
  on public.outlets(warung_id) where (is_default);

alter table public.outlets enable row level security;

drop policy if exists "outlets_select" on public.outlets;
create policy "outlets_select" on public.outlets
  for select using (public.is_warung_member(warung_id));

drop policy if exists "outlets_write" on public.outlets;
create policy "outlets_write" on public.outlets
  for all using (public.is_warung_owner(warung_id))
  with check (public.is_warung_owner(warung_id));

-- Backfill: every existing warung gets one default outlet
insert into public.outlets (warung_id, name, is_active, is_default)
select w.id, 'Outlet Utama', true, true
from public.warungs w
where not exists (
  select 1 from public.outlets o where o.warung_id = w.id and o.is_default
);

-- New warungs automatically get a default outlet too
create or replace function public.handle_new_warung_outlet()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.outlets (warung_id, name, is_active, is_default)
  values (new.id, 'Outlet Utama', true, true);
  return new;
end;
$$;

drop trigger if exists on_warung_created_outlet on public.warungs;
create trigger on_warung_created_outlet
  after insert on public.warungs
  for each row execute function public.handle_new_warung_outlet();

-- Helper: default outlet id for a warung
create or replace function public.default_outlet_id(_warung_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select id from public.outlets
  where warung_id = _warung_id and is_default
  limit 1;
$$;

grant execute on function public.default_outlet_id(uuid) to authenticated;

-- ------------------------------------------------------------
-- 2. EXPANDED ROLE VOCABULARY
-- ------------------------------------------------------------
-- Existing values 'owner' / 'staff' kept for backward compat.
-- 'staff' historically meant "cashier-ish generic worker"; new
-- rows should use the specific role. Existing rows are left as
-- 'staff' (untouched) rather than guessed at.
alter table public.warung_members
  drop constraint if exists warung_members_role_check;

alter table public.warung_members
  add constraint warung_members_role_check check (
    role in (
      'owner', 'staff',
      'admin', 'manager', 'supervisor',
      'cashier', 'kitchen', 'inventory', 'finance'
    )
  );

-- ------------------------------------------------------------
-- 3. OUTLET ACCESS (optional scoping)
-- ------------------------------------------------------------
-- No rows for a member => member has access to every outlet in
-- their warung (matches current single-outlet behavior exactly).
-- Rows present => member is restricted to the listed outlets.
create table if not exists public.member_outlet_access (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.warung_members(id) on delete cascade,
  outlet_id uuid not null references public.outlets(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (member_id, outlet_id)
);

create index if not exists idx_member_outlet_access_member on public.member_outlet_access(member_id);
create index if not exists idx_member_outlet_access_outlet on public.member_outlet_access(outlet_id);

alter table public.member_outlet_access enable row level security;

drop policy if exists "member_outlet_access_select" on public.member_outlet_access;
create policy "member_outlet_access_select" on public.member_outlet_access
  for select using (
    exists (
      select 1 from public.warung_members m
      where m.id = member_id and public.is_warung_member(m.warung_id)
    )
  );

drop policy if exists "member_outlet_access_write" on public.member_outlet_access;
create policy "member_outlet_access_write" on public.member_outlet_access
  for all using (
    exists (
      select 1 from public.warung_members m
      where m.id = member_id and public.is_warung_owner(m.warung_id)
    )
  )
  with check (
    exists (
      select 1 from public.warung_members m
      where m.id = member_id and public.is_warung_owner(m.warung_id)
    )
  );

create or replace function public.has_outlet_access(_outlet_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.outlets o
    join public.warung_members m
      on m.warung_id = o.warung_id and m.user_id = auth.uid()
    where o.id = _outlet_id
      and (
        not exists (
          select 1 from public.member_outlet_access a where a.member_id = m.id
        )
        or exists (
          select 1 from public.member_outlet_access a
          where a.member_id = m.id and a.outlet_id = _outlet_id
        )
      )
  );
$$;

grant execute on function public.has_outlet_access(uuid) to authenticated;

-- ------------------------------------------------------------
-- 4. outlet_id ON OPERATIONAL TABLES (additive, nullable)
-- ------------------------------------------------------------
alter table public.customers add column if not exists outlet_id uuid references public.outlets(id) on delete set null;
alter table public.menu_items add column if not exists outlet_id uuid references public.outlets(id) on delete set null;
alter table public.transactions add column if not exists outlet_id uuid references public.outlets(id) on delete set null;
alter table public.expenses add column if not exists outlet_id uuid references public.outlets(id) on delete set null;
alter table public.stock_movements add column if not exists outlet_id uuid references public.outlets(id) on delete set null;

-- Backfill existing rows to each warung's default outlet
update public.customers c set outlet_id = public.default_outlet_id(c.warung_id) where outlet_id is null;
update public.menu_items m set outlet_id = public.default_outlet_id(m.warung_id) where outlet_id is null;
update public.transactions t set outlet_id = public.default_outlet_id(t.warung_id) where outlet_id is null;
update public.expenses e set outlet_id = public.default_outlet_id(e.warung_id) where outlet_id is null;
update public.stock_movements s set outlet_id = public.default_outlet_id(s.warung_id) where outlet_id is null;

create index if not exists idx_customers_outlet on public.customers(outlet_id);
create index if not exists idx_menu_items_outlet on public.menu_items(outlet_id);
create index if not exists idx_transactions_outlet on public.transactions(outlet_id);
create index if not exists idx_expenses_outlet on public.expenses(outlet_id);
create index if not exists idx_stock_movements_outlet on public.stock_movements(outlet_id);

-- NOTE: outlet_id is intentionally still nullable and not yet
-- required by create_transaction() or RLS. Making it mandatory
-- and outlet-scoping RLS is a Phase 5 (Outlet Management) change,
-- once the UI has an outlet switcher and every insert path sends
-- outlet_id explicitly. Forcing it now would break every existing
-- write path for zero functional benefit in a single-outlet warteg.
