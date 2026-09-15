-- Bổ sung theo đối chiếu KiotViet thật (xem KE_HOACH_HE_THONG_BAN_HANG_KIOTVIET.md mục 14.2/14.3):
-- 1) dữ liệu giao hàng tự vận chuyển (khối lượng/kích thước/người giao/thu hộ COD)
-- 2) theo dõi số lượng đã giao thực tế theo từng dòng hàng (giao thiếu/dư)
-- 3) giá nhập cuối (khác giá vốn bình quân) trên products

-- ============================================================================
-- 1. Giao hàng tự vận chuyển — khớp màn "Bán giao hàng" của Sale/POS thật.
-- ============================================================================
alter table public.orders add column if not exists package_weight_g numeric(10,1);
alter table public.orders add column if not exists package_dimensions text;
alter table public.orders add column if not exists assigned_driver text;
alter table public.orders add column if not exists cod_collect_amount numeric(14,2) not null default 0;
comment on column public.orders.package_weight_g is 'Khối lượng kiện hàng (gram), khớp trường "gram" trên màn Bán giao hàng KiotViet.';
comment on column public.orders.package_dimensions is 'Kích thước kiện hàng dạng "dài x rộng x cao" (cm), nhập tay, không tách cột riêng vì chỉ hiển thị tham khảo.';
comment on column public.orders.assigned_driver is 'Tên/mã tài xế nội bộ được giao đơn (tự giao bằng xe công ty) — khác sales_rep_id (người bán/chốt đơn).';
comment on column public.orders.cod_collect_amount is 'Số tiền tài xế cần thu hộ khi giao hàng, tách khỏi grand_total vì có thể khác (thu một phần, đã đặt cọc...).';

-- ============================================================================
-- 2. Giao thiếu/giao nhiều đợt theo dòng hàng — khớp cặp cột "SL Đã nhận /
--    SL còn lại" trong báo cáo đặt hàng thật. Không bắt buộc bằng quantity;
--    mặc định 0, soạn hàng/giao hàng cập nhật khi xác nhận số lượng thực giao.
-- ============================================================================
alter table public.order_items add column if not exists quantity_delivered numeric(12,3) not null default 0;
comment on column public.order_items.quantity_delivered is 'Số lượng đã giao thực tế cho dòng hàng này; có thể < hoặc > quantity (đặt) nếu giao thiếu/dư. Không tự động bằng quantity khi tạo đơn.';

-- ============================================================================
-- 3. Giá nhập cuối — khác cost_price (giá vốn, có thể là bình quân). Thu mua
--    dùng để so sánh biến động giá nhà cung cấp giữa các lần nhập.
-- ============================================================================
alter table public.products add column if not exists last_import_price numeric(14,2);
comment on column public.products.last_import_price is 'Đơn giá của lần nhập kho gần nhất (khác cost_price là giá vốn bình quân) — cập nhật bởi import-inventory mỗi khi có dòng nhập ghi kèm đơn giá.';
