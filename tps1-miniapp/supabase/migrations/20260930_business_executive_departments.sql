-- Bổ sung đầy đủ cơ cấu tổ chức TPS1.
-- Phòng ban, chức vụ và vai trò nghiệp vụ là ba khái niệm độc lập:
--   * department: đơn vị tổ chức nhân viên trực thuộc
--   * position: cấp bậc/chức vụ
--   * role: nhóm quyền nghiệp vụ trong hệ thống
--
-- Migration an toàn, có thể chạy lại nhiều lần và không thay đổi nhân sự cũ.

do $$
declare
  con record;
begin
  for con in
    select c.conname
    from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_attribute att on att.attrelid = rel.oid and att.attnum = any(c.conkey)
    where rel.relname = 'departments'
      and c.contype = 'c'
      and att.attname = 'function_group'
  loop
    execute format('alter table public.departments drop constraint %I', con.conname);
  end loop;
end $$;

alter table public.departments
  add constraint departments_function_group_check
  check (function_group in (
    'executive',
    'business_marketing',
    'operations',
    'procurement',
    'accounting'
  ));

insert into public.departments (code, name, function_group)
values
  ('BGD',   'Ban Giám đốc',                  'executive'),
  ('KDMKT', 'Phòng Kinh doanh & Marketing', 'business_marketing')
on conflict (code) do update
set name = excluded.name,
    function_group = excluded.function_group,
    is_active = true,
    updated_at = now();

-- Chuẩn hóa các tên có thể đã được nhập thủ công trước migration này.
update public.departments
set name = 'Ban Giám đốc',
    function_group = 'executive',
    is_active = true,
    updated_at = now()
where code = 'BGD';

update public.departments
set name = 'Phòng Kinh doanh & Marketing',
    function_group = 'business_marketing',
    is_active = true,
    updated_at = now()
where code = 'KDMKT';

-- Ban Giám đốc có nhóm quyền nghiệp vụ riêng, không dùng chung role `admin`
-- của tài khoản quản trị kỹ thuật.
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
    'ban_giam_doc',
    'truong_phong',
    'sale',
    'thu_mua',
    'kho',
    'ke_toan',
    'tai_xe'
  ));

