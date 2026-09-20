-- ============================================================================
-- 20260920e — Yêu cầu điều chỉnh / hủy đơn của khách (WP6b, anh chốt 2026-09-20)
-- Additive: 1 bảng mới. RLS bật, KHÔNG có policy => chỉ service-role (API server) truy cập.
-- Hoàn kho khi hủy dùng hàm public.sync_order_inventory(…,'zero') của migration 20260920g.
-- ============================================================================

create table if not exists public.order_change_requests (
  id                      uuid primary key default gen_random_uuid(),
  order_id                uuid not null references public.orders(id) on delete cascade,
  customer_id             uuid not null,
  type                    text not null check (type in ('adjust', 'cancel')),
  message                 text not null,
  status                  text not null default 'open' check (status in ('open', 'approved', 'rejected', 'done')),
  order_status_at_request text,
  packing_status_at_request text,
  after_cutoff            boolean not null default false,
  requested_at            timestamptz not null default now(),
  handled_by              text,
  handled_at              timestamptz,
  handled_note            text
);

alter table public.order_change_requests enable row level security;

create index if not exists order_change_requests_status_idx
  on public.order_change_requests (status, requested_at);
create index if not exists order_change_requests_order_idx
  on public.order_change_requests (order_id);

-- Mỗi đơn chỉ có tối đa 1 yêu cầu đang mở
create unique index if not exists order_change_requests_one_open_per_order
  on public.order_change_requests (order_id)
  where status in ('open', 'approved');
