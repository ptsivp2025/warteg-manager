-- ============================================================
-- PHASE 1 — UNIT CONVERSION + RECIPE/BOM + HPP (COGS)
-- ------------------------------------------------------------
-- Adds raw-material inventory (ingredients) distinct from the
-- existing per-menu `stock_quantity` (finished-portion count).
-- A recipe (BOM) links a menu_item to the ingredients + quantities
-- it consumes. HPP (harga pokok penjualan / COGS per unit sold)
-- is derived from the recipe, cached on menu_items, and recorded
-- per line item at sale time so historical margin never drifts
-- even if ingredient cost changes later.
-- ============================================================

-- ------------------------------------------------------------
-- 1. UNITS + CONVERSION
-- ------------------------------------------------------------
-- Simple star-schema conversion: every unit converts to a single
-- base unit of its category via to_base_factor. Converting unit
-- A -> unit B (same category) is (qty_A * A.to_base_factor) /
-- B.to_base_factor. This covers arbitrary unit-to-unit conversion
-- within a category without a combinatorial pairwise table.
create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,          -- 'g', 'kg', 'ml', 'l', 'pcs', 'sdm', ...
  name text not null,                 -- 'Gram', 'Kilogram', ...
  category text not null check (category in ('weight', 'volume', 'count')),
  to_base_factor numeric(18,6) not null check (to_base_factor > 0),
  created_at timestamptz not null default now()
);

insert into public.units (code, name, category, to_base_factor) values
  ('g',   'Gram',       'weight', 1),
  ('kg',  'Kilogram',   'weight', 1000),
  ('ons', 'Ons',        'weight', 100),
  ('ml',  'Mililiter',  'volume', 1),
  ('l',   'Liter',      'volume', 1000),
  ('pcs', 'Pcs',        'count',  1),
  ('butir', 'Butir',    'count',  1),
  ('ikat', 'Ikat',      'count',  1),
  ('sdm', 'Sendok Makan','volume', 15),
  ('sdt', 'Sendok Teh', 'volume', 5)
on conflict (code) do nothing;

create or replace function public.convert_unit(_qty numeric, _from_unit_id uuid, _to_unit_id uuid)
returns numeric
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  _from record;
  _to record;
begin
  if _from_unit_id = _to_unit_id then
    return _qty;
  end if;

  select * into _from from public.units where id = _from_unit_id;
  select * into _to from public.units where id = _to_unit_id;

  if _from is null or _to is null then
    raise exception 'Unit tidak ditemukan.';
  end if;

  if _from.category <> _to.category then
    raise exception 'Tidak bisa konversi % (%) ke % (%): beda kategori.',
      _from.code, _from.category, _to.code, _to.category;
  end if;

  return (_qty * _from.to_base_factor) / _to.to_base_factor;
end;
$$;

grant execute on function public.convert_unit(numeric, uuid, uuid) to authenticated;

-- ------------------------------------------------------------
-- 2. INGREDIENTS (raw materials / bahan baku)
-- ------------------------------------------------------------
create table if not exists public.ingredients (
  id uuid primary key default gen_random_uuid(),
  warung_id uuid not null references public.warungs(id) on delete cascade,
  outlet_id uuid references public.outlets(id) on delete set null,
  name text not null,
  base_unit_id uuid not null references public.units(id),
  cost_per_base_unit numeric(14,4) not null default 0 check (cost_per_base_unit >= 0),
  current_stock numeric(14,3) not null default 0 check (current_stock >= 0), -- in base_unit
  min_stock numeric(14,3) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_ingredients_warung on public.ingredients(warung_id);
create index if not exists idx_ingredients_outlet on public.ingredients(outlet_id);

alter table public.ingredients enable row level security;

drop policy if exists "ingredients_all" on public.ingredients;
create policy "ingredients_all" on public.ingredients
  for all using (public.is_warung_member(warung_id))
  with check (public.is_warung_member(warung_id));

-- ------------------------------------------------------------
-- 3. INGREDIENT STOCK MOVEMENTS (audit trail, separate from
--    menu-level stock_movements which track finished portions)
-- ------------------------------------------------------------
create table if not exists public.ingredient_stock_movements (
  id uuid primary key default gen_random_uuid(),
  warung_id uuid not null references public.warungs(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  quantity_change numeric(14,3) not null, -- in base_unit; negative = consumed
  type text not null check (type in ('purchase', 'consumption', 'adjustment', 'waste', 'opening')),
  reference_id uuid, -- e.g. transaction_id when type = 'consumption'
  reason text,
  actor uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_ing_movements_ingredient on public.ingredient_stock_movements(ingredient_id, created_at desc);
create index if not exists idx_ing_movements_warung on public.ingredient_stock_movements(warung_id, created_at desc);

alter table public.ingredient_stock_movements enable row level security;

drop policy if exists "ing_movements_select" on public.ingredient_stock_movements;
create policy "ing_movements_select" on public.ingredient_stock_movements
  for select using (public.is_warung_member(warung_id));

-- Writes only via SECURITY DEFINER functions below (adjust_ingredient_stock,
-- create_transaction's recipe-consumption step) to keep current_stock and
-- the movement ledger from drifting apart.

-- ------------------------------------------------------------
-- 4. RECIPES / BOM
-- ------------------------------------------------------------
create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  warung_id uuid not null references public.warungs(id) on delete cascade,
  menu_item_id uuid not null unique references public.menu_items(id) on delete cascade,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_recipes_warung on public.recipes(warung_id);

alter table public.recipes enable row level security;

drop policy if exists "recipes_all" on public.recipes;
create policy "recipes_all" on public.recipes
  for all using (public.is_warung_member(warung_id))
  with check (public.is_warung_member(warung_id));

create table if not exists public.recipe_items (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete restrict,
  quantity numeric(14,4) not null check (quantity > 0), -- in unit_id below
  unit_id uuid not null references public.units(id),
  created_at timestamptz not null default now(),
  unique (recipe_id, ingredient_id)
);

create index if not exists idx_recipe_items_recipe on public.recipe_items(recipe_id);

alter table public.recipe_items enable row level security;

drop policy if exists "recipe_items_all" on public.recipe_items;
create policy "recipe_items_all" on public.recipe_items
  for all using (
    exists (select 1 from public.recipes r where r.id = recipe_id and public.is_warung_member(r.warung_id))
  )
  with check (
    exists (select 1 from public.recipes r where r.id = recipe_id and public.is_warung_member(r.warung_id))
  );

-- ------------------------------------------------------------
-- 5. HPP (COGS) — cached on menu_items, recomputed from recipe
-- ------------------------------------------------------------
alter table public.menu_items
  add column if not exists hpp numeric(14,2) not null default 0,
  add column if not exists hpp_updated_at timestamptz;

create or replace function public.calculate_recipe_cost(_menu_item_id uuid)
returns numeric
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  _recipe_id uuid;
  _total numeric(14,4) := 0;
  _line record;
  _qty_base numeric;
begin
  select id into _recipe_id from public.recipes where menu_item_id = _menu_item_id;
  if _recipe_id is null then
    return 0;
  end if;

  for _line in
    select ri.quantity, ri.unit_id, i.base_unit_id, i.cost_per_base_unit
    from public.recipe_items ri
    join public.ingredients i on i.id = ri.ingredient_id
    where ri.recipe_id = _recipe_id
  loop
    _qty_base := public.convert_unit(_line.quantity, _line.unit_id, _line.base_unit_id);
    _total := _total + (_qty_base * _line.cost_per_base_unit);
  end loop;

  return round(_total, 2);
end;
$$;

grant execute on function public.calculate_recipe_cost(uuid) to authenticated;

create or replace function public.recompute_menu_hpp(_menu_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.menu_items
    set hpp = public.calculate_recipe_cost(_menu_item_id),
        hpp_updated_at = now()
    where id = _menu_item_id;
end;
$$;

grant execute on function public.recompute_menu_hpp(uuid) to authenticated;

-- Recompute HPP whenever the recipe or ingredient cost changes
create or replace function public.trg_recipe_items_hpp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _menu_item_id uuid;
begin
  select menu_item_id into _menu_item_id from public.recipes
    where id = coalesce(new.recipe_id, old.recipe_id);
  if _menu_item_id is not null then
    perform public.recompute_menu_hpp(_menu_item_id);
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists on_recipe_items_hpp on public.recipe_items;
create trigger on_recipe_items_hpp
  after insert or update or delete on public.recipe_items
  for each row execute function public.trg_recipe_items_hpp();

create or replace function public.trg_ingredient_cost_hpp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _menu_item_id uuid;
begin
  if new.cost_per_base_unit is distinct from old.cost_per_base_unit then
    for _menu_item_id in
      select distinct r.menu_item_id
      from public.recipe_items ri
      join public.recipes r on r.id = ri.recipe_id
      where ri.ingredient_id = new.id
    loop
      perform public.recompute_menu_hpp(_menu_item_id);
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists on_ingredient_cost_hpp on public.ingredients;
create trigger on_ingredient_cost_hpp
  after update of cost_per_base_unit on public.ingredients
  for each row execute function public.trg_ingredient_cost_hpp();

-- ------------------------------------------------------------
-- 6. adjust_ingredient_stock — controlled write path (purchase/
--    adjustment/waste/opening). Consumption from sales happens
--    inside create_transaction (migration 0008), not here.
-- ------------------------------------------------------------
create or replace function public.adjust_ingredient_stock(
  _warung_id uuid,
  _ingredient_id uuid,
  _quantity_change numeric, -- in base_unit; positive or negative
  _type text,
  _reason text default null
)
returns numeric
language plpgsql
security invoker
set search_path = public
as $$
declare
  _new_stock numeric;
begin
  if not public.is_warung_member(_warung_id) then
    raise exception 'Anda tidak memiliki akses ke warung ini.';
  end if;

  if _type not in ('purchase', 'adjustment', 'waste', 'opening') then
    raise exception 'Tipe pergerakan stok tidak valid untuk fungsi ini.';
  end if;

  update public.ingredients
    set current_stock = current_stock + _quantity_change
    where id = _ingredient_id
      and warung_id = _warung_id
      and current_stock + _quantity_change >= 0
    returning current_stock into _new_stock;

  if not found then
    raise exception 'Bahan baku tidak ditemukan atau stok tidak cukup.';
  end if;

  insert into public.ingredient_stock_movements
    (warung_id, ingredient_id, quantity_change, type, reason, actor)
  values
    (_warung_id, _ingredient_id, _quantity_change, _type, _reason, auth.uid());

  return _new_stock;
end;
$$;

grant execute on function public.adjust_ingredient_stock(uuid, uuid, numeric, text, text) to authenticated;
