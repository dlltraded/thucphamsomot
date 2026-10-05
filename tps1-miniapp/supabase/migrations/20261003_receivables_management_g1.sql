-- ============================================================================
-- Migration: Phân hệ Quản lý Công nợ TPS1 (Giai đoạn G1)
-- File: 20261003_receivables_management_g1.sql
-- Mục tiêu:
--   1. Thêm payment_terms_days cho khách hàng (mặc định 30 ngày).
--   2. Thêm orders.due_date cho đơn hàng.
--   3. Tạo bảng customer_receipts (phiếu thu), receipt_allocations (phân bổ),
--      receivable_adjustments (điều chỉnh & số dư đầu kỳ).
--   4. Import kiotviet_opening_debt thành bút toán đầu kỳ idempotent.
--   5. Viết RPC transaction nguyên tử tạo phiếu thu, phân bổ hóa đơn, cấn trừ,
--      chặn thu vượt nợ và lập phiếu đảo.
--   6. Khóa toàn bộ ghi RLS từ client, chỉ service_role được truy cập.
-- ============================================================================

-- 1. Bổ sung payment_terms_days cho khách hàng (vip_accounts)
alter table public.vip_accounts
  add column if not exists payment_terms_days integer not null default 30;

comment on column public.vip_accounts.payment_terms_days is 'Thời hạn thanh toán công nợ theo ngày, mặc định 30 ngày.';

-- Đảm bảo có view hoặc alias customers nếu cần thiết
create or replace view public.customers as
  select * from public.vip_accounts;

-- 2. Bổ sung orders.due_date cho đơn hàng
alter table public.orders
  add column if not exists due_date timestamptz;

comment on column public.orders.due_date is 'Hạn thanh toán của hóa đơn/đơn hàng, tính theo payment_terms_days của khách.';

-- Khởi tạo hạn nợ cho các đơn hoàn thành đã có
update public.orders o
set due_date = coalesce(o.completed_at, o.created_at) + (coalesce(va.payment_terms_days, 30) || ' days')::interval
from public.vip_accounts va
where o.customer_id = va.id and o.due_date is null;

create index if not exists orders_due_date_idx on public.orders(due_date);
create index if not exists orders_customer_due_idx on public.orders(customer_id, due_date);

-- 3. Tạo sequences sinh mã chứng từ
create sequence if not exists public.customer_receipt_number_seq start 1;
create sequence if not exists public.receivable_adjustment_number_seq start 1;

-- 4. Bảng sổ điều chỉnh & số dư đầu kỳ: receivable_adjustments
create table if not exists public.receivable_adjustments (
  id uuid primary key default gen_random_uuid(),
  adjustment_number text not null unique,
  customer_id uuid not null references public.vip_accounts(id) on delete restrict,
  adjustment_type text not null check (adjustment_type in ('opening_balance', 'debit_adjustment', 'credit_adjustment')),
  amount numeric(14,2) not null,
  remaining_amount numeric(14,2) not null default 0,
  reason text not null,
  reference_code text,
  source text default 'kiotviet_import',
  created_by text not null default 'system',
  created_at timestamptz not null default now()
);

create index if not exists receivable_adjustments_customer_idx
  on public.receivable_adjustments(customer_id, created_at desc);

-- Ràng buộc duy nhất cho đầu kỳ import từ KiotViet để đảm bảo IDEMPOTENT khi migration chạy lại
create unique index if not exists uq_receivable_adjustments_opening
  on public.receivable_adjustments(customer_id, adjustment_type, source)
  where adjustment_type = 'opening_balance';

-- 5. Bảng phiếu thu: customer_receipts
create table if not exists public.customer_receipts (
  id uuid primary key default gen_random_uuid(),
  receipt_number text not null unique,
  customer_id uuid not null references public.vip_accounts(id) on delete restrict,
  receipt_date date not null default current_date,
  amount numeric(14,2) not null check (amount > 0),
  payment_method text not null check (payment_method in ('bank_transfer', 'cash')),
  reference_code text,
  note text,
  unallocated_amount numeric(14,2) not null default 0 check (unallocated_amount >= 0),
  status text not null default 'posted' check (status in ('posted', 'reversed')),
  created_by text not null,
  created_at timestamptz not null default now(),
  reversed_by text,
  reversed_at timestamptz,
  reversal_reason text,
  original_receipt_id uuid references public.customer_receipts(id),
  idempotency_key text
);

create index if not exists customer_receipts_customer_idx
  on public.customer_receipts(customer_id, receipt_date desc, created_at desc);
create index if not exists customer_receipts_status_idx
  on public.customer_receipts(status);
create unique index if not exists uq_customer_receipts_idempotency
  on public.customer_receipts(idempotency_key)
  where idempotency_key is not null;

-- 6. Bảng phân bổ phiếu thu: receipt_allocations
create table if not exists public.receipt_allocations (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.customer_receipts(id) on delete cascade,
  order_id uuid references public.orders(id) on delete restrict,
  adjustment_id uuid references public.receivable_adjustments(id) on delete restrict,
  allocation_type text not null check (allocation_type in ('order', 'opening_debt')),
  amount numeric(14,2) not null check (amount > 0),
  created_at timestamptz not null default now()
);

create index if not exists receipt_allocations_receipt_idx
  on public.receipt_allocations(receipt_id);
create index if not exists receipt_allocations_order_idx
  on public.receipt_allocations(order_id);
create index if not exists receipt_allocations_adj_idx
  on public.receipt_allocations(adjustment_id);

-- 7. Import kiotviet_opening_debt thành bút toán đầu kỳ idempotent
insert into public.receivable_adjustments (
  adjustment_number,
  customer_id,
  adjustment_type,
  amount,
  remaining_amount,
  reason,
  reference_code,
  source,
  created_by
)
select
  'DK-' || lpad(row_number() over (order by id)::text, 6, '0'),
  id as customer_id,
  'opening_balance' as adjustment_type,
  kiotviet_opening_debt as amount,
  kiotviet_opening_debt as remaining_amount,
  'Số dư công nợ đầu kỳ KiotViet' as reason,
  kiotviet_code as reference_code,
  'kiotviet_import' as source,
  'migration_kiotviet' as created_by
from public.vip_accounts
where kiotviet_opening_debt is not null and kiotviet_opening_debt <> 0
on conflict (customer_id, adjustment_type, source) where adjustment_type = 'opening_balance' do nothing;

-- 8. Bảo mật RLS: Khóa toàn bộ ghi từ client, chỉ Server API service_role được truy cập
alter table public.customer_receipts enable row level security;
alter table public.receipt_allocations enable row level security;
alter table public.receivable_adjustments enable row level security;

revoke all on public.customer_receipts from anon, authenticated;
revoke all on public.receipt_allocations from anon, authenticated;
revoke all on public.receivable_adjustments from anon, authenticated;

grant select, insert, update on public.customer_receipts to service_role;
grant select, insert, update on public.receipt_allocations to service_role;
grant select, insert, update on public.receivable_adjustments to service_role;

grant usage, select on sequence public.customer_receipt_number_seq to service_role;
grant usage, select on sequence public.receivable_adjustment_number_seq to service_role;

-- 9. RPC nguyên tử: Tạo phiếu thu & phân bổ thanh toán
create or replace function public.record_customer_receipt(
  p_customer_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_reference_code text default null,
  p_note text default null,
  p_receipt_date date default current_date,
  p_allocations jsonb default '[]'::jsonb,
  p_created_by text default 'system',
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer public.vip_accounts%rowtype;
  v_receipt_id uuid;
  v_receipt_number text;
  v_alloc_item jsonb;
  v_alloc_type text;
  v_alloc_amount numeric(14,2);
  v_target_order_id uuid;
  v_target_adj_id uuid;
  v_order public.orders%rowtype;
  v_adj public.receivable_adjustments%rowtype;
  v_effective_debt numeric(14,2);
  v_total_allocated numeric(14,2) := 0;
  v_unallocated numeric(14,2) := 0;
  v_existing_receipt public.customer_receipts%rowtype;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Số tiền phiếu thu phải lớn hơn 0';
  end if;

  if p_payment_method not in ('bank_transfer', 'cash') then
    raise exception 'Phương thức thanh toán phải là chuyển khoản (bank_transfer) hoặc tiền mặt (cash)';
  end if;

  -- Chống trùng lặp theo idempotency_key nếu có (tránh client/network retry tạo 2 phiếu thu)
  if p_idempotency_key is not null and trim(p_idempotency_key) <> '' then
    -- Khóa mức giao dịch theo hash của idempotency_key (chống race condition giữa 2 request đồng thời)
    perform pg_advisory_xact_lock(hashtext(trim(p_idempotency_key)));

    select * into v_existing_receipt
    from public.customer_receipts
    where idempotency_key = trim(p_idempotency_key);

    if found then
      -- Kiểm tra xung đột payload cùng khóa idempotency
      if v_existing_receipt.customer_id <> p_customer_id or
         v_existing_receipt.amount <> p_amount or
         v_existing_receipt.payment_method <> p_payment_method then
        raise exception 'Xung đột Idempotency Key: Khóa % đã được sử dụng cho một phiếu thu khác với nội dung không khớp (khách hàng, số tiền hoặc phương thức thanh toán)', trim(p_idempotency_key);
      end if;

      return jsonb_build_object(
        'receiptId', v_existing_receipt.id,
        'receiptNumber', v_existing_receipt.receipt_number,
        'amount', v_existing_receipt.amount,
        'unallocatedAmount', v_existing_receipt.unallocated_amount,
        'status', v_existing_receipt.status,
        'idempotent', true
      );
    end if;
  end if;

  -- Khóa khách hàng chống tranh chấp
  select * into v_customer from public.vip_accounts where id = p_customer_id for update;
  if not found then
    raise exception 'Không tìm thấy khách hàng';
  end if;

  -- Kiểm tra tổng phân bổ không vượt quá số tiền thu
  if jsonb_typeof(p_allocations) = 'array' and jsonb_array_length(p_allocations) > 0 then
    for v_alloc_item in select value from jsonb_array_elements(p_allocations) loop
      v_alloc_amount := round((v_alloc_item->>'amount')::numeric, 2);
      if v_alloc_amount <= 0 then
        raise exception 'Số tiền phân bổ cho từng dòng phải lớn hơn 0';
      end if;
      v_total_allocated := v_total_allocated + v_alloc_amount;
    end loop;
  end if;

  if v_total_allocated > p_amount then
    raise exception 'Tổng tiền phân bổ (%) không được vượt quá số tiền phiếu thu (%)', v_total_allocated, p_amount;
  end if;

  v_unallocated := round(p_amount - v_total_allocated, 2);

  -- Sinh số phiếu thu: PT-YYYYMMDD-XXXX
  v_receipt_number := 'PT-' || to_char(coalesce(p_receipt_date, current_date), 'YYYYMMDD') || '-' ||
                      lpad(nextval('public.customer_receipt_number_seq')::text, 4, '0');

  -- Tạo phiếu thu
  insert into public.customer_receipts (
    receipt_number, customer_id, receipt_date, amount, payment_method,
    reference_code, note, unallocated_amount, status, created_by,
    idempotency_key
  )
  values (
    v_receipt_number, p_customer_id, coalesce(p_receipt_date, current_date), p_amount, p_payment_method,
    trim(p_reference_code), trim(p_note), v_unallocated, 'posted', p_created_by,
    nullif(trim(p_idempotency_key), '')
  )
  returning id into v_receipt_id;

  -- Thực hiện phân bổ từng dòng
  if jsonb_typeof(p_allocations) = 'array' and jsonb_array_length(p_allocations) > 0 then
    for v_alloc_item in select value from jsonb_array_elements(p_allocations) loop
      v_alloc_type := v_alloc_item->>'allocationType';
      v_alloc_amount := round((v_alloc_item->>'amount')::numeric, 2);

      if v_alloc_type = 'order' then
        v_target_order_id := (v_alloc_item->>'orderId')::uuid;
        -- Khóa hóa đơn chống tranh chấp đồng thời
        select * into v_order from public.orders where id = v_target_order_id for update;
        if not found then
          raise exception 'Không tìm thấy hóa đơn ID %', v_target_order_id;
        end if;
        if v_order.customer_id <> p_customer_id then
          raise exception 'Hóa đơn % không thuộc khách hàng này', v_order.order_code;
        end if;

        -- Nợ còn lại của hóa đơn = max(grand_total - paid_amount - return_credit_amount, 0)
        v_effective_debt := greatest(
          coalesce(v_order.grand_total, 0) - coalesce(v_order.paid_amount, 0) - coalesce(v_order.return_credit_amount, 0),
          0
        );

        if v_alloc_amount > v_effective_debt + 1 then -- cho phép sai số 1đ làm tròn
          raise exception 'Số tiền phân bổ (%) vượt quá nợ còn lại (%) của đơn %', v_alloc_amount, v_effective_debt, v_order.order_code;
        end if;

        -- Cập nhật paid_amount và payment_status của đơn (cơ chế duy nhất cập nhật paid_amount)
        update public.orders
        set
          paid_amount = paid_amount + v_alloc_amount,
          payment_status = case
            when (paid_amount + v_alloc_amount + coalesce(return_credit_amount, 0)) >= coalesce(grand_total, 0) and coalesce(grand_total, 0) > 0 then 'paid'
            else 'partially_paid'
          end,
          updated_at = now()
        where id = v_target_order_id;

        -- Ghi nhận lịch sử đơn hàng (không ghi order_payments để tránh kích hoạt trigger trg_apply_order_payment)
        insert into public.order_history (
          order_id, action, actor, note, payload
        )
        values (
          v_target_order_id,
          'receipt_collected',
          p_created_by,
          'Thu tiền theo phiếu ' || v_receipt_number || ': ' || to_char(v_alloc_amount, 'FM999,999,999,999') || 'đ',
          jsonb_build_object(
            'receiptId', v_receipt_id,
            'receiptNumber', v_receipt_number,
            'amount', v_alloc_amount,
            'paymentMethod', p_payment_method
          )
        );

        -- Ghi nhận phân bổ
        insert into public.receipt_allocations (
          receipt_id, order_id, allocation_type, amount
        )
        values (
          v_receipt_id, v_target_order_id, 'order', v_alloc_amount
        );

      elsif v_alloc_type = 'opening_debt' then
        v_target_adj_id := null;
        if (v_alloc_item->>'adjustmentId') is not null and (v_alloc_item->>'adjustmentId') <> '' then
          v_target_adj_id := (v_alloc_item->>'adjustmentId')::uuid;
        end if;

        if v_target_adj_id is not null then
          select * into v_adj from public.receivable_adjustments where id = v_target_adj_id for update;
        else
          select * into v_adj from public.receivable_adjustments
          where customer_id = p_customer_id and adjustment_type = 'opening_balance' and remaining_amount > 0
          order by created_at asc limit 1 for update;
        end if;

        if not found or v_adj.remaining_amount <= 0 then
          raise exception 'Khách hàng không còn nợ đầu kỳ để cấn trừ';
        end if;

        if v_alloc_amount > v_adj.remaining_amount + 1 then
          raise exception 'Số tiền cấn trừ (%) vượt quá nợ đầu kỳ còn lại (%)', v_alloc_amount, v_adj.remaining_amount;
        end if;

        update public.receivable_adjustments
        set remaining_amount = greatest(remaining_amount - v_alloc_amount, 0)
        where id = v_adj.id;

        insert into public.receipt_allocations (
          receipt_id, adjustment_id, allocation_type, amount
        )
        values (
          v_receipt_id, v_adj.id, 'opening_debt', v_alloc_amount
        );

      else
        raise exception 'Loại phân bổ không hợp lệ: %', v_alloc_type;
      end if;
    end loop;
  end if;

  return jsonb_build_object(
    'receiptId', v_receipt_id,
    'receiptNumber', v_receipt_number,
    'amount', p_amount,
    'totalAllocated', v_total_allocated,
    'unallocatedAmount', v_unallocated,
    'status', 'posted'
  );
end;
$$;

revoke all on function public.record_customer_receipt(uuid, numeric, text, text, text, date, jsonb, text, text) from public, anon, authenticated;
grant execute on function public.record_customer_receipt(uuid, numeric, text, text, text, date, jsonb, text, text) to service_role;

-- 10. RPC nguyên tử: Lập phiếu đảo (hoàn lại công nợ chính xác)
create or replace function public.reverse_customer_receipt(
  p_receipt_id uuid,
  p_reason text,
  p_actor text default 'system'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_receipt public.customer_receipts%rowtype;
  v_alloc public.receipt_allocations%rowtype;
  v_order public.orders%rowtype;
  v_adj public.receivable_adjustments%rowtype;
  v_reversal_number text;
  v_reversal_id uuid;
begin
  if p_reason is null or length(trim(p_reason)) < 3 then
    raise exception 'Bắt buộc phải nhập lý do lập phiếu đảo (tối thiểu 3 ký tự)';
  end if;

  select * into v_receipt from public.customer_receipts where id = p_receipt_id for update;
  if not found then
    raise exception 'Không tìm thấy phiếu thu cần đảo';
  end if;

  if v_receipt.status = 'reversed' then
    raise exception 'Phiếu thu này đã được đảo trước đó, không thể đảo lại';
  end if;

  if v_receipt.original_receipt_id is not null or v_receipt.receipt_number like 'PT-DAO-%' then
    raise exception 'Không thể đảo một chứng từ phiếu đảo';
  end if;

  -- Khóa khách hàng
  perform 1 from public.vip_accounts where id = v_receipt.customer_id for update;

  -- Duyệt qua tất cả các dòng phân bổ để khôi phục nợ
  for v_alloc in select * from public.receipt_allocations where receipt_id = p_receipt_id loop
    if v_alloc.allocation_type = 'order' and v_alloc.order_id is not null then
      select * into v_order from public.orders where id = v_alloc.order_id for update;
      if found then
        update public.orders
        set
          paid_amount = greatest(paid_amount - v_alloc.amount, 0),
          payment_status = case
            when greatest(paid_amount - v_alloc.amount, 0) <= 0 then 'pending'
            when (greatest(paid_amount - v_alloc.amount, 0) + coalesce(return_credit_amount, 0)) >= grand_total then 'paid'
            else 'partially_paid'
          end,
          updated_at = now()
        where id = v_alloc.order_id;

        -- Ghi nhận lịch sử đơn hàng đảo phiếu (không ghi số âm vào order_payments)
        insert into public.order_history (
          order_id, action, actor, note, payload
        )
        values (
          v_alloc.order_id,
          'receipt_reversed',
          p_actor,
          'Đảo phiếu thu ' || v_receipt.receipt_number || ' (-' || to_char(v_alloc.amount, 'FM999,999,999,999') || 'đ): ' || trim(p_reason),
          jsonb_build_object(
            'originalReceiptId', p_receipt_id,
            'originalReceiptNumber', v_receipt.receipt_number,
            'amount', v_alloc.amount,
            'reason', trim(p_reason)
          )
        );
      end if;

    elsif v_alloc.allocation_type = 'opening_debt' and v_alloc.adjustment_id is not null then
      select * into v_adj from public.receivable_adjustments where id = v_alloc.adjustment_id for update;
      if found then
        update public.receivable_adjustments
        set remaining_amount = remaining_amount + v_alloc.amount
        where id = v_alloc.adjustment_id;
      end if;
    end if;
  end loop;

  -- Cập nhật trạng thái phiếu thu gốc
  update public.customer_receipts
  set
    status = 'reversed',
    reversed_by = p_actor,
    reversed_at = now(),
    reversal_reason = trim(p_reason)
  where id = p_receipt_id;

  -- Tạo chứng từ đảo liên kết (bút toán đối ứng hợp lệ, số tiền dương)
  v_reversal_number := 'PT-DAO-' || v_receipt.receipt_number;

  insert into public.customer_receipts (
    receipt_number, customer_id, receipt_date, amount, payment_method,
    reference_code, note, unallocated_amount, status, created_by,
    original_receipt_id, reversal_reason
  )
  values (
    v_reversal_number, v_receipt.customer_id, current_date, v_receipt.amount, v_receipt.payment_method,
    v_receipt.reference_code, 'Đảo phiếu thu ' || v_receipt.receipt_number || ': ' || trim(p_reason),
    0, 'reversed', p_actor, p_receipt_id, trim(p_reason)
  )
  returning id into v_reversal_id;

  -- Tạo bút toán phân bổ đối ứng cho chứng từ đảo (bút toán đối ứng hợp lệ, số dương)
  insert into public.receipt_allocations (
    receipt_id, order_id, adjustment_id, allocation_type, amount
  )
  select
    v_reversal_id, order_id, adjustment_id, allocation_type, amount
  from public.receipt_allocations
  where receipt_id = p_receipt_id;

  return jsonb_build_object(
    'originalReceiptId', p_receipt_id,
    'reversalReceiptId', v_reversal_id,
    'reversalNumber', v_reversal_number,
    'status', 'reversed',
    'restoredAmount', v_receipt.amount
  );
end;
$$;

revoke all on function public.reverse_customer_receipt(uuid, text, text) from public, anon, authenticated;
grant execute on function public.reverse_customer_receipt(uuid, text, text) to service_role;

-- 11. RPC: Cập nhật ngày đến hạn hóa đơn
create or replace function public.update_invoice_due_date(
  p_order_id uuid,
  p_due_date timestamptz,
  p_actor text default 'system'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_old_due timestamptz;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Không tìm thấy hóa đơn';
  end if;

  v_old_due := v_order.due_date;

  update public.orders
  set
    due_date = p_due_date,
    updated_at = now()
  where id = p_order_id;

  insert into public.order_history(order_id, action, actor, note, payload)
  values (
    p_order_id, 'invoice_due_date_updated', p_actor,
    'Cập nhật hạn thanh toán sang ' || to_char(p_due_date, 'YYYY-MM-DD'),
    jsonb_build_object(
      'oldDueDate', v_old_due,
      'newDueDate', p_due_date
    )
  );

  return jsonb_build_object(
    'orderId', p_order_id,
    'oldDueDate', v_old_due,
    'newDueDate', p_due_date
  );
end;
$$;

revoke all on function public.update_invoice_due_date(uuid, timestamptz, text) from public, anon, authenticated;
grant execute on function public.update_invoice_due_date(uuid, timestamptz, text) to service_role;
