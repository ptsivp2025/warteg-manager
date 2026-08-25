-- ============================================================
-- STOCK MANAGEMENT (menu -> stock -> availability -> cart ->
-- transaction -> stock berkurang) + minimal branding background
-- ------------------------------------------------------------
-- Stock (jumlah fisik) dan availability (is_active, boleh/tidak
-- dijual) TETAP dua konsep terpisah — is_active tidak diganti.
-- ============================================================

-- ------------------------------------------------------------
-- 1. menu_items: stock quantity + unit
-- ------------------------------------------------------------
alter table public.menu_items
  add column if not exists stock_quantity integer not null default 0,
  add column if not exists stock_unit text not null default 'porsi';

alter table public.menu_items
  drop constraint if exists menu_items_stock_quantity_check;
alter table public.menu_items
  add constraint menu_items_stock_quantity_check check (stock_quantity >= 0);

-- ------------------------------------------------------------
-- 2. stock_movements — minimal audit trail per section 7
-- ------------------------------------------------------------
create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  warung_id uuid not null references public.warungs(id) on delete cascade,
  menu_item_id uuid not null references public.menu_items(id) on delete cascade,
  quantity_change integer not null,
  type text not null check (type in ('sale', 'restock', 'adjustment', 'waste')),
  reason text,
  actor uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_stock_movements_menu
  on public.stock_movements(menu_item_id, created_at desc);
create index if not exists idx_stock_movements_warung
  on public.stock_movements(warung_id, created_at desc);

alter table public.stock_movements enable row level security;

drop policy if exists "stock_movements_all" on public.stock_movements;
create policy "stock_movements_all" on public.stock_movements
  for all using (public.is_warung_member(warung_id))
  with check (public.is_warung_member(warung_id));

-- ------------------------------------------------------------
-- 3. warungs: background (minimal branding, section 9)
-- ------------------------------------------------------------
alter table public.warungs
  add column if not exists background_url text;

-- ------------------------------------------------------------
-- 4. create_transaction: validate + deduct stock atomically
-- ------------------------------------------------------------
-- Same signature as before (0003) — no client contract change.
-- Adds: stock check (server source of truth, never trusts client),
-- atomic conditional UPDATE so stock can never go negative even
-- under concurrent checkouts, and a 'sale' stock_movements row.
create or replace function public.create_transaction(
  _warung_id uuid,
  _customer_id uuid,
  _payment_method text,
  _items jsonb -- [{ "menu_item_id": uuid, "qty": integer }, ...]
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  _tx_id uuid;
  _total numeric(12,2) := 0;
  _item jsonb;
  _menu record;
  _qty integer;
  _status text;
  _remaining_stock integer;
begin
  if not public.is_warung_member(_warung_id) then
    raise exception 'Anda tidak memiliki akses ke warung ini.';
  end if;

  if _payment_method not in ('cash', 'qris', 'transfer', 'hutang') then
    raise exception 'Metode pembayaran tidak valid.';
  end if;

  if _payment_method = 'hutang' and _customer_id is null then
    raise exception 'Transaksi hutang wajib memilih nama pelanggan.';
  end if;

  if _customer_id is not null then
    if not exists (
      select 1 from public.customers c
      where c.id = _customer_id and c.warung_id = _warung_id
    ) then
      raise exception 'Pelanggan tidak ditemukan di warung ini.';
    end if;
  end if;

  if _items is null or jsonb_array_length(_items) = 0 then
    raise exception 'Pilih minimal satu menu.';
  end if;

  _status := case when _payment_method = 'hutang' then 'unpaid' else 'paid' end;

  insert into public.transactions
    (warung_id, customer_id, payment_method, status, total, created_by)
  values
    (_warung_id, _customer_id, _payment_method, _status, 0, auth.uid())
  returning id into _tx_id;

  for _item in select * from jsonb_array_elements(_items)
  loop
    _qty := (_item->>'qty')::integer;
    if _qty is null or _qty <= 0 then
      raise exception 'Jumlah item tidak valid.';
    end if;

    select id, name, price, is_active, stock_quantity, stock_unit
      into _menu
      from public.menu_items
      where id = (_item->>'menu_item_id')::uuid
        and warung_id = _warung_id;

    if not found then
      raise exception 'Menu tidak ditemukan di warung ini.';
    end if;

    if not _menu.is_active then
      raise exception 'Transaksi ditolak. Menu % sudah tidak tersedia.', _menu.name;
    end if;

    -- Atomic check-and-deduct: kondisi stock_quantity >= _qty ada di
    -- WHERE, jadi tidak ada race condition antar transaksi bersamaan
    -- dan stock tidak pernah menjadi negatif.
    update public.menu_items
       set stock_quantity = stock_quantity - _qty
     where id = _menu.id
       and warung_id = _warung_id
       and stock_quantity >= _qty
    returning stock_quantity into _remaining_stock;

    if not found then
      raise exception 'Stok % hanya tersisa % %.', _menu.name, _menu.stock_quantity, _menu.stock_unit;
    end if;

    insert into public.stock_movements
      (warung_id, menu_item_id, quantity_change, type, reason, actor)
    values
      (_warung_id, _menu.id, -_qty, 'sale', null, auth.uid());

    insert into public.transaction_items
      (transaction_id, menu_item_id, menu_name, price, qty, subtotal)
    values
      (_tx_id, _menu.id, _menu.name, _menu.price, _qty, _menu.price * _qty);

    _total := _total + (_menu.price * _qty);
  end loop;

  update public.transactions set total = _total where id = _tx_id;

  return _tx_id;
end;
$$;

grant execute on function public.create_transaction(uuid, uuid, text, jsonb) to authenticated;

-- ------------------------------------------------------------
-- 5. restock_menu_item — additive "Tambah Stok" action (section 4)
-- ------------------------------------------------------------
create or replace function public.restock_menu_item(
  _warung_id uuid,
  _menu_item_id uuid,
  _quantity integer,
  _reason text default null
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  _new_stock integer;
begin
  if not public.is_warung_member(_warung_id) then
    raise exception 'Anda tidak memiliki akses ke warung ini.';
  end if;

  if _quantity is null or _quantity <= 0 then
    raise exception 'Jumlah tambah stok tidak valid.';
  end if;

  update public.menu_items
     set stock_quantity = stock_quantity + _quantity
   where id = _menu_item_id
     and warung_id = _warung_id
  returning stock_quantity into _new_stock;

  if not found then
    raise exception 'Menu tidak ditemukan di warung ini.';
  end if;

  insert into public.stock_movements
    (warung_id, menu_item_id, quantity_change, type, reason, actor)
  values
    (_warung_id, _menu_item_id, _quantity, 'restock', _reason, auth.uid());

  return _new_stock;
end;
$$;

grant execute on function public.restock_menu_item(uuid, uuid, integer, text) to authenticated;
