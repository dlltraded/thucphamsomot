-- SQL migration: Thiết lập bảng cấu hình và token Zalo OA
-- Chạy script này trên Supabase SQL Editor

create table if not exists public.zalo_config (
  id text primary key default 'tps1_oa',
  app_id text not null,
  secret_key text not null,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  refresh_expires_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Kích hoạt Row Level Security (RLS) để bảo vệ thông tin nhạy cảm
alter table public.zalo_config enable row level security;

-- Drop policy nếu đã tồn tại để tránh lỗi trùng lặp
drop policy if exists "Backend full access" on public.zalo_config;

-- Chỉ cho phép role service_role (backend/admin) thực hiện các thao tác CRUD
create policy "Backend full access" on public.zalo_config 
  for all to service_role using (true) with check (true);

-- Ghi chú cho tài liệu schema
comment on table public.zalo_config is 'Bảng lưu trữ thông tin cấu hình credentials và OAuth tokens cho Zalo OA API v4';
