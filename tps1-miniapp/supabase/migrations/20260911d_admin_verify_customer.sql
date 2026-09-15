-- Xác thực khách hàng thủ công — bổ sung cho luồng đã có sẵn (khách tự đăng
-- ký qua web/Mini App qua register_customer_account() luôn ở trạng thái
-- 'pending'; admin_finalize_order_v2 tự chuyển 'verified' khi nhân viên chốt
-- giá đơn đầu tiên). Yêu cầu 2026-09-11: cần thêm đường xác thực thủ công
-- ("phân loại khách hàng") KHÔNG qua đơn hàng — ví dụ gọi điện xác minh
-- trước khi khách kịp đặt đơn — để tránh khách đặt đơn ảo mà không có cách
-- nào đánh dấu đã xác thực ngoài việc chờ có đơn.
--
-- Không sửa admin_update_customer (đang chạy thật trong quanly, không có
-- migration định nghĩa lại đầy đủ) — tạo RPC riêng, an toàn hơn.
create or replace function public.admin_verify_customer(
  p_id uuid,
  p_status text,
  p_actor text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if p_status not in ('pending', 'verified', 'rejected') then
    raise exception 'Trạng thái xác thực không hợp lệ';
  end if;

  update public.vip_accounts
  set verification_status = p_status,
      verified_at = case when p_status = 'verified' then now() else verified_at end,
      verified_by = case when p_status = 'verified' then p_actor else verified_by end,
      verification_note = coalesce(nullif(trim(p_note), ''), verification_note),
      updated_at = now()
  where id = p_id;
end;
$$;
revoke all on function public.admin_verify_customer(uuid, text, text, text) from public;
grant execute on function public.admin_verify_customer(uuid, text, text, text) to authenticated;
