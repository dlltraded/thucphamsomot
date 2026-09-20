-- ============================================================================
-- Migration: 20260920f_orders_external_ref.sql
-- Thêm cột mã tham chiếu đơn hàng ngoại bộ (mã đơn KiotViet) cho bảng orders
-- Áp dụng cho: Gói P2 (Vận hành thử 10 đơn thật KiotViet)
-- ============================================================================

-- 1. Bổ sung cột external_ref vào bảng orders
alter table public.orders
  add column if not exists external_ref text;

-- 2. Index tìm kiếm nhanh theo mã KiotViet (không phân biệt hoa thường)
create index if not exists orders_external_ref_idx
  on public.orders (upper(trim(external_ref)))
  where external_ref is not null and trim(external_ref) <> '';
