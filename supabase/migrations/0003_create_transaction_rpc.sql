-- ============================================================
-- create_transaction: server-authoritative, atomic checkout
-- ------------------------------------------------------------
-- Fixes:
--   - price integrity: harga & subtotal diambil dari menu_items,
--     bukan dari client
--   - availability: menolak menu yang is_active = false / tidak ada
--   - ownership: customer & menu wajib milik _warung_id yang sama
--   - atomicity: transaction + transaction_items dalam satu
--     PL/pgSQL function -> otomatis rollback penuh jika exception
-- security invoker: RLS existing (is_warung_member) tetap berlaku
-- sebagai lapisan pertahanan kedua di balik pengecekan eksplisit
-- di bawah.
-- ============================================================

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

    select id, name, price, is_active
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
