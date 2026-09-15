-- Áp giá hàng ngày hàng loạt (mục brief 2026-09-11) — bài toán: 1 ngày có
-- hàng trăm đơn từ hàng trăm khách, nhiều mặt hàng để giá 0đ (thịt/hải sản
-- tươi biến động giá mỗi ngày, xem mục 14 "priceOnRequest") — không thể mở
-- từng đơn để gõ giá tay. RPC này áp 1 giá cho 1 mặt hàng, tự lan ra TẤT CẢ
-- dòng hàng cùng SKU trong các đơn "pending" (chưa chốt giá) của đúng ngày
-- được chọn — dùng resolve_product_price() sẵn có để tự tính đúng khách nào
-- có giá hợp đồng riêng (giữ nguyên, KHÔNG bị giá ngày ghi đè) và khách nào
-- theo hạng (tự tính theo product_tier_prices nếu có, không thì theo giá
-- ngày vừa nhập). CHỈ cập nhật order_items — KHÔNG đụng orders.subtotal/
-- grand_total (vẫn "tạm tính" cho tới khi xác nhận hàng loạt riêng ở bước
-- sau, xem admin_bulk_finalize_check bên dưới) — để nhân viên rà soát trước
-- khi khóa giá, an toàn hơn tự động chốt luôn.
create or replace function public.admin_bulk_apply_price(
  p_product_id uuid,
  p_price numeric,
  p_date date,
  p_actor text
)
returns table(affected_orders integer, affected_lines integer)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_row record;
  v_new_price numeric;
  v_lines integer := 0;
  v_orders integer := 0;
begin
  if p_price is null or p_price < 0 then
    raise exception 'Giá không hợp lệ';
  end if;

  -- Giá "hôm nay" trở thành giá gốc mới — resolve_product_price() vẫn ưu
  -- tiên customer_contract_prices > product_tier_prices > giá gốc này.
  update public.products
  set price_retail = p_price, price_wholesale = p_price
  where id = p_product_id;

  for v_row in
    select oi.id as item_id, oi.quantity, o.id as order_id, o.customer_id
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.product_id = p_product_id
      and o.status = 'pending'
      and o.pricing_status is distinct from 'finalized'
      and o.created_at::date = p_date
  loop
    v_new_price := public.resolve_product_price(p_product_id, v_row.customer_id);
    update public.order_items
    set base_unit_price = p_price,
        unit_price = v_new_price,
        discount_percent = case when p_price > 0 then round((1 - v_new_price / p_price) * 100, 2) else 0 end,
        line_total = round(v_new_price * v_row.quantity)
    where id = v_row.item_id;
    v_lines := v_lines + 1;
  end loop;

  select count(distinct o.id) into v_orders
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where oi.product_id = p_product_id
    and o.status = 'pending'
    and o.pricing_status is distinct from 'finalized'
    and o.created_at::date = p_date;

  if v_orders > 0 then
    insert into public.order_history(order_id, action, note, actor, payload)
    select distinct o.id, 'bulk_price_applied',
      'Áp giá hàng loạt: ' || p_price::text || 'đ (ngày ' || p_date::text || ')',
      p_actor,
      jsonb_build_object('productId', p_product_id, 'price', p_price, 'date', p_date)
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.product_id = p_product_id
      and o.status = 'pending'
      and o.pricing_status is distinct from 'finalized'
      and o.created_at::date = p_date;
  end if;

  return query select v_orders, v_lines;
end;
$$;
revoke all on function public.admin_bulk_apply_price(uuid, numeric, date, text) from public;
grant execute on function public.admin_bulk_apply_price(uuid, numeric, date, text) to authenticated;
