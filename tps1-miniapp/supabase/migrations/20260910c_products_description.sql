-- Bổ sung cho trang chi tiết sản phẩm (Hàng hóa): mô tả chi tiết hiển thị
-- cho khách/nội bộ, khác với "notes" (ghi chú nội bộ, không nhất thiết để
-- khách xem) đã có sẵn.
alter table public.products add column if not exists description text;
comment on column public.products.description is 'Mô tả chi tiết sản phẩm, sửa trong trang chi tiết Hàng hóa.';
