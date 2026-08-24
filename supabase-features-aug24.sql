-- 1. Thêm trạng thái 'draft' cho đơn hàng (để Admin tạo đơn nháp)
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('draft', 'pending', 'confirmed', 'preparing', 'shipping', 'completed', 'canceled'));

alter table public.orders add column if not exists created_by_admin_id text;

-- 2. Thêm hạng CUSTOM vào khách hàng
alter table public.vip_accounts drop constraint if exists vip_accounts_discount_tier_check;
alter table public.vip_accounts add constraint vip_accounts_discount_tier_check
  check (discount_tier in ('VIP0', 'VIP1', 'VIP2', 'VIP3', 'CUSTOM'));

insert into public.customer_tiers (code, name, discount_percent)
values ('CUSTOM', 'Bảng giá riêng theo hợp đồng', 0)
on conflict (code) do nothing;

-- 3. Tạo bảng Bảng giá hợp đồng (customer_contract_prices)
create table if not exists public.customer_contract_prices (
  customer_id uuid not null references public.vip_accounts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  price numeric(14,2) not null check (price >= 0),
  valid_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (customer_id, product_id)
);

alter table public.customer_contract_prices enable row level security;
drop policy if exists select_contract_prices_all on public.customer_contract_prices;
drop policy if exists manage_contract_prices_all on public.customer_contract_prices;
create policy select_contract_prices_all on public.customer_contract_prices for select using (true);
create policy manage_contract_prices_all on public.customer_contract_prices for all using (true);

-- 4. Cập nhật hàm customer_create_order để HỖ TRỢ CUSTOM TYPE VÀ DRAFT STATUS
drop function if exists public.customer_create_order(uuid, text, jsonb, text, text, text, text, text, text, text, text, text);
drop function if exists public.customer_create_order(uuid, text, jsonb, text, text, text, text, text, text, text, text, text, uuid);
create or replace function public.customer_create_order(
  p_session_token uuid,
  p_source text,
  p_items jsonb,
  p_delivery_type text,
  p_delivery_alias text,
  p_delivery_address text,
  p_delivery_name text,
  p_delivery_phone text,
  p_note text,
  p_idempotency_key text,
  p_voucher_code text default null,
  p_admin_id text default null,
  p_customer_id uuid default null
)
returns setof public.orders
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_customer public.vip_accounts%rowtype;
  v_discount numeric := 0;
  v_order public.orders%rowtype;
  v_item jsonb;
  v_product public.products%rowtype;
  v_identifier text;
  v_quantity numeric;
  v_base_price numeric;
  v_unit_price numeric;
  v_line_total numeric;
  v_subtotal numeric := 0;
  v_grand_total numeric := 0;
  v_item_count integer := 0;
  v_custom_price public.customer_contract_prices%rowtype;
  
  v_voucher public.vouchers%rowtype;
  v_voucher_discount numeric := 0;
  v_user_usages integer := 0;
  
  v_status text := 'pending';
begin
  if p_source not in ('website', 'zalo_mini_app', 'admin') then
    raise exception 'Nguồn đơn hàng không hợp lệ';
  end if;
  if p_delivery_type not in ('shipping', 'pickup') then
    raise exception 'Hình thức giao hàng không hợp lệ';
  end if;
  if p_delivery_type = 'shipping' and coalesce(trim(p_delivery_address), '') = '' then
    raise exception 'Thiếu địa chỉ giao hàng';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Giỏ hàng trống';
  end if;

  if p_source = 'admin' and p_customer_id is not null then
    -- Khi Admin tạo, bỏ qua kiểm tra session_token, truy vấn trực tiếp khách hàng
    select * into v_customer from public.vip_accounts where id = p_customer_id and is_active = true;
    if not found then raise exception 'Khách hàng không hợp lệ hoặc đã bị khóa'; end if;
    v_status := 'draft';
  else
    select a.* into v_customer
    from public.customer_sessions s
    join public.vip_accounts a on a.id = s.customer_id
    where s.token = p_session_token
      and s.expires_at > now()
      and a.is_active = true;
    if not found then raise exception 'Phiên khách hàng không hợp lệ hoặc đã hết hạn'; end if;
    update public.customer_sessions set last_used_at = now() where token = p_session_token;
  end if;

  select coalesce(t.discount_percent, 0) into v_discount
  from public.customer_tiers t
  where t.code = v_customer.discount_tier;

  select o.* into v_order
  from public.orders o
  where o.customer_id = v_customer.id
    and o.idempotency_key = p_idempotency_key;
  if found then
    return next v_order;
    return;
  end if;

  insert into public.orders(
    order_code,
    customer_id,
    customer_code,
    customer_name,
    customer_phone,
    customer_company,
    customer_tier,
    discount_percent,
    source,
    delivery_type,
    delivery_alias,
    delivery_address,
    delivery_name,
    delivery_phone,
    note,
    idempotency_key,
    status,
    created_by_admin_id
  ) values (
    'DH-' || to_char(current_date, 'YYYYMMDD') || '-' || lpad(nextval('public.order_number_seq')::text, 6, '0'),
    v_customer.id,
    v_customer.partner_code,
    v_customer.name,
    v_customer.phone,
    v_customer.company,
    v_customer.discount_tier,
    coalesce(v_discount, 0),
    p_source,
    p_delivery_type,
    nullif(trim(p_delivery_alias), ''),
    nullif(trim(p_delivery_address), ''),
    coalesce(nullif(trim(p_delivery_name), ''), v_customer.name),
    coalesce(nullif(trim(p_delivery_phone), ''), v_customer.phone),
    nullif(trim(p_note), ''),
    p_idempotency_key,
    v_status,
    p_admin_id
  ) returning * into v_order;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_identifier := coalesce(
      nullif(v_item->>'productId', ''),
      nullif(v_item->>'product_id', ''),
      nullif(v_item->>'id', ''),
      nullif(v_item->>'slug', '')
    );
    v_quantity := greatest(coalesce((v_item->>'quantity')::numeric, (v_item->>'qty')::numeric, 0), 0);
    if v_identifier is null or v_quantity <= 0 then continue; end if;

    select p.* into v_product
    from public.products p
    where p.active = true
      and (p.id::text = v_identifier or p.local_product_id = v_identifier)
    limit 1;
    if not found then continue; end if;

    v_base_price := coalesce(nullif(v_product.price_retail, 0), v_product.price_wholesale, 0);
    v_unit_price := round(v_base_price * (1 - coalesce(v_discount, 0) / 100));
    
    if v_customer.discount_tier = 'CUSTOM' then
      select * into v_custom_price from public.customer_contract_prices 
      where customer_id = v_customer.id and product_id = v_product.id and (valid_until is null or valid_until > now()) limit 1;
      
      if found then
        v_base_price := v_custom_price.price;
        v_unit_price := v_custom_price.price;
      end if;
    end if;

    v_line_total := round(v_unit_price * v_quantity);

    insert into public.order_items(
      order_id, product_id, product_local_id, sku, name, unit, quantity,
      base_unit_price, discount_percent, unit_price, line_total
    ) values (
      v_order.id, v_product.id, v_product.local_product_id, v_product.sku,
      v_product.name, v_product.unit, v_quantity, v_base_price,
      coalesce(v_discount, 0), v_unit_price, v_line_total
    );

    v_subtotal := v_subtotal + round(v_base_price * v_quantity);
    v_grand_total := v_grand_total + v_line_total;
    v_item_count := v_item_count + 1;
  end loop;

  if v_item_count = 0 then
    delete from public.orders where id = v_order.id;
    raise exception 'Không tìm thấy sản phẩm hợp lệ trong giỏ hàng';
  end if;
  
  if p_voucher_code is null or trim(p_voucher_code) = '' then
     p_voucher_code := null;
  else
     select * into v_voucher from public.vouchers where code = p_voucher_code and is_active = true limit 1;
     if found then
       if v_voucher.expires_at is null or v_voucher.expires_at > now() then
         if v_grand_total >= v_voucher.min_order_value then
           if v_voucher.max_uses_total = 0 or v_voucher.current_uses_total < v_voucher.max_uses_total then
             select count(*) into v_user_usages from public.voucher_usages where voucher_code = p_voucher_code and customer_id = v_customer.id;
             if v_user_usages < v_voucher.max_uses_per_user then
               if v_voucher.discount_amount > 0 then v_voucher_discount := v_voucher.discount_amount;
               elsif v_voucher.discount_percent > 0 then
                 v_voucher_discount := round(v_grand_total * (v_voucher.discount_percent / 100));
                 if v_voucher.max_discount_value > 0 and v_voucher_discount > v_voucher.max_discount_value then v_voucher_discount := v_voucher.max_discount_value; end if;
               end if;
               if v_voucher_discount > v_grand_total then v_voucher_discount := v_grand_total; end if;
               insert into public.voucher_usages (voucher_code, customer_id, order_id) values (p_voucher_code, v_customer.id, v_order.id);
               update public.vouchers set current_uses_total = current_uses_total + 1 where code = p_voucher_code;
             else p_voucher_code := null; end if;
           else p_voucher_code := null; end if;
         else p_voucher_code := null; end if;
       else p_voucher_code := null; end if;
     else p_voucher_code := null; end if;
  end if;

  update public.orders
  set subtotal = v_subtotal,
      discount_amount = (v_subtotal - v_grand_total) + v_voucher_discount,
      voucher_code = p_voucher_code,
      voucher_discount = v_voucher_discount,
      grand_total = greatest(0, v_grand_total - v_voucher_discount),
      item_count = v_item_count
  where id = v_order.id
  returning * into v_order;

  insert into public.order_history(order_id, action, to_status, actor, payload)
  values (
    v_order.id,
    'created',
    v_status,
    case when p_source = 'zalo_mini_app' then 'customer:zalo' when p_source = 'admin' then 'admin' else 'customer:website' end,
    jsonb_build_object('source', p_source, 'voucher_code', p_voucher_code, 'voucher_discount', v_voucher_discount, 'admin_id', p_admin_id)
  );

  return next v_order;
end;
$$;
revoke all on function public.customer_create_order(uuid, text, jsonb, text, text, text, text, text, text, text, text, text, uuid) from public;
grant execute on function public.customer_create_order(uuid, text, jsonb, text, text, text, text, text, text, text, text, text, uuid) to anon, authenticated;

-- 5. RPC để Khách Hàng duyệt đơn nháp (draft -> pending)
create or replace function public.customer_confirm_draft_order(
  p_session_token uuid,
  p_order_id uuid
) returns boolean language plpgsql security definer
as $$
declare
  v_customer_id uuid;
  v_status text;
begin
  select a.id into v_customer_id from public.customer_sessions s
  join public.vip_accounts a on a.id = s.customer_id
  where s.token = p_session_token and s.expires_at > now() and a.is_active = true;
  
  if not found then raise exception 'Phiên không hợp lệ'; end if;
  
  select status into v_status from public.orders where id = p_order_id and customer_id = v_customer_id;
  if not found then raise exception 'Không tìm thấy đơn hàng'; end if;
  if v_status <> 'draft' then raise exception 'Đơn hàng không ở trạng thái nháp'; end if;
  
  update public.orders set status = 'pending' where id = p_order_id;
  
  insert into public.order_history(order_id, action, from_status, to_status, actor)
  values (p_order_id, 'customer_approved_draft', 'draft', 'pending', 'customer');
  
  return true;
end;
$$;
grant execute on function public.customer_confirm_draft_order(uuid, uuid) to public;
