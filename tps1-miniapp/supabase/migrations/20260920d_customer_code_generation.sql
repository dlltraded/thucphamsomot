-- ============================================================================
-- Migration: Nối bộ sinh mã đối tác TPS1-<VIẾTTẮT> vào các đường tạo khách
-- File: 20260920d_customer_code_generation.sql
-- Áp dụng cho: WP2b / G4 (Phase 1)
-- ============================================================================

-- Cập nhật register_customer_account (đường khách tự đăng ký qua Zalo Mini App / Web)
-- Thay thế việc sinh mã số thứ tự TPS1-000123 bằng hàm generate_partner_code()
CREATE OR REPLACE FUNCTION public.register_customer_account(
  p_name text,
  p_phone text,
  p_password text,
  p_company text DEFAULT '',
  p_email text DEFAULT '',
  p_source text DEFAULT 'zalo_mini_app'
)
RETURNS TABLE(id uuid, code text, name text, phone text, tier text, verification_status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_phone text;
  v_code text;
  v_customer public.vip_accounts%ROWTYPE;
BEGIN
  v_phone := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  IF v_phone LIKE '84%' AND length(v_phone) = 11 THEN
    v_phone := '0' || substr(v_phone, 3);
  END IF;
  IF length(trim(p_name)) < 2 THEN
    RAISE EXCEPTION 'Tên người liên hệ phải có ít nhất 2 ký tự';
  END IF;
  IF length(trim(coalesce(p_company, ''))) < 2 THEN
    RAISE EXCEPTION 'Vui lòng nhập tên công ty / cửa hàng';
  END IF;
  IF length(v_phone) < 9 OR length(v_phone) > 15 THEN
    RAISE EXCEPTION 'Số điện thoại chưa hợp lệ';
  END IF;
  IF length(coalesce(p_password, '')) < 8 THEN
    RAISE EXCEPTION 'Mật khẩu phải có ít nhất 8 ký tự';
  END IF;
  IF p_source NOT IN ('zalo_mini_app', 'website') THEN
    RAISE EXCEPTION 'Nguồn đăng ký không hợp lệ';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(v_phone));
  IF EXISTS (
    SELECT 1 FROM public.vip_accounts a
    WHERE (
      CASE
        WHEN regexp_replace(coalesce(a.phone, ''), '[^0-9]', '', 'g') LIKE '84%'
          AND length(regexp_replace(coalesce(a.phone, ''), '[^0-9]', '', 'g')) = 11
        THEN '0' || substr(regexp_replace(coalesce(a.phone, ''), '[^0-9]', '', 'g'), 3)
        ELSE regexp_replace(coalesce(a.phone, ''), '[^0-9]', '', 'g')
      END
    ) = v_phone
  ) THEN
    RAISE EXCEPTION 'Số điện thoại này đã có tài khoản';
  END IF;

  -- Sinh mã viết tắt dễ nhớ TPS1-<VIẾTTẮT> dùng chung theo WP2b (G4)
  v_code := public.generate_partner_code(coalesce(nullif(trim(p_company), ''), trim(p_name)));

  INSERT INTO public.vip_accounts(
    partner_code, name, phone, company, email, discount_tier,
    password_hash, must_change_password, is_active,
    verification_status, registration_source, registered_at
  ) VALUES (
    v_code, trim(p_name), v_phone, trim(p_company), nullif(lower(trim(p_email)), ''),
    'VIP0', crypt(p_password, gen_salt('bf')), false, true,
    'pending', p_source, now()
  ) RETURNING * INTO v_customer;

  RETURN QUERY SELECT
    v_customer.id, v_customer.partner_code, v_customer.name, v_customer.phone,
    v_customer.discount_tier, v_customer.verification_status;
END;
$$;

REVOKE ALL ON FUNCTION public.register_customer_account(text, text, text, text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.register_customer_account(text, text, text, text, text, text) TO service_role;
