-- Phase 1 — Order Intake Migration (yêu cầu 2026-09-20, thu hẹp v2)
-- Viết idempotent: "if not exists", "create or replace", "drop trigger if exists".
-- Không sửa RPC customer_create_order / admin_create_order_full / admin_finalize_order_v2:
-- dùng trigger BEFORE INSERT để điền các cột mới bất kể RPC nào tạo đơn.
-- Phạm vi: ngày giao + điểm giao + ghi chú dòng + giữ SL khách đặt + giờ chốt + nhật ký
-- xuất file tổng + cột thumbnail. KHÔNG có tuyến/xe, KHÔNG có tươi-khô (hoãn phase sau).
--
-- CHƯA CHẠY TRÊN SUPABASE — cần anh chạy sau khi Claude duyệt.

-- ═══════════════════════════════════════════════════════════════════
-- 1. customer_addresses — cho phép ẩn địa chỉ thay vì xóa
-- ═══════════════════════════════════════════════════════════════════
alter table public.customer_addresses
  add column if not exists is_active boolean not null default true;


-- ═══════════════════════════════════════════════════════════════════
-- 2. orders — cột Phase 1
-- ═══════════════════════════════════════════════════════════════════
alter table public.orders
  add column if not exists delivery_date       date,
  add column if not exists delivery_address_id uuid references public.customer_addresses(id) on delete set null,
  add column if not exists is_late_order       boolean not null default false,
  add column if not exists cancel_reason       text,
  add column if not exists canceled_by         text;

create index if not exists orders_delivery_date_status_idx
  on public.orders (delivery_date, status);

-- Backfill đơn cũ: chưa có ngày giao → lấy ngày tạo (giờ VN).
update public.orders
  set delivery_date = (created_at at time zone 'Asia/Ho_Chi_Minh')::date
where delivery_date is null;


-- ═══════════════════════════════════════════════════════════════════
-- 3. order_items — ghi chú dòng + giữ số lượng/tên khách đặt ban đầu
-- ═══════════════════════════════════════════════════════════════════
alter table public.order_items
  add column if not exists customer_note        text,
  add column if not exists ordered_quantity     numeric(12,3),
  add column if not exists ordered_product_name text;

update public.order_items
  set ordered_quantity     = coalesce(ordered_quantity, quantity),
      ordered_product_name = coalesce(ordered_product_name, name)
where ordered_quantity is null or ordered_product_name is null;


-- ═══════════════════════════════════════════════════════════════════
-- 4. products — thumbnail/ảnh gốc (WP4, chuyển ảnh KiotViet về Supabase)
-- ═══════════════════════════════════════════════════════════════════
alter table public.products
  add column if not exists thumb_url          text,
  add column if not exists image_url_original text;


-- ═══════════════════════════════════════════════════════════════════
-- 5. app_settings — giờ chốt đơn…
--    BẬT RLS (không policy) => anon/authenticated KHÔNG đọc/ghi được qua REST;
--    chỉ service-role (API server) truy cập. Tránh lặp lại lỗ hổng RLS 09/2026.
-- ═══════════════════════════════════════════════════════════════════
create table if not exists public.app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;

-- Giao ngày D phải đặt trước 16:30 ngày D-1; giao Chủ nhật/Thứ Hai thì trước 17:00 Thứ Bảy.
insert into public.app_settings (key, value) values
  ('order_cutoff', '{"time":"16:30","satTime":"17:00","tz":"Asia/Ho_Chi_Minh"}')
on conflict (key) do nothing;


-- ═══════════════════════════════════════════════════════════════════
-- 6. procurement_exports — nhật ký mỗi lần xuất file tổng hợp soạn hàng
--    (để cảnh báo "có đơn thay đổi sau lần xuất"). RLS bật, chỉ service-role.
-- ═══════════════════════════════════════════════════════════════════
create table if not exists public.procurement_exports (
  id              uuid primary key default gen_random_uuid(),
  delivery_date   date not null,
  exported_by     text,
  exported_at     timestamptz not null default now(),
  include_pending boolean not null default false,
  order_count     int not null default 0,
  line_count      int not null default 0,
  total_qty       numeric(14,3) not null default 0,
  file_name       text
);
alter table public.procurement_exports enable row level security;
create index if not exists procurement_exports_date_idx
  on public.procurement_exports (delivery_date, exported_at desc);


-- ═══════════════════════════════════════════════════════════════════
-- 7. TRIGGER: tự điền delivery_date khi INSERT orders (không sửa RPC)
-- ═══════════════════════════════════════════════════════════════════
create or replace function public.trg_orders_set_delivery_date()
returns trigger
language plpgsql
as $$
begin
  if new.delivery_date is null then
    new.delivery_date := (now() at time zone 'Asia/Ho_Chi_Minh')::date + 1;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_set_delivery_date on public.orders;
create trigger orders_set_delivery_date
  before insert on public.orders
  for each row execute function public.trg_orders_set_delivery_date();


-- ═══════════════════════════════════════════════════════════════════
-- 8. TRIGGER: giữ số lượng/tên khách đặt ban đầu khi INSERT order_items
-- ═══════════════════════════════════════════════════════════════════
create or replace function public.trg_order_items_set_ordered_fields()
returns trigger
language plpgsql
as $$
begin
  new.ordered_quantity     := coalesce(new.ordered_quantity, new.quantity);
  new.ordered_product_name := coalesce(new.ordered_product_name, new.name);
  return new;
end;
$$;

drop trigger if exists order_items_set_ordered_fields on public.order_items;
create trigger order_items_set_ordered_fields
  before insert on public.order_items
  for each row execute function public.trg_order_items_set_ordered_fields();
