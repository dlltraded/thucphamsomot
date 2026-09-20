-- ============================================================================
-- 20260920h — Nhật ký đăng nhập sai để giới hạn số lần thử (chống dò mật khẩu)
-- Mã khách hàng giờ là dạng viết tắt dễ đoán (TPS1-TANVAN) nên phải có giới hạn.
-- Additive: 1 bảng. RLS bật, KHÔNG policy => chỉ service-role (API server) truy cập.
-- ============================================================================
create table if not exists public.auth_attempts (
  id bigint generated always as identity primary key,
  key text not null,              -- 'id:<mã/email chuẩn hóa>' hoặc 'ip:<địa chỉ IP>'
  at timestamptz not null default now()
);
alter table public.auth_attempts enable row level security;
create index if not exists auth_attempts_key_at_idx on public.auth_attempts (key, at desc);
