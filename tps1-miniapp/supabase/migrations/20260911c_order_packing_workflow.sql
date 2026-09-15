-- Luồng "Xử lý đơn hàng" (soạn hàng) có trạng thái + người phụ trách rõ ràng
-- — trước đây trang Soạn hàng chỉ hiện tổng hợp để xem, không ai "nhận" đơn
-- nào nên dễ 2 người cùng soạn 1 đơn hoặc không ai soạn (yêu cầu 2026-09-11:
-- "tránh bị nhầm lẫn là người này soạn người kia cũng soạn").
alter table public.orders add column if not exists packing_status text not null default 'not_started';
alter table public.orders drop constraint if exists orders_packing_status_check;
alter table public.orders add constraint orders_packing_status_check
  check (packing_status in ('not_started', 'in_progress', 'done'));
alter table public.orders add column if not exists packed_by uuid references public.admin_profiles(id);
alter table public.orders add column if not exists packing_started_at timestamptz;
alter table public.orders add column if not exists packed_at timestamptz;

comment on column public.orders.packing_status is 'not_started=chưa soạn, in_progress=đang soạn (đã có packed_by nhận), done=đã soạn xong.';
comment on column public.orders.packed_by is 'Nhân viên đã "nhận soạn" đơn này — chỉ người này (hoặc admin/truong_phong) được đổi trạng thái soạn tiếp.';
