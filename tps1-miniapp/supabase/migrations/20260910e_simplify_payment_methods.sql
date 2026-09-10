-- Thực tế TPS1 chỉ có 2 hình thức thanh toán: COD (khách trả ngay khi giao)
-- và công nợ (thu sau) — không dùng "cash"/"transfer" như 2 mục riêng (xác
-- nhận với chủ hệ thống 2026-09-10). Thu hẹp lại constraint cho đúng, tránh
-- nhầm lẫn khi chọn phương thức.
alter table public.order_payments drop constraint if exists order_payments_method_check;
alter table public.order_payments
  add constraint order_payments_method_check
  check (method in ('cod', 'debt_collection'));
