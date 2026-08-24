-- Tạo RPC cho Admin POS tạo đơn hàng tự do
-- Cho phép tùy chỉnh sản phẩm ngoài (không có trong DB), sửa giá, thêm voucher, chiết khấu.

create or replace function public.admin_create_order_full(
  p_customer_id uuid,
  p_items jsonb, -- [{ "product_id": uuid|null, "name": text, "price": numeric, "quantity": numeric, "unit": text }]
  p_voucher_code text default null,
  p_voucher_discount numeric default 0,
  p_discount_percent numeric default 0,
  p_discount_amount numeric default 0,
  p_shipping_amount numeric default 0,
  p_delivery_type text default 'shipping',
  p_delivery_name text default 'Trống',
  p_delivery_phone text default 'Trống',
  p_delivery_address text default 'Trống',
  p_note text default '',
  p_idempotency_key text default '',
  p_admin_id text default 'admin'
)
returns public.orders
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_customer public.vip_accounts%rowtype;
  v_order public.orders%rowtype;
  v_subtotal numeric := 0;
  v_item jsonb;
  v_product_id uuid;
  v_name text;
  v_price numeric;
  v_qty numeric;
  v_unit text;
  v_line_total numeric;
  v_code text;
begin
  -- 1. Get customer
  select * into v_customer from public.vip_accounts where id = p_customer_id;
  if not found then raise exception 'Không tìm thấy khách hàng'; end if;

  -- 2. Generate unique order code
  loop
    v_code := 'AD' || to_char(now(), 'YYMMDD') || '-' || upper(substring(md5(random()::text) from 1 for 4));
    exit when not exists (select 1 from public.orders where order_code = v_code);
  end loop;

  -- 3. Calculate subtotal from provided items
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_price := (v_item->>'price')::numeric;
    v_qty := (v_item->>'quantity')::numeric;
    v_subtotal := v_subtotal + round(v_price * v_qty);
  end loop;

  -- 4. Create Order
  insert into public.orders (
    order_code, customer_id, customer_code, customer_name, customer_phone, customer_company, customer_tier,
    status, source, payment_method, payment_status, delivery_type,
    delivery_name, delivery_phone, delivery_address, note,
    subtotal, discount_percent, discount_amount, voucher_code, voucher_discount, shipping_amount
  ) values (
    v_code, v_customer.id, v_customer.customer_code, v_customer.name, v_customer.phone, v_customer.company_name, v_customer.tier,
    'draft', 'admin', 'COD', 'pending', p_delivery_type,
    p_delivery_name, p_delivery_phone, p_delivery_address, p_note,
    v_subtotal, p_discount_percent, p_discount_amount, p_voucher_code, p_voucher_discount, p_shipping_amount
  ) returning * into v_order;

  -- 5. Insert Order Items
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    if (v_item->>'product_id') is not null and (v_item->>'product_id') <> '' then
      v_product_id := (v_item->>'product_id')::uuid;
    else
      v_product_id := null;
    end if;

    v_name := v_item->>'name';
    v_price := (v_item->>'price')::numeric;
    v_qty := (v_item->>'quantity')::numeric;
    v_unit := coalesce(v_item->>'unit', 'Kg');
    v_line_total := round(v_price * v_qty);

    insert into public.order_items(
      order_id, product_id, product_local_id, sku, name, unit, quantity,
      base_unit_price, discount_percent, unit_price, line_total
    ) values (
      v_order.id, v_product_id, case when v_product_id is null then 'CUSTOM' else null end, case when v_product_id is null then 'CUSTOM-SP' else null end,
      v_name, v_unit, v_qty,
      v_price, 0, v_price, v_line_total
    );
  end loop;

  -- 6. Insert History
  insert into public.order_history(order_id, action, from_status, to_status, actor)
  values (v_order.id, 'admin_created_draft', null, 'draft', p_admin_id);

  return v_order;
end;
$$;

revoke all on function public.admin_create_order_full(uuid, jsonb, text, numeric, numeric, numeric, numeric, text, text, text, text, text, text, text) from public;
grant execute on function public.admin_create_order_full(uuid, jsonb, text, numeric, numeric, numeric, numeric, text, text, text, text, text, text, text) to anon, authenticated;
