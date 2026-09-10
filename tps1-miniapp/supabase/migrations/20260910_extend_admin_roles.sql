-- Giai đoạn A (đăng nhập & phân quyền hợp nhất): mở rộng admin_profiles.role
-- từ ('admin','sale') sang thêm 'truong_phong' (duyệt vượt hạn mức công nợ ở
-- Giai đoạn C) và 'thu_mua' (nhập tồn kho/giá ở Giai đoạn B).
-- An toàn để chạy lại nhiều lần: tự tìm đúng tên constraint check hiện có trên
-- cột role (không đoán tên cứng) rồi thay bằng constraint mới.

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
  check (role in ('admin', 'sale', 'truong_phong', 'thu_mua'));
