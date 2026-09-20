# PHASE 1 — Tiến độ triển khai

> **Đọc file này đầu mỗi phiên** để biết đang làm tới đâu.
> Cập nhật mỗi khi hoàn thành một mục.

## Trạng thái tổng quan

| Đợt | Gói việc | Trạng thái | Ghi chú |
|-----|----------|------------|---------|
| 1 | WP0 (phân quyền) + WP1 (migration) | **đã duyệt (có sửa)** | Claude đã sửa trực tiếp ngày 2026-09-20 |
| 2 | WP2 (API) | **đã sửa F1–F7** | Hoàn thành sửa F1–F7 theo yêu cầu mục 9 |
| 2b | WP2b (sinh mã, nhập khách KiotViet dry-run) | **đã duyệt (hoàn tất G7)** | Claude duyệt G1–G6; hoàn tất G7 + mục 3 (2026-09-20) |
| 3A | WP4 (tìm kiếm + ảnh: SQL + script) | **đã duyệt (3A)** | Claude duyệt & tinh chỉnh regex, bucket; test 17 từ khóa ~165ms |
| **P2** | **POS là đường nhập đơn chính (Pilot 10 đơn)** | **đã duyệt có sửa** | Claude duyệt & bổ sung cutoff, idempotencyKey; Gemini đã sửa PosCreatePage |
| **P3** | **WP4-3B (UI tìm kiếm + thumbnail lazy-load)** | **hoàn thành — chờ rà soát** | Component ProductSearchBox (64px, debounce, highlight), tích hợp POS & DatHangPage |
| **P4** | **WP5 (Đơn tổng, Cần xử lý, Zalo alert)** | **hoàn thành — chờ rà soát** | DonTongPage (/don-tong), Excel export, triage bulk-confirm, Zalo alert, lọc ngày SoanHangPage |
| **P7** | **WP3 (Khách đặt webapp & Excel)** | **hoàn thành — đã kiểm tra** | DatHangPage, DatHangExcelPage, MyOrdersPage |
| **P8** | **WP6 (Truy vết điều chỉnh & Có yêu cầu)** | **hoàn thành — đã kiểm tra** | OrdersPage, PosCreatePage, track-adjustment API |
| **P9** | **WP7 (Khách đặt Mini App)** | **hoàn thành — đã kiểm tra** | Checkout cấu hình ngày/địa chỉ, cutoff banner, ghi chú dòng, số lượng thập phân, đổi/hủy đơn |
| — | WP9 (API KiotViet) | **chưa làm** — chờ anh cấp khóa | |

> **⚠️ Thứ tự đưa lên hệ thống (BẮT BUỘC):**
> Chạy migration TRƯỚC (`20260920a_staff_roles.sql`, `20260920_phase1_order_intake.sql`, `20260920c_customer_kiotviet_import.sql`, `20260920d_customer_code_generation.sql`, `20260920f_orders_external_ref.sql`), deploy code SAU. Nếu deploy code trước sẽ hỏng vì thiếu cột mới.

---

## Đợt 1 — WP0 + WP1

### WP0 — Phân quyền vai trò

- [x] `lib/permissions.ts` (server) — nguồn sự thật cho tất cả quyền
- [x] `sale-webapp/src/lib/permissions.ts` (client) — đồng bộ với server
- [x] `sale-webapp/src/layouts/SaleLayout.tsx` — lọc menu theo quyền
- [x] `sale-webapp/src/App.tsx` — route guard `StaffOnlyRoute` nhận `perm`

**File đã tạo/sửa (WP0):**
- `lib/permissions.ts` [MỚI]
- `sale-webapp/src/lib/permissions.ts` [MỚI]
- `sale-webapp/src/layouts/SaleLayout.tsx` [SỬA]
- `sale-webapp/src/App.tsx` [SỬA]

### WP1 — Migration

- [x] `20260920a_staff_roles.sql` — mở rộng check constraint thêm `kho`, `ke_toan`, `tai_xe`
- [x] `20260920_phase1_order_intake.sql` — bảng + cột mới + trigger + seed

**File đã tạo (WP1):**
- `tps1-miniapp/supabase/migrations/20260920a_staff_roles.sql` [MỚI]
- `tps1-miniapp/supabase/migrations/20260920_phase1_order_intake.sql` [MỚI]

**⚠️ Migration chưa chạy trên Supabase — cần anh chạy sau khi Claude rà soát.**

---

## Đợt 2 — WP2 (API)

- [x] `lib/order-cutoff.ts` — tính toán giờ chốt đơn theo D4 (16:30 T2-T7, 17:00 T7 cho CN/T2)
- [x] `GET /api/customer/order-config` — giờ chốt server + danh sách địa chỉ `customer_addresses`
- [x] `POST /api/customer/order` — nhận `deliveryDate`, `addressId`, `customer_note`, tính `is_late_order`, update sau RPC
- [x] `POST /api/customer/orders/cancel` — hủy đơn pending/confirmed trước giờ chốt, ghi `order_history`
- [x] `GET /api/customer/orders` — bổ sung `delivery_date`, `is_late_order`, `customerNote`, `orderedQuantity`, `orderedProductName`
- [x] `GET /api/customer/frequent-items` — 20 mặt hàng đặt nhiều nhất 60 ngày
- [x] `GET /api/admin/procurement/summary` — tổng hợp đơn Thu mua, đối chiếu checksum, changedSinceLastExport
- [x] `GET /api/admin/procurement/export` — xuất file Excel 3 sheet, đối chiếu tổng Sheet 1 = Sheet 2, ghi `procurement_exports`
- [x] `POST /api/admin/orders/bulk-confirm` — xác nhận đơn hàng loạt, sale chỉ duyệt khách mình phụ trách
- [x] `GET /api/admin/orders` — thêm lọc `deliveryDate`, `late=1`, sửa actor thật
- [x] `POST /api/sale-auth` & `POST /api/customer/login` — đăng nhập mã ngắn, chuẩn hóa HOA/bỏ dấu, tự thử lại tiền tố `TPS1-`
- [x] Phân quyền: Thêm `can(role, 'pricing.edit')` cho bulk-price, dọn dẹp các role set cũ sang `can()`

**File đã tạo/sửa (WP2):**
- `lib/order-cutoff.ts` [MỚI]
- `app/api/customer/order-config/route.ts` [MỚI]
- `app/api/customer/orders/cancel/route.ts` [MỚI]
- `app/api/customer/frequent-items/route.ts` [MỚI]
- `app/api/admin/procurement/summary/route.ts` [MỚI]
- `app/api/admin/procurement/export/route.ts` [MỚI]
- `app/api/admin/orders/bulk-confirm/route.ts` [MỚI]
- `app/api/customer/order/route.ts` [SỬA]
- `app/api/customer/orders/route.ts` [SỬA]
- `app/api/customer/login/route.ts` [SỬA]
- `app/api/sale-auth/route.ts` [SỬA]
- `app/api/admin/orders/route.ts` [SỬA]
- `app/api/admin/orders/bulk-price/route.ts` [SỬA]
- `app/api/admin/products/route.ts` [SỬA]
- `app/api/admin/products/upload-image/route.ts` [SỬA]
- `app/api/admin/products/import-inventory/route.ts` [SỬA]
- `app/api/admin/products/import-pricebook/route.ts` [SỬA]
- `lib/permissions.ts` [SỬA]

---

## Đợt 2b & 2b-fix — WP2b (Nhập khách KiotViet & Sinh mã đối tác)

### WP2b — Nhập khách & Sinh mã
- [x] Migration `20260920c_customer_kiotviet_import.sql`: thêm cột KiotViet, `phone DROP NOT NULL`, hàm SQL `generate_partner_code`.
- [x] Script `scripts/import-kiotviet-customers.mjs`: đọc file Excel 269 khách, dry-run xuất CSV & MD trong `tmp/`.
- [x] `sale-webapp/src/pages/CustomersPage.tsx` & `CustomerDetailPage.tsx`: hiển thị mã KV, nhóm, nợ đầu kỳ, đổi mã.

### 2b-fix — Sửa G1 đến G6 theo yêu cầu mục 10
- [x] **G1:** Tạo 3 API dùng service-role + `can()`:
  - `GET /api/admin/customers/list`: quyền `customers.view`, không trả password_hash, lọc tìm kiếm, nhóm, chưa phân công, thiếu liên hệ; `sale` chỉ thấy khách mình, vai trò khác thấy tất cả.
  - `POST /api/admin/customers/assign-rep`: chỉ `admin`/`truong_phong`, tối đa 200 khách, kiểm tra staff active, trả về số dòng thực đổi. Thêm lọc theo nhóm + chọn tất cả đang lọc trên UI.
  - `POST /api/admin/customers/change-code`: chỉ `admin`/`truong_phong`, kiểm tra regex `^TPS1-[A-Z0-9]{2,16}$` và tính duy nhất.
- [x] **G2:** Script `--apply`: kiểm tra cột `kiotviet_code` tồn tại (dừng nếu chưa chạy migration), tóm tắt + yêu cầu gõ `YES`; MATCH_PHONE không ghi đè `name`/`company`; bắt lỗi từng dòng và ghi ra `tmp/import_errors_*.json`; kiểm tra lỗi khi tạo `customer_addresses`.
- [x] **G3:** Báo cáo dry-run: dùng số tính động 100%; thêm mục 3 SĐT không hợp lệ bị bỏ; chi tiết dòng MATCH_PHONE duy nhất (`CAFE` vs `TPS1-100002` "Nguyen Tien Tien") kèm cảnh báo; hỗ trợ cờ `--skip-match`.
- [x] **G4:** Migration `20260920d_customer_code_generation.sql`: nối `generate_partner_code` vào `register_customer_account` (bỏ sequence số cũ). Báo cáo `admin_create_customer` nằm trên Dashboard nên không sửa trong repo.
- [x] **G5:** Tạo `tps1-miniapp/supabase/tests/generate_partner_code.sql` chứa các câu SELECT test case mẫu cho Claude/anh chạy trên SQL Editor.
- [x] **G6:** Báo cáo đối chiếu công thức hạn mức công nợ (`PosCreatePage`, `bulk-confirm`, `reports/debt`): `credit_limit > 0` mới kiểm tra (bằng 0 hoặc null = không giới hạn), tính các đơn khác canceled chưa thanh toán đủ (`debt_amount` hoặc `grand_total - paid_amount`).
- [x] **G7 & Mục 3 bổ sung (2026-09-20):**
  - Bỏ qua tài khoản `is_active=false` và hỗ trợ cờ `--ignore-existing=<mã1>,<mã2>...` trong `scripts/import-kiotviet-customers.mjs`. Chạy với `--ignore-existing=TPS1-100002` loại bỏ dữ liệu test `CAFE` ↔ `TPS1-100002`, kết quả `MATCH_PHONE = 0`, `CREATE = 269`.
  - Sinh `dateStr` động theo ngày hiện tại (`YYYYMMDD`).
  - Thêm kiểm tra vai trò `role in ('sale', 'truong_phong')` cho người được gán trong `POST /api/admin/customers/assign-rep`.
  - Thêm ghi chú `// TODO khi > 1000 khách phải lọc ở DB` trong `GET /api/admin/customers/list`.

**File đã tạo/sửa (Đợt 2b & 2b-fix):**
- `app/api/admin/customers/list/route.ts` [MỚI]
- `app/api/admin/customers/assign-rep/route.ts` [MỚI]
- `app/api/admin/customers/change-code/route.ts` [MỚI]
- `tps1-miniapp/supabase/migrations/20260920c_customer_kiotviet_import.sql` [MỚI]
- `tps1-miniapp/supabase/migrations/20260920d_customer_code_generation.sql` [MỚI]
- `tps1-miniapp/supabase/tests/generate_partner_code.sql` [MỚI]
- `scripts/import-kiotviet-customers.mjs` [MỚI + SỬA G7]
- `sale-webapp/src/pages/CustomersPage.tsx` [SỬA]
- `sale-webapp/src/pages/CustomerDetailPage.tsx` [SỬA]
- `tmp/doi_chieu_ma_khach_20260920.csv` [MỚI]
- `tmp/import-khach-20260920.md` [MỚI]

---

## Đợt 3A — WP4 (Tìm kiếm thông minh & Script ảnh: Chỉ SQL + Script)

- [x] Migration `20260920b_product_search.sql`:
  - Kích hoạt extension `unaccent`, `pg_trgm`.
  - Hàm bỏ dấu `public.immutable_unaccent(text)` gọi `extensions.unaccent('extensions.unaccent', $1)`.
  - Cột `search_text`, `search_text_plain`, `thumb_url`, `image_url_original` trên bảng `products`.
  - Đảm bảo public Storage bucket `products`.
  - Trigger `BEFORE INSERT OR UPDATE OF name, sku, category, tags ON products` tự động cập nhật `search_text` và `search_text_plain`.
  - Backfill `search_text` và `search_text_plain` cho 5.295 sản phẩm hiện có.
  - Chỉ mục GIN trigram `products_search_text_gin_trgm_idx` và `products_search_text_plain_gin_trgm_idx`.
  - Hàm `public.get_distinct_categories()` trả về danh mục duy nhất kèm số lượng sản phẩm.
  - RPC `public.search_products(p_query, p_category, p_limit, p_offset)`:
    - Trả kèm `total` bằng `count(*) over()`, `p_limit` giới hạn tối đa 60.
    - `p_query` rỗng -> sắp xếp theo tên, ưu tiên sản phẩm có ảnh.
    - Gõ có dấu -> tìm khớp ranh giới từ `\y` trên `search_text`, nới sang không dấu khi 0 kết quả.
    - Gõ không dấu -> tìm khớp trên `search_text_plain`.
    - Xếp hạng: Tên đúng = cụm gõ > Bắt đầu bằng > Từ nguyên `\y` > Trigram similarity() giảm dần > Có ảnh trước > Tên A-Z.
    - Fallback: `similarity > 0.3` khi không có kết quả từ các bước trên.
    - Hàm STABLE, SECURITY DEFINER, cấp quyền cho `service_role`.
- [x] File test SQL `tps1-miniapp/supabase/tests/search_products.sql`:
  - 15 từ khóa mẫu (`bò`, `thịt bò`, `thit bo`, `ba chỉ`, `rau muống`, `hành`, `tôm`, `cá basa`, `gà`, `trứng`, `nước mắm`, `bo`, `ga`, `ca basa`, `rau muong`) + test `get_distinct_categories()`, kèm kết quả mong đợi ghi rõ bằng comment tiếng Việt.
- [x] Script ảnh `scripts/backfill-product-images.mjs`:
  - Mặc định dry-run, cờ `--apply` yêu cầu gõ `YES` mới ghi.
  - Xử lý theo lô 50 sản phẩm, chạy lại an toàn (bỏ qua ảnh đã chuyển đổi).
  - Tải ảnh từ CDN KiotViet, dùng `sharp` tạo thumb 200x200 webp (`thumbs/{id}.webp`) và medium 800px webp (`img/{id}.webp`).
  - Upload lên Supabase Storage bucket `products` (fallback `product-images`), cập nhật `thumb_url`, `image_url`, lưu URL gốc ở `image_url_original`.
  - Chuỗi rỗng -> chuyển thành `null`.
  - Bắt lỗi từng ảnh và ghi nhật ký lỗi ra `tmp/image_errors_<date>.json`.
  - Tương thích tốt khi migration chưa chạy (tự động fallback query).

**File đã tạo (Đợt 3A):**
- `tps1-miniapp/supabase/migrations/20260920b_product_search.sql` [MỚI]
- `tps1-miniapp/supabase/tests/search_products.sql` [MỚI]
- `scripts/backfill-product-images.mjs` [MỚI]

> **Dừng lại tại đây theo đúng quy định Đợt 3A:** KHÔNG sửa UI hay route nào. Đợi anh chạy migration trên Supabase, Claude gọi thử RPC bằng 15 từ khóa và duyệt kết quả trước khi bước sang Đợt 3B. (Claude đã gọi thử & duyệt thành công ngày 20/09).

---

## Gói P2 — POS là đường nhập đơn chính (Vận hành thử 10 đơn KiotViet)

- [x] **Migration `20260920f_orders_external_ref.sql`**:
  - Thêm cột `orders.external_ref` để lưu mã đơn / hóa đơn tham chiếu KiotViet.
  - Tạo chỉ mục `orders_external_ref_idx` trên `upper(trim(external_ref))` để tìm kiếm tức thì.
- [x] **API Server `POST /api/admin/orders/create`**:
  - Chuyển việc tạo đơn từ client RPC sang server API route (service role).
  - Kiểm tra quyền `orders.create` qua `can(auth.profile?.role, "orders.create")`.
  - Tính ngày giao mặc định (`earliestDate`) và đánh cờ trễ giờ chốt (`is_late_order`) dựa theo `lib/order-cutoff.ts`.
  - Hỗ trợ lưu nhanh điểm giao hàng mới vào `customer_addresses` (`saveNewAddress`).
  - Kiểm tra hạn mức công nợ (`credit_limit > 0`), hỗ trợ duyệt vượt hạn mức (`orders.credit_override`) và tự ghi log vào `order_history`.
  - Gọi RPC `admin_create_order` và thực hiện UPDATE hậu kỳ theo quy tắc F1 (bắt lỗi UPDATE nhưng không bao giờ làm hỏng đơn đã tạo, trả cảnh báo `warnings`).
  - Cập nhật `customer_note` cho từng dòng hàng trong `order_items`.
- [x] **Giao diện POS (`sale-webapp/src/pages/PosCreatePage.tsx`)**:
  - Tích hợp gọi `POST /api/admin/orders/create`.
  - Thêm ô chọn Ngày giao hàng với cảnh báo trễ giờ chốt tự động (`checkIsLate`).
  - Thêm ô nhập Mã đơn KiotViet (`externalRef`).
  - Chọn điểm giao từ danh sách `savedAddresses` hoặc gõ tay kèm checkbox "Lưu vào sổ địa chỉ khách".
  - Thêm ô ghi chú từng dòng hàng (`items[].note`) phục vụ quy cách/thái/đóng gói.
  - Nhập số lượng thập phân (bước nhảy `step="0.001"`).
  - Hỗ trợ phím tắt Enter tại ô tìm kiếm để thêm ngay sản phẩm đầu tiên vào giỏ.
- [x] **Quản lý đơn hàng (`sale-webapp/src/pages/OrdersPage.tsx`)**:
  - Query chọn `external_ref`, hỗ trợ tìm kiếm theo mã KiotViet trong ô tìm kiếm.
  - Hiển thị badge `KV: {external_ref}` ngay dưới mã đơn.
- [x] **Báo cáo Thu mua & Excel (`export/route.ts` & `summary/route.ts`)**:
  - Đưa `external_ref` vào API summary và Sheet 2 ("Chi tiết theo khách"), Sheet 3 ("Danh sách đơn") trong file Excel xuất Đơn tổng.

**File đã tạo/sửa (P2):**
- `tps1-miniapp/supabase/migrations/20260920f_orders_external_ref.sql` [MỚI]
- `app/api/admin/orders/create/route.ts` [MỚI]
- `sale-webapp/src/pages/PosCreatePage.tsx` [SỬA]
- `sale-webapp/src/pages/OrdersPage.tsx` [SỬA]
- `app/api/admin/procurement/export/route.ts` [SỬA]
- `app/api/admin/procurement/summary/route.ts` [SỬA]

---

## Gói P3 — WP4-3B Tìm kiếm thông minh & Ảnh sản phẩm

- [x] Sửa POS (`PosCreatePage.tsx`):
  - Bỏ hàm tự tính `getTomorrowVN` và `checkIsLate`.
  - Gọi `/api/admin/order-cutoff` lấy `earliestDate`, `cutoffInfo`, hiển thị banner trễ / hạn chót server.
  - Thêm `idempotencyKey` per-tab (UUID), gửi trong body tạo đơn, khóa nút khi đang gửi.
  - Xử lý nhẹ phản hồi `warnings`, không báo lỗi tạo đơn.
- [x] Route API sản phẩm (`app/api/admin/products`, `app/api/customer/products`):
  - Nâng cấp dùng RPC `search_products` + `get_distinct_categories`.
  - Tính giá tier & hợp đồng qua `resolvePricesForProducts`.
- [x] Component dùng chung `ProductSearchBox.tsx`:
  - Thumbnail 64px, tô đậm từ khoá khớp, debounce 250ms + `AbortController`, phím mũi tên/Enter/Escape, category pills, fallback placeholder TPS1.
- [x] Tích hợp `ProductSearchBox` vào `PosCreatePage.tsx` và `DatHangPage.tsx` (nâng cấp thumbnail 64px).

**File đã tạo/sửa (P3):**
- `sale-webapp/src/components/ProductSearchBox.tsx` [MỚI]
- `app/api/admin/products/route.ts` [SỬA]
- `app/api/customer/products/route.ts` [SỬA]
- `sale-webapp/src/pages/PosCreatePage.tsx` [SỬA]
- `sale-webapp/src/pages/DatHangPage.tsx` [SỬA]

---

## Gói P4 — WP5 Đơn tổng & File Excel Thu mua

- [x] Trang `sale-webapp/src/pages/DonTongPage.tsx`:
  - Nối vào route `/don-tong` trong `App.tsx` (quyền `procurement.view`).
  - Bộ lọc ngày giao (mặc định sớm nhất/ngày mai; nút Hôm nay/Ngày mai) + checkbox gồm đơn chờ xác nhận (`includePending`).
  - Tab 1 "Tổng hợp soạn hàng": gom nhóm danh mục, cột SL cuối / ban đầu / tồn kho / cần bù (đỏ khi thiếu), bấm dòng mở rộng phân bổ từng khách (`customerLines`), hộp đối chiếu checksum (khớp ✓ / lệch ✗), nút tải file Excel `/api/admin/procurement/export`.
  - Tab 2 "Cần xử lý": hàng đợi đơn `pending`/trễ giờ chốt, nút "Xác nhận tất cả đơn sạch" & "Xác nhận đơn đã chọn" gọi `/api/admin/orders/bulk-confirm` (chia lô ≤ 50 đơn).
  - Khối đỏ cảnh báo thay đổi sau lần xuất file (`changedSinceLastExport`) + nút sao chép thông báo Zalo.
- [x] `SoanHangPage.tsx`: bổ sung bộ lọc `delivery_date` cho nhân viên kho.

**File đã tạo/sửa (P4):**
- `sale-webapp/src/pages/DonTongPage.tsx` [MỚI]
- `sale-webapp/src/App.tsx` [SỬA]
- `sale-webapp/src/pages/SoanHangPage.tsx` [SỬA]

---

## Gói P7 — WP3 Khách đặt hàng WebApp & Excel

- [x] Trang `sale-webapp/src/pages/DatHangPage.tsx`:
  - Thanh chọn ngày giao hàng + cảnh báo giờ chốt (`/api/customer/order-config`).
  - Dropdown chọn sổ địa chỉ giao hàng (`customer_addresses`), chặn gửi nếu khách chưa có địa chỉ.
  - Section cuộn ngang "Sản phẩm hay đặt" (WP3) lấy từ `GET /api/customer/frequent-items`.
  - Hỗ trợ số lượng thập phân (bước 0.1 cho kg, nút +/- nhảy 0.5).
  - Ô nhập ghi chú riêng cho từng dòng sản phẩm trong giỏ hàng.
  - Nhận state `reorderItems` từ `MyOrdersPage` để "Đặt lại đơn" tự động nạp giỏ hàng + banner thông báo.
  - Sinh và gửi `idempotencyKey` per-tab chống trùng lặp đơn.
- [x] Trang `sale-webapp/src/pages/DatHangExcelPage.tsx`:
  - Tích hợp `/api/customer/order-config` để chọn ngày giao & chọn địa chỉ nhận hàng.
  - Bảo lưu ghi chú từ file Excel vào `items[].note`.
  - Hộp thoại Modal xác nhận khi còn dòng lỗi/bỏ qua/chưa khớp (`not_found`, `invalid_quantity`, `ambiguous`) trước khi tạo đơn.
- [x] Trang `sale-webapp/src/pages/MyOrdersPage.tsx`:
  - Hiển thị ngày giao hàng `delivery_date` (định dạng `dd/MM/yyyy`).
  - Badge cảnh báo `⚠️ Trễ giờ chốt` khi `is_late_order === true`.
  - Nút "Đặt lại đơn" điều hướng về `/` (`DatHangPage`) nạp lại toàn bộ mặt hàng cũ.

**File đã tạo/sửa (P7):**
- `sale-webapp/src/pages/DatHangPage.tsx` [SỬA]
- `sale-webapp/src/pages/DatHangExcelPage.tsx` [SỬA]
- `sale-webapp/src/pages/MyOrdersPage.tsx` [SỬA]

---

## Gói P8 — WP6 Truy vết điều chỉnh & Nút "Có yêu cầu"

- [x] API `app/api/admin/orders/track-adjustment/route.ts`:
  - Xác thực nhân viên qua `verifyAdminAuth`, kiểm tra quyền `orders.edit`.
  - Ghi nhận `action: 'items_changed'` vào `order_history` kèm `actor`, `note` và `payload` chi tiết (`itemChanges`, `changedAt`).
- [x] Quản lý đơn `sale-webapp/src/pages/OrdersPage.tsx`:
  - Tải danh sách yêu cầu mở từ `GET /api/admin/order-change-requests?status=open`.
  - Nút lọc "Có yêu cầu (N)" với hiệu ứng viền phát xung nhịp đỏ.
  - Badge trạng thái `❌ Yêu cầu hủy` hoặc `✏️ Yêu cầu sửa` kèm tooltip hiển thị nội dung khách yêu cầu.
- [x] POS điều chỉnh đơn `sale-webapp/src/pages/PosCreatePage.tsx`:
  - Giữ lại `ordered_quantity` ban đầu khi vào chế độ `processOrderId`.
  - Hiển thị thông tin "Khách đặt: X ĐVT".
  - Hiển thị bộ chọn lý do điều chỉnh (`changeReason`) khi thay đổi số lượng hoặc thêm món mới.
  - Theo dõi danh sách sản phẩm bị xóa kèm lý do và nút phục hồi dòng đã xóa.
  - Yêu cầu checkbox "Đã thống nhất với khách" và chọn đủ lý do trước khi hoàn tất điều chỉnh.
  - Tự động gọi `/api/admin/orders/track-adjustment` để lưu vết lịch sử điều chỉnh.

**File đã tạo/sửa (P8):**
- `app/api/admin/orders/track-adjustment/route.ts` [MỚI]
- `sale-webapp/src/pages/OrdersPage.tsx` [SỬA]
- `sale-webapp/src/pages/PosCreatePage.tsx` [SỬA]

---

## Gói P9 — WP7 Khách đặt hàng Zalo Mini App (`tps1-miniapp`)

- [x] **Cấu hình đơn hàng & Chọn địa chỉ (`delivery.tsx` & `state.ts`)**:
  - Tích hợp `/api/customer/order-config` nạp `earliestDate`, `cutoffInfo` và danh sách địa chỉ `customer_addresses`.
  - Chọn ngày giao hàng (bắt buộc từ `earliestDate` trở đi, mặc định ngày mai/sớm nhất).
  - Banner cảnh báo giờ chốt kèm đồng hồ đếm ngược `minutesLeft` ("Còn X phút để chốt giao ngày..."). Nếu chọn ngày đã qua giờ chốt, hiển thị cảnh báo trễ giờ chốt màu cam.
  - Dropdown chọn điểm giao hàng từ danh sách địa chỉ đã lưu (`selectedAddressId`).
- [x] **Ghi chú từng dòng & Số lượng thập phân (`cart-item.tsx` & `quantity-input.tsx`)**:
  - Hỗ trợ số lượng thập phân (bước nhảy 0.1 cho kg, nút bấm +/- bước 0.5).
  - Ô nhập ghi chú riêng cho từng dòng hàng trong giỏ (`items[].note`), tự động cập nhật vào `cartState`.
  - Dọn dẹp nhãn ngày giao giả lập cũ ở `cart-list.tsx`.
- [x] **Đặt hàng & Đặt lại đơn (`hooks.ts`)**:
  - `useCheckout`: gửi payload chuẩn gồm `deliveryDate`, `addressId`, và `items[].note` lên `/api/customer/order`.
  - `useReorder`: đặt lại đơn hàng từ lịch sử, bảo lưu toàn bộ ghi chú dòng (`item.note`), chuyển hướng về giỏ hàng để khách chọn ngày giao mới.
- [x] **Chi tiết đơn & Yêu cầu điều chỉnh/hủy (`detail.tsx`)**:
  - Hiển thị ngày giao hàng dự kiến (`deliveryDate`) và badge cảnh báo đỏ `⚠️ Trễ giờ chốt` khi `isLateOrder === true`.
  - Nút "Hủy đơn hàng" trực tiếp cho đơn đang ở trạng thái `pending`, gọi `POST /api/customer/orders/cancel`.
  - Nút "Yêu cầu sửa đơn" & "Yêu cầu hủy đơn" cho đơn đã được duyệt (`confirmed` / `preparing`): mở Modal nhập lý do, gọi `POST /api/customer/orders/request-change` gửi yêu cầu đến nhân viên vận hành.
  - Banner trạng thái yêu cầu điều chỉnh (`open`: Đang chờ duyệt; `approved`: Đã chấp thuận; `rejected`: Đã từ chối kèm lý do).
- [x] **Tìm kiếm sản phẩm & Thumbnail (`state.ts`)**:
  - Ưu tiên hiển thị `thumb_url` (tối ưu tải nhanh 200x200 WebP), fallback `image_url`.
  - Tối ưu `searchResultState`: bỏ delay nhân tạo 1s, tìm kiếm tức thì theo tên và mã.

**File đã tạo/sửa (P9):**
- `tps1-miniapp/src/types.d.ts` [SỬA]
- `tps1-miniapp/src/state.ts` [SỬA]
- `tps1-miniapp/src/components/quantity-input.tsx` [SỬA]
- `tps1-miniapp/src/pages/cart/cart-item.tsx` [SỬA]
- `tps1-miniapp/src/pages/cart/cart-list.tsx` [SỬA]
- `tps1-miniapp/src/pages/cart/delivery.tsx` [SỬA]
- `tps1-miniapp/src/hooks.ts` [SỬA]
- `tps1-miniapp/src/pages/orders/detail.tsx` [SỬA]

---

## Việc phase sau (ghi nhận từ rà soát Đợt 2, 2b & WP6)

1. **Thống nhất 1 hàm tính công nợ giữa PosCreatePage, reports/debt, bulk-confirm:**
   - Hiện tại: `PosCreatePage` tính tổng đơn chưa `paid` (`fetchCustomerDebt`); `reports/debt` dùng `debt_amount > 0`; `bulk-confirm` dùng `debt_amount` hoặc `grand_total - paid_amount`. Sẽ thống nhất thành 1 hàm / RPC dùng chung khi làm module công nợ.
2. **Hoàn kho khi hủy đơn:**
   - *Đã giải quyết ở WP6b*: Hàm RPC `sync_order_inventory` (`20260920e_order_change_requests.sql`, `20260920g_delivery_reconcile.sql`) đã hoàn trả tồn kho khi đơn bị hủy (void / cancel) hoặc điều chỉnh số lượng.
3. **So sánh lịch sử điều chỉnh đơn phía server:**
   - Hiện tại `track-adjustment` nhận `itemChanges` do client gửi lên. Trong phase sau cần chuyển thành so sánh diff trực tiếp trên server giữa dòng hàng cũ trong DB và dòng hàng mới khi gọi chốt đơn để đảm bảo tính toàn vẹn tuyệt đối.
4. **Dọn dẹp tài khoản test (G7):**
   - Vô hiệu hóa hoặc xóa các tài khoản test cũ (`TPS1-100002`...) sau khi nghiệm thu giai đoạn đầu.
5. **Chuyển số dư nợ KiotViet đầu kỳ vào module công nợ chính thức:**
   - Khi Kế toán chốt số dư đầu kỳ chính thức.

---

## Lỗi typecheck cũ không thuộc Phase 1 (KHÔNG sửa)

- `tps1-miniapp/src/pages/orders/index.tsx:50` — `"draft"` không thuộc union type
- `tps1-miniapp/src/state.ts:153` — `discountTier`
- Các lỗi trong `.next/types` của root repo
