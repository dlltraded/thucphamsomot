-- Group-level price books: a KiotViet customer group can share one price book,
-- while a customer-specific assignment still has precedence at resolve time.
create table if not exists public.price_book_customer_group_assignments (
  id uuid primary key default gen_random_uuid(),
  price_book_id uuid not null references public.price_books(id) on delete cascade,
  group_name text not null,
  valid_from timestamptz,
  valid_to timestamptz,
  priority integer not null default 5,
  created_at timestamptz not null default now(),
  created_by text
);

create index if not exists idx_pb_group_assign
  on public.price_book_customer_group_assignments (lower(trim(group_name)), valid_from, valid_to);

alter table public.price_book_customer_group_assignments enable row level security;
revoke all on public.price_book_customer_group_assignments from anon, authenticated;
