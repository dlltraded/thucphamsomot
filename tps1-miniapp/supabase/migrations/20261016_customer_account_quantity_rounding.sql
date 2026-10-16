-- Quantity normalization and customer self-service account support.

alter table public.products
  add column if not exists quantity_adjustment_mode text not null default 'reject';

alter table public.products drop constraint if exists products_quantity_adjustment_mode_check;
alter table public.products add constraint products_quantity_adjustment_mode_check
  check (quantity_adjustment_mode in ('reject', 'ceil_to_step'));

alter table public.order_items
  add column if not exists requested_quantity numeric(12,3),
  add column if not exists quantity_precision_snapshot integer,
  add column if not exists quantity_adjustment_mode_snapshot text,
  add column if not exists quantity_adjustment_note text;

alter table public.order_items drop constraint if exists order_items_quantity_adjustment_mode_snapshot_check;
alter table public.order_items add constraint order_items_quantity_adjustment_mode_snapshot_check
  check (quantity_adjustment_mode_snapshot is null or quantity_adjustment_mode_snapshot in ('reject', 'ceil_to_step'));

alter table public.customer_addresses
  add column if not exists is_active boolean not null default true,
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists customer_addresses_one_default_idx
  on public.customer_addresses(customer_id)
  where is_default = true and is_active = true;

create table if not exists public.customer_profile_change_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.vip_accounts(id) on delete cascade,
  requested_company text,
  requested_tax_code text,
  reason text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'canceled')),
  requested_by text not null default 'customer',
  reviewed_by uuid references public.admin_profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (nullif(trim(coalesce(requested_company, '')), '') is not null
      or nullif(trim(coalesce(requested_tax_code, '')), '') is not null)
);

create index if not exists customer_profile_change_requests_customer_idx
  on public.customer_profile_change_requests(customer_id, created_at desc);

alter table public.customer_profile_change_requests enable row level security;
revoke all on public.customer_profile_change_requests from anon, authenticated;

-- Service-role API calls this function after verifying the customer session.
create or replace function public.customer_set_default_address(
  p_customer_id uuid,
  p_address_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.customer_addresses
    where id = p_address_id and customer_id = p_customer_id and is_active = true
  ) then
    raise exception 'Địa chỉ không hợp lệ hoặc đã ngừng sử dụng';
  end if;

  update public.customer_addresses
  set is_default = false, updated_at = now()
  where customer_id = p_customer_id and is_default = true;

  update public.customer_addresses
  set is_default = true, updated_at = now()
  where id = p_address_id and customer_id = p_customer_id;
end;
$$;

revoke all on function public.customer_set_default_address(uuid, uuid) from public, anon, authenticated;
grant execute on function public.customer_set_default_address(uuid, uuid) to service_role;

-- Preview only. Admin reviews this list before applying the optional UPDATE below.
create or replace view public.product_discrete_quantity_preview as
select id, sku, name, unit, min_order_qty, order_step, quantity_precision,
       enforce_order_step, quantity_adjustment_mode
from public.products
where active = true
  and lower(trim(coalesce(unit, ''))) in (
    'cái', 'cai', 'trái', 'trai', 'quả', 'qua', 'bao', 'bịch', 'bich',
    'gói', 'goi', 'hộp', 'hop', 'khay', 'thùng', 'thung', 'chai', 'hũ',
    'hu', 'lon', 'can', 'bộ', 'bo', 'lốc', 'loc'
  );

-- Deliberately no bulk UPDATE here. Applying the preview remains an explicit
-- Admin action after checking products whose commercial unit is exceptional.
create or replace function public.admin_apply_discrete_quantity_rules(p_product_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  changed_count integer;
begin
  if coalesce(array_length(p_product_ids, 1), 0) = 0 then
    return 0;
  end if;

  update public.products p
  set min_order_qty = 1,
      order_step = 1,
      quantity_precision = 0,
      enforce_order_step = true,
      quantity_adjustment_mode = 'ceil_to_step'
  where p.id = any(p_product_ids)
    and lower(trim(coalesce(p.unit, ''))) in (
      'cái', 'cai', 'trái', 'trai', 'quả', 'qua', 'bao', 'bịch', 'bich',
      'gói', 'goi', 'hộp', 'hop', 'khay', 'thùng', 'thung', 'chai', 'hũ',
      'hu', 'lon', 'can', 'bộ', 'bo', 'lốc', 'loc'
    );
  get diagnostics changed_count = row_count;
  return changed_count;
end;
$$;

revoke all on function public.admin_apply_discrete_quantity_rules(uuid[]) from public, anon, authenticated;
grant execute on function public.admin_apply_discrete_quantity_rules(uuid[]) to service_role;
