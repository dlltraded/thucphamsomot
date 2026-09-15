-- TPS1 chỉ bán sỉ cho công ty/cửa hàng, không bán lẻ — bắt buộc có tên công
-- ty/cửa hàng ngay khi đăng ký tài khoản, không còn để "company" tùy chọn
-- như trước (yêu cầu 2026-09-11: "đối với khách mới chưa xác thực yêu cầu
-- nhập toàn bộ thông tin của công ty hoặc cửa hàng... + thông tin người
-- liên hệ và sdt"). Validate ở tầng DB (giống name/phone/password đã có sẵn
-- trong hàm này) để chặn cả các nơi gọi RPC trực tiếp, không chỉ chặn ở API.
create or replace function public.register_customer_account(
  p_name text,
  p_phone text,
  p_password text,
  p_company text default '',
  p_email text default '',
  p_source text default 'zalo_mini_app'
)
returns table(id uuid, code text, name text, phone text, tier text, verification_status text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_phone text;
  v_code text;
  v_customer public.vip_accounts%rowtype;
begin
  v_phone := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  if v_phone like '84%' and length(v_phone) = 11 then
    v_phone := '0' || substr(v_phone, 3);
  end if;
  if length(trim(p_name)) < 2 then
    raise exception 'Tên người liên hệ phải có ít nhất 2 ký tự';
  end if;
  if length(trim(coalesce(p_company, ''))) < 2 then
    raise exception 'Vui lòng nhập tên công ty / cửa hàng';
  end if;
  if length(v_phone) < 9 or length(v_phone) > 15 then
    raise exception 'Số điện thoại chưa hợp lệ';
  end if;
  if length(coalesce(p_password, '')) < 8 then
    raise exception 'Mật khẩu phải có ít nhất 8 ký tự';
  end if;
  if p_source not in ('zalo_mini_app', 'website') then
    raise exception 'Nguồn đăng ký không hợp lệ';
  end if;
  perform pg_advisory_xact_lock(hashtext(v_phone));
  if exists (
    select 1 from public.vip_accounts a
    where (
      case
        when regexp_replace(coalesce(a.phone, ''), '[^0-9]', '', 'g') like '84%'
          and length(regexp_replace(coalesce(a.phone, ''), '[^0-9]', '', 'g')) = 11
        then '0' || substr(regexp_replace(coalesce(a.phone, ''), '[^0-9]', '', 'g'), 3)
        else regexp_replace(coalesce(a.phone, ''), '[^0-9]', '', 'g')
      end
    ) = v_phone
  ) then
    raise exception 'Số điện thoại này đã có tài khoản';
  end if;

  loop
    v_code := 'TPS1-' || lpad(nextval('public.customer_partner_code_seq')::text, 6, '0');
    exit when not exists (select 1 from public.vip_accounts a where a.partner_code = v_code);
  end loop;

  insert into public.vip_accounts(
    partner_code, name, phone, company, email, discount_tier,
    password_hash, must_change_password, is_active,
    verification_status, registration_source, registered_at
  ) values (
    v_code, trim(p_name), v_phone, trim(p_company), nullif(lower(trim(p_email)), ''),
    'VIP0', crypt(p_password, gen_salt('bf')), false, true,
    'pending', p_source, now()
  ) returning * into v_customer;

  return query select
    v_customer.id, v_customer.partner_code, v_customer.name, v_customer.phone,
    v_customer.discount_tier, v_customer.verification_status;
end;
$$;
revoke all on function public.register_customer_account(text, text, text, text, text, text) from public;
grant execute on function public.register_customer_account(text, text, text, text, text, text) to service_role;
