-- ============================================================================
-- SQL Test: Kiểm thử hàm public.generate_partner_code()
-- File: tps1-miniapp/supabase/tests/generate_partner_code.sql
-- Áp dụng cho: WP2b / G5 (Phase 1)
--
-- Hướng dẫn chạy:
--   Chạy script này trong Supabase Dashboard → SQL Editor sau khi đã chạy
--   migration 20260920c_customer_kiotviet_import.sql.
-- ============================================================================

-- Test 1: Loại bỏ tiền tố loại hình "Công ty TNHH", lấy từ có nghĩa
-- Kết quả mong đợi: 'TPS1-TANVAN'
SELECT public.generate_partner_code('Công ty TNHH Tân Vạn') AS test_1_result;

-- Test 2: Loại bỏ tiền tố "Trường Mầm non", lấy tên trường
-- Kết quả mong đợi: 'TPS1-HOASEN'
SELECT public.generate_partner_code('Trường Mầm non Hoa Sen') AS test_2_result;

-- Test 3: Ưu tiên mã KiotViet có ký tự tiếng Việt có dấu "ĐĐT" -> chuyển thành "DDT"
-- Kết quả mong đợi: 'TPS1-DDT'
SELECT public.generate_partner_code('Đoàn Đào Tạo', 'ĐĐT') AS test_3_result;

-- Test 4: Ưu tiên mã KiotViet có khoảng trắng "FGL U2" -> chuyển thành "FGLU2"
-- Kết quả mong đợi: 'TPS1-FGLU2'
SELECT public.generate_partner_code('FGL Unit 2', 'FGL U2') AS test_4_result;

-- Test 5: Ưu tiên mã KiotViet có dấu chấm "N.GỖ" -> chuyển thành "NGO"
-- Kết quả mong đợi: 'TPS1-NGO'
SELECT public.generate_partner_code('Nội thất Gỗ', 'N.GỖ') AS test_5_result;

-- Test 6: Mã KiotViet dài hơn 12 ký tự -> cắt tối đa 12 ký tự
-- Ví dụ: 'FORMOSAHATINH' -> cắt thành 'FORMOSAHATIN'
SELECT public.generate_partner_code('Công ty Formosa', 'FORMOSAHATINHVN') AS test_6_result;

-- Test 7: Kiểm tra xử lý trùng mã (nếu đã có TPS1-TANVAN thì sinh ra TPS1-TANVAN2)
-- Chú ý: Cần có bản ghi TPS1-TANVAN trong vip_accounts trước thì test này mới thấy suffix
SELECT public.generate_partner_code('Công ty Tân Vạn') AS test_7_suffix_check;
