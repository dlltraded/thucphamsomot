# BÁO CÁO ĐỢT 3A — WP4 (SQL + SCRIPT ẢNH) | Trạng thái: Chờ rà soát

1. **Đã làm:**
   - **Hoàn tất G7 & Mục 11:** Thêm `--ignore-existing` & lọc `is_active=false` vào `scripts/import-kiotviet-customers.mjs` (kết quả: `MATCH_PHONE = 0`, `CREATE = 269`); `assign-rep` kiểm tra `role in ('sale', 'truong_phong')`; `customers/list` thêm ghi chú `// TODO khi > 1000 khách`; ghi nhận thống nhất hàm công nợ vào `PHASE1_TIEN_DO.md`.
   - **Đợt 3A (WP4):** Viết migration `20260920b_product_search.sql` (extension `unaccent`/`pg_trgm`, `immutable_unaccent`, `search_text`/`search_text_plain`, trigger, GIN index, RPC `search_products` xếp hạng 6 bậc + fallback similarity > 0.3, `get_distinct_categories`); file test `tps1-miniapp/supabase/tests/search_products.sql` (15 từ khóa mẫu); script `scripts/backfill-product-images.mjs` (mặc định dry-run, lô 50, sharp webp 200x200 & 800px, idempotent).
   - **Chưa sửa UI / route:** Dừng lại đúng phạm vi 3A theo chỉ đạo.
2. **File đã tạo/sửa:**
   - Sửa: `scripts/import-kiotviet-customers.mjs`, `app/api/admin/customers/assign-rep/route.ts`, `app/api/admin/customers/list/route.ts`, `docs/PHASE1_TIEN_DO.md`.
   - Tạo mới: `tps1-miniapp/supabase/migrations/20260920b_product_search.sql`, `tps1-miniapp/supabase/tests/search_products.sql`, `scripts/backfill-product-images.mjs`.
3. **Bảng kiểm tra thực tế:**

| Đã kiểm tra được | Chưa kiểm tra được |
|---|---|
| • `tsc --noEmit` sạch 0 lỗi ở cả root và sale-webapp | • Chưa chạy migration SQL trên Supabase (chờ anh chạy) |
| • Dry-run import khách với `--ignore-existing=TPS1-100002` ra đúng 0 MATCH_PHONE | • Chưa gọi thử RPC `search_products` trên database thật |
| • Dry-run script ảnh đo được: 4.771 cần chuyển, 524 không ảnh, CDN KiotViet phản hồi tốt (~100ms) | • Chưa chạy `--apply` chuyển ảnh thật (chờ migration) |
| • Script ảnh tự động fallback an toàn khi cột `thumb_url` chưa có trên DB | • Chưa kiểm tra giao diện DatHangPage (thuộc Đợt 3B) |

4. **Bước tiếp theo:** Anh chạy migration `20260920b_product_search.sql` trên Supabase SQL Editor; Claude chạy file test `search_products.sql` với 15 từ khóa để duyệt kết quả trước khi làm Đợt 3B.
