-- Atomic final-order editor: classify customer, replace the final item list,
-- edit quantity/unit price/specification notes, then finalize one revision.
-- Run after 20260813_vip0_order_finalization.sql.

create or replace function public.admin_finalize_order_v2(
  p_order_id uuid,
  p_customer_tier text,
  p_pricing_mode text,
  p_order_discount_percent numeric default 0,
  p_shipping_amount numeric default 0,
  p_items jsonb default '[]'::jsonb,
  p_verification_note text default '',
  p_pricing_note text default '',
  p_actor text default 'admin'
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_order public.orders%rowtype;
  v_customer public.vip_accounts%rowtype;
  v_product public.products%rowtype;
  v_item public.order_items%rowtype;
  v_input jsonb;
  v_identifier text;
  v_quantity numeric;
  v_tier_discount numeric := 0;
  v_discount numeric;
  v_final_unit_price numeric;
  v_line_total numeric;
  v_subtotal numeric := 0;
  v_merchandise_total numeric := 0;
  v_shipping numeric := greatest(coalesce(p_shipping_amount, 0), 0);
  v_revision integer;
  v_effective_discount numeric := 0;
  v_now timestamptz := now();
  v_kept_ids uuid[] := array[]::uuid[];
  v_item_count integer := 0;
begin
  if p_customer_tier not in ('VIP0', 'VIP1', 'VIP2', 'VIP3') then
    raise exception 'Hạng khách hàng không hợp lệ';
  end if;
  if p_pricing_mode not in ('tier', 'order_discount', 'manual_item_price') then
    raise exception 'Chế độ tính giá không hợp lệ';
  end if;
  if coalesce(p_order_discount_percent, 0) < 0 or coalesce(p_order_discount_percent, 0) > 100 then
    raise exception 'Chiết khấu phải nằm trong khoảng 0 đến 100';
  end if;
  if jsonb_typeof(coalesce(p_items, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then
    raise exception 'Đơn hàng cuối cùng phải có ít nhất một sản phẩm';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Không tìm thấy đơn hàng'; end if;
  if v_order.status in ('shipping', 'completed', 'canceled') then
    raise exception 'Không thể sửa đơn đang giao, đã hoàn thành hoặc đã hủy';
  end if;
  if v_order.payment_status in ('paid', 'refunded') then
    raise exception 'Không thể sửa đơn đã thanh toán hoặc hoàn tiền';
  end if;

  select * into v_customer from public.vip_accounts where id = v_order.customer_id for update;
  if not found then raise exception 'Không tìm thấy tài khoản khách hàng'; end if;

  select coalesce(discount_percent, 0) into v_tier_discount
  from public.customer_tiers where code = p_customer_tier;

  update public.vip_accounts
  set discount_tier = p_customer_tier,
      verification_status = 'verified',
      verified_at = coalesce(verified_at, v_now),
      verified_by = p_actor,
      verification_note = nullif(trim(p_verification_note), ''),
      updated_at = v_now
  where id = v_customer.id;

  for v_input in select value from jsonb_array_elements(p_items)
  loop
    v_item := null;
    v_quantity := coalesce(nullif(v_input->>'quantity', '')::numeric, 0);
    if v_quantity <= 0 then raise exception 'Số lượng sản phẩm phải lớn hơn 0'; end if;

    if coalesce(v_input->>'itemId', '') <> '' then
      select * into v_item
      from public.order_items
      where id = (v_input->>'itemId')::uuid and order_id = v_order.id
      for update;
      if not found then raise exception 'Sản phẩm trong đơn không còn tồn tại'; end if;
    else
      v_identifier := coalesce(
        nullif(v_input->>'productId', ''),
        nullif(v_input->>'productLocalId', ''),
        nullif(v_input->>'sku', '')
      );
      if v_identifier is null then raise exception 'Thiếu mã sản phẩm cần thêm'; end if;

      select * into v_product
      from public.products
      where active = true
        and (id::text = v_identifier or local_product_id = v_identifier or sku = v_identifier)
      limit 1;
      if not found then raise exception 'Không tìm thấy sản phẩm % trong danh mục', v_identifier; end if;

      insert into public.order_items(
        order_id, product_id, product_local_id, sku, name, unit, quantity,
        base_unit_price, original_base_unit_price, discount_percent,
        unit_price, line_total, pricing_mode, pricing_note
      ) values (
        v_order.id, v_product.id, v_product.local_product_id, v_product.sku,
        v_product.name, coalesce(v_product.unit, 'Kg'), v_quantity,
        coalesce(nullif(v_product.price_retail, 0), v_product.price_wholesale, 0),
        coalesce(nullif(v_product.price_retail, 0), v_product.price_wholesale, 0),
        0, 0, 0, p_pricing_mode, nullif(trim(v_input->>'note'), '')
      ) returning * into v_item;
    end if;

    if p_pricing_mode = 'tier' then
      v_discount := v_tier_discount;
      v_final_unit_price := round(v_item.base_unit_price * (1 - v_discount / 100));
    elsif p_pricing_mode = 'order_discount' then
      v_discount := coalesce(p_order_discount_percent, 0);
      v_final_unit_price := round(v_item.base_unit_price * (1 - v_discount / 100));
    else
      if coalesce(v_input->>'finalUnitPrice', '') = '' then
        raise exception 'Thiếu đơn giá chốt cho sản phẩm %', v_item.name;
      end if;
      v_final_unit_price := round((v_input->>'finalUnitPrice')::numeric);
      if v_final_unit_price < 0 then raise exception 'Đơn giá chốt không được âm'; end if;
      v_discount := case
        when v_item.base_unit_price > 0
          then round((1 - v_final_unit_price / v_item.base_unit_price) * 100, 2)
        else 0
      end;
    end if;

    v_line_total := round(v_final_unit_price * v_quantity);
    update public.order_items
    set quantity = v_quantity,
        original_base_unit_price = coalesce(original_base_unit_price, base_unit_price),
        pricing_mode = p_pricing_mode,
        tier_discount_percent = v_tier_discount,
        manual_discount_percent = case when p_pricing_mode = 'order_discount' then v_discount else null end,
        manual_unit_price = case when p_pricing_mode = 'manual_item_price' then v_final_unit_price else null end,
        discount_percent = v_discount,
        unit_price = v_final_unit_price,
        line_total = v_line_total,
        final_unit_price = v_final_unit_price,
        final_line_total = v_line_total,
        pricing_note = nullif(trim(v_input->>'note'), '')
    where id = v_item.id;

    v_kept_ids := array_append(v_kept_ids, v_item.id);
    v_subtotal := v_subtotal + round(v_item.base_unit_price * v_quantity);
    v_merchandise_total := v_merchandise_total + v_line_total;
    v_item_count := v_item_count + 1;
  end loop;

  delete from public.order_items
  where order_id = v_order.id and not (id = any(v_kept_ids));

  if v_subtotal > 0 then
    v_effective_discount := round((v_subtotal - v_merchandise_total) / v_subtotal * 100, 2);
  end if;
  v_revision := greatest(coalesce(v_order.price_revision, 0), 0) + 1;

  update public.orders
  set customer_tier = p_customer_tier,
      discount_percent = v_effective_discount,
      subtotal = v_subtotal,
      discount_amount = greatest(v_subtotal - v_merchandise_total, 0),
      pricing_adjustment_amount = v_subtotal - v_merchandise_total,
      shipping_amount = v_shipping,
      grand_total = v_merchandise_total + v_shipping,
      item_count = v_item_count,
      original_grand_total = coalesce(original_grand_total, v_order.grand_total),
      pricing_status = 'finalized',
      pricing_mode = p_pricing_mode,
      manual_discount_percent = case when p_pricing_mode = 'order_discount' then p_order_discount_percent else null end,
      price_revision = v_revision,
      priced_at = v_now,
      priced_by = p_actor,
      pricing_note = nullif(trim(p_pricing_note), ''),
      confirmation_document_status = 'pending',
      status = case when status = 'pending' then 'confirmed' else status end,
      confirmed_at = coalesce(confirmed_at, v_now)
  where id = v_order.id;

  insert into public.order_history(order_id, action, from_status, to_status, note, actor, payload)
  values (
    v_order.id, 'customer_classified_and_final_order_rebuilt', v_order.status,
    case when v_order.status = 'pending' then 'confirmed' else v_order.status end,
    nullif(trim(p_pricing_note), ''), p_actor,
    jsonb_build_object(
      'previousTier', v_customer.discount_tier,
      'customerTier', p_customer_tier,
      'pricingMode', p_pricing_mode,
      'previousTotal', v_order.grand_total,
      'finalTotal', v_merchandise_total + v_shipping,
      'itemCount', v_item_count,
      'revision', v_revision
    )
  );

  return (
    select to_jsonb(o) || jsonb_build_object(
      'order_items', coalesce((
        select jsonb_agg(to_jsonb(oi) order by oi.created_at)
        from public.order_items oi where oi.order_id = o.id
      ), '[]'::jsonb)
    )
    from public.orders o where o.id = v_order.id
  );
end;
$$;

revoke all on function public.admin_finalize_order_v2(uuid, text, text, numeric, numeric, jsonb, text, text, text) from public;
grant execute on function public.admin_finalize_order_v2(uuid, text, text, numeric, numeric, jsonb, text, text, text) to service_role;

drop function if exists public.customer_list_orders(uuid);
create function public.customer_list_orders(p_session_token uuid)
returns table(
  id uuid, order_code text, status text, pricing_status text, pricing_mode text,
  payment_status text, payment_method text, source text,
  delivery_type text, delivery_alias text, delivery_address text,
  delivery_name text, delivery_phone text, note text,
  customer_tier text, discount_percent numeric, subtotal numeric,
  discount_amount numeric, pricing_adjustment_amount numeric,
  shipping_amount numeric, grand_total numeric, original_grand_total numeric,
  price_revision integer, priced_at timestamptz, pricing_note text,
  confirmation_document_status text, confirmation_document_id uuid,
  created_at timestamptz, updated_at timestamptz, items jsonb
)
language sql
security definer
set search_path = public, extensions
as $$
  select
    o.id, o.order_code, o.status, o.pricing_status, o.pricing_mode,
    o.payment_status, o.payment_method, o.source,
    o.delivery_type, o.delivery_alias, o.delivery_address,
    o.delivery_name, o.delivery_phone, o.note,
    o.customer_tier, o.discount_percent, o.subtotal,
    o.discount_amount, o.pricing_adjustment_amount,
    o.shipping_amount, o.grand_total, o.original_grand_total,
    o.price_revision, o.priced_at, o.pricing_note,
    o.confirmation_document_status,
    (select d.id from public.order_documents d where d.order_id = o.id and d.status = 'generated' order by d.revision desc limit 1),
    o.created_at, o.updated_at,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', oi.id, 'productId', oi.product_id,
          'localProductId', oi.product_local_id, 'sku', oi.sku,
          'name', oi.name, 'unit', oi.unit, 'quantity', oi.quantity,
          'baseUnitPrice', oi.base_unit_price,
          'discountPercent', oi.discount_percent,
          'price', oi.unit_price, 'lineTotal', oi.line_total,
          'pricingMode', oi.pricing_mode,
          'finalUnitPrice', oi.final_unit_price,
          'finalLineTotal', oi.final_line_total,
          'itemNote', oi.pricing_note
        ) order by oi.created_at
      ) filter (where oi.id is not null),
      '[]'::jsonb
    )
  from public.customer_sessions s
  join public.vip_accounts a on a.id = s.customer_id and a.is_active = true
  join public.orders o on o.customer_id = s.customer_id
  left join public.order_items oi on oi.order_id = o.id
  where s.token = p_session_token and s.expires_at > now()
  group by o.id
  order by o.created_at desc;
$$;
revoke all on function public.customer_list_orders(uuid) from public;
grant execute on function public.customer_list_orders(uuid) to anon, authenticated;
