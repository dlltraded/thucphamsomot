-- ============================================================================
-- Migration: Nhập khách hàng từ KiotViet & Sinh mã đối tác viết tắt
-- File: 20260920c_customer_kiotviet_import.sql
-- Áp dụng cho: WP2b (Phase 1)
-- ============================================================================

-- 1. Thêm các cột phục vụ import từ KiotViet vào bảng vip_accounts
ALTER TABLE public.vip_accounts
  ADD COLUMN IF NOT EXISTS kiotviet_code text,
  ADD COLUMN IF NOT EXISTS customer_group text,
  ADD COLUMN IF NOT EXISTS kiotviet_opening_debt numeric(14, 0),
  ADD COLUMN IF NOT EXISTS kiotviet_imported_at timestamptz;

-- Nới lỏng ràng buộc phone NOT NULL nếu có (236/269 khách KiotViet chưa có SĐT)
ALTER TABLE public.vip_accounts ALTER COLUMN phone DROP NOT NULL;

-- Index tìm kiếm nhanh và đảm bảo tính duy nhất của mã KiotViet (không phân biệt hoa thường)
CREATE UNIQUE INDEX IF NOT EXISTS vip_accounts_kiotviet_code_upper_idx
  ON public.vip_accounts (UPPER(TRIM(kiotviet_code)))
  WHERE kiotviet_code IS NOT NULL AND TRIM(kiotviet_code) <> '';

-- Index tìm kiếm theo nhóm khách hàng KiotViet
CREATE INDEX IF NOT EXISTS vip_accounts_customer_group_idx
  ON public.vip_accounts (customer_group)
  WHERE customer_group IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 2. Hàm SQL sinh mã đối tác viết tắt: TPS1-<VIẾTTẮT> (Dùng chung cho toàn hệ thống)
-- Quy tắc:
--   - Ưu tiên p_preferred (mã KiotViet): bỏ dấu, HOA, bỏ ký tự đặc biệt, tối đa 12 ký tự.
--   - Nếu không có, sinh từ p_name: loại tiền tố (CÔNG TY, TNHH, CP, MTV, HKD...),
--     bỏ dấu, HOA, ghép từ đầu tiên, tối đa 12 ký tự.
--   - Ghép tiền tố TPS1-, nếu trùng thêm số hậu tố (2, 3...) kiểm tra không phân biệt hoa thường.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_partner_code(
  p_name text,
  p_preferred text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_base text := '';
  v_candidate text := '';
  v_suffix int := 1;
  v_final text := '';
  v_clean text;
BEGIN
  -- Bước 1: Ưu tiên mã KiotViet (p_preferred)
  IF p_preferred IS NOT NULL AND length(trim(p_preferred)) > 0 THEN
    v_clean := translate(
      upper(trim(p_preferred)),
      'ÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬĐÉÈẺẼẸÊẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÚÙỦŨỤƯỨỪỬỮỰÝỲỶỸỴ',
      'AAAAAAAAAAAAAAAAADEEEEEEEEEEEIIIIIOOOOOOOOOOOOOOOOOUUUUUUUUUUUYYYYY'
    );
    v_base := regexp_replace(v_clean, '[^A-Z0-9]', '', 'g');
    IF length(v_base) > 12 THEN
      v_base := substr(v_base, 1, 12);
    END IF;
  END IF;

  -- Bước 2: Nếu chưa có base, sinh từ p_name
  IF v_base = '' AND p_name IS NOT NULL AND length(trim(p_name)) > 0 THEN
    v_clean := translate(
      upper(trim(p_name)),
      'ÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬĐÉÈẺẼẸÊẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÚÙỦŨỤƯỨỪỬỮỰÝỲỶỸỴ',
      'AAAAAAAAAAAAAAAAADEEEEEEEEEEEIIIIIOOOOOOOOOOOOOOOOOUUUUUUUUUUUYYYYY'
    );
    -- Loại bỏ các tiền tố doanh nghiệp / loại hình phổ biến
    v_clean := regexp_replace(
      v_clean,
      '\y(CONG TY|TNHH|CO PHAN|CP|MTV|HO KINH DOANH|HKD|DNTN|TRUONG|MAM NON|MAU GIAO|NHA HANG|QUAN|TIEM|CHI NHANH|CN|VPDD)\y',
      ' ',
      'g'
    );
    -- Bỏ ký tự không phải chữ số
    v_clean := regexp_replace(v_clean, '[^A-Z0-9 ]', ' ', 'g');
    v_clean := regexp_replace(v_clean, '\s+', '', 'g');
    
    IF length(v_clean) > 0 THEN
      v_base := substr(v_clean, 1, 12);
    ELSE
      -- Fallback 6 ký tự đầu của tên gốc
      v_clean := regexp_replace(
        translate(
          upper(trim(p_name)),
          'ÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬĐÉÈẺẼẸÊẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÚÙỦŨỤƯỨỪỬỮỰÝỲỶỸỴ',
          'AAAAAAAAAAAAAAAAADEEEEEEEEEEEIIIIIOOOOOOOOOOOOOOOOOUUUUUUUUUUUYYYYY'
        ),
        '[^A-Z0-9]',
        '',
        'g'
      );
      v_base := substr(v_clean, 1, 6);
    END IF;
  END IF;

  IF v_base = '' THEN
    v_base := 'KHACH';
  END IF;

  -- Bước 3: Ghép TPS1- và kiểm tra tính duy nhất (case-insensitive)
  v_candidate := 'TPS1-' || v_base;
  v_final := v_candidate;

  WHILE EXISTS (
    SELECT 1 FROM public.vip_accounts
    WHERE UPPER(partner_code) = UPPER(v_final)
  ) LOOP
    v_suffix := v_suffix + 1;
    v_final := v_candidate || v_suffix::text;
  END LOOP;

  RETURN v_final;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_partner_code(text, text) FROM public;
-- Chỉ service-role (API/script) được gọi: hàm SECURITY DEFINER đọc vip_accounts, không mở cho authenticated.
-- Lưu ý regex ở trên dùng \y (ranh giới từ của Postgres); \b trong Postgres là backspace.
GRANT EXECUTE ON FUNCTION public.generate_partner_code(text, text) TO service_role;
