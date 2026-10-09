-- TPS1 - Nhap don thong minh (Gemini + bo kiem tra TPS1)
-- File nguon nam trong bucket rieng, client khong duoc ghi truc tiep vao DB.

create extension if not exists pgcrypto;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'order-imports-private',
  'order-imports-private',
  false,
  10485760,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.order_import_batches (
  id uuid primary key default gen_random_uuid(),
  actor_type text not null check (actor_type in ('customer', 'staff')),
  actor_id uuid,
  customer_id uuid not null references public.vip_accounts(id),
  channel text not null check (channel in ('website', 'pos')),
  status text not null default 'uploading'
    check (status in ('uploading', 'uploaded', 'analyzing', 'review', 'confirmed', 'cancelled', 'failed')),
  model text,
  files jsonb not null default '[]'::jsonb,
  file_count integer not null default 0,
  line_count integer not null default 0,
  usage_metadata jsonb not null default '{}'::jsonb,
  error_message text,
  confirmed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_order_import_batches_customer_created
  on public.order_import_batches(customer_id, created_at desc);
create index if not exists idx_order_import_batches_expires
  on public.order_import_batches(expires_at) where status in ('uploading', 'uploaded', 'review', 'failed');

create table if not exists public.product_aliases (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  customer_id uuid references public.vip_accounts(id) on delete cascade,
  alias text not null,
  alias_normalized text not null,
  source text not null default 'manual',
  verified_by uuid,
  created_at timestamptz not null default now(),
  unique(product_id, customer_id, alias_normalized)
);

create index if not exists idx_product_aliases_normalized
  on public.product_aliases(alias_normalized);

create table if not exists public.product_unit_conversions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  input_unit text not null,
  input_unit_normalized text not null,
  factor_to_order_unit numeric(14,6) not null check (factor_to_order_unit > 0),
  note text,
  is_active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_id, input_unit_normalized)
);

create table if not exists public.order_import_lines (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.order_import_batches(id) on delete cascade,
  source_file text not null,
  source_page integer,
  source_row integer,
  raw_text text,
  raw_sku text,
  raw_name text not null,
  raw_quantity numeric(14,3),
  raw_unit text,
  raw_note text,
  document_price numeric(14,2),
  extraction_confidence numeric(5,4),
  selected_product_id uuid references public.products(id),
  matched_by text,
  match_score numeric(5,4),
  converted_quantity numeric(14,3),
  conversion_factor numeric(14,6),
  resolved_price numeric(14,2),
  price_source text,
  status text not null,
  warnings jsonb not null default '[]'::jsonb,
  suggestions jsonb not null default '[]'::jsonb,
  selected boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_order_import_lines_batch
  on public.order_import_lines(batch_id, created_at);

alter table public.orders
  add column if not exists source_import_batch_id uuid references public.order_import_batches(id);
alter table public.order_items
  add column if not exists source_import_line_id uuid references public.order_import_lines(id),
  add column if not exists source_input_unit text,
  add column if not exists source_conversion_factor numeric(14,6);

alter table public.order_import_batches enable row level security;
alter table public.order_import_lines enable row level security;
alter table public.product_aliases enable row level security;
alter table public.product_unit_conversions enable row level security;

revoke all on public.order_import_batches from anon, authenticated;
revoke all on public.order_import_lines from anon, authenticated;
revoke all on public.product_aliases from anon, authenticated;
revoke all on public.product_unit_conversions from anon, authenticated;

-- Khong tao storage policy cho client. Upload dung signed upload URL mot lan
-- do Server API phat hanh; download/xoa chi do service_role thuc hien.
