-- Chuẩn hóa nhân sự theo 3 chiều độc lập:
--   department  = nhân viên thuộc phòng nào
--   position    = cấp bậc/chức vụ trong phòng
--   role        = nhóm nghiệp vụ đang thực hiện (giữ lại để tương thích code cũ)
-- Trưởng phòng có quyền cao nhất trong PHÒNG CỦA MÌNH, không mặc nhiên có
-- quyền phê duyệt nghiệp vụ của phòng khác.

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  function_group text not null check (function_group in ('operations', 'procurement', 'accounting')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.departments (code, name, function_group)
values
  ('VH1', 'Phòng Vận hành 1', 'operations'),
  ('VH2', 'Phòng Vận hành 2', 'operations'),
  ('TM',  'Phòng Thu mua',    'procurement'),
  ('KT',  'Phòng Kế toán',    'accounting')
on conflict (code) do update
set name = excluded.name,
    function_group = excluded.function_group,
    is_active = true,
    updated_at = now();

alter table public.admin_profiles
  add column if not exists department_id uuid references public.departments(id),
  add column if not exists position text not null default 'nhan_vien';

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
      and att.attname = 'position'
  loop
    execute format('alter table public.admin_profiles drop constraint %I', con.conname);
  end loop;
end $$;

alter table public.admin_profiles
  add constraint admin_profiles_position_check
  check (position in (
    'nhan_vien',
    'tro_ly',
    'truong_nhom',
    'truong_phong',
    'ban_giam_doc',
    'quan_tri_he_thong'
  ));

create index if not exists idx_admin_profiles_department
  on public.admin_profiles(department_id)
  where is_active = true;

-- Chỉ backfill các phòng có thể suy ra chắc chắn từ role hiện tại.
-- Sale/Vận hành và Tài xế phải được Admin chọn VH1 hoặc VH2 thủ công.
update public.admin_profiles ap
set department_id = d.id
from public.departments d
where ap.department_id is null
  and d.code = 'TM'
  and ap.role in ('thu_mua', 'kho');

update public.admin_profiles ap
set department_id = d.id
from public.departments d
where ap.department_id is null
  and d.code = 'KT'
  and ap.role = 'ke_toan';

update public.admin_profiles
set position = 'truong_phong'
where role = 'truong_phong'
  and position = 'nhan_vien';

alter table public.departments enable row level security;

drop policy if exists "authenticated_view_departments" on public.departments;
create policy "authenticated_view_departments"
  on public.departments for select
  to authenticated
  using (true);

drop policy if exists "admin_manage_departments" on public.departments;
create policy "admin_manage_departments"
  on public.departments for all
  to authenticated
  using (
    exists (
      select 1 from public.admin_profiles ap
      where ap.id = auth.uid() and ap.role = 'admin' and ap.is_active
    )
  )
  with check (
    exists (
      select 1 from public.admin_profiles ap
      where ap.id = auth.uid() and ap.role = 'admin' and ap.is_active
    )
  );

