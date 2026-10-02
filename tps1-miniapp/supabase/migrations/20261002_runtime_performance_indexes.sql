-- Tối ưu các truy vấn nóng của POS và danh sách đơn hàng.
-- Chỉ thêm index; không đổi dữ liệu và có thể chạy lại an toàn.

create index if not exists order_history_processing_claimed_idx
  on public.order_history (order_id, created_at desc)
  where action = 'processing_claimed';

create index if not exists vip_accounts_sales_rep_active_idx
  on public.vip_accounts (sales_rep_id, id)
  where is_active = true;

create index if not exists orders_active_created_idx
  on public.orders (created_at desc)
  where status not in ('completed', 'merged');

create index if not exists orders_completed_created_idx
  on public.orders (created_at desc)
  where status = 'completed';

create index if not exists price_books_active_kind_version_idx
  on public.price_books (kind, version desc, created_at desc)
  where status = 'active';

create index if not exists price_book_customer_assignments_resolve_idx
  on public.price_book_customer_assignments (customer_id, priority desc, created_at desc);

analyze public.products;
analyze public.orders;
analyze public.order_history;
analyze public.price_books;
analyze public.price_book_items;
analyze public.price_book_customer_assignments;
