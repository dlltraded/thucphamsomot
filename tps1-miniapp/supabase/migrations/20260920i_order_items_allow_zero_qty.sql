-- Migration: cho phép order_items.quantity = 0 (dòng giao thiếu hoàn toàn).
-- Phát hiện khi thử "Xác nhận thực giao" với 1 dòng thực giao 0: constraint order_items_quantity_check (quantity > 0)
-- làm lệnh cập nhật lỗi → không thể ghi nhận "giao 0" cho mặt hàng.
-- Idempotent: tìm và bỏ mọi CHECK chỉ liên quan tới cột quantity, rồi thêm lại CHECK quantity >= 0.
-- CHƯA CHẠY — cần anh chạy trong SQL Editor.

do $$
declare
  con record;
begin
  for con in
    select c.conname
    from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public'
      and rel.relname = 'order_items'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ~* '\yquantity\y'
      and pg_get_constraintdef(c.oid) !~* 'quantity_(delivered|confirmed)|ordered_quantity|confirmed_quantity'
  loop
    execute format('alter table public.order_items drop constraint %I', con.conname);
  end loop;
end $$;

alter table public.order_items
  add constraint order_items_quantity_check check (quantity >= 0);
