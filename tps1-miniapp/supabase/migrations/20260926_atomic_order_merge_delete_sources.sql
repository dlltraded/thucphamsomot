-- Gộp đơn an toàn: tạo đơn đích và xóa đơn nguồn trong CÙNG một transaction.
-- Lịch sử đơn nguồn được lưu dạng JSON snapshot, không giữ dòng orders cũ để
-- tránh cộng trùng doanh thu, công nợ, thanh toán và nhu cầu soạn hàng.

alter table public.order_merge_audit
  add column if not exists old_order_snapshot jsonb,
  add column if not exists old_items_snapshot jsonb;

-- old_order_id chỉ còn là mã tham chiếu trong lịch sử. Nếu giữ FK ON DELETE
-- CASCADE thì audit cũng bị xóa cùng đơn nguồn.
alter table public.order_merge_audit
  drop constraint if exists order_merge_audit_old_order_id_fkey;
alter table public.order_merge_audit
  alter column old_order_id drop not null;

-- Hỗ trợ trạng thái thanh toán một phần đã được UI/API sử dụng.
alter table public.orders drop constraint if exists orders_payment_status_check;
alter table public.orders add constraint orders_payment_status_check
  check (payment_status in ('pending', 'cod', 'paid', 'partially_paid', 'failed', 'refunded'));

create unique index if not exists orders_merge_idempotency_unique_idx
  on public.orders(idempotency_key)
  where idempotency_key like 'merge-%';

create or replace function public.admin_merge_orders_atomic(
  p_order_ids uuid[],
  p_idempotency_key text,
  p_shipping_amount numeric default null,
  p_note text default null,
  p_reason text default null,
  p_actor_id uuid default null,
  p_actor_name text default 'admin',
  p_allow_locked boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_ids uuid[];
  v_count integer;
  v_first public.orders%rowtype;
  v_new_id uuid;
  v_existing public.orders%rowtype;
  v_has_locked boolean;
  v_target_status text;
  v_subtotal numeric(14,2);
  v_discount numeric(14,2);
  v_shipping numeric(14,2);
  v_grand_total numeric(14,2);
  v_paid_from_headers numeric(14,2);
  v_paid_from_ledger numeric(14,2);
  v_paid numeric(14,2);
  v_payment_status text;
  v_item_count integer;
  v_order_code text;
  v_source_codes text;
  v_final_note text;
  v_deleted integer;
begin
  select array_agg(distinct x order by x)
    into v_ids
  from unnest(coalesce(p_order_ids, array[]::uuid[])) as x;

  if coalesce(cardinality(v_ids), 0) < 2 then
    raise exception 'Cần ít nhất 2 đơn hàng khác nhau để gộp';
  end if;
  if nullif(trim(coalesce(p_idempotency_key, '')), '') is null then
    raise exception 'Thiếu mã chống tạo trùng thao tác gộp đơn';
  end if;

  -- Kiểm tra trước khi đọc đơn nguồn vì ở lần gửi lại, các đơn nguồn hợp lệ đã
  -- bị xóa bởi lần gọi đầu tiên.
  select * into v_existing
  from public.orders
  where idempotency_key = 'merge-' || left(trim(p_idempotency_key), 100)
  limit 1;
  if found then
    return jsonb_build_object('ok', true, 'alreadyProcessed', true, 'order', to_jsonb(v_existing));
  end if;

  -- Khóa toàn bộ đơn nguồn cho tới khi transaction kết thúc.
  perform 1
  from public.orders
  where id = any(v_ids)
  order by id
  for update;

  select count(*) into v_count from public.orders where id = any(v_ids);
  if v_count <> cardinality(v_ids) then
    select * into v_existing
    from public.orders
    where idempotency_key = 'merge-' || left(trim(p_idempotency_key), 100)
    limit 1;
    if found then
      return jsonb_build_object('ok', true, 'alreadyProcessed', true, 'order', to_jsonb(v_existing));
    end if;
    raise exception 'Một hoặc nhiều đơn nguồn không còn tồn tại';
  end if;

  select * into v_first
  from public.orders
  where id = v_ids[1];

  if exists (
    select 1 from public.orders
    where id = any(v_ids) and status not in ('draft', 'pending', 'confirmed')
  ) then
    raise exception 'Chỉ được gộp đơn nháp, chờ xác nhận hoặc đã xác nhận';
  end if;
  if v_first.customer_id is null or exists (
    select 1 from public.orders
    where id = any(v_ids) and customer_id is distinct from v_first.customer_id
  ) then
    raise exception 'Các đơn nguồn không cùng một khách hàng';
  end if;
  if exists (
    select 1 from public.orders
    where id = any(v_ids) and delivery_date is distinct from v_first.delivery_date
  ) then
    raise exception 'Các đơn nguồn không cùng ngày giao hàng';
  end if;
  if exists (
    select 1 from public.orders
    where id = any(v_ids)
      and lower(regexp_replace(trim(coalesce(delivery_address, '')), '[.,/-]+|[[:space:]]+', ' ', 'g'))
          is distinct from
          lower(regexp_replace(trim(coalesce(v_first.delivery_address, '')), '[.,/-]+|[[:space:]]+', ' ', 'g'))
  ) then
    raise exception 'Các đơn nguồn không cùng địa chỉ giao hàng';
  end if;
  if exists (
    select 1 from public.orders
    where id = any(v_ids) and branch_id is distinct from v_first.branch_id
  ) then
    raise exception 'Các đơn nguồn không cùng chi nhánh';
  end if;
  if exists (
    select 1 from public.orders
    where id = any(v_ids) and payment_method is distinct from v_first.payment_method
  ) then
    raise exception 'Các đơn nguồn có phương thức thanh toán khác nhau';
  end if;
  if exists (
    select 1 from public.orders
    where id = any(v_ids) and price_book_id is distinct from v_first.price_book_id
  ) then
    raise exception 'Các đơn nguồn đang dùng bảng giá khác nhau';
  end if;
  if exists (
    select 1 from public.orders
    where id = any(v_ids) and invoice_document_status = 'issued'
  ) then
    raise exception 'Có đơn đã phát hành hóa đơn, không được phép gộp';
  end if;

  select exists (
    select 1 from public.orders
    where id = any(v_ids)
      and (status = 'confirmed' or pricing_status = 'finalized' or confirmation_document_status = 'generated')
  ) into v_has_locked;
  if v_has_locked and not coalesce(p_allow_locked, false) then
    raise exception 'Có đơn đã xác nhận; cần quyền Trưởng phòng hoặc Admin để gộp';
  end if;

  select
    coalesce(sum(subtotal), 0), coalesce(sum(discount_amount), 0),
    coalesce(sum(grand_total - shipping_amount), 0), coalesce(sum(paid_amount), 0),
    string_agg(order_code, ', ' order by created_at)
  into v_subtotal, v_discount, v_grand_total, v_paid_from_headers, v_source_codes
  from public.orders where id = any(v_ids);

  if p_shipping_amount is null then
    select coalesce(max(shipping_amount), 0) into v_shipping
    from public.orders where id = any(v_ids);
  else
    v_shipping := greatest(p_shipping_amount, 0);
  end if;
  v_grand_total := greatest(v_grand_total + v_shipping, 0);
  v_target_status := case when v_has_locked then 'confirmed' else 'pending' end;
  v_order_code := 'DH-' || to_char(current_date, 'YYYYMMDD') || '-G-' || upper(substr(gen_random_uuid()::text, 1, 8));
  v_final_note := concat('[GỘP ĐƠN từ: ', v_source_codes, ']',
    case when nullif(trim(coalesce(p_note, '')), '') is not null then ' - ' || trim(p_note) else '' end);

  insert into public.orders (
    order_code, customer_id, customer_code, customer_name, customer_phone,
    customer_company, customer_tier, discount_percent, source, status,
    payment_method, payment_status, delivery_type, delivery_alias,
    delivery_address, delivery_name, delivery_phone, delivery_date,
    delivery_shift, delivery_address_id, branch_id, note, subtotal,
    discount_amount, shipping_amount, grand_total, item_count,
    idempotency_key, sales_rep_id, pricing_status, pricing_mode,
    original_grand_total, pricing_adjustment_amount, manual_discount_percent,
    price_revision, priced_at, priced_by, pricing_note,
    confirmation_document_status, confirmed_at, price_book_id,
    price_book_version, price_resolution_status, price_locked_at,
    customer_price_source, packing_status, package_weight_g,
    package_dimensions, assigned_driver, cod_collect_amount
  ) values (
    v_order_code, v_first.customer_id, v_first.customer_code,
    v_first.customer_name, v_first.customer_phone, v_first.customer_company,
    v_first.customer_tier, v_first.discount_percent, 'admin', v_target_status,
    v_first.payment_method, 'pending', v_first.delivery_type,
    v_first.delivery_alias, v_first.delivery_address, v_first.delivery_name,
    v_first.delivery_phone, v_first.delivery_date, v_first.delivery_shift,
    v_first.delivery_address_id, v_first.branch_id, v_final_note, v_subtotal,
    v_discount, v_shipping, v_grand_total, 0,
    'merge-' || left(trim(p_idempotency_key), 100), v_first.sales_rep_id,
    case when v_has_locked then 'finalized' else 'provisional' end,
    v_first.pricing_mode, v_grand_total, 0, v_first.manual_discount_percent,
    case when v_has_locked then greatest(v_first.price_revision, 1) else 0 end,
    case when v_has_locked then now() else null end,
    case when v_has_locked then coalesce(p_actor_name, 'admin') else null end,
    nullif(trim(coalesce(p_reason, '')), ''), 'pending',
    case when v_has_locked then now() else null end,
    v_first.price_book_id, v_first.price_book_version,
    v_first.price_resolution_status,
    case when v_has_locked then now() else null end,
    v_first.customer_price_source, 'not_started', null, null, null, 0
  ) returning id into v_new_id;

  -- Chỉ gộp các dòng có cùng sản phẩm, ĐVT, giá và toàn bộ ghi chú/quy cách.
  insert into public.order_items (
    order_id, product_id, product_local_id, sku, name, unit, quantity,
    base_unit_price, discount_percent, unit_price, line_total,
    original_base_unit_price, pricing_mode, tier_discount_percent,
    manual_discount_percent, manual_unit_price, final_unit_price,
    final_line_total, pricing_note, customer_note, ordered_quantity,
    ordered_product_name, quantity_delivered, confirmed_quantity,
    general_unit_price, assigned_unit_price, discount_amount, manual_price,
    manual_price_reason, price_source, unit_snapshot, packaging_note,
    min_qty_snapshot, order_step_snapshot, product_name_snapshot
  )
  select
    v_new_id,
    (array_agg(oi.product_id) filter (where oi.product_id is not null))[1],
    min(oi.product_local_id), min(oi.sku), min(oi.name), oi.unit,
    sum(oi.quantity), oi.base_unit_price, oi.discount_percent,
    oi.unit_price, sum(oi.line_total), min(oi.original_base_unit_price),
    oi.pricing_mode, min(oi.tier_discount_percent),
    min(oi.manual_discount_percent), min(oi.manual_unit_price),
    min(oi.final_unit_price), sum(oi.final_line_total), oi.pricing_note,
    oi.customer_note, sum(coalesce(oi.ordered_quantity, oi.quantity)),
    min(coalesce(oi.ordered_product_name, oi.name)), sum(oi.quantity_delivered),
    case when count(oi.confirmed_quantity) > 0 then sum(oi.confirmed_quantity) else null end,
    min(oi.general_unit_price), min(oi.assigned_unit_price),
    sum(coalesce(oi.discount_amount, 0)), min(oi.manual_price),
    oi.manual_price_reason, oi.price_source, oi.unit_snapshot,
    oi.packaging_note, min(oi.min_qty_snapshot), min(oi.order_step_snapshot),
    min(coalesce(oi.product_name_snapshot, oi.name))
  from public.order_items oi
  where oi.order_id = any(v_ids)
  group by
    coalesce(oi.product_id::text, oi.product_local_id, oi.sku, oi.name),
    oi.unit, oi.base_unit_price, oi.discount_percent, oi.unit_price,
    oi.pricing_mode, oi.pricing_note, oi.customer_note, oi.packaging_note,
    oi.manual_price_reason, oi.price_source, oi.unit_snapshot;

  get diagnostics v_item_count = row_count;
  if v_item_count = 0 then raise exception 'Không có sản phẩm hợp lệ để tạo đơn gộp'; end if;
  update public.orders set item_count = v_item_count where id = v_new_id;

  -- Lưu ảnh chụp đầy đủ trước khi xóa. Audit không còn phụ thuộc dòng orders cũ.
  insert into public.order_merge_audit (
    parent_order_id, old_order_id, merge_condition, merged_by, merged_at,
    old_order_snapshot, old_items_snapshot
  )
  select
    v_new_id, o.id,
    jsonb_build_object(
      'reason', coalesce(nullif(trim(p_reason), ''), 'Gộp đơn cùng khách, ngày giao và địa chỉ'),
      'source_order_codes', string_to_array(v_source_codes, ', ')
    ),
    coalesce(nullif(trim(p_actor_name), ''), p_actor_id::text, 'admin'), now(),
    to_jsonb(o),
    coalesce((select jsonb_agg(to_jsonb(oi) order by oi.created_at)
              from public.order_items oi where oi.order_id = o.id), '[]'::jsonb)
  from public.orders o where o.id = any(v_ids);

  -- Di chuyển sổ thu tiền, không sao chép, nên không thể bị nhân đôi.
  update public.order_payments set order_id = v_new_id where order_id = any(v_ids);
  select coalesce(sum(amount), 0) into v_paid_from_ledger
  from public.order_payments where order_id = v_new_id;
  v_paid := greatest(v_paid_from_headers, v_paid_from_ledger);
  v_payment_status := case
    when v_paid >= v_grand_total and v_grand_total > 0 then 'paid'
    when v_paid > 0 then 'partially_paid'
    else 'pending'
  end;
  update public.orders
  set paid_amount = v_paid, payment_status = v_payment_status,
      cod_collect_amount = greatest(v_grand_total - v_paid, 0)
  where id = v_new_id;

  -- Nếu một đơn nguồn từng là kết quả của lần gộp trước, chuyển toàn bộ cây
  -- lịch sử sang đơn mới trước khi xóa nó.
  update public.order_merge_audit
  set parent_order_id = v_new_id
  where parent_order_id = any(v_ids);

  insert into public.order_history(order_id, action, to_status, note, actor, payload)
  values (
    v_new_id, 'merged_created', v_target_status,
    coalesce(nullif(trim(p_reason), ''), 'Gộp đơn và xóa các đơn nguồn'),
    coalesce(nullif(trim(p_actor_name), ''), p_actor_id::text, 'admin'),
    jsonb_build_object('source_order_ids', v_ids, 'source_order_codes', v_source_codes)
  );

  delete from public.orders where id = any(v_ids);
  get diagnostics v_deleted = row_count;
  if v_deleted <> cardinality(v_ids) then
    raise exception 'Không thể xóa đầy đủ các đơn nguồn; toàn bộ thao tác đã được hoàn tác';
  end if;

  return jsonb_build_object(
    'ok', true, 'alreadyProcessed', false, 'deletedSourceCount', v_deleted,
    'sourceOrderCodes', string_to_array(v_source_codes, ', '),
    'order', (select to_jsonb(o) from public.orders o where o.id = v_new_id)
  );
end;
$$;

revoke all on function public.admin_merge_orders_atomic(
  uuid[], text, numeric, text, text, uuid, text, boolean
) from public, anon, authenticated;
grant execute on function public.admin_merge_orders_atomic(
  uuid[], text, numeric, text, text, uuid, text, boolean
) to service_role;

-- Dọn dữ liệu legacy: chụp lại những gì còn có rồi xóa đơn nguồn đã gộp.
update public.order_merge_audit a
set old_order_snapshot = coalesce(a.old_order_snapshot, to_jsonb(o)),
    old_items_snapshot = coalesce(
      a.old_items_snapshot,
      (select jsonb_agg(to_jsonb(oi) order by oi.created_at)
       from public.order_items oi where oi.order_id = o.id),
      '[]'::jsonb
    )
from public.orders o
where a.old_order_id = o.id;

update public.order_merge_audit a
set parent_order_id = o.merged_into_order_id
from public.orders o
where a.parent_order_id = o.id
  and o.status = 'merged'
  and o.merged_into_order_id is not null;

delete from public.orders
where status = 'merged' and merged_into_order_id is not null;
