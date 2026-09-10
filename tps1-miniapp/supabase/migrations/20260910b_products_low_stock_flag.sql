-- Bổ sung cho Giai đoạn B: PostgREST không lọc được "stock_qty <= min_stock"
-- trực tiếp (so sánh 2 cột), nên thêm cột tính sẵn để trang Hàng hóa lọc
-- "sắp hết hàng" bằng 1 điều kiện eq đơn giản, tự động cập nhật theo dữ liệu.
alter table public.products
  add column if not exists is_low_stock boolean
  generated always as (track_inventory and stock_qty <= min_stock) stored;

create index if not exists products_low_stock_idx on public.products (is_low_stock) where is_low_stock = true;
