-- Web Push cho order-webapp (khách hàng đặt hàng) — thông báo trạng thái đơn
-- (đã xác nhận/đang giao/hoàn thành) ngay trên điện thoại đã "Thêm vào màn
-- hình chính" (PWA), không cần mở app. Phía sale/admin đã có kênh Telegram
-- riêng (app/api/webhook/new-order) nên bảng này hiện chỉ phục vụ khách hàng,
-- nhưng để subject_type mở sẵn phòng khi cần thêm thông báo cho nhân viên.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in ('customer', 'staff')),
  customer_id uuid references public.vip_accounts(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_customer_id_idx on public.push_subscriptions(customer_id);

alter table public.push_subscriptions enable row level security;
-- Không có policy nào cho anon/authenticated — bảng này CHỈ được ghi/đọc qua
-- các route Next.js dùng service role (đăng ký lúc khách bật thông báo, gửi
-- lúc đổi trạng thái đơn). Không có lý do để client query trực tiếp.
revoke all on public.push_subscriptions from anon, authenticated;

-- RPC (security definer) để route /api/customer/push-subscribe gọi bằng
-- chính session khách hàng thay vì phải dùng service role cho một thao tác
-- đơn giản — nhất quán với các RPC customer_* khác trong hệ thống.
create or replace function public.customer_save_push_subscription(
  p_customer_id uuid,
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  insert into public.push_subscriptions (subject_type, customer_id, endpoint, p256dh, auth, user_agent)
  values ('customer', p_customer_id, p_endpoint, p_p256dh, p_auth, p_user_agent)
  on conflict (endpoint) do update
    set customer_id = excluded.customer_id,
        p256dh = excluded.p256dh,
        auth = excluded.auth,
        user_agent = excluded.user_agent;
end;
$$;
revoke all on function public.customer_save_push_subscription(uuid, text, text, text, text) from public;
grant execute on function public.customer_save_push_subscription(uuid, text, text, text, text) to anon, authenticated;

create or replace function public.customer_remove_push_subscription(p_endpoint text)
returns void
language sql
security definer
set search_path = public, extensions
as $$
  delete from public.push_subscriptions where endpoint = p_endpoint;
$$;
revoke all on function public.customer_remove_push_subscription(text) from public;
grant execute on function public.customer_remove_push_subscription(text) to anon, authenticated;
