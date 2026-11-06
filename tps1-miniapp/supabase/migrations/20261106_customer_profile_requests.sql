create table if not exists public.customer_profile_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.vip_accounts(id) on delete cascade,
  company text not null,
  tax_code text not null default '',
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid,
  note text
);
create unique index if not exists customer_profile_requests_one_pending
  on public.customer_profile_requests(customer_id) where status = 'pending';
create index if not exists customer_profile_requests_customer_idx
  on public.customer_profile_requests(customer_id, requested_at desc);
alter table public.customer_profile_requests enable row level security;
alter table public.vip_accounts add column if not exists avatar_path text;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('customer-avatars', 'customer-avatars', false, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
