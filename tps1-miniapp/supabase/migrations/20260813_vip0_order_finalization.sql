-- VIP0 registration, customer verification and final order pricing.
-- Run after 20260812_central_orders.sql.

create extension if not exists pgcrypto;

insert into public.customer_tiers (code, name, discount_percent)
values ('VIP0', 'Khách mới / chưa có chiết khấu', 0)
on conflict (code) do update
set name = excluded.name,
    discount_percent = excluded.discount_percent,
    updated_at = now();

alter table public.vip_accounts
  drop constraint if exists vip_accounts_discount_tier_check;
alter table public.vip_accounts
  add constraint vip_accounts_discount_tier_check
  check (discount_tier in ('VIP0', 'VIP1', 'VIP2', 'VIP3'));

alter table public.vip_accounts
  add column if not exists verification_status text not null default 'verified',
  add column if not exists verified_at timestamptz,
  add column if not exists verified_by text,
  add column if not exists verification_note text,
  add column if not exists registration_source text not null default 'admin',
  add column if not exists registered_at timestamptz not null default now();

alter table public.vip_accounts
  drop constraint if exists vip_accounts_verification_status_check;
alter table public.vip_accounts
  add constraint vip_accounts_verification_status_check
  check (verification_status in ('pending', 'verified', 'rejected'));

alter table public.vip_accounts
  drop constraint if exists vip_accounts_registration_source_check;
alter table public.vip_accounts
  add constraint vip_accounts_registration_source_check
  check (registration_source in ('zalo_mini_app', 'website', 'admin'));

update public.vip_accounts
set verification_status = 'verified',
    verified_at = coalesce(verified_at, updated_at, created_at, now()),
    verified_by = coalesce(verified_by, 'migration')
where discount_tier in ('VIP1', 'VIP2', 'VIP3')
  and verification_status <> 'verified';

alter table public.orders
  add column if not exists pricing_status text not null default 'provisional',
  add column if not exists pricing_mode text not null default 'tier',
  add column if not exists original_grand_total numeric(14,2),
  add column if not exists pricing_adjustment_amount numeric(14,2) not null default 0,
  add column if not exists manual_discount_percent numeric(5,2),
  add column if not exists price_revision integer not null default 0,
  add column if not exists priced_at timestamptz,
  add column if not exists priced_by text,
  add column if not exists pricing_note text,
  add column if not exists confirmation_document_status text not null default 'pending';

alter table public.orders drop constraint if exists orders_pricing_status_check;
alter table public.orders add constraint orders_pricing_status_check
  check (pricing_status in ('provisional', 'finalized'));
alter table public.orders drop constraint if exists orders_pricing_mode_check;
alter table public.orders add constraint orders_pricing_mode_check
  check (pricing_mode in ('tier', 'order_discount', 'manual_item_price'));
alter table public.orders drop constraint if exists orders_confirmation_document_status_check;
alter table public.orders add constraint orders_confirmation_document_status_check
  check (confirmation_document_status in ('pending', 'generated', 'failed'));

update public.orders
set original_grand_total = coalesce(original_grand_total, grand_total),
    pricing_status = case
      when status = 'pending' and payment_status not in ('paid', 'refunded') then 'provisional'
      else 'finalized'
    end,
    price_revision = case when status = 'pending' then price_revision else greatest(price_revision, 1) end
where original_grand_total is null;

alter table public.orders drop constraint if exists orders_processing_requires_final_price;
alter table public.orders add constraint orders_processing_requires_final_price
  check (status in ('pending', 'canceled') or pricing_status = 'finalized');

alter table public.orders drop constraint if exists orders_payment_requires_final_price;
alter table public.orders add constraint orders_payment_requires_final_price
  check (payment_status not in ('paid', 'refunded') or pricing_status = 'finalized');

alter table public.order_items
  add column if not exists original_base_unit_price numeric(14,2),
  add column if not exists pricing_mode text not null default 'tier',
  add column if not exists tier_discount_percent numeric(5,2),
  add column if not exists manual_discount_percent numeric(5,2),
  add column if not exists manual_unit_price numeric(14,2),
  add column if not exists final_unit_price numeric(14,2),
  add column if not exists final_line_total numeric(14,2),
  add column if not exists pricing_note text;

update public.order_items
set original_base_unit_price = coalesce(original_base_unit_price, base_unit_price),
    tier_discount_percent = coalesce(tier_discount_percent, discount_percent),
    final_unit_price = coalesce(final_unit_price, unit_price),
    final_line_total = coalesce(final_line_total, line_total)
where original_base_unit_price is null
   or final_unit_price is null
   or final_line_total is null;

create table if not exists public.order_documents (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  document_type text not null default 'order_confirmation',
  revision integer not null,
  storage_path text not null,
  file_hash text not null,
  snapshot jsonb not null,
  status text not null default 'generated'
    check (status in ('pending', 'generated', 'failed')),
  generated_by text not null,
  generated_at timestamptz not null default now(),
  unique(order_id, document_type, revision)
);

create index if not exists order_documents_order_idx
  on public.order_documents(order_id, revision desc);
alter table public.order_documents enable row level security;
revoke all on public.order_documents from anon, authenticated;

create sequence if not exists public.customer_partner_code_seq start 100000;

create or replace function public.register_customer_account(
  p_name text,
  p_phone text,
  p_password text,
  p_company text default '',
  p_email text default '',
  p_source text default 'zalo_mini_app'
)
returns table(id uuid, code text, name text, phone text, tier text, verification_status text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_phone text;
  v_code text;
  v_customer public.vip_accounts%rowtype;
begin
  v_phone := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  if v_phone like '84%' and length(v_phone) = 11 then
    v_phone := '0' || substr(v_phone, 3);
  end if;
  if length(trim(p_name)) < 2 then
    raise exception 'Tên liên hệ phải có ít nhất 2 ký tự';
  end if;
  if length(v_phone) < 9 or length(v_phone) > 15 then
    raise exception 'Số điện thoại chưa hợp lệ';
  end if;
  if length(coalesce(p_password, '')) < 8 then
    raise exception 'Mật khẩu phải có ít nhất 8 ký tự';
  end if;
  if p_source not in ('zalo_mini_app', 'website') then
    raise exception 'Nguồn đăng ký không hợp lệ';
  end if;
  perform pg_advisory_xact_lock(hashtext(v_phone));
  if exists (
    select 1 from public.vip_accounts a
    where (
      case
        when regexp_replace(coalesce(a.phone, ''), '[^0-9]', '', 'g') like '84%'
          and length(regexp_replace(coalesce(a.phone, ''), '[^0-9]', '', 'g')) = 11
        then '0' || substr(regexp_replace(coalesce(a.phone, ''), '[^0-9]', '', 'g'), 3)
        else regexp_replace(coalesce(a.phone, ''), '[^0-9]', '', 'g')
      end
    ) = v_phone
  ) then
    raise exception 'Số điện thoại này đã có tài khoản';
  end if;

  loop
    v_code := 'TPS1-' || lpad(nextval('public.customer_partner_code_seq')::text, 6, '0');
    exit when not exists (select 1 from public.vip_accounts a where a.partner_code = v_code);
  end loop;

  insert into public.vip_accounts(
    partner_code, name, phone, company, email, discount_tier,
    password_hash, must_change_password, is_active,
    verification_status, registration_source, registered_at
  ) values (
    v_code, trim(p_name), v_phone, nullif(trim(p_company), ''), nullif(lower(trim(p_email)), ''),
    'VIP0', crypt(p_password, gen_salt('bf')), false, true,
    'pending', p_source, now()
  ) returning * into v_customer;

  return query select
    v_customer.id, v_customer.partner_code, v_customer.name, v_customer.phone,
    v_customer.discount_tier, v_customer.verification_status;
end;
$$;
revoke all on function public.register_customer_account(text, text, text, text, text, text) from public;
grant execute on function public.register_customer_account(text, text, text, text, text, text) to service_role;

create or replace function public.admin_finalize_order(
  p_order_id uuid,
  p_customer_tier text,
  p_pricing_mode text,
  p_order_discount_percent numeric default 0,
  p_shipping_amount numeric default 0,
  p_items jsonb default '[]'::jsonb,
  p_verification_note text default '',
  p_pricing_note text default '',
  p_actor text default 'admin'
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_order public.orders%rowtype;
  v_customer public.vip_accounts%rowtype;
  v_tier_discount numeric := 0;
  v_item public.order_items%rowtype;
  v_override jsonb;
  v_discount numeric;
  v_final_unit_price numeric;
  v_line_total numeric;
  v_subtotal numeric := 0;
  v_merchandise_total numeric := 0;
  v_shipping numeric := greatest(coalesce(p_shipping_amount, 0), 0);
  v_revision integer;
  v_effective_discount numeric := 0;
  v_now timestamptz := now();
begin
  if p_customer_tier not in ('VIP0', 'VIP1', 'VIP2', 'VIP3') then
    raise exception 'Hạng khách hàng không hợp lệ';
  end if;
  if p_pricing_mode not in ('tier', 'order_discount', 'manual_item_price') then
    raise exception 'Chế độ tính giá không hợp lệ';
  end if;
  if coalesce(p_order_discount_percent, 0) < 0 or coalesce(p_order_discount_percent, 0) > 100 then
    raise exception 'Chiết khấu phải nằm trong khoảng 0 đến 100';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Không tìm thấy đơn hàng'; end if;
  if v_order.status in ('shipping', 'completed', 'canceled') then
    raise exception 'Không thể chỉnh giá đơn đang giao, đã hoàn thành hoặc đã hủy';
  end if;
  if v_order.payment_status in ('paid', 'refunded') then
    raise exception 'Không thể chỉnh giá đơn đã thanh toán hoặc hoàn tiền';
  end if;

  select * into v_customer
  from public.vip_accounts where id = v_order.customer_id for update;
  if not found then raise exception 'Không tìm thấy tài khoản khách hàng'; end if;

  select coalesce(discount_percent, 0) into v_tier_discount
  from public.customer_tiers where code = p_customer_tier;

  update public.vip_accounts
  set discount_tier = p_customer_tier,
      verification_status = 'verified',
      verified_at = coalesce(verified_at, v_now),
      verified_by = p_actor,
      verification_note = nullif(trim(p_verification_note), ''),
      updated_at = v_now
  where id = v_customer.id;

  for v_item in
    select * from public.order_items where order_id = v_order.id order by created_at for update
  loop
    v_override := null;
    if jsonb_typeof(coalesce(p_items, '[]'::jsonb)) = 'array' then
      select value into v_override
      from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
      where value->>'itemId' = v_item.id::text
      limit 1;
    end if;

    if p_pricing_mode = 'tier' then
      v_discount := v_tier_discount;
      v_final_unit_price := round(v_item.base_unit_price * (1 - v_discount / 100));
    elsif p_pricing_mode = 'order_discount' then
      v_discount := coalesce(p_order_discount_percent, 0);
      v_final_unit_price := round(v_item.base_unit_price * (1 - v_discount / 100));
    else
      if v_override is null or coalesce(v_override->>'finalUnitPrice', '') = '' then
        raise exception 'Thiếu đơn giá chốt cho sản phẩm %', v_item.name;
      end if;
      v_final_unit_price := round((v_override->>'finalUnitPrice')::numeric);
      if v_final_unit_price < 0 then raise exception 'Đơn giá chốt không được âm'; end if;
      v_discount := case
        when v_item.base_unit_price > 0
          then round((1 - v_final_unit_price / v_item.base_unit_price) * 100, 2)
        else 0
      end;
    end if;

    v_line_total := round(v_final_unit_price * v_item.quantity);
    update public.order_items
    set original_base_unit_price = coalesce(original_base_unit_price, base_unit_price),
        pricing_mode = p_pricing_mode,
        tier_discount_percent = v_tier_discount,
        manual_discount_percent = case when p_pricing_mode = 'order_discount' then v_discount else null end,
        manual_unit_price = case when p_pricing_mode = 'manual_item_price' then v_final_unit_price else null end,
        discount_percent = v_discount,
        unit_price = v_final_unit_price,
        line_total = v_line_total,
        final_unit_price = v_final_unit_price,
        final_line_total = v_line_total,
        pricing_note = case when v_override is not null then nullif(v_override->>'note', '') else null end
    where id = v_item.id;

    v_subtotal := v_subtotal + round(v_item.base_unit_price * v_item.quantity);
    v_merchandise_total := v_merchandise_total + v_line_total;
  end loop;

  if v_subtotal > 0 then
    v_effective_discount := round((v_subtotal - v_merchandise_total) / v_subtotal * 100, 2);
  end if;
  v_revision := greatest(coalesce(v_order.price_revision, 0), 0) + 1;

  update public.orders
  set customer_tier = p_customer_tier,
      discount_percent = v_effective_discount,
      subtotal = v_subtotal,
      discount_amount = greatest(v_subtotal - v_merchandise_total, 0),
      pricing_adjustment_amount = v_subtotal - v_merchandise_total,
      shipping_amount = v_shipping,
      grand_total = v_merchandise_total + v_shipping,
      original_grand_total = coalesce(original_grand_total, v_order.grand_total),
      pricing_status = 'finalized',
      pricing_mode = p_pricing_mode,
      manual_discount_percent = case when p_pricing_mode = 'order_discount' then p_order_discount_percent else null end,
      price_revision = v_revision,
      priced_at = v_now,
      priced_by = p_actor,
      pricing_note = nullif(trim(p_pricing_note), ''),
      confirmation_document_status = 'pending',
      status = case when status = 'pending' then 'confirmed' else status end,
      confirmed_at = coalesce(confirmed_at, v_now)
  where id = v_order.id;

  insert into public.order_history(order_id, action, from_status, to_status, note, actor, payload)
  values (
    v_order.id,
    'customer_classified_and_order_finalized',
    v_order.status,
    case when v_order.status = 'pending' then 'confirmed' else v_order.status end,
    nullif(trim(p_pricing_note), ''),
    p_actor,
    jsonb_build_object(
      'previousTier', v_customer.discount_tier,
      'customerTier', p_customer_tier,
      'verificationStatus', 'verified',
      'pricingMode', p_pricing_mode,
      'tierDiscountPercent', v_tier_discount,
      'effectiveDiscountPercent', v_effective_discount,
      'previousTotal', v_order.grand_total,
      'finalTotal', v_merchandise_total + v_shipping,
      'revision', v_revision
    )
  );

  return (
    select to_jsonb(o) || jsonb_build_object(
      'order_items', coalesce((select jsonb_agg(to_jsonb(oi) order by oi.created_at) from public.order_items oi where oi.order_id = o.id), '[]'::jsonb)
    )
    from public.orders o where o.id = v_order.id
  );
end;
$$;
revoke all on function public.admin_finalize_order(uuid, text, text, numeric, numeric, jsonb, text, text, text) from public;
grant execute on function public.admin_finalize_order(uuid, text, text, numeric, numeric, jsonb, text, text, text) to service_role;

drop function if exists public.verify_customer_login(text, text);
create function public.verify_customer_login(p_code text, p_password text)
returns table(
  id uuid, code text, name text, phone text, company text,
  email text, tax_code text, address text,
  default_shipping_alias text, default_shipping_address text,
  default_shipping_name text, default_shipping_phone text,
  tier text, discount_percent numeric, verification_status text,
  must_change_password boolean, order_session_token uuid
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
  if not found then return; end if;

  delete from public.customer_sessions s
  where s.customer_id = v_customer.id and s.expires_at <= now();
  insert into public.customer_sessions(customer_id)
  values (v_customer.id) returning token into v_token;

  select coalesce(t.discount_percent, 0) into v_discount
  from public.customer_tiers t where t.code = v_customer.discount_tier;

  return query select
    v_customer.id, v_customer.partner_code, v_customer.name, v_customer.phone,
    coalesce(v_customer.company, ''), coalesce(v_customer.email, ''),
    coalesce(v_customer.tax_code, ''), coalesce(v_customer.address, ''),
    coalesce(v_customer.default_shipping_alias, 'Địa chỉ mặc định'),
    coalesce(v_customer.default_shipping_address, v_customer.address, ''),
    coalesce(v_customer.default_shipping_name, v_customer.name, ''),
    coalesce(v_customer.default_shipping_phone, v_customer.phone, ''),
    v_customer.discount_tier, coalesce(v_discount, 0),
    v_customer.verification_status,
    v_customer.must_change_password, v_token;
end;
$$;
revoke all on function public.verify_customer_login(text, text) from public;
grant execute on function public.verify_customer_login(text, text) to anon, authenticated;

drop function if exists public.admin_list_customers();
create function public.admin_list_customers()
returns table(
  id uuid, partner_code text, name text, phone text, company text,
  email text, tax_code text, address text,
  default_shipping_alias text, default_shipping_address text,
  default_shipping_name text, default_shipping_phone text,
  discount_tier text, verification_status text, verified_at timestamptz,
  verified_by text, verification_note text, registration_source text,
  credit_limit numeric, notes text, is_active boolean,
  must_change_password boolean, created_at timestamptz
)
language sql
security definer
set search_path = public, extensions
as $$
  select
    a.id, a.partner_code, a.name, a.phone, a.company,
    coalesce(a.email, ''), coalesce(a.tax_code, ''), coalesce(a.address, ''),
    coalesce(a.default_shipping_alias, ''), coalesce(a.default_shipping_address, ''),
    coalesce(a.default_shipping_name, ''), coalesce(a.default_shipping_phone, ''),
    a.discount_tier, a.verification_status, a.verified_at, a.verified_by,
    a.verification_note, a.registration_source,
    a.credit_limit, a.notes, a.is_active, a.must_change_password, a.created_at
  from public.vip_accounts a
  order by a.created_at desc;
$$;
revoke all on function public.admin_list_customers() from public;
grant execute on function public.admin_list_customers() to anon, authenticated;

drop function if exists public.customer_list_orders(uuid);
create function public.customer_list_orders(p_session_token uuid)
returns table(
  id uuid, order_code text, status text, pricing_status text, pricing_mode text,
  payment_status text, payment_method text, source text,
  delivery_type text, delivery_alias text, delivery_address text,
  delivery_name text, delivery_phone text, note text,
  customer_tier text, discount_percent numeric, subtotal numeric,
  discount_amount numeric, pricing_adjustment_amount numeric,
  shipping_amount numeric, grand_total numeric, original_grand_total numeric,
  price_revision integer, priced_at timestamptz, pricing_note text,
  confirmation_document_status text, confirmation_document_id uuid,
  created_at timestamptz, updated_at timestamptz, items jsonb
)
language sql
security definer
set search_path = public, extensions
as $$
  select
    o.id, o.order_code, o.status, o.pricing_status, o.pricing_mode,
    o.payment_status, o.payment_method, o.source,
    o.delivery_type, o.delivery_alias, o.delivery_address,
    o.delivery_name, o.delivery_phone, o.note,
    o.customer_tier, o.discount_percent, o.subtotal,
    o.discount_amount, o.pricing_adjustment_amount,
    o.shipping_amount, o.grand_total, o.original_grand_total,
    o.price_revision, o.priced_at, o.pricing_note,
    o.confirmation_document_status,
    (select d.id from public.order_documents d where d.order_id = o.id and d.status = 'generated' order by d.revision desc limit 1),
    o.created_at, o.updated_at,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', oi.id, 'productId', oi.product_id,
          'localProductId', oi.product_local_id, 'sku', oi.sku,
          'name', oi.name, 'unit', oi.unit, 'quantity', oi.quantity,
          'baseUnitPrice', oi.base_unit_price,
          'discountPercent', oi.discount_percent,
          'price', oi.unit_price, 'lineTotal', oi.line_total,
          'pricingMode', oi.pricing_mode,
          'finalUnitPrice', oi.final_unit_price,
          'finalLineTotal', oi.final_line_total
        ) order by oi.created_at
      ) filter (where oi.id is not null),
      '[]'::jsonb
    )
  from public.customer_sessions s
  join public.vip_accounts a on a.id = s.customer_id and a.is_active = true
  join public.orders o on o.customer_id = s.customer_id
  left join public.order_items oi on oi.order_id = o.id
  where s.token = p_session_token and s.expires_at > now()
  group by o.id
  order by o.created_at desc;
$$;
revoke all on function public.customer_list_orders(uuid) from public;
grant execute on function public.customer_list_orders(uuid) to anon, authenticated;
