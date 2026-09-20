-- ============================================================================
-- SQL Test: Kiểm thử hàm public.search_products() với 15 từ khóa mẫu
-- File: tps1-miniapp/supabase/tests/search_products.sql
-- Áp dụng cho: WP4 / Đợt 3A (Phase 1)
--
-- Hướng dẫn chạy:
--   Chạy script này trong Supabase Dashboard → SQL Editor sau khi đã chạy
--   migration 20260920b_product_search.sql.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Test 1: Từ khóa có dấu "bò"
-- Kỳ vọng:
--   - Khớp từ nguyên "bò" hoặc bắt đầu bằng "bò" trong search_text.
--   - Top kết quả: Bò tươi, Thịt bò, Nạm bò, Bắp bò, Thăn bò...
--   - TUYỆT ĐỐI KHÔNG kéo "bột" (bột mì, bột ngọt), "bơ" (bơ lạt, bơ sáp), "bờ" lên đầu.
-- ----------------------------------------------------------------------------
SELECT id, sku, name, category, (thumb_url IS NOT NULL) AS has_thumb, total
FROM public.search_products('bò', NULL, 5, 0);

-- ----------------------------------------------------------------------------
-- Test 2: Từ khóa có dấu nhiều từ "thịt bò"
-- Kỳ vọng:
--   - Cả 2 từ "thịt" và "bò" đều phải xuất hiện trong sản phẩm.
--   - Top kết quả: Thịt bò bắp, Thịt bò Úc, Thịt bò xay, Thịt thăn bò...
--   - Không lẫn thịt heo, thịt gà hay các loại hạt/bột bò.
-- ----------------------------------------------------------------------------
SELECT id, sku, name, category, (thumb_url IS NOT NULL) AS has_thumb, total
FROM public.search_products('thịt bò', NULL, 5, 0);

-- ----------------------------------------------------------------------------
-- Test 3: Từ khóa không dấu "thit bo"
-- Kỳ vọng:
--   - Tự động tìm trên search_text_plain với cả 2 từ "thit" và "bo".
--   - Top kết quả tương tự như gõ có dấu "thịt bò" (Thịt bò các loại).
-- ----------------------------------------------------------------------------
SELECT id, sku, name, category, (thumb_url IS NOT NULL) AS has_thumb, total
FROM public.search_products('thit bo', NULL, 5, 0);

-- ----------------------------------------------------------------------------
-- Test 4: Từ khóa có dấu "ba chỉ"
-- Kỳ vọng:
--   - Khớp cả 2 từ "ba" và "chỉ".
--   - Top kết quả: Ba chỉ heo, Ba chỉ bò, Ba chỉ rút sườn, Thịt ba chỉ...
-- ----------------------------------------------------------------------------
SELECT id, sku, name, category, (thumb_url IS NOT NULL) AS has_thumb, total
FROM public.search_products('ba chỉ', NULL, 5, 0);

-- ----------------------------------------------------------------------------
-- Test 5: Từ khóa có dấu "rau muống"
-- Kỳ vọng:
--   - Khớp các loại rau muống.
--   - Top kết quả: Rau muống nước, Rau muống hạt, Đọt rau muống...
-- ----------------------------------------------------------------------------
SELECT id, sku, name, category, (thumb_url IS NOT NULL) AS has_thumb, total
FROM public.search_products('rau muống', NULL, 5, 0);

-- ----------------------------------------------------------------------------
-- Test 6: Từ khóa có dấu "hành"
-- Kỳ vọng:
--   - Khớp từ nguyên "hành" (Hành lá, Hành tím, Hành tây, Hành khô...).
--   - Xếp hạng ưu tiên sản phẩm có tên bắt đầu bằng "Hành" hoặc chứa từ nguyên "Hành".
-- ----------------------------------------------------------------------------
SELECT id, sku, name, category, (thumb_url IS NOT NULL) AS has_thumb, total
FROM public.search_products('hành', NULL, 5, 0);

-- ----------------------------------------------------------------------------
-- Test 7: Từ khóa có dấu "tôm"
-- Kỳ vọng:
--   - Khớp các mặt hàng tôm thủy hải sản.
--   - Top kết quả: Tôm sú, Tôm thẻ, Tôm đất, Tôm khô, Tôm tít...
-- ----------------------------------------------------------------------------
SELECT id, sku, name, category, (thumb_url IS NOT NULL) AS has_thumb, total
FROM public.search_products('tôm', NULL, 5, 0);

-- ----------------------------------------------------------------------------
-- Test 8: Từ khóa có dấu "cá basa"
-- Kỳ vọng:
--   - Khớp cả 2 từ "cá" và "basa".
--   - Top kết quả: Cá basa phi lê, Cá basa cắt khúc, Cá basa nguyên con...
-- ----------------------------------------------------------------------------
SELECT id, sku, name, category, (thumb_url IS NOT NULL) AS has_thumb, total
FROM public.search_products('cá basa', NULL, 5, 0);

-- ----------------------------------------------------------------------------
-- Test 9: Từ khóa có dấu "gà"
-- Kỳ vọng:
--   - Khớp từ nguyên "gà" (Gà ta, Cánh gà, Đùi gà, Gà công nghiệp...).
-- ----------------------------------------------------------------------------
SELECT id, sku, name, category, (thumb_url IS NOT NULL) AS has_thumb, total
FROM public.search_products('gà', NULL, 5, 0);

-- ----------------------------------------------------------------------------
-- Test 10: Từ khóa có dấu "trứng"
-- Kỳ vọng:
--   - Khớp các sản phẩm trứng.
--   - Top kết quả: Trứng gà, Trứng vịt, Trứng cút, Lòng đỏ trứng...
-- ----------------------------------------------------------------------------
SELECT id, sku, name, category, (thumb_url IS NOT NULL) AS has_thumb, total
FROM public.search_products('trứng', NULL, 5, 0);

-- ----------------------------------------------------------------------------
-- Test 11: Từ khóa có dấu "nước mắm"
-- Kỳ vọng:
--   - Khớp cả 2 từ "nước" và "mắm".
--   - Top kết quả: Nước mắm Nam Ngư, Nước mắm cá cơm, Nước mắm Phan Thiết...
-- ----------------------------------------------------------------------------
SELECT id, sku, name, category, (thumb_url IS NOT NULL) AS has_thumb, total
FROM public.search_products('nước mắm', NULL, 5, 0);

-- ----------------------------------------------------------------------------
-- Test 12: Từ khóa KHÔNG DẤU "bo"
-- Kỳ vọng:
--   - Khớp trên search_text_plain.
--   - Xếp hạng: Sản phẩm chứa từ nguyên "bo" (như Thịt bò, Bắp bò, Bơ...)
--     được ưu tiên lên đầu hơn các từ chỉ chứa tiền tố "bot" (bột mì).
-- ----------------------------------------------------------------------------
SELECT id, sku, name, category, (thumb_url IS NOT NULL) AS has_thumb, total
FROM public.search_products('bo', NULL, 5, 0);

-- ----------------------------------------------------------------------------
-- Test 13: Từ khóa KHÔNG DẤU "ga"
-- Kỳ vọng:
--   - Khớp trên search_text_plain.
--   - Top kết quả: Thịt gà, Cánh gà, Gà ta...
-- ----------------------------------------------------------------------------
SELECT id, sku, name, category, (thumb_url IS NOT NULL) AS has_thumb, total
FROM public.search_products('ga', NULL, 5, 0);

-- ----------------------------------------------------------------------------
-- Test 14: Từ khóa KHÔNG DẤU "ca basa"
-- Kỳ vọng:
--   - Khớp trên search_text_plain cả "ca" và "basa".
--   - Top kết quả: Cá basa phi lê, Cá basa cắt khúc...
-- ----------------------------------------------------------------------------
SELECT id, sku, name, category, (thumb_url IS NOT NULL) AS has_thumb, total
FROM public.search_products('ca basa', NULL, 5, 0);

-- ----------------------------------------------------------------------------
-- Test 15: Từ khóa KHÔNG DẤU "rau muong"
-- Kỳ vọng:
--   - Khớp trên search_text_plain cả "rau" và "muong".
--   - Top kết quả: Rau muống nước, Rau muống hạt...
-- ----------------------------------------------------------------------------
SELECT id, sku, name, category, (thumb_url IS NOT NULL) AS has_thumb, total
FROM public.search_products('rau muong', NULL, 5, 0);

-- ----------------------------------------------------------------------------
-- Test bổ sung: Thử tìm danh mục với public.get_distinct_categories()
-- Kỳ vọng:
--   - Trả về danh sách danh mục (category) kèm product_count theo thứ tự A-Z.
-- ----------------------------------------------------------------------------
SELECT category, product_count
FROM public.get_distinct_categories()
LIMIT 10;
