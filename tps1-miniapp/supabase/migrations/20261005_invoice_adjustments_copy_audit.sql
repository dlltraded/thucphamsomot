-- TPS1: chỉnh sửa hóa đơn hoàn thành có kiểm soát, truy vết và sao chép đơn.
-- Mọi hàm ghi chỉ dành cho service_role; API vẫn phải xác thực quyền trước khi gọi.

alter table public.orders
  add column if not exists operations_department_id uuid references public.departments(id),
  add column if not exists copied_from_order_id uuid references public.orders(id) on delete set null,
  add column if not exists invoice_revision integer not null default 1,
  add column if not exists tax_amount numeric(14,2) not null default 0;

alter table public.order_items
  add column if not exists vat_rate numeric(5,2) not null default 0,
  add column if not exists vat_amount numeric(14,2) not null default 0;

alter table public.sales_returns
  add column if not exists created_by_id uuid references public.admin_profiles(id) on delete set null,
  add column if not exists created_by_role text,
  add column if not exists created_by_department_id uuid references public.departments(id) on delete set null;

do $$ begin
  alter table public.order_items add constraint order_items_vat_rate_check
    check (vat_rate in (0, 5, 8));
exception when duplicate_object then null; end $$;

-- Chốt phòng Vận hành theo Sale đã phụ trách đơn. Không cập nhật lại sau này.
update public.orders o
set operations_department_id = ap.department_id
from public.admin_profiles ap
join public.departments d on d.id = ap.department_id and d.function_group = 'operations'
where o.operations_department_id is null and o.sales_rep_id = ap.id;

create or replace function public.set_order_operations_department()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.operations_department_id is null and new.sales_rep_id is not null then
    select ap.department_id into new.operations_department_id
    from public.admin_profiles ap
    join public.departments d on d.id = ap.department_id and d.function_group = 'operations'
    where ap.id = new.sales_rep_id;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_orders_set_operations_department on public.orders;
create trigger trg_orders_set_operations_department
before insert or update of sales_rep_id on public.orders
for each row execute function public.set_order_operations_department();

create index if not exists orders_operations_department_idx
  on public.orders(operations_department_id, status, completed_at desc);
create index if not exists orders_copied_from_idx
  on public.orders(copied_from_order_id) where copied_from_order_id is not null;

create sequence if not exists public.invoice_adjustment_number_seq start 1;

create table if not exists public.invoice_adjustments (
  id uuid primary key default gen_random_uuid(),
  adjustment_number text not null unique,
  order_id uuid not null references public.orders(id) on delete restrict,
  invoice_number text not null,
  revision_from integer not null,
  revision_to integer not null,
  reason text not null,
  before_snapshot jsonb not null,
  after_snapshot jsonb not null,
  total_before numeric(14,2) not null,
  total_after numeric(14,2) not null,
  total_delta numeric(14,2) not null,
  debt_before numeric(14,2) not null,
  debt_after numeric(14,2) not null,
  customer_credit_amount numeric(14,2) not null default 0,
  receivable_adjustment_id uuid references public.receivable_adjustments(id) on delete set null,
  created_by uuid references public.admin_profiles(id) on delete set null,
  created_by_name text not null,
  created_by_role text,
  created_by_department_id uuid references public.departments(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(order_id, revision_to)
);

alter table public.receivable_adjustments
  add column if not exists order_id uuid references public.orders(id) on delete restrict,
  add column if not exists invoice_adjustment_id uuid references public.invoice_adjustments(id) on delete set null;

create index if not exists invoice_adjustments_order_idx
  on public.invoice_adjustments(order_id, revision_to desc);
create index if not exists receivable_adjustments_order_idx
  on public.receivable_adjustments(order_id, created_at desc)
  where order_id is not null;

alter table public.invoice_adjustments enable row level security;
revoke all on public.invoice_adjustments from public, anon, authenticated;
grant select, insert on public.invoice_adjustments to service_role;
grant usage, select on sequence public.invoice_adjustment_number_seq to service_role;

create or replace function public.adjust_completed_invoice(
  p_order_id uuid,
  p_expected_revision integer,
  p_items jsonb,
  p_discount_amount numeric,
  p_shipping_amount numeric,
  p_note text,
  p_reason text,
  p_actor_id uuid,
  p_actor_name text,
  p_actor_role text,
  p_actor_department_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_actor public.admin_profiles%rowtype;
  v_actor_group text;
  v_input jsonb;
  v_product public.products%rowtype;
  v_line public.order_items%rowtype;
  v_item_id uuid;
  v_qty numeric;
  v_price numeric;
  v_vat numeric;
  v_line_total numeric;
  v_line_tax numeric;
  v_subtotal numeric := 0;
  v_tax_total numeric := 0;
  v_discount numeric := greatest(coalesce(p_discount_amount, 0), 0);
  v_shipping numeric := greatest(coalesce(p_shipping_amount, 0), 0);
  v_grand_total numeric;
  v_new_debt numeric;
  v_credit numeric := 0;
  v_revision integer;
  v_kept_ids uuid[] := array[]::uuid[];
  v_before jsonb;
  v_after jsonb;
  v_adjustment public.invoice_adjustments%rowtype;
  v_receivable_id uuid;
begin
  if length(trim(coalesce(p_reason, ''))) < 3 then
    raise exception 'Bắt buộc nhập lý do điều chỉnh hóa đơn';
  end if;
  if jsonb_typeof(coalesce(p_items, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then
    raise exception 'Hóa đơn phải có ít nhất một sản phẩm';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.status <> 'completed' or v_order.invoice_number is null then
    raise exception 'Chỉ được chỉnh sửa hóa đơn đã hoàn thành';
  end if;
  if coalesce(v_order.invoice_revision, 1) <> coalesce(p_expected_revision, 0) then
    raise exception 'Hóa đơn đã được người khác cập nhật. Vui lòng tải lại dữ liệu';
  end if;

  -- Kiểm tra quyền lần hai ngay trong CSDL. Legacy Admin chỉ được chấp nhận
  -- khi API service_role truyền role admin; tài khoản thường phải tồn tại.
  if p_actor_id is not null then
    select * into v_actor from public.admin_profiles where id = p_actor_id and is_active = true;
    if not found then raise exception 'Tài khoản thao tác không hợp lệ'; end if;
    select function_group into v_actor_group from public.departments where id = v_actor.department_id;
    p_actor_role := v_actor.role;
    p_actor_department_id := v_actor.department_id;
  end if;
  if not (
    p_actor_role = 'admin'
    or p_actor_role = 'ke_toan'
    or v_actor_group = 'accounting'
    or (
      coalesce(v_actor.position, '') = 'truong_phong'
      and v_actor_group = 'operations'
      and v_order.operations_department_id is not null
      and v_order.operations_department_id = p_actor_department_id
    )
  ) then
    raise exception 'Không có quyền chỉnh sửa hóa đơn này';
  end if;

  select to_jsonb(o) || jsonb_build_object('order_items', coalesce((
    select jsonb_agg(to_jsonb(oi) order by oi.created_at, oi.id)
    from public.order_items oi where oi.order_id = o.id
  ), '[]'::jsonb)) into v_before
  from public.orders o where o.id = p_order_id;

  for v_input in select value from jsonb_array_elements(p_items) loop
    v_qty := coalesce(nullif(v_input->>'quantity', '')::numeric, 0);
    v_price := coalesce(nullif(v_input->>'unitPrice', '')::numeric, -1);
    v_vat := coalesce(nullif(v_input->>'vatRate', '')::numeric, 0);
    if v_qty <= 0 then raise exception 'Số lượng phải lớn hơn 0'; end if;
    if v_price < 0 then raise exception 'Đơn giá không được âm'; end if;
    if v_vat not in (0, 5, 8) then raise exception 'VAT chỉ được chọn 0%%, 5%% hoặc 8%%'; end if;

    if coalesce(v_input->>'itemId', '') <> '' then
      select * into v_line from public.order_items
      where id = (v_input->>'itemId')::uuid and order_id = p_order_id for update;
      if not found then raise exception 'Dòng hàng không còn tồn tại trong hóa đơn'; end if;
      v_item_id := v_line.id;
    else
      select * into v_product from public.products
      where id = (v_input->>'productId')::uuid and active = true;
      if not found then raise exception 'Sản phẩm mới không còn kinh doanh hoặc không tồn tại'; end if;
      insert into public.order_items(
        order_id, product_id, product_local_id, sku, name, unit, quantity,
        base_unit_price, unit_price, line_total, final_unit_price, final_line_total,
        pricing_mode, price_source, pricing_note, vat_rate, vat_amount
      ) values (
        p_order_id, v_product.id, v_product.local_product_id, v_product.sku,
        v_product.name, coalesce(v_product.unit, 'Kg'), v_qty,
        v_price, v_price, round(v_qty * v_price), v_price, round(v_qty * v_price),
        'manual_item_price', 'manual', nullif(trim(v_input->>'note'), ''), v_vat,
        round(v_qty * v_price * v_vat / 100)
      ) returning * into v_line;
      v_item_id := v_line.id;
    end if;

    v_line_total := round(v_qty * v_price);
    v_line_tax := round(v_line_total * v_vat / 100);
    update public.order_items set
      quantity = v_qty,
      unit_price = v_price,
      line_total = v_line_total,
      final_unit_price = v_price,
      final_line_total = v_line_total,
      pricing_mode = 'manual_item_price',
      manual_unit_price = v_price,
      price_source = 'manual',
      pricing_note = nullif(trim(v_input->>'note'), ''),
      vat_rate = v_vat,
      vat_amount = v_line_tax
    where id = v_item_id;
    v_kept_ids := array_append(v_kept_ids, v_item_id);
    v_subtotal := v_subtotal + v_line_total;
    v_tax_total := v_tax_total + v_line_tax;
  end loop;

  delete from public.order_items where order_id = p_order_id and not (id = any(v_kept_ids));
  if v_discount > v_subtotal then raise exception 'Chiết khấu không được lớn hơn tiền hàng'; end if;
  v_grand_total := v_subtotal - v_discount + v_shipping + v_tax_total;
  v_new_debt := greatest(v_grand_total - coalesce(v_order.return_credit_amount, 0) - coalesce(v_order.paid_amount, 0), 0);
  v_credit := greatest(coalesce(v_order.paid_amount, 0) + coalesce(v_order.return_credit_amount, 0) - v_grand_total, 0);
  v_revision := coalesce(v_order.invoice_revision, 1) + 1;

  update public.orders set
    subtotal = v_subtotal,
    discount_amount = v_discount,
    shipping_amount = v_shipping,
    tax_amount = v_tax_total,
    grand_total = v_grand_total,
    debt_amount = v_new_debt,
    payment_status = case
      when v_new_debt <= 0 then 'paid'
      when coalesce(v_order.paid_amount, 0) > 0 then 'partially_paid'
      when v_order.payment_status = 'cod' then 'cod'
      else 'pending'
    end,
    note = nullif(trim(coalesce(p_note, '')), ''),
    item_count = jsonb_array_length(p_items),
    invoice_revision = v_revision,
    invoice_document_status = 'pending',
    updated_at = now()
  where id = p_order_id;

  select to_jsonb(o) || jsonb_build_object('order_items', coalesce((
    select jsonb_agg(to_jsonb(oi) order by oi.created_at, oi.id)
    from public.order_items oi where oi.order_id = o.id
  ), '[]'::jsonb)) into v_after
  from public.orders o where o.id = p_order_id;

  insert into public.invoice_adjustments(
    adjustment_number, order_id, invoice_number, revision_from, revision_to,
    reason, before_snapshot, after_snapshot, total_before, total_after,
    total_delta, debt_before, debt_after, customer_credit_amount,
    created_by, created_by_name, created_by_role, created_by_department_id
  ) values (
    'DCHD-' || to_char(current_date, 'YYYYMMDD') || '-' || lpad(nextval('public.invoice_adjustment_number_seq')::text, 6, '0'),
    p_order_id, v_order.invoice_number, coalesce(v_order.invoice_revision, 1), v_revision,
    trim(p_reason), v_before, v_after, v_order.grand_total, v_grand_total,
    v_grand_total - v_order.grand_total, coalesce(v_order.debt_amount, 0), v_new_debt, v_credit,
    p_actor_id, coalesce(nullif(trim(p_actor_name), ''), 'Hệ thống'), p_actor_role, p_actor_department_id
  ) returning * into v_adjustment;

  -- Chỉ tạo bút toán khi tổng hóa đơn thực sự thay đổi. Các lần sửa ghi chú
  -- hoặc thay đổi dòng hàng nhưng giữ nguyên tổng tiền vẫn có lịch sử hóa đơn,
  -- nhưng không được sinh bút toán 0đ (bảng công nợ cấm amount = 0).
  if abs(v_grand_total - v_order.grand_total) > 0 then
    insert into public.receivable_adjustments(
      adjustment_number, customer_id, adjustment_type, amount, remaining_amount,
      reason, reference_code, source, created_by, order_id, invoice_adjustment_id
    ) values (
      'CN-' || lpad(nextval('public.receivable_adjustment_number_seq')::text, 6, '0'),
      v_order.customer_id,
      case when v_grand_total >= v_order.grand_total then 'debit_adjustment' else 'credit_adjustment' end,
      abs(v_grand_total - v_order.grand_total),
      case when v_grand_total < v_order.grand_total then v_credit else 0 end,
      'Điều chỉnh hóa đơn ' || v_order.invoice_number || ': ' || trim(p_reason),
      v_adjustment.adjustment_number, 'invoice_adjustment', coalesce(nullif(trim(p_actor_name), ''), 'Hệ thống'),
      p_order_id, v_adjustment.id
    ) returning id into v_receivable_id;

    update public.invoice_adjustments set receivable_adjustment_id = v_receivable_id where id = v_adjustment.id;
  end if;
  insert into public.order_history(order_id, action, actor, note, payload)
  values (p_order_id, 'invoice_adjusted', coalesce(nullif(trim(p_actor_name), ''), 'Hệ thống'), trim(p_reason),
    jsonb_build_object('adjustmentId', v_adjustment.id, 'adjustmentNumber', v_adjustment.adjustment_number,
      'revisionFrom', v_adjustment.revision_from, 'revisionTo', v_adjustment.revision_to,
      'totalBefore', v_order.grand_total, 'totalAfter', v_grand_total,
      'debtBefore', coalesce(v_order.debt_amount, 0), 'debtAfter', v_new_debt,
      'customerCreditAmount', v_credit, 'actorId', p_actor_id,
      'actorRole', p_actor_role, 'actorDepartmentId', p_actor_department_id));

  return jsonb_build_object('order', v_after, 'adjustment', to_jsonb(v_adjustment),
    'receivableAdjustmentId', v_receivable_id);
end;
$$;

revoke all on function public.adjust_completed_invoice(uuid, integer, jsonb, numeric, numeric, text, text, uuid, text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.adjust_completed_invoice(uuid, integer, jsonb, numeric, numeric, text, text, uuid, text, text, uuid)
  to service_role;

create or replace function public.create_sales_return_secured(
  p_order_id uuid,
  p_items jsonb,
  p_reason text,
  p_actor_id uuid,
  p_actor_name text,
  p_actor_role text,
  p_actor_department_id uuid
)
returns public.sales_returns
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_actor public.admin_profiles%rowtype;
  v_actor_group text;
  v_return public.sales_returns%rowtype;
  v_input jsonb;
  v_line public.order_items%rowtype;
  v_qty numeric;
  v_normalized_items jsonb;
  v_extra_tax numeric := 0;
  v_outstanding_before numeric;
  v_extra_reduction numeric;
  v_extra_credit numeric;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Không tìm thấy hóa đơn'; end if;
  if p_actor_id is not null then
    select * into v_actor from public.admin_profiles where id = p_actor_id and is_active = true;
    if not found then raise exception 'Tài khoản thao tác không hợp lệ'; end if;
    select function_group into v_actor_group from public.departments where id = v_actor.department_id;
    p_actor_role := v_actor.role;
    p_actor_department_id := v_actor.department_id;
  end if;
  if not (
    p_actor_role = 'admin' or p_actor_role = 'ke_toan' or v_actor_group = 'accounting'
    or (coalesce(v_actor.position, '') = 'truong_phong' and v_actor_group = 'operations'
      and v_order.operations_department_id is not null
      and v_order.operations_department_id = p_actor_department_id)
  ) then raise exception 'Không có quyền đổi/trả hóa đơn này'; end if;

  -- Gộp các dòng trùng orderItemId trước khi kiểm tra. Nếu client vô tình
  -- (hoặc cố ý) gửi cùng một dòng hàng nhiều lần, tổng số lượng trả vẫn chỉ
  -- được đối chiếu một lần với số lượng đã giao còn lại.
  select coalesce(jsonb_agg(jsonb_build_object(
    'orderItemId', grouped.order_item_id,
    'quantity', grouped.quantity
  )), '[]'::jsonb)
  into v_normalized_items
  from (
    select item->>'orderItemId' as order_item_id,
      sum(coalesce(nullif(item->>'quantity', '')::numeric, 0)) as quantity
    from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) item
    group by item->>'orderItemId'
  ) grouped;

  v_outstanding_before := greatest(coalesce(v_order.grand_total, 0)
    - coalesce(v_order.return_credit_amount, 0) - coalesce(v_order.paid_amount, 0), 0);
  for v_input in select value from jsonb_array_elements(v_normalized_items) loop
    select * into v_line from public.order_items
      where id = (v_input->>'orderItemId')::uuid and order_id = p_order_id;
    v_qty := coalesce((v_input->>'quantity')::numeric, 0);
    v_extra_tax := v_extra_tax + round(v_qty * coalesce(v_line.final_unit_price, v_line.unit_price, 0) * coalesce(v_line.vat_rate, 0) / 100);
  end loop;

  v_return := public.create_sales_return(p_order_id, v_normalized_items, p_reason, p_actor_name);
  if v_extra_tax > 0 then
    v_extra_reduction := least(v_extra_tax, greatest(v_outstanding_before - v_return.total_amount, 0));
    v_extra_credit := greatest(v_extra_tax - v_extra_reduction, 0);
    update public.sales_returns set
      total_amount = total_amount + v_extra_tax,
      receivable_reduction_amount = receivable_reduction_amount + v_extra_reduction,
      customer_credit_amount = customer_credit_amount + v_extra_credit,
      settlement_type = case when customer_credit_amount + v_extra_credit > 0 then 'customer_credit' else 'reduce_receivable' end
    where id = v_return.id returning * into v_return;
    update public.orders set return_credit_amount = return_credit_amount + v_extra_tax, updated_at = now()
      where id = p_order_id;
    update public.sales_return_items sri set line_total = line_total + round(
      sri.quantity * coalesce(oi.final_unit_price, oi.unit_price, 0) * coalesce(oi.vat_rate, 0) / 100)
    from public.order_items oi where sri.sales_return_id = v_return.id and oi.id = sri.order_item_id;
  end if;
  update public.sales_returns set
    created_by_id = p_actor_id,
    created_by_role = p_actor_role,
    created_by_department_id = p_actor_department_id
  where id = v_return.id returning * into v_return;
  insert into public.order_history(order_id, action, actor, note, payload)
  values (p_order_id, 'sales_return_audit_enriched', p_actor_name, trim(p_reason),
    jsonb_build_object('returnId', v_return.id, 'returnNumber', v_return.return_number,
      'totalAmount', v_return.total_amount, 'vatAmount', v_extra_tax,
      'actorId', p_actor_id, 'actorRole', p_actor_role,
      'actorDepartmentId', p_actor_department_id));
  return v_return;
end;
$$;
revoke all on function public.create_sales_return_secured(uuid, jsonb, text, uuid, text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.create_sales_return_secured(uuid, jsonb, text, uuid, text, text, uuid)
  to service_role;
