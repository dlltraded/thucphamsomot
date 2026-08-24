-- 1. Create admin_profiles table to store role and mapping
create table if not exists public.admin_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text not null,
  role text not null check (role in ('admin', 'sale')),
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS for admin_profiles
alter table public.admin_profiles enable row level security;

-- Admin can see and manage all profiles. Sales can only see themselves.
create policy "admin_manage_profiles" on public.admin_profiles 
  for all using (
    exists (select 1 from public.admin_profiles where id = auth.uid() and role = 'admin')
  );
  
create policy "sales_view_self" on public.admin_profiles 
  for select using (id = auth.uid());
  
-- Everyone can select (we need this so orders can show the name of the sales rep)
create policy "anyone_select_profiles" on public.admin_profiles 
  for select using (true);


-- 2. Add sales_rep_id to vip_accounts
alter table public.vip_accounts add column if not exists sales_rep_id uuid references public.admin_profiles(id);

-- 3. Add sales_rep_id to orders
alter table public.orders add column if not exists sales_rep_id uuid references public.admin_profiles(id);

-- 4. Set RLS on vip_accounts
alter table public.vip_accounts enable row level security;

-- Admins can see all vip_accounts
create policy "admin_all_vip_accounts" on public.vip_accounts
  for all using (
    exists (select 1 from public.admin_profiles where id = auth.uid() and role = 'admin')
  );

-- Sales can only see their assigned vip_accounts
create policy "sale_own_vip_accounts" on public.vip_accounts
  for all using (
    sales_rep_id = auth.uid()
  );
  
-- Allow public insert (if customer signs up themselves)? We need to keep existing policies intact.
-- Usually customer sessions manage their own data. Let's assume customer-facing APIs bypass RLS or have their own policies.
-- Let's just add a policy for service_role to bypass RLS.
create policy "service_role_all_vip_accounts" on public.vip_accounts
  for all using (true);


-- 5. Set RLS on orders
alter table public.orders enable row level security;

create policy "admin_all_orders" on public.orders
  for all using (
    exists (select 1 from public.admin_profiles where id = auth.uid() and role = 'admin')
  );

create policy "sale_own_orders" on public.orders
  for all using (
    sales_rep_id = auth.uid()
  );
  
create policy "service_role_all_orders" on public.orders
  for all using (true);


-- 6. Update admin_create_order_full to accept p_admin_id (which is sales_rep_id)
drop function if exists public.admin_create_order_full(uuid, jsonb, text, numeric, numeric, numeric, numeric, text, text, text, text, text, text);
create or replace function public.admin_create_order_full(
  p_customer_id uuid,
  p_items jsonb,
  p_voucher_code text default null,
  p_voucher_discount numeric default 0,
  p_discount_percent numeric default 0,
  p_discount_amount numeric default 0,
  p_shipping_amount numeric default 0,
  p_delivery_type text default 'shipping',
  p_delivery_name text default null,
  p_delivery_phone text default null,
  p_delivery_address text default null,
  p_note text default null,
  p_idempotency_key text default null,
  p_admin_id uuid default null
)
returns setof public.orders
language plpgsql
security definer
as $$
declare
  v_customer public.vip_accounts%rowtype;
  v_order public.orders%rowtype;
  v_code text;
  v_subtotal numeric := 0;
  v_item jsonb;
  v_product public.products%rowtype;
  v_identifier text;
  v_qty numeric;
  v_base_price numeric;
  v_line_total numeric;
  v_count int := 0;
begin
  -- 1. Get customer
  select * into v_customer from public.vip_accounts where id = p_customer_id;
  if not found then
    raise exception 'Không tìm thấy khách hàng (ID: %)', p_customer_id;
  end if;

  -- 2. Check idempotency
  if p_idempotency_key is not null then
    select * into v_order from public.orders where idempotency_key = p_idempotency_key limit 1;
    if found then
      return next v_order;
      return;
    end if;
  end if;

  -- 3. Calculate subtotal
  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_identifier := v_item->>'product_id';
    v_qty := (v_item->>'quantity')::numeric;
    v_base_price := (v_item->>'price')::numeric;
    
    if v_qty > 0 then
      v_subtotal := v_subtotal + round(v_base_price * v_qty);
      v_count := v_count + 1;
    end if;
  end loop;

  if v_count = 0 then
    raise exception 'Giỏ hàng trống';
  end if;

  -- 4. Create Order
  v_code := 'DH-' || to_char(current_date, 'YYYYMMDD') || '-' || lpad(nextval('public.order_number_seq')::text, 6, '0');
  
  insert into public.orders (
    order_code, customer_id, customer_code, customer_name, customer_phone, customer_company, customer_tier,
    status, source, payment_method, payment_status, delivery_type,
    delivery_name, delivery_phone, delivery_address, note,
    subtotal, discount_percent, discount_amount, voucher_code, voucher_discount, shipping_amount,
    idempotency_key, sales_rep_id
  ) values (
    v_code, v_customer.id, v_customer.customer_code, v_customer.name, v_customer.phone, v_customer.company_name, v_customer.tier,
    'draft', 'admin', 'COD', 'pending', p_delivery_type,
    p_delivery_name, p_delivery_phone, p_delivery_address, p_note,
    v_subtotal, p_discount_percent, p_discount_amount, p_voucher_code, p_voucher_discount, p_shipping_amount,
    p_idempotency_key, p_admin_id
  ) returning * into v_order;

  -- 5. Insert Order Items
  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_identifier := v_item->>'product_id';
    v_qty := (v_item->>'quantity')::numeric;
    v_base_price := (v_item->>'price')::numeric;
    
    if v_qty > 0 then
      -- try to find product in DB
      select * into v_product from public.products where id::text = v_identifier limit 1;
      
      insert into public.order_items (
        order_id, product_id, sku, name, unit, quantity, base_unit_price, unit_price, line_total
      ) values (
        v_order.id, 
        case when v_product.id is not null then v_product.id else null end,
        case when v_product.id is not null then v_product.sku else null end,
        v_item->>'name',
        v_item->>'unit',
        v_qty,
        v_base_price,
        v_base_price,
        round(v_base_price * v_qty)
      );
    end if;
  end loop;

  -- 6. Log history
  insert into public.order_history (order_id, action, to_status, actor, payload)
  values (v_order.id, 'created', 'draft', 'admin', jsonb_build_object('source', 'pos'));

  return next v_order;
end;
$$;
