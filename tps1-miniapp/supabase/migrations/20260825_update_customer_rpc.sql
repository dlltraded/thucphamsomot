drop function if exists public.admin_update_customer(uuid, text, text, text, text, text, text, text, text, text, text, text, numeric, text);
drop function if exists public.admin_update_customer(uuid, text, text, text, text, text, text, text, text, text, text, text, numeric, text, text, uuid);

create or replace function public.admin_update_customer(
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
  p_notes text,
  p_verification_status text default null,
  p_sales_rep_id uuid default null
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
      discount_tier = coalesce(p_tier, discount_tier),
      credit_limit = coalesce(p_credit_limit, credit_limit),
      notes = nullif(trim(p_notes), ''),
      verification_status = coalesce(p_verification_status, verification_status),
      sales_rep_id = p_sales_rep_id,
      updated_at = now()
  where id = p_id;
$$;
grant execute on function public.admin_update_customer to anon, authenticated;
