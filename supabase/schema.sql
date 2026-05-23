create table if not exists public.products (
  slug text primary key,
  title text not null,
  data jsonb not null,
  position integer not null default 0,
  published_at timestamptz,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.news (
  slug text primary key,
  title text not null,
  data jsonb not null,
  position integer not null default 0,
  published_at timestamptz,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.knowledge (
  slug text primary key,
  title text not null,
  data jsonb not null,
  position integer not null default 0,
  published_at timestamptz,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists set_news_updated_at on public.news;
create trigger set_news_updated_at
before update on public.news
for each row execute function public.set_updated_at();

drop trigger if exists set_knowledge_updated_at on public.knowledge;
create trigger set_knowledge_updated_at
before update on public.knowledge
for each row execute function public.set_updated_at();

alter table public.products enable row level security;
alter table public.news enable row level security;
alter table public.knowledge enable row level security;

drop policy if exists "Service role manages products" on public.products;
create policy "Service role manages products"
on public.products
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "Service role manages news" on public.news;
create policy "Service role manages news"
on public.news
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "Service role manages knowledge" on public.knowledge;
create policy "Service role manages knowledge"
on public.knowledge
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
