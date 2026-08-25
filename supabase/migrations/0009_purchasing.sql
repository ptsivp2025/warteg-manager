-- ============================================================
-- PHASE 2 — SUPPLIER + PURCHASING + RECEIVING
-- ------------------------------------------------------------
-- Flow: supplier -> purchase_order (draft) -> purchase_order_items
-- -> receive_purchase_order() (partial or full) -> ingredient
-- stock increases + ingredient_stock_movements ('purchase' rows,
-- reference_id = PO id) + payable tracked on the PO itself.
-- Per FINANCIAL DATA MODEL in the positioning doc: purchase is
-- NEVER a direct revenue deduction. It only affects inventory/
-- payable. COGS still only happens at sale time (0008).
-- ============================================================

-- ------------------------------------------------------------
-- 1. SUPPLIERS
-- ------------------------------------------------------------
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  warung_id uuid not null references public.warungs(id) on delete cascade,
  name text not null,
  contact_phone text,
  address text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_suppliers_warung on public.suppliers(warung_id);

alter table public.suppliers enable row level security;

drop policy if exists "suppliers_all" on public.suppliers;
create policy "suppliers_all" on public.suppliers
  for all using (public.is_warung_member(warung_id))
  with check (public.is_warung_member(warung_id));

-- ------------------------------------------------------------
-- 2. PURCHASE ORDERS
-- ------------------------------------------------------------
create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  warung_id uuid not null references public.warungs(id) on delete cascade,
  outlet_id uuid references public.outlets(id) on delete set null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  status text not null default 'draft'
    check (status in ('draft', 'ordered', 'partially_received', 'received', 'cancelled')),
  total_cost numeric(14,2) not null default 0, -- recomputed from items
  amount_paid numeric(14,2) not null default 0,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_po_warung on public.purchase_orders(warung_id, created_at desc);
create index if not exists idx_po_supplier on public.purchase_orders(supplier_id);

alter table public.purchase_orders enable row level security;

drop policy if exists "po_all" on public.purchase_orders;
create policy "po_all" on public.purchase_orders
  for all using (public.is_warung_member(warung_id))
  with check (public.is_warung_member(warung_id));

-- payable = total_cost - amount_paid (view, not stored, so it never drifts)
create or replace view public.purchase_order_payable
  with (security_invoker = true) as
  select id, warung_id, total_cost, amount_paid,
         (total_cost - amount_paid) as payable
  from public.purchase_orders
  where status in ('ordered', 'partially_received', 'received');

create table if not exists public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete restrict,
  quantity_ordered numeric(14,3) not null check (quantity_ordered > 0), -- in ingredient's base_unit
  quantity_received numeric(14,3) not null default 0 check (quantity_received >= 0),
  unit_cost numeric(14,4) not null default 0 check (unit_cost >= 0), -- per base_unit
  created_at timestamptz not null default now()
);

create index if not exists idx_po_items_po on public.purchase_order_items(purchase_order_id);

alter table public.purchase_order_items enable row level security;

drop policy if exists "po_items_all" on public.purchase_order_items;
create policy "po_items_all" on public.purchase_order_items
  for all using (
    exists (select 1 from public.purchase_orders po where po.id = purchase_order_id and public.is_warung_member(po.warung_id))
  )
  with check (
    exists (select 1 from public.purchase_orders po where po.id = purchase_order_id and public.is_warung_member(po.warung_id))
  );

-- ------------------------------------------------------------
-- 3. CREATE PURCHASE ORDER (draft, with line items)
-- ------------------------------------------------------------
create or replace function public.create_purchase_order(
  _warung_id uuid,
  _supplier_id uuid,
  _notes text,
  _items jsonb -- [{ "ingredient_id": uuid, "quantity_ordered": numeric, "unit_cost": numeric }, ...]
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  _po_id uuid;
  _item jsonb;
  _total numeric(14,2) := 0;
  _qty numeric;
  _cost numeric;
begin
  if not public.is_warung_member(_warung_id) then
    raise exception 'Anda tidak memiliki akses ke warung ini.';
  end if;

  if _items is null or jsonb_array_length(_items) = 0 then
    raise exception 'Pilih minimal satu bahan baku.';
  end if;

  insert into public.purchase_orders (warung_id, supplier_id, notes, status, created_by)
  values (_warung_id, _supplier_id, nullif(_notes, ''), 'ordered', auth.uid())
  returning id into _po_id;

  for _item in select * from jsonb_array_elements(_items)
  loop
    _qty := (_item->>'quantity_ordered')::numeric;
    _cost := coalesce((_item->>'unit_cost')::numeric, 0);
    if _qty is null or _qty <= 0 then
      raise exception 'Jumlah pesan tidak valid.';
    end if;

    if not exists (
      select 1 from public.ingredients i
      where i.id = (_item->>'ingredient_id')::uuid and i.warung_id = _warung_id
    ) then
      raise exception 'Bahan baku tidak ditemukan di warung ini.';
    end if;

    insert into public.purchase_order_items
      (purchase_order_id, ingredient_id, quantity_ordered, unit_cost)
    values
      (_po_id, (_item->>'ingredient_id')::uuid, _qty, _cost);

    _total := _total + (_qty * _cost);
  end loop;

  update public.purchase_orders set total_cost = _total, updated_at = now() where id = _po_id;

  return _po_id;
end;
$$;

grant execute on function public.create_purchase_order(uuid, uuid, text, jsonb) to authenticated;

-- ------------------------------------------------------------
-- 4. RECEIVE PURCHASE ORDER (partial or full)
-- ------------------------------------------------------------
-- Increases ingredient.current_stock, logs ingredient_stock_movements
-- ('purchase', reference_id = PO id), updates PO status. Ingredient
-- cost_per_base_unit is updated to the latest received unit_cost
-- (last-in cost) so future HPP reflects current purchasing reality —
-- this is a deliberate simplification vs. weighted-average costing,
-- appropriate for warteg-scale volume; note it for future refinement.
create or replace function public.receive_purchase_order(
  _warung_id uuid,
  _purchase_order_id uuid,
  _receipts jsonb -- [{ "purchase_order_item_id": uuid, "quantity_received": numeric }, ...]
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  _receipt jsonb;
  _line record;
  _qty numeric;
  _fully_received boolean;
  _partially_received boolean;
begin
  if not public.is_warung_member(_warung_id) then
    raise exception 'Anda tidak memiliki akses ke warung ini.';
  end if;

  if not exists (
    select 1 from public.purchase_orders
    where id = _purchase_order_id and warung_id = _warung_id
      and status in ('ordered', 'partially_received')
  ) then
    raise exception 'Purchase order tidak ditemukan atau sudah selesai/dibatalkan.';
  end if;

  for _receipt in select * from jsonb_array_elements(_receipts)
  loop
    _qty := (_receipt->>'quantity_received')::numeric;
    if _qty is null or _qty <= 0 then
      raise exception 'Jumlah terima tidak valid.';
    end if;

    select poi.*, i.id as ing_id
      into _line
      from public.purchase_order_items poi
      join public.ingredients i on i.id = poi.ingredient_id
      where poi.id = (_receipt->>'purchase_order_item_id')::uuid
        and poi.purchase_order_id = _purchase_order_id;

    if not found then
      raise exception 'Item purchase order tidak ditemukan.';
    end if;

    if _line.quantity_received + _qty > _line.quantity_ordered then
      raise exception 'Jumlah terima melebihi jumlah pesan.';
    end if;

    update public.purchase_order_items
      set quantity_received = quantity_received + _qty
      where id = _line.id;

    update public.ingredients
      set current_stock = current_stock + _qty,
          cost_per_base_unit = case when _line.unit_cost > 0 then _line.unit_cost else cost_per_base_unit end
      where id = _line.ing_id;

    insert into public.ingredient_stock_movements
      (warung_id, ingredient_id, quantity_change, type, reference_id, actor)
    values
      (_warung_id, _line.ing_id, _qty, 'purchase', _purchase_order_id, auth.uid());
  end loop;

  select
    not exists (
      select 1 from public.purchase_order_items
      where purchase_order_id = _purchase_order_id and quantity_received < quantity_ordered
    ),
    exists (
      select 1 from public.purchase_order_items
      where purchase_order_id = _purchase_order_id and quantity_received > 0
    )
    into _fully_received, _partially_received;

  update public.purchase_orders
    set status = case
          when _fully_received then 'received'
          when _partially_received then 'partially_received'
          else status
        end,
        updated_at = now()
    where id = _purchase_order_id;
end;
$$;

grant execute on function public.receive_purchase_order(uuid, uuid, jsonb) to authenticated;

create or replace function public.record_purchase_payment(
  _warung_id uuid,
  _purchase_order_id uuid,
  _amount numeric
)
returns numeric
language plpgsql
security invoker
set search_path = public
as $$
declare
  _new_paid numeric;
begin
  if not public.is_warung_member(_warung_id) then
    raise exception 'Anda tidak memiliki akses ke warung ini.';
  end if;

  if _amount is null or _amount <= 0 then
    raise exception 'Jumlah bayar tidak valid.';
  end if;

  update public.purchase_orders
    set amount_paid = amount_paid + _amount, updated_at = now()
    where id = _purchase_order_id and warung_id = _warung_id
    returning amount_paid into _new_paid;

  if not found then
    raise exception 'Purchase order tidak ditemukan.';
  end if;

  return _new_paid;
end;
$$;

grant execute on function public.record_purchase_payment(uuid, uuid, numeric) to authenticated;

create or replace function public.cancel_purchase_order(_warung_id uuid, _purchase_order_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not public.is_warung_member(_warung_id) then
    raise exception 'Anda tidak memiliki akses ke warung ini.';
  end if;

  update public.purchase_orders
    set status = 'cancelled', updated_at = now()
    where id = _purchase_order_id
      and warung_id = _warung_id
      and status in ('draft', 'ordered');

  if not found then
    raise exception 'Purchase order tidak bisa dibatalkan (sudah diterima sebagian/seluruhnya, atau tidak ditemukan).';
  end if;
end;
$$;

grant execute on function public.cancel_purchase_order(uuid, uuid) to authenticated;
