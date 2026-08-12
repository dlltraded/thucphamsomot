-- Đơn hàng trung tâm cho Website, Zalo Mini App và TPS1 Admin.
-- Chạy sau 20260812_customer_profile_shipping.sql.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.customer_sessions (
  token uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.vip_accounts(id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now()
);

create index if not exists customer_sessions_customer_idx
  on public.customer_sessions(customer_id);
create index if not exists customer_sessions_expiry_idx
  on public.customer_sessions(expires_at);

create sequence if not exists public.order_number_seq start 1;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null unique,
  customer_id uuid not null references public.vip_accounts(id),
  customer_code text not null,
  customer_name text not null,
  customer_phone text not null,
  customer_company text,
  customer_tier text,
  discount_percent numeric(5,2) not null default 0,
  source text not null check (source in ('website', 'zalo_mini_app', 'admin')),
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'preparing', 'shipping', 'completed', 'canceled')),
  payment_method text not null default 'COD',
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'cod', 'paid', 'failed', 'refunded')),
  delivery_type text not null default 'shipping'
    check (delivery_type in ('shipping', 'pickup')),
  delivery_alias text,
  delivery_address text,
  delivery_name text,
  delivery_phone text,
  note text,
  subtotal numeric(14,2) not null default 0,
  discount_amount numeric(14,2) not null default 0,
  shipping_amount numeric(14,2) not null default 0,
  grand_total numeric(14,2) not null default 0,
  item_count integer not null default 0,
  idempotency_key text not null,
  external_payment_order_id text,
  confirmed_at timestamptz,
  shipping_at timestamptz,
  completed_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(customer_id, idempotency_key)
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_local_id text,
  sku text,
  name text not null,
  unit text not null default 'Kg',
  quantity numeric(12,3) not null check (quantity > 0),
  base_unit_price numeric(14,2) not null default 0,
  discount_percent numeric(5,2) not null default 0,
  unit_price numeric(14,2) not null default 0,
  line_total numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.order_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  action text not null,
  from_status text,
  to_status text,
  note text,
  actor text not null default 'system',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists orders_customer_idx on public.orders(customer_id, created_at desc);
create index if not exists orders_status_idx on public.orders(status, created_at desc);
create index if not exists orders_phone_idx on public.orders(customer_phone);
create index if not exists order_items_order_idx on public.order_items(order_id);
create index if not exists order_history_order_idx on public.order_history(order_id, created_at);

drop trigger if exists trg_orders_set_updated_at on public.orders;
create trigger trg_orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

alter table public.customer_sessions enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_history enable row level security;

-- Không tạo policy anon. Khách chỉ thao tác qua SECURITY DEFINER RPC có token phiên.
revoke all on public.customer_sessions from anon, authenticated;
revoke all on public.orders from anon, authenticated;
revoke all on public.order_items from anon, authenticated;
revoke all on public.order_history from anon, authenticated;

-- Đăng nhập trả thêm token ngẫu nhiên dùng riêng cho API đơn hàng.
drop function if exists public.verify_customer_login(text, text);
create function public.verify_customer_login(p_code text, p_password text)
returns table(
  id uuid,
  code text,
  name text,
  phone text,
  company text,
  email text,
  tax_code text,
  address text,
  default_shipping_alias text,
  default_shipping_address text,
  default_shipping_name text,
  default_shipping_phone text,
  tier text,
  discount_percent numeric,
  must_change_password boolean,
  order_session_token uuid
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_customer public.vip_accounts%rowtype;
  v_discount numeric;
  v_token uuid;
begin
  select a.* into v_customer
  from public.vip_accounts a
  where a.partner_code = upper(trim(p_code))
    and a.is_active = true
    and a.password_hash is not null
    and a.password_hash = crypt(p_password, a.password_hash);

  if not found then
    return;
  end if;

  delete from public.customer_sessions s
  where s.customer_id = v_customer.id and s.expires_at <= now();

  insert into public.customer_sessions(customer_id)
  values (v_customer.id)
  returning token into v_token;

  select coalesce(t.discount_percent, 0) into v_discount
  from public.customer_tiers t
  where t.code = v_customer.discount_tier;

  return query select
    v_customer.id,
    v_customer.partner_code,
    v_customer.name,
    v_customer.phone,
    coalesce(v_customer.company, ''),
    coalesce(v_customer.email, ''),
    coalesce(v_customer.tax_code, ''),
    coalesce(v_customer.address, ''),
    coalesce(v_customer.default_shipping_alias, 'Địa chỉ mặc định'),
    coalesce(v_customer.default_shipping_address, v_customer.address, ''),
    coalesce(v_customer.default_shipping_name, v_customer.name, ''),
    coalesce(v_customer.default_shipping_phone, v_customer.phone, ''),
    v_customer.discount_tier,
    coalesce(v_discount, 0),
    v_customer.must_change_password,
    v_token;
end;
$$;
revoke all on function public.verify_customer_login(text, text) from public;
grant execute on function public.verify_customer_login(text, text) to anon, authenticated;

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
  p_idempotency_key text
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

  update public.orders
  set subtotal = v_subtotal,
      discount_amount = v_subtotal - v_grand_total,
      grand_total = v_grand_total,
      item_count = v_item_count
  where id = v_order.id
  returning * into v_order;

  insert into public.order_history(order_id, action, to_status, actor, payload)
  values (
    v_order.id,
    'created',
    'pending',
    case when p_source = 'zalo_mini_app' then 'customer:zalo' else 'customer:website' end,
    jsonb_build_object('source', p_source)
  );

  return next v_order;
end;
$$;
revoke all on function public.customer_create_order(uuid, text, jsonb, text, text, text, text, text, text, text) from public;
grant execute on function public.customer_create_order(uuid, text, jsonb, text, text, text, text, text, text, text) to anon, authenticated;

create or replace function public.customer_list_orders(p_session_token uuid)
returns table(
  id uuid,
  order_code text,
  status text,
  payment_status text,
  payment_method text,
  source text,
  delivery_type text,
  delivery_alias text,
  delivery_address text,
  delivery_name text,
  delivery_phone text,
  note text,
  subtotal numeric,
  discount_amount numeric,
  grand_total numeric,
  created_at timestamptz,
  updated_at timestamptz,
  items jsonb
)
language sql
security definer
set search_path = public, extensions
as $$
  select
    o.id,
    o.order_code,
    o.status,
    o.payment_status,
    o.payment_method,
    o.source,
    o.delivery_type,
    o.delivery_alias,
    o.delivery_address,
    o.delivery_name,
    o.delivery_phone,
    o.note,
    o.subtotal,
    o.discount_amount,
    o.grand_total,
    o.created_at,
    o.updated_at,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', oi.id,
          'productId', oi.product_id,
          'localProductId', oi.product_local_id,
          'sku', oi.sku,
          'name', oi.name,
          'unit', oi.unit,
          'quantity', oi.quantity,
          'baseUnitPrice', oi.base_unit_price,
          'discountPercent', oi.discount_percent,
          'price', oi.unit_price,
          'lineTotal', oi.line_total
        ) order by oi.created_at
      ) filter (where oi.id is not null),
      '[]'::jsonb
    ) as items
  from public.customer_sessions s
  join public.vip_accounts a on a.id = s.customer_id and a.is_active = true
  join public.orders o on o.customer_id = s.customer_id
  left join public.order_items oi on oi.order_id = o.id
  where s.token = p_session_token
    and s.expires_at > now()
  group by o.id
  order by o.created_at desc;
$$;
revoke all on function public.customer_list_orders(uuid) from public;
grant execute on function public.customer_list_orders(uuid) to anon, authenticated;
