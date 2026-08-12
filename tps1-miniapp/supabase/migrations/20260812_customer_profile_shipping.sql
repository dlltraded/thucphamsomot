-- Mở rộng hồ sơ khách hàng VIP và địa chỉ giao hàng mặc định.
-- Chạy sau 20260812_customer_login.sql.

alter table public.vip_accounts add column if not exists email text;
alter table public.vip_accounts add column if not exists tax_code text;
alter table public.vip_accounts add column if not exists address text;
alter table public.vip_accounts add column if not exists default_shipping_alias text;
alter table public.vip_accounts add column if not exists default_shipping_address text;
alter table public.vip_accounts add column if not exists default_shipping_name text;
alter table public.vip_accounts add column if not exists default_shipping_phone text;

update public.vip_accounts
set default_shipping_alias = coalesce(nullif(default_shipping_alias, ''), 'Địa chỉ mặc định'),
    default_shipping_address = coalesce(nullif(default_shipping_address, ''), address),
    default_shipping_name = coalesce(nullif(default_shipping_name, ''), name),
    default_shipping_phone = coalesce(nullif(default_shipping_phone, ''), phone)
where default_shipping_address is null or default_shipping_address = '';

-- CREATE OR REPLACE không đổi được kiểu bảng trả về, vì vậy cần drop trước.
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
  must_change_password boolean
)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  return query
    select
      a.id,
      a.partner_code,
      a.name,
      a.phone,
      a.company,
      coalesce(a.email, ''),
      coalesce(a.tax_code, ''),
      coalesce(a.address, ''),
      coalesce(a.default_shipping_alias, 'Địa chỉ mặc định'),
      coalesce(a.default_shipping_address, a.address, ''),
      coalesce(a.default_shipping_name, a.name, ''),
      coalesce(a.default_shipping_phone, a.phone, ''),
      a.discount_tier,
      coalesce(t.discount_percent, 0),
      a.must_change_password
    from public.vip_accounts a
    left join public.customer_tiers t on t.code = a.discount_tier
    where a.partner_code = upper(trim(p_code))
      and a.is_active = true
      and a.password_hash is not null
      and a.password_hash = crypt(p_password, a.password_hash);
end;
$$;
revoke all on function public.verify_customer_login(text, text) from public;
grant execute on function public.verify_customer_login(text, text) to anon, authenticated;

-- Xóa cả chữ ký cũ và mới để migration có thể chạy lại sau một lần bị ngắt giữa chừng.
drop function if exists public.admin_create_customer(text, text, text, text);
drop function if exists public.admin_create_customer(text, text, text, text, text, text, text, text, text, text, text);
create function public.admin_create_customer(
  p_name text,
  p_phone text,
  p_company text,
  p_tier text,
  p_email text,
  p_tax_code text,
  p_address text,
  p_shipping_alias text,
  p_shipping_address text,
  p_shipping_name text,
  p_shipping_phone text
)
returns table(partner_code text, temp_password text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_code text;
  v_pass text;
begin
  loop
    v_code := 'TPS1-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 4));
    exit when not exists (
      select 1 from public.vip_accounts a where a.partner_code = v_code
    );
  end loop;

  v_pass := public.generate_temp_password();

  insert into public.vip_accounts (
    partner_code,
    name,
    phone,
    company,
    email,
    tax_code,
    address,
    default_shipping_alias,
    default_shipping_address,
    default_shipping_name,
    default_shipping_phone,
    discount_tier,
    password_hash,
    must_change_password,
    is_active
  ) values (
    v_code,
    trim(p_name),
    trim(p_phone),
    nullif(trim(p_company), ''),
    nullif(trim(p_email), ''),
    nullif(trim(p_tax_code), ''),
    nullif(trim(p_address), ''),
    coalesce(nullif(trim(p_shipping_alias), ''), 'Địa chỉ mặc định'),
    coalesce(nullif(trim(p_shipping_address), ''), nullif(trim(p_address), '')),
    coalesce(nullif(trim(p_shipping_name), ''), trim(p_name)),
    coalesce(nullif(trim(p_shipping_phone), ''), trim(p_phone)),
    p_tier,
    crypt(v_pass, gen_salt('bf')),
    true,
    true
  );

  return query select v_code, v_pass;
end;
$$;
revoke all on function public.admin_create_customer(text, text, text, text, text, text, text, text, text, text, text) from public;
grant execute on function public.admin_create_customer(text, text, text, text, text, text, text, text, text, text, text) to anon, authenticated;

drop function if exists public.admin_list_customers();
create function public.admin_list_customers()
returns table(
  id uuid,
  partner_code text,
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
  discount_tier text,
  credit_limit numeric,
  notes text,
  is_active boolean,
  must_change_password boolean,
  created_at timestamptz
)
language sql
security definer
set search_path = public, extensions
as $$
  select
    a.id,
    a.partner_code,
    a.name,
    a.phone,
    a.company,
    coalesce(a.email, ''),
    coalesce(a.tax_code, ''),
    coalesce(a.address, ''),
    coalesce(a.default_shipping_alias, ''),
    coalesce(a.default_shipping_address, ''),
    coalesce(a.default_shipping_name, ''),
    coalesce(a.default_shipping_phone, ''),
    a.discount_tier,
    a.credit_limit,
    a.notes,
    a.is_active,
    a.must_change_password,
    a.created_at
  from public.vip_accounts a
  order by a.created_at desc;
$$;
revoke all on function public.admin_list_customers() from public;
grant execute on function public.admin_list_customers() to anon, authenticated;

drop function if exists public.admin_update_customer(uuid, text, text, text, text, numeric, text);
drop function if exists public.admin_update_customer(uuid, text, text, text, text, text, text, text, text, text, text, text, numeric, text);
create function public.admin_update_customer(
  p_id uuid,
  p_name text,
  p_phone text,
  p_company text,
  p_email text,
  p_tax_code text,
  p_address text,
  p_shipping_alias text,
  p_shipping_address text,
  p_shipping_name text,
  p_shipping_phone text,
  p_tier text,
  p_credit_limit numeric,
  p_notes text
)
returns void
language sql
security definer
set search_path = public, extensions
as $$
  update public.vip_accounts
  set name = trim(p_name),
      phone = trim(p_phone),
      company = nullif(trim(p_company), ''),
      email = nullif(trim(p_email), ''),
      tax_code = nullif(trim(p_tax_code), ''),
      address = nullif(trim(p_address), ''),
      default_shipping_alias = coalesce(nullif(trim(p_shipping_alias), ''), 'Địa chỉ mặc định'),
      default_shipping_address = coalesce(nullif(trim(p_shipping_address), ''), nullif(trim(p_address), '')),
      default_shipping_name = coalesce(nullif(trim(p_shipping_name), ''), trim(p_name)),
      default_shipping_phone = coalesce(nullif(trim(p_shipping_phone), ''), trim(p_phone)),
      discount_tier = p_tier,
      credit_limit = p_credit_limit,
      notes = nullif(trim(p_notes), ''),
      updated_at = now()
  where id = p_id;
$$;
revoke all on function public.admin_update_customer(uuid, text, text, text, text, text, text, text, text, text, text, text, numeric, text) from public;
grant execute on function public.admin_update_customer(uuid, text, text, text, text, text, text, text, text, text, text, text, numeric, text) to anon, authenticated;
