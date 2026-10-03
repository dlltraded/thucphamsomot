-- VAT theo đơn và từng dòng hàng.
-- Chỉ áp dụng 5% hoặc 8% theo nghiệp vụ TPS1 giai đoạn hiện tại.

alter table public.orders
  add column if not exists vat_enabled boolean not null default false,
  add column if not exists vat_amount numeric(14,2) not null default 0;

alter table public.order_items
  add column if not exists vat_rate numeric(4,2) not null default 5,
  add column if not exists vat_amount numeric(14,2) not null default 0;

alter table public.orders drop constraint if exists orders_vat_amount_check;
alter table public.orders add constraint orders_vat_amount_check
  check (vat_amount >= 0);

alter table public.order_items drop constraint if exists order_items_vat_rate_check;
alter table public.order_items add constraint order_items_vat_rate_check
  check (vat_rate in (5, 8));

alter table public.order_items drop constraint if exists order_items_vat_amount_check;
alter table public.order_items add constraint order_items_vat_amount_check
  check (vat_amount >= 0);

comment on column public.orders.vat_enabled is 'Bật khi đơn hàng có tính VAT';
comment on column public.orders.vat_amount is 'Tổng VAT của các dòng hàng tại thời điểm chốt';
comment on column public.order_items.vat_rate is 'Thuế suất VAT của dòng hàng: 5 hoặc 8 phần trăm';
comment on column public.order_items.vat_amount is 'Tiền VAT của dòng hàng tại thời điểm chốt';

