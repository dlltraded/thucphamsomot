-- TPS1-Admin Supabase schema
-- Chạy file này trong Supabase SQL Editor.
-- Lưu ý: frontend chỉ nên dùng anon public key, không dùng service_role/secret key.

create extension if not exists pgcrypto;

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  local_quote_id text not null unique,
  lead_id text not null,
  quote_code text,
  lead_name text not null,
  lead_phone text not null,
  lead_email text,
  lead_category text,
  lead_source text,
  lead_snapshot jsonb not null default '{}'::jsonb,
  quote_snapshot jsonb not null default '{}'::jsonb,
  price_type text not null default 'wholesale',
  status text not null default 'draft',
  result text,
  items jsonb not null default '[]'::jsonb,
  subtotal numeric(14,2) not null default 0,
  discount_percent numeric(5,2) not null default 0,
  discount_amount numeric(14,2) not null default 0,
  shipping_amount numeric(14,2) not null default 0,
  deposit_amount numeric(14,2) not null default 0,
  grand_total numeric(14,2) not null default 0,
  balance_amount numeric(14,2) not null default 0,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  closed_at timestamptz
);

create table if not exists public.quote_history (
  id uuid primary key default gen_random_uuid(),
  local_quote_id text not null,
  lead_id text not null,
  action text not null,
  from_status text,
  to_status text,
  note text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists quotes_lead_id_idx on public.quotes (lead_id);
create index if not exists quotes_status_idx on public.quotes (status);
create index if not exists quote_history_quote_idx on public.quote_history (local_quote_id);
create index if not exists quote_history_lead_idx on public.quote_history (lead_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_quotes_set_updated_at on public.quotes;
create trigger trg_quotes_set_updated_at
before update on public.quotes
for each row
execute function public.set_updated_at();

alter table public.quotes enable row level security;
alter table public.quote_history enable row level security;

drop policy if exists "quotes_select_all" on public.quotes;
create policy "quotes_select_all"
on public.quotes
for select
using (true);

drop policy if exists "quotes_insert_all" on public.quotes;
create policy "quotes_insert_all"
on public.quotes
for insert
with check (true);

drop policy if exists "quotes_update_all" on public.quotes;
create policy "quotes_update_all"
on public.quotes
for update
using (true)
with check (true);

drop policy if exists "quotes_delete_all" on public.quotes;
create policy "quotes_delete_all"
on public.quotes
for delete
using (true);

drop policy if exists "quote_history_select_all" on public.quote_history;
create policy "quote_history_select_all"
on public.quote_history
for select
using (true);

drop policy if exists "quote_history_insert_all" on public.quote_history;
create policy "quote_history_insert_all"
on public.quote_history
for insert
with check (true);

drop policy if exists "quote_history_update_all" on public.quote_history;
create policy "quote_history_update_all"
on public.quote_history
for update
using (true)
with check (true);

drop policy if exists "quote_history_delete_all" on public.quote_history;
create policy "quote_history_delete_all"
on public.quote_history
for delete
using (true);
