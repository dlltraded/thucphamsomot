-- Bổ sung cột tồn kho / giá vốn / nguồn dữ liệu cho public.products
-- để có thể đồng bộ danh sách hàng hóa thật từ KiotViet (không đụng tới
-- price_wholesale/price_retail hiện có, script đồng bộ sẽ tự quyết định
-- khi nào ghi đè giá).

alter table public.products add column if not exists stock_qty numeric(14,3) not null default 0;
alter table public.products add column if not exists min_stock numeric(14,3) not null default 0;
alter table public.products add column if not exists max_stock numeric(14,3);
alter table public.products add column if not exists cost_price numeric(14,2) not null default 0;
alter table public.products add column if not exists kiotviet_group text;
alter table public.products add column if not exists data_source text not null default 'manual';
alter table public.products add column if not exists last_synced_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'products_data_source_check'
  ) then
    alter table public.products
      add constraint products_data_source_check
      check (data_source in ('manual', 'kiotviet'));
  end if;
end $$;

-- Cho phép tra cứu nhanh theo mã hàng KiotViet khi đồng bộ.
create index if not exists products_sku_idx on public.products (sku);

comment on column public.products.stock_qty is 'Tồn kho hiện tại, đồng bộ từ KiotViet (cột Tồn kho).';
comment on column public.products.min_stock is 'Định mức tồn tối thiểu, dùng để cảnh báo sắp hết hàng.';
comment on column public.products.max_stock is 'Định mức tồn tối đa, để trống nếu KiotViet để 999,999,999 (không giới hạn).';
comment on column public.products.cost_price is 'Giá vốn tham khảo, đồng bộ từ KiotViet (cột Giá vốn) — không phải giá bán cho khách.';
comment on column public.products.kiotviet_group is 'Nhóm hàng gốc bên KiotViet (cột Nhóm hàng), giữ lại để đối chiếu khi mapping category bị sai.';
comment on column public.products.data_source is 'manual = nhập tay/seed ban đầu, kiotviet = đồng bộ tự động từ file KiotViet.';
comment on column public.products.last_synced_at is 'Lần gần nhất script sync-kiotviet-products.mjs cập nhật dòng này.';
