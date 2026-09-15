-- Hóa đơn bán hàng phát hành khi đơn HOÀN THÀNH GIAO HÀNG — khác với "Phiếu
-- xác nhận đơn hàng" (order_confirmation, phát hành lúc chốt giá/xác nhận,
-- vẫn còn là phiếu tạm vì khách có thể đổi ý/khiếu nại trước khi nhận hàng).
-- Yêu cầu 2026-09-11: "lúc này mới tạo hoá đơn/invoice chứ nhỉ còn lúc xác
-- nhận đơn hàng chỉ là phiếu tạm thôi" + Mini App chỉ xem được hóa đơn khi
-- đơn đã "Hoàn thành" (đồng bộ với sale-webapp).
--
-- Dùng lại đúng bảng order_documents đã có (document_type không có check
-- constraint, chỉ cần thêm document_type = 'invoice') — không cần bảng mới.
alter table public.orders add column if not exists invoice_document_status text;
alter table public.orders drop constraint if exists orders_invoice_document_status_check;
alter table public.orders add constraint orders_invoice_document_status_check
  check (invoice_document_status is null or invoice_document_status in ('pending', 'generated', 'failed'));
comment on column public.orders.invoice_document_status is 'Trạng thái tạo PDF hóa đơn bán hàng — chỉ có giá trị sau khi đơn chuyển sang completed. NULL = chưa hoàn thành, chưa có hóa đơn.';
