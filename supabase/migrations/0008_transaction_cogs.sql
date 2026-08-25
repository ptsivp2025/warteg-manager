-- ============================================================
-- WIRE HPP/COGS + RECIPE CONSUMPTION INTO CHECKOUT
-- ------------------------------------------------------------
-- Same public signature as 0004's create_transaction — no client
-- contract change. Adds, per line item:
--   - transaction_items.cogs: qty * menu_items.hpp AT SALE TIME
--     (frozen on the row, so later ingredient-cost changes never
--     rewrite historical margin — this is why cogs lives on
--     transaction_items, not derived on read)
--   - if the menu item has a recipe, deducts each ingredient's
--     stock atomically (never goes negative) and logs a
--     'consumption' ingredient_stock_movements row
-- Existing finished-portion stock_quantity deduction (0004) is
-- unchanged and still runs — recipe-based ingredient deduction is
-- additive, not a replacement, so warungs without recipes yet
-- keep working exactly as before.
-- ============================================================

alter table public.transaction_items
  add column if not exists cogs numeric(14,2) not null default 0;

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
  _recipe_id uuid;
  _line_cogs numeric(14,2);
  _ing_line record;
  _needed_base numeric;
  _new_ing_stock numeric;
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

    select id, name, price, is_active, stock_quantity, stock_unit, hpp
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

    -- Finished-portion stock (unchanged from 0004): atomic check-and-deduct
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

    -- Recipe-based ingredient consumption (additive, only if a recipe exists)
    select id into _recipe_id from public.recipes where menu_item_id = _menu.id;

    if _recipe_id is not null then
      for _ing_line in
        select ri.ingredient_id, ri.quantity, ri.unit_id,
               i.base_unit_id, i.current_stock, i.name as ingredient_name, i.cost_per_base_unit
        from public.recipe_items ri
        join public.ingredients i on i.id = ri.ingredient_id
        where ri.recipe_id = _recipe_id
      loop
        _needed_base := public.convert_unit(_ing_line.quantity, _ing_line.unit_id, _ing_line.base_unit_id) * _qty;

        update public.ingredients
           set current_stock = current_stock - _needed_base
         where id = _ing_line.ingredient_id
           and warung_id = _warung_id
           and current_stock >= _needed_base
        returning current_stock into _new_ing_stock;

        if not found then
          raise exception 'Stok bahan baku % tidak cukup untuk membuat %.', _ing_line.ingredient_name, _menu.name;
        end if;

        insert into public.ingredient_stock_movements
          (warung_id, ingredient_id, quantity_change, type, reference_id, actor)
        values
          (_warung_id, _ing_line.ingredient_id, -_needed_base, 'consumption', _tx_id, auth.uid());
      end loop;
    end if;

    -- COGS frozen at sale-time price of ingredients, not recalculated later
    _line_cogs := coalesce(_menu.hpp, 0) * _qty;

    insert into public.transaction_items
      (transaction_id, menu_item_id, menu_name, price, qty, subtotal, cogs)
    values
      (_tx_id, _menu.id, _menu.name, _menu.price, _qty, _menu.price * _qty, _line_cogs);

    _total := _total + (_menu.price * _qty);
  end loop;

  update public.transactions set total = _total where id = _tx_id;

  return _tx_id;
end;
$$;

grant execute on function public.create_transaction(uuid, uuid, text, jsonb) to authenticated;

-- ------------------------------------------------------------
-- Daily/monthly summary: add COGS + gross profit alongside
-- existing gross_revenue, so Phase 4 dashboards have real numbers
-- to read instead of recomputing from raw rows every time.
-- ------------------------------------------------------------
alter table public.daily_sales_summary
  add column if not exists cogs numeric(14,2) not null default 0;
alter table public.monthly_sales_summary
  add column if not exists cogs numeric(14,2) not null default 0;

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
  _cogs numeric(14,2);
begin
  select coalesce(sum(t.total), 0), count(*)
    into _revenue, _tx_count
    from public.transactions t
    where t.warung_id = _warung_id
      and t.created_at >= _date::timestamptz
      and t.created_at < (_date + 1)::timestamptz;

  select coalesce(sum(ti.qty), 0), coalesce(sum(ti.cogs), 0)
    into _item_qty, _cogs
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
      (warung_id, summary_date, gross_revenue, transaction_count, item_quantity, cogs, updated_at)
    values
      (_warung_id, _date, _revenue, _tx_count, _item_qty, _cogs, now())
    on conflict (warung_id, summary_date) do update
      set gross_revenue = excluded.gross_revenue,
          transaction_count = excluded.transaction_count,
          item_quantity = excluded.item_quantity,
          cogs = excluded.cogs,
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
  _cogs numeric(14,2);
begin
  select coalesce(sum(gross_revenue), 0), coalesce(sum(transaction_count), 0),
         coalesce(sum(item_quantity), 0), coalesce(sum(cogs), 0)
    into _revenue, _tx_count, _item_qty, _cogs
    from public.daily_sales_summary
    where warung_id = _warung_id
      and summary_date >= _month_start
      and summary_date < _month_end;

  if _tx_count = 0 then
    delete from public.monthly_sales_summary
      where warung_id = _warung_id and summary_month = _month_start;
  else
    insert into public.monthly_sales_summary
      (warung_id, summary_month, gross_revenue, transaction_count, item_quantity, cogs, updated_at)
    values
      (_warung_id, _month_start, _revenue, _tx_count, _item_qty, _cogs, now())
    on conflict (warung_id, summary_month) do update
      set gross_revenue = excluded.gross_revenue,
          transaction_count = excluded.transaction_count,
          item_quantity = excluded.item_quantity,
          cogs = excluded.cogs,
          updated_at = now();
  end if;
end;
$$;

-- Re-backfill summaries so historical rows pick up cogs = 0 consistently
-- (real cogs only exists going forward once recipes are defined; that's
-- correct — HPP for a period before a recipe existed is genuinely unknown).
do $$
declare
  _r record;
begin
  for _r in
    select distinct warung_id, created_at::date as d from public.transactions
  loop
    perform public.recompute_daily_sales_summary(_r.warung_id, _r.d);
  end loop;
end $$;
