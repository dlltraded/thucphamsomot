-- Kiểm định read-only cho migration 20261001_orders_invoices_returns.sql.
-- Chạy sau migration trên Supabase SQL Editor. Script chỉ đọc metadata và
-- phát sinh lỗi nếu cấu trúc/quyền chưa đúng; không sửa dữ liệu nghiệp vụ.

do $$
declare
  v_missing text[];
begin
  select array_agg(required.column_name)
  into v_missing
  from (values
    ('orders', 'invoice_number'),
    ('orders', 'invoice_issued_at'),
    ('orders', 'return_credit_amount'),
    ('order_items', 'price_book_id'),
    ('order_items', 'price_book_version'),
    ('order_items', 'price_resolved_at'),
    ('sales_returns', 'receivable_reduction_amount'),
    ('sales_returns', 'customer_credit_amount')
  ) as required(table_name, column_name)
  where not exists (
    select 1 from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = required.table_name
      and c.column_name = required.column_name
  );

  if coalesce(array_length(v_missing, 1), 0) > 0 then
    raise exception 'Thiếu cột sau migration: %', array_to_string(v_missing, ', ');
  end if;

  if to_regclass('public.sales_returns') is null
     or to_regclass('public.sales_return_items') is null then
    raise exception 'Thiếu bảng sales_returns hoặc sales_return_items';
  end if;

  if to_regprocedure('public.complete_order_for_invoice(uuid,text)') is null then
    raise exception 'Thiếu RPC complete_order_for_invoice';
  end if;
  if to_regprocedure('public.create_sales_return(uuid,jsonb,text,text)') is null then
    raise exception 'Thiếu RPC create_sales_return';
  end if;

  if has_function_privilege('anon', 'public.complete_order_for_invoice(uuid,text)', 'execute')
     or has_function_privilege('authenticated', 'public.complete_order_for_invoice(uuid,text)', 'execute') then
    raise exception 'Client vẫn còn quyền phát hành hóa đơn';
  end if;
  if has_function_privilege('anon', 'public.create_sales_return(uuid,jsonb,text,text)', 'execute')
     or has_function_privilege('authenticated', 'public.create_sales_return(uuid,jsonb,text,text)', 'execute') then
    raise exception 'Client vẫn còn quyền trực tiếp tạo phiếu đổi/trả';
  end if;
  if not has_function_privilege('service_role', 'public.complete_order_for_invoice(uuid,text)', 'execute') then
    raise exception 'service_role chưa có quyền phát hành hóa đơn';
  end if;

  if has_table_privilege('anon', 'public.sales_returns', 'insert')
     or has_table_privilege('authenticated', 'public.sales_returns', 'insert') then
    raise exception 'Client vẫn còn quyền ghi phiếu đổi/trả';
  end if;

  raise notice 'PASS: cấu trúc hóa đơn/đổi trả và quyền service_role hợp lệ';
end
$$;

select
  (select count(*) from public.price_books where status = 'active') as active_price_books,
  (select count(*) from public.price_book_customer_assignments) as customer_assignments,
  (select count(*) from public.price_book_customer_group_assignments) as group_assignments,
  (select count(*) from public.orders where customer_price_source = 'kiotviet_import') as imported_kiot_orders;
