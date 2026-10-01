-- TPS1 2026-10-01: tách Đặt hàng/Hóa đơn và sổ đổi-trả tài chính.
-- Không xóa cột VIP cũ để giữ tương thích trong giai đoạn pilot.

alter table public.orders
  add column if not exists invoice_number text,
  add column if not exists invoice_issued_at timestamptz,
  add column if not exists return_credit_amount numeric(14,2) not null default 0;

alter table public.order_items
  add column if not exists price_book_id uuid references public.price_books(id) on delete set null,
  add column if not exists price_book_version integer,
  add column if not exists price_resolved_at timestamptz;

create unique index if not exists orders_invoice_number_uq
  on public.orders(invoice_number) where invoice_number is not null;
create index if not exists orders_status_created_idx on public.orders(status, created_at desc);
create index if not exists orders_customer_completed_idx on public.orders(customer_id, completed_at desc)
  where status = 'completed';
create index if not exists orders_price_book_idx on public.orders(price_book_id, created_at desc);
create index if not exists order_items_price_book_idx on public.order_items(price_book_id, order_id);

create sequence if not exists public.sales_invoice_number_seq start 1;
create sequence if not exists public.sales_return_number_seq start 1;

create table if not exists public.sales_returns (
  id uuid primary key default gen_random_uuid(),
  return_number text not null unique,
  order_id uuid not null references public.orders(id) on delete restrict,
  invoice_number text not null,
  customer_id uuid not null references public.vip_accounts(id) on delete restrict,
  reason text not null,
  total_amount numeric(14,2) not null check (total_amount > 0),
  receivable_reduction_amount numeric(14,2) not null default 0 check (receivable_reduction_amount >= 0),
  customer_credit_amount numeric(14,2) not null default 0 check (customer_credit_amount >= 0),
  settlement_type text not null check (settlement_type in ('reduce_receivable', 'customer_credit')),
  warehouse_status text not null default 'pending' check (warehouse_status in ('pending', 'processed', 'not_applicable')),
  status text not null default 'confirmed' check (status in ('confirmed', 'voided')),
  created_by text not null,
  created_at timestamptz not null default now(),
  voided_by text,
  voided_at timestamptz,
  void_reason text
);

-- Giữ migration chạy lại an toàn nếu bảng đổi/trả đã được tạo từ một bản nháp.
alter table public.sales_returns
  add column if not exists receivable_reduction_amount numeric(14,2) not null default 0,
  add column if not exists customer_credit_amount numeric(14,2) not null default 0;

create table if not exists public.sales_return_items (
  id uuid primary key default gen_random_uuid(),
  sales_return_id uuid not null references public.sales_returns(id) on delete restrict,
  order_item_id uuid not null references public.order_items(id) on delete restrict,
  product_id uuid references public.products(id) on delete set null,
  sku text,
  name text not null,
  unit text,
  quantity numeric(12,3) not null check (quantity > 0),
  unit_price numeric(14,2) not null check (unit_price >= 0),
  line_total numeric(14,2) not null check (line_total > 0)
);

create index if not exists sales_returns_order_idx on public.sales_returns(order_id, created_at desc);
create index if not exists sales_returns_customer_idx on public.sales_returns(customer_id, created_at desc);
create index if not exists sales_return_items_order_item_idx on public.sales_return_items(order_item_id);

alter table public.sales_returns enable row level security;
alter table public.sales_return_items enable row level security;
revoke all on public.sales_returns from anon, authenticated;
revoke all on public.sales_return_items from anon, authenticated;
grant select, insert, update on public.sales_returns to service_role;
grant select, insert, update on public.sales_return_items to service_role;
grant usage, select on sequence public.sales_invoice_number_seq to service_role;
grant usage, select on sequence public.sales_return_number_seq to service_role;

create or replace function public.complete_order_for_invoice(
  p_order_id uuid,
  p_actor text
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_previous_status text;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Không tìm thấy đơn hàng'; end if;
  if v_order.status = 'completed' then return v_order; end if;
  v_previous_status := v_order.status;
  if v_order.status not in ('confirmed', 'preparing', 'shipping') then
    raise exception 'Đơn chưa đủ điều kiện hoàn thành';
  end if;
  if coalesce(v_order.pricing_status, '') <> 'finalized'
     or coalesce(v_order.price_resolution_status, '') not in ('resolved', 'manual') then
    raise exception 'Đơn chưa chốt đủ giá từ bảng giá';
  end if;
  if exists (
    select 1 from public.order_items
    where order_id = p_order_id and (final_unit_price is null or price_source is null)
  ) then raise exception 'Đơn còn sản phẩm chưa xác định giá'; end if;

  update public.orders set
    status = 'completed',
    completed_at = coalesce(completed_at, now()),
    invoice_number = coalesce(invoice_number,
      'HD-' || to_char(current_date, 'YYYYMMDD') || '-' || lpad(nextval('public.sales_invoice_number_seq')::text, 6, '0')),
    invoice_issued_at = coalesce(invoice_issued_at, now()),
    invoice_document_status = 'pending',
    updated_at = now()
  where id = p_order_id returning * into v_order;

  insert into public.order_history(order_id, action, from_status, to_status, actor, payload)
  values (p_order_id, 'invoice_issued', v_previous_status, 'completed', p_actor,
    jsonb_build_object('invoiceNumber', v_order.invoice_number));
  return v_order;
end;
$$;
revoke all on function public.complete_order_for_invoice(uuid, text) from public, anon, authenticated;
grant execute on function public.complete_order_for_invoice(uuid, text) to service_role;

create or replace function public.create_sales_return(
  p_order_id uuid,
  p_items jsonb,
  p_reason text,
  p_actor text
)
returns public.sales_returns
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_return public.sales_returns%rowtype;
  v_item jsonb;
  v_line public.order_items%rowtype;
  v_qty numeric;
  v_already numeric;
  v_delivered numeric;
  v_total numeric := 0;
  v_settlement text;
  v_outstanding numeric;
  v_receivable_reduction numeric;
  v_customer_credit numeric;
begin
  if length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'Cần nhập lý do đổi/trả'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'Chưa chọn sản phẩm đổi/trả'; end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.status <> 'completed' or v_order.invoice_number is null then
    raise exception 'Chỉ đổi/trả từ hóa đơn đã hoàn thành';
  end if;

  for v_item in select value from jsonb_array_elements(p_items) loop
    select * into v_line from public.order_items
      where id = (v_item->>'orderItemId')::uuid and order_id = p_order_id;
    if not found then raise exception 'Sản phẩm đổi/trả không thuộc hóa đơn'; end if;
    v_qty := coalesce((v_item->>'quantity')::numeric, 0);
    v_delivered := coalesce(v_line.quantity_delivered, v_line.quantity, 0);
    select coalesce(sum(sri.quantity), 0) into v_already
      from public.sales_return_items sri join public.sales_returns sr on sr.id = sri.sales_return_id
      where sri.order_item_id = v_line.id and sr.status = 'confirmed';
    if v_qty <= 0 or v_qty > v_delivered - v_already then
      raise exception 'Số lượng trả vượt quá số đã giao còn lại của %', v_line.name;
    end if;
    v_total := v_total + round(v_qty * coalesce(v_line.final_unit_price, v_line.unit_price, 0));
  end loop;
  if v_total <= 0 then raise exception 'Giá trị đổi/trả phải lớn hơn 0'; end if;
  -- Một phiếu trả có thể vừa giảm phần còn nợ, vừa tạo số dư có nếu khách đã
  -- thanh toán nhiều hơn giá trị hóa đơn còn lại. Lưu tách hai phần để kế
  -- toán không phải suy ngược từ tổng tiền.
  v_outstanding := greatest(
    coalesce(v_order.grand_total, 0)
      - coalesce(v_order.return_credit_amount, 0)
      - coalesce(v_order.paid_amount, 0),
    0
  );
  v_receivable_reduction := least(v_total, v_outstanding);
  v_customer_credit := greatest(v_total - v_receivable_reduction, 0);
  v_settlement := case when v_customer_credit > 0 then 'customer_credit' else 'reduce_receivable' end;

  insert into public.sales_returns(
    return_number, order_id, invoice_number, customer_id, reason, total_amount,
    receivable_reduction_amount, customer_credit_amount, settlement_type, created_by
  )
  values ('DT-' || to_char(current_date, 'YYYYMMDD') || '-' || lpad(nextval('public.sales_return_number_seq')::text, 6, '0'),
    p_order_id, v_order.invoice_number, v_order.customer_id, trim(p_reason), v_total,
    v_receivable_reduction, v_customer_credit, v_settlement, p_actor)
  returning * into v_return;

  for v_item in select value from jsonb_array_elements(p_items) loop
    select * into v_line from public.order_items where id = (v_item->>'orderItemId')::uuid;
    v_qty := (v_item->>'quantity')::numeric;
    insert into public.sales_return_items(sales_return_id, order_item_id, product_id, sku, name, unit, quantity, unit_price, line_total)
    values (v_return.id, v_line.id, v_line.product_id, v_line.sku, v_line.name, v_line.unit, v_qty,
      coalesce(v_line.final_unit_price, v_line.unit_price, 0),
      round(v_qty * coalesce(v_line.final_unit_price, v_line.unit_price, 0)));
  end loop;

  update public.orders set return_credit_amount = return_credit_amount + v_total, updated_at = now() where id = p_order_id;
  insert into public.order_history(order_id, action, actor, note, payload)
  values (p_order_id, 'sales_return_confirmed', p_actor, trim(p_reason),
    jsonb_build_object('returnId', v_return.id, 'returnNumber', v_return.return_number,
      'amount', v_total, 'receivableReductionAmount', v_receivable_reduction,
      'customerCreditAmount', v_customer_credit,
      'settlementType', v_settlement, 'warehouseStatus', 'pending'));
  return v_return;
end;
$$;
revoke all on function public.create_sales_return(uuid, jsonb, text, text) from public, anon, authenticated;
grant execute on function public.create_sales_return(uuid, jsonb, text, text) to service_role;
