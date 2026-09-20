-- Migration: mở rộng check constraint của admin_profiles.role
-- để cho phép 3 vai trò mới: kho, ke_toan, tai_xe (yêu cầu 2026-09-20).
-- Dùng cùng kỹ thuật tìm tên constraint động như 20260910_extend_admin_roles.sql
-- để chạy idempotent, không đoán tên cứng.
--
-- CHƯA CHẠY TRÊN SUPABASE — cần anh chạy sau khi Claude rà soát.

do $$
declare
  con record;
begin
  for con in
    select c.conname
    from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_attribute att on att.attrelid = rel.oid and att.attnum = any(c.conkey)
    where rel.relname = 'admin_profiles'
      and c.contype = 'c'
      and att.attname = 'role'
  loop
    execute format('alter table public.admin_profiles drop constraint %I', con.conname);
  end loop;
end $$;

alter table public.admin_profiles
  add constraint admin_profiles_role_check
  check (role in (
    'admin',
    'truong_phong',
    'sale',
    'thu_mua',
    'kho',      -- Kho / Soạn hàng (mới — Phase 1)
    'ke_toan',  -- Kế toán (mới — Phase 1)
    'tai_xe'    -- Tài xế — đặt trước cho Phase 2, chưa cấp cho ai
  ));
