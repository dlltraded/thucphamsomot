-- ============================================================================
-- Migration: Đăng nhập khách hàng VIP + Chiết khấu theo nhóm (Zalo Mini App TPS1)
-- Xem kế hoạch đầy đủ: tps1-miniapp/docs/PLAN_VIP_LOGIN_CHIET_KHAU.md
--
-- Chạy file này 1 LẦN trong Supabase Dashboard → SQL Editor → Run.
-- An toàn để chạy lại nhiều lần (idempotent) nhờ IF NOT EXISTS / OR REPLACE.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. Mở rộng bảng vip_accounts: thêm mật khẩu + cờ bắt buộc đổi mật khẩu
-- ----------------------------------------------------------------------------
alter table vip_accounts add column if not exists password_hash text;
alter table vip_accounts add column if not exists must_change_password boolean not null default false;

-- Bảng cũ có CHECK constraint chỉ cho phép discount_tier IN ('A','B','C').
-- Gỡ constraint cũ (nếu có) trước khi đổi dữ liệu, rồi thay bằng constraint mới
-- cho phép VIP1/VIP2/VIP3.
alter table vip_accounts drop constraint if exists vip_accounts_discount_tier_check;

-- Chuẩn hóa dữ liệu cũ: hạng A/B/C -> VIP1/VIP2/VIP3
update vip_accounts set discount_tier = 'VIP1' where discount_tier = 'A';
update vip_accounts set discount_tier = 'VIP2' where discount_tier = 'B';
update vip_accounts set discount_tier = 'VIP3' where discount_tier = 'C';

alter table vip_accounts add constraint vip_accounts_discount_tier_check
  check (discount_tier in ('VIP1', 'VIP2', 'VIP3'));

-- ----------------------------------------------------------------------------
-- 2. Bảng cấu hình % chiết khấu theo nhóm (sale chỉnh trong Admin, không sửa code)
-- ----------------------------------------------------------------------------
create table if not exists customer_tiers (
  code text primary key,              -- 'VIP1' | 'VIP2' | 'VIP3'
  name text not null,
  discount_percent numeric not null default 0,
  updated_at timestamptz not null default now()
);

insert into customer_tiers (code, name, discount_percent) values
  ('VIP1', 'VIP1 - Khách thân thiết', 5),
  ('VIP2', 'VIP2 - Khách lớn', 10),
  ('VIP3', 'VIP3 - Đối tác chiến lược', 15)
on conflict (code) do nothing;

-- Cho phép đọc công khai (không nhạy cảm) — dùng để hiển thị % ngay sau đăng nhập
alter table customer_tiers enable row level security;
drop policy if exists customer_tiers_select_all on customer_tiers;
create policy customer_tiers_select_all on customer_tiers for select using (true);

-- ----------------------------------------------------------------------------
-- 3. Khóa truy cập trực tiếp vào vip_accounts qua anon key
--    Mọi thao tác (đăng nhập, tạo mã, đổi/reset mật khẩu, liệt kê) đi qua RPC
--    bên dưới (SECURITY DEFINER) — không policy nào cho phép anon SELECT/INSERT/
--    UPDATE trực tiếp, tránh lộ password_hash hoặc toàn bộ danh sách khách hàng.
-- ----------------------------------------------------------------------------
alter table vip_accounts enable row level security;

-- Gỡ bỏ MỌI policy cũ có thể đang tồn tại trên bảng này (vd. policy đọc công khai
-- được tạo sẵn từ khi khởi tạo bảng qua Supabase UI) — chỉ bật RLS thôi KHÔNG đủ,
-- vì 1 policy cho phép SELECT vẫn override việc "mặc định deny" của RLS.
do $$
declare
  pol record;
begin
  for pol in select policyname from pg_policies where schemaname = 'public' and tablename = 'vip_accounts' loop
    execute format('drop policy if exists %I on public.vip_accounts', pol.policyname);
  end loop;
end $$;
-- Không tạo lại policy nào cho anon => mặc định deny hết với anon/authenticated.

-- ----------------------------------------------------------------------------
-- 4. Hàm sinh mật khẩu tạm: 8 ký tự chữ+số, loại ký tự dễ nhầm (0 O I l 1)
-- ----------------------------------------------------------------------------
create or replace function generate_temp_password()
returns text
language plpgsql
as $$
declare
  v_chars text := 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  v_pass text := '';
  i int;
begin
  for i in 1..8 loop
    v_pass := v_pass || substr(v_chars, (floor(random() * length(v_chars)) + 1)::int, 1);
  end loop;
  return v_pass;
end;
$$;

-- ----------------------------------------------------------------------------
-- 5. RPC: khách đăng nhập bằng Mã khách hàng + Mật khẩu
-- ----------------------------------------------------------------------------
create or replace function verify_customer_login(p_code text, p_password text)
returns table(
  id uuid, code text, name text, phone text, company text,
  tier text, discount_percent numeric, must_change_password boolean
)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  return query
    select a.id, a.partner_code, a.name, a.phone, a.company, a.discount_tier,
           coalesce(t.discount_percent, 0), a.must_change_password
    from vip_accounts a
    left join customer_tiers t on t.code = a.discount_tier
    where a.partner_code = upper(trim(p_code))
      and a.is_active = true
      and a.password_hash is not null
      and a.password_hash = crypt(p_password, a.password_hash);
end;
$$;
revoke all on function verify_customer_login(text, text) from public;
grant execute on function verify_customer_login(text, text) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 6. RPC: khách tự đổi mật khẩu (bắt buộc ở lần đăng nhập đầu, hoặc chủ động sau này)
-- ----------------------------------------------------------------------------
create or replace function customer_change_password(p_code text, p_old_password text, p_new_password text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_match boolean;
begin
  if length(p_new_password) < 6 then
    raise exception 'Mật khẩu mới phải từ 6 ký tự trở lên';
  end if;

  select (password_hash = crypt(p_old_password, password_hash)) into v_match
  from vip_accounts
  where partner_code = upper(trim(p_code)) and is_active = true;

  if v_match is not true then
    raise exception 'Mật khẩu hiện tại không đúng';
  end if;

  update vip_accounts
  set password_hash = crypt(p_new_password, gen_salt('bf')),
      must_change_password = false
  where partner_code = upper(trim(p_code));

  return true;
end;
$$;
revoke all on function customer_change_password(text, text, text) from public;
grant execute on function customer_change_password(text, text, text) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 7. RPC (Admin): tạo tài khoản khách hàng mới — trả mật khẩu tạm DUY NHẤT 1 LẦN
-- ----------------------------------------------------------------------------
create or replace function admin_create_customer(
  p_name text, p_phone text, p_company text, p_tier text
)
returns table(partner_code text, temp_password text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_code text;
  v_pass text;
begin
  v_code := 'TPS1-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 4));
  v_pass := generate_temp_password();

  insert into vip_accounts (partner_code, name, phone, company, discount_tier, password_hash, must_change_password, is_active)
  values (v_code, p_name, p_phone, p_company, p_tier, crypt(v_pass, gen_salt('bf')), true, true);

  return query select v_code, v_pass;
end;
$$;
revoke all on function admin_create_customer(text, text, text, text) from public;
grant execute on function admin_create_customer(text, text, text, text) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 8. RPC (Admin): reset mật khẩu khách hàng — trả mật khẩu tạm mới DUY NHẤT 1 LẦN
-- ----------------------------------------------------------------------------
create or replace function admin_reset_customer_password(p_code text)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_pass text;
begin
  v_pass := generate_temp_password();

  update vip_accounts
  set password_hash = crypt(v_pass, gen_salt('bf')),
      must_change_password = true
  where partner_code = upper(trim(p_code));

  if not found then
    raise exception 'Không tìm thấy mã khách hàng %', p_code;
  end if;

  return v_pass;
end;
$$;
revoke all on function admin_reset_customer_password(text) from public;
grant execute on function admin_reset_customer_password(text) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 9. RPC (Admin): liệt kê / cập nhật thông tin khách hàng (không lộ password_hash)
-- ----------------------------------------------------------------------------
create or replace function admin_list_customers()
returns table(
  id uuid, partner_code text, name text, phone text, company text,
  discount_tier text, credit_limit numeric, notes text,
  is_active boolean, must_change_password boolean, created_at timestamptz
)
language sql
security definer
set search_path = public, extensions
as $$
  select id, partner_code, name, phone, company, discount_tier, credit_limit, notes,
         is_active, must_change_password, created_at
  from vip_accounts
  order by created_at desc;
$$;
revoke all on function admin_list_customers() from public;
grant execute on function admin_list_customers() to anon, authenticated;

create or replace function admin_update_customer(
  p_id uuid, p_name text, p_phone text, p_company text,
  p_tier text, p_credit_limit numeric, p_notes text
)
returns void
language sql
security definer
set search_path = public, extensions
as $$
  update vip_accounts
  set name = p_name, phone = p_phone, company = p_company,
      discount_tier = p_tier, credit_limit = p_credit_limit, notes = p_notes,
      updated_at = now()
  where id = p_id;
$$;
revoke all on function admin_update_customer(uuid, text, text, text, text, numeric, text) from public;
grant execute on function admin_update_customer(uuid, text, text, text, text, numeric, text) to anon, authenticated;

create or replace function admin_toggle_customer_active(p_id uuid, p_is_active boolean)
returns void
language sql
security definer
set search_path = public, extensions
as $$
  update vip_accounts set is_active = p_is_active, updated_at = now() where id = p_id;
$$;
revoke all on function admin_toggle_customer_active(uuid, boolean) from public;
grant execute on function admin_toggle_customer_active(uuid, boolean) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 10. RPC (Admin): chỉnh % chiết khấu theo nhóm
-- ----------------------------------------------------------------------------
create or replace function admin_update_tier_discount(p_code text, p_discount_percent numeric)
returns void
language sql
security definer
set search_path = public, extensions
as $$
  update customer_tiers
  set discount_percent = p_discount_percent, updated_at = now()
  where code = p_code;
$$;
revoke all on function admin_update_tier_discount(text, numeric) from public;
grant execute on function admin_update_tier_discount(text, numeric) to anon, authenticated;

-- ============================================================================
-- HẾT MIGRATION
-- ============================================================================
