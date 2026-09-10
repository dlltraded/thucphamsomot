-- Giai đoạn C — tách 3 phần thanh toán (trả ngay/COD/công nợ) cho 1 đơn
-- (KE_HOACH_HE_THONG_BAN_HANG_KIOTVIET.md mục 13.2/13.5).

create table if not exists public.order_payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  method text not null check (method in ('cash', 'transfer', 'cod', 'debt_collection')),
  amount numeric(14,2) not null check (amount > 0),
  note text,
  created_by uuid references public.admin_profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists order_payments_order_idx on public.order_payments(order_id);
alter table public.order_payments enable row level security;
-- Không tạo policy cho anon/authenticated -> mặc định từ chối hết, chỉ
-- service_role (API phía server) đọc/ghi được — cùng mẫu với
-- inventory_transactions/product_tier_prices ở Giai đoạn B.

alter table public.orders add column if not exists paid_amount numeric(14,2) not null default 0;
alter table public.orders add column if not exists debt_amount numeric(14,2)
  generated always as (greatest(coalesce(grand_total, 0) - paid_amount, 0)) stored;
comment on column public.orders.paid_amount is 'Tổng đã thu cho đơn này, cộng dồn tự động từ order_payments qua trigger — không sửa tay.';
comment on column public.orders.debt_amount is 'Công nợ còn lại của đơn = grand_total - paid_amount, tính tự động.';

create or replace function public.apply_order_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.orders
  set paid_amount = paid_amount + new.amount,
      payment_status = case
        when (paid_amount + new.amount) >= coalesce(grand_total, 0) and coalesce(grand_total, 0) > 0 then 'paid'
        else payment_status
      end
  where id = new.order_id;
  return new;
end;
$$;

drop trigger if exists trg_apply_order_payment on public.order_payments;
create trigger trg_apply_order_payment
  after insert on public.order_payments
  for each row execute function public.apply_order_payment();
