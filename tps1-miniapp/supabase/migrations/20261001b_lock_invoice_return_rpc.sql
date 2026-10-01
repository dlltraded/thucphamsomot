-- Hotfix bảo mật sau migration hóa đơn/đổi-trả.
-- PostgreSQL có thể còn quyền EXECUTE được cấp trực tiếp cho các role API;
-- thu hồi rõ ràng thay vì chỉ dựa vào REVOKE FROM PUBLIC.

revoke all on function public.complete_order_for_invoice(uuid, text)
  from public, anon, authenticated;
revoke all on function public.create_sales_return(uuid, jsonb, text, text)
  from public, anon, authenticated;

grant execute on function public.complete_order_for_invoice(uuid, text)
  to service_role;
grant execute on function public.create_sales_return(uuid, jsonb, text, text)
  to service_role;

