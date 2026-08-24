-- 1. Create vouchers table
create table if not exists public.vouchers (
  code text primary key,
  discount_amount numeric(14,2) not null default 0,
  discount_percent numeric(5,2) not null default 0,
  min_order_value numeric(14,2) not null default 0,
  max_discount_value numeric(14,2) not null default 0,
  max_uses_total integer not null default 0, -- 0 means unlimited
  max_uses_per_user integer not null default 1,
  current_uses_total integer not null default 0,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2. Create voucher_usages table
create table if not exists public.voucher_usages (
  id uuid primary key default gen_random_uuid(),
  voucher_code text not null,
  customer_id uuid not null,
  order_id uuid,
  used_at timestamptz not null default now(),
  constraint fk_voucher foreign key (voucher_code) references public.vouchers(code) on delete cascade
);

-- 3. Update orders table (Not quotes since miniapp uses orders)
alter table public.orders add column if not exists voucher_code text;
alter table public.orders add column if not exists voucher_discount numeric(14,2) not null default 0;

-- 4. RLS for vouchers (Read for all, write for admin/service role)
alter table public.vouchers enable row level security;
create policy "vouchers_select_all" on public.vouchers for select using (true);

-- 5. RLS for voucher_usages (Insert and read for all)
alter table public.voucher_usages enable row level security;
create policy "voucher_usages_select_all" on public.voucher_usages for select using (true);
create policy "voucher_usages_insert_all" on public.voucher_usages for insert with check (true);

-- 6. Insert a test voucher
insert into public.vouchers (code, discount_amount, min_order_value, max_uses_per_user, max_uses_total, expires_at)
values ('TEST50K', 50000, 200000, 1, 100, now() + interval '30 days')
on conflict (code) do nothing;

-- 7. Update customer_create_order function to accept p_voucher_code
drop function if exists public.customer_create_order(uuid, text, jsonb, text, text, text, text, text, text, text);
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
  p_voucher_code text default null
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
  
  v_voucher public.vouchers%rowtype;
  v_voucher_discount numeric := 0;
  v_user_usages integer := 0;
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

  select a.* into v_customer
  from public.customer_sessions s
  join public.vip_accounts a on a.id = s.customer_id
  where s.token = p_session_token
    and s.expires_at > now()
    and a.is_active = true;

  if not found then
    raise exception 'Phiên khách hàng không hợp lệ hoặc đã hết hạn';
  end if;

  update public.customer_sessions
  set last_used_at = now()
  where token = p_session_token;

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
    idempotency_key
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
    p_idempotency_key
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
    if v_identifier is null or v_quantity <= 0 then
      continue;
    end if;

    select p.* into v_product
    from public.products p
    where p.active = true
      and (p.id::text = v_identifier or p.local_product_id = v_identifier)
    limit 1;
    if not found then
      continue;
    end if;

    v_base_price := coalesce(nullif(v_product.price_retail, 0), v_product.price_wholesale, 0);
    v_unit_price := round(v_base_price * (1 - coalesce(v_discount, 0) / 100));
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
  
  -- VOUCHER LOGIC
  if p_voucher_code is null or trim(p_voucher_code) = '' then
     p_voucher_code := null;
  else
     select * into v_voucher from public.vouchers where code = p_voucher_code and is_active = true limit 1;
     if found then
       if v_voucher.expires_at is null or v_voucher.expires_at > now() then
         if v_grand_total >= v_voucher.min_order_value then
           if v_voucher.max_uses_total = 0 or v_voucher.current_uses_total < v_voucher.max_uses_total then
             -- Check user usages
             select count(*) into v_user_usages from public.voucher_usages where voucher_code = p_voucher_code and customer_id = v_customer.id;
             if v_user_usages < v_voucher.max_uses_per_user then
               -- Calculate discount
               if v_voucher.discount_amount > 0 then
                 v_voucher_discount := v_voucher.discount_amount;
               elsif v_voucher.discount_percent > 0 then
                 v_voucher_discount := round(v_grand_total * (v_voucher.discount_percent / 100));
                 if v_voucher.max_discount_value > 0 and v_voucher_discount > v_voucher.max_discount_value then
                   v_voucher_discount := v_voucher.max_discount_value;
                 end if;
               end if;
               
               if v_voucher_discount > v_grand_total then
                 v_voucher_discount := v_grand_total;
               end if;
               
               -- Record usage
               insert into public.voucher_usages (voucher_code, customer_id, order_id) values (p_voucher_code, v_customer.id, v_order.id);
               update public.vouchers set current_uses_total = current_uses_total + 1 where code = p_voucher_code;
             else
               p_voucher_code := null; -- Exceeded user uses
             end if;
           else
             p_voucher_code := null; -- Exceeded total uses
           end if;
         else
           p_voucher_code := null; -- Min order value not met
         end if;
       else
         p_voucher_code := null; -- Expired
       end if;
     else
       p_voucher_code := null; -- Invalid voucher
     end if;
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
    'pending',
    case when p_source = 'zalo_mini_app' then 'customer:zalo' else 'customer:website' end,
    jsonb_build_object('source', p_source, 'voucher_code', p_voucher_code, 'voucher_discount', v_voucher_discount)
  );

  return next v_order;
end;
$$;
revoke all on function public.customer_create_order(uuid, text, jsonb, text, text, text, text, text, text, text, text) from public;
grant execute on function public.customer_create_order(uuid, text, jsonb, text, text, text, text, text, text, text, text) to anon, authenticated;
