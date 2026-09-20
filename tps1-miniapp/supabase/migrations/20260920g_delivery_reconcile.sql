-- ============================================================================
-- 20260920g — Xác nhận THỰC GIAO → tính lại tiền → hóa đơn theo số thực giao (P5)
-- Additive: chỉ thêm cột + 1 hàm. Chưa chạy trên Supabase (Claude viết 2026-09-20).
--
-- Quy ước sau khi "xác nhận thực giao":
--   order_items.ordered_quantity   = SL khách đặt ban đầu (giữ nguyên, đã có)
--   order_items.confirmed_quantity = SL đã chốt với khách trước khi giao (MỚI, chụp lại lúc đối chiếu)
--   order_items.quantity_delivered = SL thực giao (đã có)
--   order_items.quantity           = SL thực giao  => hóa đơn/báo cáo/khách đều thấy số thật
--   orders.pre_delivery_grand_total= tổng tiền trước khi đối chiếu (MỚI)
-- ============================================================================

alter table public.orders
  add column if not exists delivery_confirmed_at   timestamptz,
  add column if not exists delivery_confirmed_by   text,
  add column if not exists pre_delivery_grand_total numeric(14,2),
  add column if not exists delivery_note           text;

alter table public.order_items
  add column if not exists confirmed_quantity numeric(12,3);

-- ----------------------------------------------------------------------------
-- sync_order_inventory: đưa tồn kho về ĐÚNG với đơn, IDEMPOTENT.
--   p_mode = 'match_items' : mục tiêu = tổng order_items.quantity của từng mặt hàng
--   p_mode = 'zero'        : mục tiêu = 0 (hủy đơn -> hoàn kho)
-- Chỉ xét sản phẩm track_inventory = true. So "đã xuất ròng" (out - in) của đơn
-- với mục tiêu rồi chèn 1 dòng chênh lệch (out nếu thiếu, in nếu thừa) -> gọi lại
-- nhiều lần không đổi thêm. Xử lý cả mặt hàng đã bị xóa khỏi đơn sau khi đã trừ kho.
-- Trả về số mặt hàng được điều chỉnh.
-- ----------------------------------------------------------------------------
create or replace function public.sync_order_inventory(
  p_order_id uuid,
  p_actor text default 'system',
  p_mode text default 'match_items'
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_target numeric;
  v_net_out numeric;
  v_diff numeric;
  v_note text;
  v_count integer := 0;
begin
  if p_mode not in ('match_items', 'zero') then
    raise exception 'p_mode không hợp lệ: %', p_mode;
  end if;
  v_note := case when p_mode = 'zero' then 'Hoàn kho hủy đơn' else 'Đối chiếu thực giao' end
            || ' (' || coalesce(p_actor, 'system') || ')';

  for r in
    select ids.product_id
    from (
      select oi.product_id from public.order_items oi
      where oi.order_id = p_order_id and oi.product_id is not null
      union
      select t.product_id from public.inventory_transactions t
      where t.order_id = p_order_id
    ) ids
    join public.products p on p.id = ids.product_id and p.track_inventory = true
  loop
    if p_mode = 'zero' then
      v_target := 0;
    else
      select coalesce(sum(oi.quantity), 0) into v_target
      from public.order_items oi
      where oi.order_id = p_order_id and oi.product_id = r.product_id;
    end if;

    select coalesce(sum(case when t.type = 'out' then t.quantity
                             when t.type = 'in'  then -t.quantity
                             else 0 end), 0)
      into v_net_out
    from public.inventory_transactions t
    where t.order_id = p_order_id and t.product_id = r.product_id;

    v_diff := v_target - v_net_out;

    if v_diff > 0 then
      insert into public.inventory_transactions (product_id, order_id, type, quantity, note)
      values (r.product_id, p_order_id, 'out', v_diff, v_note);
      v_count := v_count + 1;
    elsif v_diff < 0 then
      insert into public.inventory_transactions (product_id, order_id, type, quantity, note)
      values (r.product_id, p_order_id, 'in', -v_diff, v_note);
      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.sync_order_inventory(uuid, text, text) from public;
grant execute on function public.sync_order_inventory(uuid, text, text) to service_role;
