# PHASE 1 (v2, thu hẹp 20/09/2026) — Nhận đơn → Tổng hợp đơn → File tổng gửi Thu mua

> Lập kế hoạch & rà soát: Claude. Triển khai: Gemini. Chủ dự án: anh.
> Căn cứ: `Quy trình chuẩn TPS1 - ….docx` **mục 4 "Giai đoạn A–B: Nhận đơn và tổng hợp đơn"** + audit code 20/09/2026.
> Repo gốc: `D:\thuc_pham_so_mot\thuc_pham_so_mot` (API `app/api/**`, SPA `sale-webapp/src`, Mini App `tps1-miniapp/src`, migrations `tps1-miniapp/supabase/migrations/*.sql`). Không sửa `quanly/` (repo riêng).

## 0. Phạm vi Phase 1 (đã thu hẹp theo yêu cầu của anh)

**Mục tiêu duy nhất:** khách đặt hàng dễ → Vận hành có đủ thông tin để chốt đơn → bấm 1 nút ra **1 file Excel tổng hợp chi tiết** (theo nhóm hàng, tổng số lượng cuối cùng từng mặt hàng, kèm chi tiết từng khách/đơn) để **gửi Thu mua soạn hàng**.

**Từ Phase 2 trở đi dùng quy trình cũ (giữ nguyên, không làm hỏng):** Thu mua soạn hàng → tài xế giao → nhân viên **xác nhận số lượng thực giao** (`order_items.quantity_delivered`) → chuyển `completed` → **in hóa đơn bán hàng** (`createInvoiceDocument` trong `app/api/admin/orders/route.ts`, tải ở `OrderDetailPage`/miniapp/portal). Mọi cột/luồng mới của Phase 1 **phải để luồng cũ này chạy y nguyên** (có kịch bản nghiệm thu riêng, WP8).

**Trong phạm vi:** ngày giao + điểm giao trên đơn, giờ chốt 16:30, ghi chú từng dòng, số lượng thập phân, đặt lại đơn, hay đặt, tìm kiếm thông minh + ảnh nhanh, màn/ file **Đơn tổng theo ngày giao**, xác nhận đơn hàng loạt, vai trò/quyền, truy vết điều chỉnh tối thiểu, Mini App tương ứng.

**HOÃN sang phase sau (đừng làm):** tuyến/xe (`delivery_routes`, đơn theo tuyến), phân loại tươi/khô (`supply_type`), file đặt NCC theo nhà cung cấp, kiểm hàng đầu vào, màn tài xế, trạng thái "Đang đặt NCC/Đã chốt công nợ/Đã xuất hóa đơn", đổi/trả hàng, khách tự sửa đơn trực tiếp (khách chỉ *gửi yêu cầu*, nhân viên sửa — xem WP6b), đẩy đơn sang KiotViet.

## 1. Quyết định thiết kế (đã chốt)

| # | Vấn đề | Quyết định |
|---|---|---|
| D1 | Chốt đơn 16:30 | **Không chặn cứng**: server tính `is_late_order`, cảnh báo khách, nổi bật trong danh sách Vận hành và trong file tổng |
| D2 | Trạng thái đơn | **Không thêm status mới.** Mới tạo=`pending`, Đã xác nhận=`confirmed`, Đang soạn=`preparing`, Đang giao=`shipping`, Đã giao=`completed` |
| D3 | Điểm giao | Khách **chọn từ `customer_addresses`** (nhân viên quản lý), không gõ tay; địa chỉ chép vào đơn từ bản ghi, không lấy từ client |
| D4 | Giờ chốt | Giao ngày D → đặt trước **16:30 ngày D-1**; D là **Chủ nhật/Thứ Hai** → trước **17:00 Thứ Bảy**. Nguồn duy nhất là server (`Asia/Ho_Chi_Minh`) |
| D5 | Đơn tổng gồm đơn nào | Mặc định `confirmed`+`preparing`; tick "gồm cả chờ xác nhận" thêm `pending`; loại `canceled`/`draft` |
| D6 | "Số lượng cuối cùng" | = `order_items.quantity` hiện tại (sau khi Vận hành chốt/điều chỉnh với khách); file luôn kèm cột "SL khách đặt ban đầu" để thấy chênh |
| D7 | Nhóm hàng | Dùng nguyên `products.category` (đã có; dữ liệu nhóm KiotViet còn lộn xộn — dọn danh mục là việc riêng, ngoài Phase 1) |
| D9 | Điều chỉnh/hủy sau khi đặt (anh chốt 20/09) | Khách gửi **yêu cầu** (không tự sửa). **Sale đủ thẩm quyền duyệt hủy/điều chỉnh** kể cả sau giờ chốt, không cần Trưởng phòng; sale tự báo Thu mua/Kho (hệ thống hỗ trợ bằng khối cảnh báo + nút sao chép thông báo Zalo). Khách chỉ **tự hủy** đơn `pending` trước giờ chốt |
| D8 | Dữ liệu | **Supabase là nguồn chính chạy độc lập**; KiotViet chỉ kéo một chiều (WP9, sau); không đẩy đơn sang KiotViet |

## 2. Thứ tự làm (mỗi đợt xong dừng chờ Claude rà soát)

Đợt 1 `WP0+WP1` (đã duyệt) → Đợt 2 `WP2` → Đợt 2b `WP2b` (nhập khách từ KiotViet) → Đợt 3 **`WP4` (tìm kiếm + ảnh + tốc độ — anh ưu tiên, làm trước WP3 vì cùng sửa DatHangPage)** → Đợt 4 `WP3` → Đợt 5 **`WP5` (file tổng — trọng tâm)** → Đợt 6 `WP6` + `WP6b` (yêu cầu điều chỉnh/hủy) → Đợt 7 `WP7+WP8` → (sau) `WP9`.

---

## WP0 — Vai trò & quyền (rút gọn)

Hiện `admin_profiles.role` ∈ `admin, sale, truong_phong, thu_mua` (`20260910_extend_admin_roles.sql:25`); menu `SaleLayout.tsx` hiện đủ mọi mục cho mọi nhân viên.

1. Migration `20260920a_staff_roles.sql`: constraint mới `admin, truong_phong, sale, thu_mua, kho, ke_toan, tai_xe`.
2. `lib/permissions.ts` (server) + `sale-webapp/src/lib/permissions.ts` (đồng bộ, có comment nhắc): `can(role, perm)`. **Chỉ áp cho tính năng Phase 1 mới** và lọc menu; **không refactor** các `Set([...])` quyền cũ (`products/*`, `packing`, `credit-override`…) — chỉ thêm role mới vào đúng chỗ cần (VD `kho` được soạn hàng như `thu_mua`) và liệt kê trong báo cáo.
3. Nhãn vai trò: `admin`=Quản trị/BGĐ, `truong_phong`=Trưởng phòng (Vận hành), `sale`=NV Vận hành, `thu_mua`=Thu mua, `kho`=Kho/Soạn hàng, `ke_toan`=Kế toán, `tai_xe`=Tài xế (đặt trước, chưa cấp cho ai).

| Quyền Phase 1 | admin | truong_phong | sale | thu_mua | kho | ke_toan |
|---|---|---|---|---|---|---|
| Xem **Đơn tổng** + tải file tổng (`procurement.view/export`) | ✔ | ✔ | xem | ✔ | xem | — |
| Xác nhận đơn hàng loạt (`orders.bulk_confirm`) | ✔ | ✔ | chỉ đơn khách mình phụ trách | — | — | — |
| Xem danh sách đơn | ✔ | ✔ | ✔ | xem | xem | xem |
| Sửa đơn / điều chỉnh SL | ✔ | ✔ | ✔ (khách mình) | — | — | — |
| Quản lý địa chỉ giao của khách | ✔ | ✔ | ✔ | xem | — | xem |
| Công nợ + báo cáo (xem) | ✔ | ✔ | xem (chỉ khách mình, API tự lọc) | — | — | ✔ |
| Soạn hàng, Áp giá hàng ngày (quy trình: Thu mua báo giá lại → sale áp giá → soạn đơn ra phiếu tạm) | ✔ | ✔ | ✔ | ✔ | soạn | — |
| Ghi nhận thanh toán, xuất hóa đơn | ✔ | — | — | — | — | ✔ |

4. Menu lọc theo `can()`; route guard `StaffOnlyRoute` nhận `perm`; **chặn thật ở API (403)**. Nghiệm thu: bảng 6 vai trò × API mới khớp ma trận.

## WP1 — Migration `20260920_phase1_order_intake.sql` (viết file, KHÔNG chạy)

Idempotent (`if not exists`). Nội dung:
1. `orders`: `delivery_date date` (index `(delivery_date, status)`), `delivery_address_id uuid → customer_addresses`, `is_late_order boolean not null default false`, `cancel_reason text`, `canceled_by text`, `last_export_at`-không cần. Backfill `delivery_date = (created_at at time zone 'Asia/Ho_Chi_Minh')::date`. Trigger BEFORE INSERT: nếu `delivery_date` null → ngày tạo (giờ VN) + 1.
2. `order_items`: `customer_note text`, `ordered_quantity numeric(12,3)`, `ordered_product_name text`. Trigger BEFORE INSERT gán `ordered_quantity := coalesce(ordered_quantity, quantity)` và `ordered_product_name := coalesce(…, name)` — **mọi RPC tạo đơn đều được phủ**, không sửa RPC. Backfill đơn cũ.
3. `app_settings(key pk, value jsonb, updated_at)` + seed `order_cutoff` = `{"time":"16:30","satTime":"17:00","tz":"Asia/Ho_Chi_Minh"}`.
4. `procurement_exports(id, delivery_date, exported_by text, exported_at timestamptz default now(), include_pending bool, order_count int, line_count int, total_qty numeric, file_name text)` — nhật ký lần xuất file tổng.
5. `products.thumb_url text`, `products.image_url_original text` (cho WP4).
6. **Không** tạo bảng tuyến, **không** thêm `supply_type`, **không** đụng `orders.status`.

Nghiệm thu: chạy lại 2 lần không lỗi; đơn cũ có `delivery_date`; insert `order_items` qua RPC hiện có vẫn ra `ordered_quantity`. Báo rõ "migration chưa chạy trên Supabase".

## WP2 — API (Next.js `app/api/**`)

Quy ước: `getCustomerSupabaseAdmin()`; staff dùng `verifyAdminAuth` + `can()` (mẫu `app/api/admin/products/route.ts`); khách dùng Bearer token (mẫu `app/api/customer/orders/route.ts`). Lỗi tiếng Việt.

1. `lib/order-cutoff.ts`: `getOrderCutoffInfo(now, deliveryDate?)` → `{earliestDate, cutoffAt, minutesLeft, isLate}` theo D4, đọc `app_settings` (fallback hằng số), comment giải thích Chủ nhật/Thứ Hai.
2. `GET /api/customer/order-config`: `serverNow, earliestDate, cutoffAt, minutesLeft` + `addresses[]` của khách (`id, label, address, contactName, contactPhone, isDefault`).
3. `POST /api/customer/order` (sửa): nhận thêm `deliveryDate` (bắt buộc, ≥ hôm nay, ≤ +30 ngày), `addressId` (bắt buộc, thuộc khách), `items[].note` (≤200). Tính `is_late_order`; gọi RPC hiện có; **ngay sau đó** UPDATE `orders` (delivery_date, delivery_address_id, is_late_order, tên/SĐT/địa chỉ nhận lấy từ bản ghi địa chỉ) và `order_items.customer_note` khớp `product_id`; UPDATE lỗi → trả lỗi rõ + log (không nuốt). Trả `isLate`.
4. `POST /api/customer/orders/cancel`: hủy khi `status in ('pending','confirmed')` và chưa quá giờ chốt của `delivery_date`; ghi `order_history` (actor=tên khách) + `cancel_reason`; quá giờ → 409 "Vui lòng liên hệ Vận hành".
5. `GET /api/customer/orders`: thêm `delivery_date`, `is_late_order`, item `customerNote`, `orderedQuantity`, `orderedProductName`.
6. `GET /api/customer/frequent-items`: 20 mặt hàng khách đặt nhiều nhất 60 ngày (SUM ở DB).
7. `GET /api/admin/procurement/summary?date=&includePending=0|1` (quyền `procurement.view`). Trả:
   - `groups[]` theo `category` → `lines[]`: `productId, sku, name, unit, totalQty (SL cuối), orderedQty (SL khách đặt ban đầu), orderCount, customerCount, stockQty (null nếu không theo dõi), shortfall = max(0,totalQty−stockQty) chỉ khi theo dõi tồn, notes[] {customer, note}`, cộng tổng nhóm.
   - `orders[]`: `orderId, orderCode, customerName, customerCode, deliveryName, deliveryPhone, deliveryAddress, status, isLate, lineCount, note`.
   - `checksum {orderCount, lineItemCount, sumQtyByLines, sumQtyByProducts}` (đối chiếu tổng đơn lẻ = đơn tổng).
   - `changedSinceLastExport[]`: đơn có `updated_at`/lịch sử mới hơn `exported_at` của lần xuất gần nhất cùng ngày.
   - 1–2 query tổng hợp có `in()`/join, **không N+1**; không `.limit(500)` ngầm.
8. `GET /api/admin/procurement/export?date=&includePending=` → **1 file Excel** (đặc tả ở WP5); ghi 1 dòng `procurement_exports` (người xuất từ `auth.profile.name`). Dùng đúng thư viện/pattern của `app/api/admin/reports/packing-list/export/route.ts`.
9. `POST /api/admin/orders/bulk-confirm` `{orderIds[]}` (quyền `orders.bulk_confirm`; `sale` chỉ đơn khách mình): với từng đơn đi **đúng luồng hiện hành** để chuyển `confirmed` (kiểm `OrderDetailPage`/finalize: nếu đơn phải chốt giá trước thì bỏ qua và báo lý do); trả `{confirmed[], skipped[{orderId, reason}]}`; ghi `order_history` với actor thật.
11. **Đăng nhập bằng mã ngắn:** ở `app/api/sale-auth/route.ts` (`tryCustomerLogin`) và `app/api/customer/login/route.ts`: chuẩn hóa mã gõ vào (trim, HOA, bỏ dấu/khoảng trắng); thử `verify_customer_login` với mã đúng như gõ, **nếu không khớp và chưa có tiền tố `TPS1-` thì thử lại với `TPS1-` + mã** (khách gõ `TANVAN` hoặc `TPS1-TANVAN` đều được). Không sửa RPC `verify_customer_login`; giữ thông báo lỗi chung (không lộ mã nào tồn tại); mỗi lần thử sai vẫn tính như nhau (chưa có rate-limit — ghi chú cho Claude).
10. `GET /api/admin/orders`: thêm lọc `deliveryDate`, `late=1`; trả `delivery_date`, `is_late_order`. Sửa `actor: "admin"` cứng (`orders/route.ts:429-437`) thành tên nhân viên thật.

Nghiệm thu: mỗi endpoint có lệnh curl mẫu; sai quyền → 401/403; khách A không đọc được địa chỉ/đơn khách B.

## WP2b — Nhập khách hàng từ KiotViet (file Excel, không cần API) — bổ sung 20/09

**Nguồn:** `C:\Users\boanl\Downloads\DanhSachKhachHang_KV20092026-143107-369.xlsx` (xuất từ KiotViet 20/09/2026). **Chứa số điện thoại/địa chỉ khách → không copy vào repo, không commit** (đọc trực tiếp từ đường dẫn; báo cáo/CSV kết quả ghi vào `tmp/` — thư mục này đã `.gitignore`).

**Đã đo file (269 khách, tất cả `Trạng thái=1`, không trùng mã):** chỉ **33 có điện thoại, 32 có địa chỉ, 6 có MST**, 50 có tên công ty xuất hóa đơn; 218 có "Nhóm khách hàng" (nhóm rất lộn xộn: "HIEPPHATFOOD- VÙNG 3 MS HÀ KVBH", "X51", "TPS1"…; 51 trống); **54 khách còn nợ tổng ≈ 559 triệu, 135 khách nợ ÂM** (KiotViet ghi âm = khách trả dư/còn tiền); mã khách có dấu/khoảng trắng ("ĐĐT", "FGL U2", "N.GỖ"); "Loại khách" Cá nhân/Công ty (không dùng).

**Hệ quả thiết kế (đã quyết):**
- Dữ liệu liên hệ **thiếu nặng** → sau import đa số khách **chưa tự đặt hàng được** (WP3 cần địa chỉ) và chưa đăng nhập được (chưa có mật khẩu). Import chỉ để **Vận hành/Thu mua chọn khách khi tạo đơn/soạn hàng** ngay; kèm **danh sách khách thiếu SĐT/địa chỉ** để nhân viên bổ sung dần.
- **Mã khách hàng = mã viết tắt dễ nhớ, tự sinh, dùng để đăng nhập (anh chốt 20/09): `TPS1-<VIẾTTẮT>`, VD `TPS1-TANVAN`, `TPS1-ZERMAT`** — thay cho dạng số `TPS1-000123`. Quy tắc sinh (hàm SQL dùng chung `public.generate_partner_code(p_name text, p_preferred text default null)`, viết trong migration, Node script gọi lại cùng logic hoặc RPC):
  1. Ưu tiên **mã KiotViet** của khách (nhân viên và khách vốn đã quen): chuẩn hóa = bỏ dấu (Đ→D), chữ HOA, bỏ mọi ký tự không phải A–Z/0–9 (`ĐĐT`→`DDT`, `FGL U2`→`FGLU2`, `N.GỖ`→`NGO`, `BÒ60`→`BO60`, `FORMOSA-Đ`→`FORMOSAD`), tối đa 12 ký tự.
  2. Khách **không có mã KiotViet** (tạo mới về sau): sinh từ tên — bỏ dấu, HOA, **loại tiền tố loại hình** (CÔNG TY, TNHH, CỔ PHẦN, CP, MTV, HỘ KINH DOANH, HKD, DNTN, TRƯỜNG, MẦM NON, MẪU GIÁO, NHÀ HÀNG, QUÁN…) và các từ nối, rồi **ghép các từ có nghĩa đầu tiên** (VD "Công ty TNHH Tân Vạn" → `TANVAN`), tối đa 12 ký tự; nếu rỗng dùng 6 ký tự đầu của tên.
  3. Mã cuối = `TPS1-` + phần trên; **trùng thì thêm số** (`TANVAN2`, `TANVAN3`…), kiểm unique không phân biệt hoa/thường; cấm mã trùng với khách hiện có (kể cả `TPS1-000123` cũ).
  4. **Khách cũ giữ nguyên mã hiện tại** (không đổi hàng loạt để khỏi lệch lịch sử đơn); thêm chức năng **admin/truong_phong đổi mã** ở `CustomerDetailPage` (kiểm unique + cảnh báo "khách sẽ phải đăng nhập bằng mã mới").
  5. Mã KiotViet vẫn lưu riêng ở `kiotviet_code` để tra cứu; staff **tìm khách được theo cả hai mã**. Báo cáo dry-run phải có **bảng đối chiếu `kiotviet_code → partner_code`** (CSV) để nhân viên báo khách.
  6. Mọi đường tạo khách phải dùng cùng bộ sinh mã: import, `register_customer_account` (bản trong `20260911f_require_company_on_register.sql`), `admin_create_customer`, trang "Khách hàng mới" ở `CustomerDetailPage`. Gemini liệt kê từng đường; đường nào có RPC định nghĩa ngoài repo (Dashboard) thì **không tự sửa RPC**, báo Claude.
- **Nợ KiotViet KHÔNG đưa vào công nợ tính toán** (tránh lệch số/hạn mức): chỉ lưu tham chiếu `kiotviet_opening_debt` + `kiotviet_imported_at`, hiển thị nhỏ ở trang khách. Việc chuyển số dư đầu kỳ vào module công nợ để Phase sau, khi Kế toán chốt.
- Import **không tạo mật khẩu**: `password_hash` để null (chưa đăng nhập được); khi khách sẵn sàng, nhân viên cấp mật khẩu tạm bằng `admin_reset_customer_password` sẵn có.

**Việc cần làm:**
1. **Migration `20260920c_customer_kiotviet_import.sql`** (viết file, không chạy): `vip_accounts` thêm `kiotviet_code text` (unique khi không null, index không phân biệt hoa thường), `customer_group text`, `kiotviet_opening_debt numeric(14,0)`, `kiotviet_imported_at timestamptz`. Trước khi viết, **đọc ràng buộc thật của `vip_accounts`** (`phone` có `NOT NULL`/unique không? `registration_source` chỉ cho `zalo_mini_app|website|admin` → dùng `admin`) và cho biết trong báo cáo; nếu `phone` bắt buộc/unique thì xử lý phù hợp (không dùng số giả gây trùng) và hỏi Claude trước khi nới ràng buộc. Bảng mới/cột mới không cần RLS riêng (đã có RLS trên `vip_accounts`).
2. **Script `scripts/import-kiotviet-customers.mjs`**, **mặc định chạy khô (dry-run) — không ghi gì**, có cờ `--apply` (chỉ anh chạy trên production; Gemini **không** chạy `--apply`). Dùng thư viện đọc xlsx đã có trong `node_modules` (báo rõ). Mỗi dòng:
   - `name` = `company` = "Tên khách hàng" (KiotViet không có tên người liên hệ); `phone` chuẩn hóa (`0…`, bỏ ký tự lạ; nhiều số → lấy số đầu); `address` → `vip_accounts.address` **và** tạo 1 `customer_addresses` (label "Địa chỉ giao hàng", `is_default=true`, `contact_name`=tên, `contact_phone`=SĐT) nếu có địa chỉ; `tax_code`=MST; `customer_group`="Nhóm khách hàng"; `kiotviet_code`=Mã khách hàng (giữ nguyên, trim); `discount_tier`='VIP0'; `is_active=true`; `registration_source='admin'`.
   - **Xác thực:** `Tổng bán > 0` → `verified` (ghi `verified_by='import KiotViet'`), ngược lại `pending`.
   - `sales_rep_id` để **null** (không suy đoán). **Thay đổi 20/09 (rà soát Đợt 2b):** RLS của `vip_accounts`/`orders` lọc theo `sales_rep_id = auth.uid()` nên quy tắc "chưa phân thì mọi sale thao tác được" không thực thi được → **admin/truong_phong gán người phụ trách hàng loạt ngay sau khi nhập** (lọc theo nhóm khách hàng) qua API `/api/admin/customers/assign-rep`; danh sách/gán/đổi mã khách đi qua API service-role + `can()`, không gọi `supabase.from('vip_accounts')` từ trình duyệt.
   - **Khớp trùng, không tự gộp:** trùng khi (a) SĐT chuẩn hóa trùng khách đã có, hoặc (b) tên chuẩn hóa (bỏ dấu, hoa/thường, khoảng trắng) trùng khách đã có. Trùng → **không tạo mới**, chỉ gắn `kiotviet_code` (+ điền các trường đang trống) cho khách đã có nếu chắc chắn (a); trường hợp (b) và trùng nội bộ trong file (đã có 1 cặp trùng tên) → **chỉ liệt kê để người duyệt**, không ghi.
   - Chạy lại nhiều lần không sinh bản ghi thừa (khóa: `kiotviet_code`).
3. **Báo cáo dry-run** (`tmp/import-khach-<ngày>.md` + CSV): tổng số dòng, sẽ tạo mới N, sẽ khớp M, cần duyệt K (kèm lý do), khách **thiếu SĐT**, **thiếu địa chỉ**, mã khách có ký tự đặc biệt, phân bố nhóm khách hàng, tổng nợ dương/âm. Gemini nộp báo cáo này cho Claude/anh **trước** khi anh chạy `--apply`.
4. UI nhỏ: `CustomersPage`/`CustomerDetailPage` hiển thị & tìm theo **mã KiotViet**, nhóm khách hàng, nợ KiotViet (tham chiếu), badge "Thiếu địa chỉ/SĐT"; lọc "Chưa phân người phụ trách" + gán hàng loạt.

Nghiệm thu: dry-run chạy ≥ 2 lần cho cùng kết quả, không ghi DB (kiểm bằng cách không cấp khóa ghi hoặc `--apply` vắng mặt); số liệu báo cáo khớp số đo ở trên (269 dòng…); mã có dấu/khoảng trắng vẫn khớp đúng; khách có địa chỉ ra đúng 1 `customer_addresses` mặc định.

## WP3 — Khách đặt hàng dễ (`sale-webapp/src/pages/DatHangPage.tsx`, `DatHangExcelPage.tsx`, `MyOrdersPage.tsx`, `MyOrderDetailPage.tsx`)

1. Mỗi tab đơn có thanh **Giao hàng**: *Ngày giao* (mặc định `earliestDate`, chọn đến +30 ngày) + *Điểm giao* (dropdown địa chỉ của khách, mặc định điểm `isDefault`). **Bỏ ô địa chỉ gõ tay**, địa chỉ chỉ đọc. Chưa có địa chỉ nào → chặn đặt + "Vui lòng liên hệ TPS1 để bổ sung địa chỉ giao hàng".
2. **Đếm ngược giờ chốt** ("Còn 2h15 để chốt đơn giao ngày mai — 16:30"); chọn ngày quá giờ → banner vàng "Đơn trễ giờ chốt — Vận hành sẽ xác nhận lại, có thể không kịp giao", vẫn cho gửi. Tính theo `serverNow` (không tin đồng hồ máy khách).
3. **Ghi chú/quy cách từng dòng** trong giỏ (`OrderTab.cart[*].note`) → `items[].note`.
4. **Số lượng thập phân** cho hàng kg: bỏ ép nguyên (`DatHangPage.tsx:152` `Math.round`); ô nhập `step="0.1"` min 0.1; nút +/- bước 1 (0,5 khi ĐVT kg); cả ô "SL trước khi Thêm".
5. **Đặt lại đơn cũ** (`MyOrderDetailPage` + dòng đơn trong `MyOrdersPage`) → tạo tab mới với các dòng, **lấy giá hiện tại**, cảnh báo dòng ngừng bán, hỏi ngày giao mới.
6. **"Hay đặt"** (từ `frequent-items`) hiện khi ô tìm kiếm rỗng; bấm để thêm nhanh.
7. **Excel** (`DatHangExcelPage.tsx`): dùng chung thanh Giao hàng; **mang cột "Ghi chú" vào `items[].note`** (đang bị bỏ `:73-81`); còn dòng `not_found/invalid_quantity/ambiguous` chưa xử lý → hộp xác nhận liệt kê từng dòng sẽ bị bỏ (hiện im lặng loại bỏ `:63-67`).
8. **Hủy đơn** ở `MyOrderDetailPage` (chọn lý do); sau giờ chốt: "Đã quá giờ chốt — liên hệ Vận hành".
9. Danh sách/chi tiết đơn hiển thị *Ngày giao*, *Điểm giao*, badge "Trễ giờ chốt", ghi chú dòng.

Nghiệm thu: đặt được đơn có ngày giao + điểm giao + ghi chú + 2,5 kg; DB đúng; sau giờ chốt vẫn đặt được và `is_late_order=true`.

## WP5 — Đơn tổng & FILE TỔNG GỬI THU MUA (trọng tâm Phase 1)

**Trang `sale-webapp/src/pages/DonTongPage.tsx`, route `/don-tong`** (quyền `procurement.view`; thêm vào menu cho `admin, truong_phong, thu_mua, kho, sale`).

Màn hình:
1. Lọc: *Ngày giao* (mặc định ngày mai; nút Hôm nay/Ngày mai), tick "Gồm cả đơn chờ xác nhận".
2. Bảng theo **nhóm hàng** (`category`, có tổng nhóm, thu gọn/mở): Mặt hàng · ĐVT · **Tổng SL cuối cùng** · (SL khách đặt) · Số đơn/Số khách · Tồn kho · **Cần bù** (đỏ khi > 0). Bấm dòng → xổ danh sách khách + SL + ghi chú quy cách.
3. Khối **Đối chiếu** ("Tổng số đơn Y · Tổng dòng hàng X · Đơn tổng khớp ✓/lệch ✗") và **Đơn trễ giờ chốt** (nổi bật vàng).
4. Cảnh báo **"Có N đơn thay đổi sau lần xuất lúc HH:mm"** (từ `changedSinceLastExport`) để Thu mua biết file cũ đã lệch.
5. Nút **"Tải file tổng hợp soạn hàng (Excel)"**; kèm nút **xác nhận đơn hàng loạt** cho các đơn `pending` của ngày đó (hiện kết quả `confirmed/skipped` + lý do).

**Hàng đợi xử lý theo ngoại lệ (để 1 nhân viên Vận hành gánh được ~150 đơn/ngày — bổ sung 20/09):** thay vì mở từng đơn, tab **"Cần xử lý"** trên `/don-tong` (và lọc tương ứng ở `OrdersPage`) chia đơn `pending` của ngày giao thành:
- **Đơn sạch** = khách đã xác thực, **mọi dòng có giá > 0** (theo hợp đồng/hạng), không trễ giờ chốt, không vượt hạn mức công nợ → nút **"Xác nhận tất cả đơn sạch (N đơn)"** (dùng `bulk-confirm`), có hộp xác nhận liệt kê số đơn/số tiền, không cần mở từng đơn.
- **Đơn cần xem** kèm **lý do dạng nhãn**: `Có hàng chưa có giá` · `Khách chưa xác thực` · `Trễ giờ chốt` · `Vượt hạn mức công nợ` · `Số lượng bất thường` (lệch > 3× trung bình 30 ngày của chính khách ở mặt hàng đó, khi khách có ≥ 5 đơn lịch sử) · `Có hàng đã ngừng bán`. Mỗi đơn mở nhanh bằng ngăn kéo bên phải (xem dòng hàng, sửa giá/SL, xác nhận) không rời trang.
- API `GET /api/admin/orders/attention?date=` trả `{clean[], needsAttention[{orderId, reasons[]}]}` (tính bằng 1–2 query gộp, không N+1; dùng đúng logic giá `resolve_product_price`/công thức trong `customer/products` và logic hạn mức hiện có ở `credit-override`). "Ghi chú dòng" **không** làm đơn thành "cần xem" (đã hiện sẵn trong file tổng cho Thu mua) nhưng hiện biểu tượng ghi chú.
- Hiển thị số liệu đo được ngay trên màn: "Hôm nay: 148 đơn · 121 đơn sạch (82%) · 27 cần xem".

**FILE EXCEL `TONG_HOP_SOAN_HANG_<yyyy-mm-dd>.xlsx`** (khổ A4 ngang, lặp dòng tiêu đề mỗi trang, cố định hàng đầu, tiếng Việt có dấu, số lượng định dạng 0,0):
- **Dòng tiêu đề chung ở mỗi sheet:** "TỔNG HỢP SOẠN HÀNG — Giao ngày dd/mm/yyyy", "Xuất lúc HH:mm dd/mm/yyyy bởi <tên>", "Phạm vi: đơn Đã xác nhận + Đang soạn (± Chờ xác nhận)", số đơn/số dòng.
- **Sheet 1 "Tổng hợp"**: theo *nhóm hàng* (mỗi nhóm 1 khối có dòng tiêu đề nhóm + tổng nhóm): STT · Mã hàng · Tên hàng · ĐVT · **Tổng SL cuối cùng** · SL khách đặt ban đầu · Số đơn · Số khách · Tồn kho · Cần bù · Ghi chú của khách (gộp "Tên khách: ghi chú"). Chân trang: tổng số mặt hàng, tổng số đơn, dòng đối chiếu ✓/✗.
- **Sheet 2 "Chi tiết theo khách"**: mỗi dòng = 1 mặt hàng trong 1 đơn: Ngày giao · Mã đơn · **Tên khách hàng** · Điểm giao/Địa chỉ · Nhóm hàng · Mã hàng · Tên hàng · ĐVT · SL khách đặt · **SL cuối cùng** · Ghi chú dòng · Trạng thái · Trễ giờ chốt. Sắp theo khách → nhóm hàng → tên hàng; bật AutoFilter (Thu mua lọc theo khách để chia hàng).
- **Sheet 3 "Danh sách đơn"**: 1 dòng/đơn: Mã đơn · Khách · Mã KH · Điểm giao · Người nhận · SĐT · Số dòng hàng · Trạng thái · Trễ giờ chốt · Ghi chú đơn. Cuối: tổng số đơn.
- (Tùy chọn, làm nếu xong sớm & hỏi Claude trước): Sheet 4 "Ma trận" hàng × khách.
- Tổng ở Sheet 1 **bắt buộc bằng** tổng cộng dồn Sheet 2 (kiểm bằng SUMIF/công thức hoặc kiểm trong code trước khi trả file; lệch → không cho tải, báo lỗi).

Nghiệm thu: với ≥ 4 đơn thử / 3 khách / 2 nhóm hàng cùng ngày giao (gồm 1 đơn trễ giờ chốt, 1 dòng có số lẻ 2,5 kg, 1 ghi chú dòng): số trên màn hình = Sheet 1 = tổng Sheet 2 (đối chiếu tay); mở được bằng Excel & in A4 ngang đọc được; đơn `canceled` không có mặt; sửa 1 đơn sau khi xuất → cảnh báo "thay đổi sau lần xuất"; Sheet 3 khớp số đơn.

## WP4 — Tìm kiếm thông minh + tải nhanh + ảnh về Supabase

**Nguyên nhân chậm/kém chuẩn (đo 20/09/2026, 5.295 sản phẩm active):** (1) `?meta=1` kéo cả 5.295 dòng `category` mỗi lần mở trang (`app/api/customer/products/route.ts:53`); (2) mỗi lần tải danh sách kéo **toàn bộ** `product_tier_prices` của hạng và `customer_contract_prices` (`:82-94`); (3) ảnh gốc KiotViet ~60 KB/ảnh, ~1,3 s/ảnh, không lazy-load; ~10% sản phẩm (524: 177 `null` + 347 chuỗi rỗng) không có ảnh; (4) tìm `ilike '%từ%'` sắp A–Z, không hiểu không dấu, không tách từ, khớp giữa từ.

1. Migration `20260920b_product_search.sql`: `create extension if not exists unaccent, pg_trgm`; hàm `immutable_unaccent`; `products.search_text` (tên+sku+danh mục+tags, lower) + `search_text_plain` (bỏ dấu) do trigger cập nhật + backfill; chỉ mục GIN trigram.
2. RPC `search_products(p_query, p_category, p_limit, p_offset)` trả kèm `total`: tách từ, **mọi từ phải khớp**; gõ **có dấu** → khớp có dấu theo **ranh giới từ** trước (`bò` không kéo `bột/bơ/bờ` lên đầu), nới sang không dấu khi ít kết quả; gõ **không dấu** → khớp `search_text_plain`. Xếp hạng: tên đúng bằng cụm gõ > bắt đầu bằng > từ đầu là từ nguyên > `similarity()` giảm dần > có ảnh trước > A–Z. Fallback `similarity>0.3` khi 0 kết quả.
3. Route sản phẩm dùng RPC; giá tier/hợp đồng **chỉ cho đúng `product_id` của trang**; `count` chỉ ở trang đầu; `meta=1` → `select distinct` + `Cache-Control: private, max-age=600`. **Mục tiêu đo được: tải trang đầu < 1 s, gõ tìm < 500 ms** (báo số đo).
4. **Ảnh về Supabase (không cần API KiotViet):** `scripts/backfill-product-images.mjs` (sharp; chạy lại được, bỏ qua ảnh xong, theo lô 50): tải từ `cdn*-retail-images.kiotviet.vn` → **thumb 200×200 webp** + **ảnh vừa 800px webp** → Storage (kiểm bucket `products` & quyền public; `thumbs/{id}.webp`, `img/{id}.webp`) → ghi `thumb_url`, đổi `image_url` sang Supabase, giữ gốc ở `image_url_original`; chuỗi rỗng → `null`; log ảnh lỗi cho Thu mua. `upload-image/route.ts` cũng tự sinh thumb + ảnh vừa. Trang khách dùng `thumb_url` + `loading="lazy"` + `decoding="async"` + kích thước cố định; thiếu ảnh → placeholder chữ cái đầu + màu theo danh mục; ảnh 64px trong danh sách, bấm xem lớn.
5. UI `DatHangPage` (và Mini App): ô tìm kiếm lớn đầu trang; debounce 250 ms + `AbortController`; giữ kết quả cũ khi đang gõ; **tô đậm từ khớp**; hiện tổng "23 mặt hàng"; chip danh mục kèm số lượng; nút xóa tìm kiếm.
6. Nghiệm thu: bộ 15 từ khóa (bò, thịt bò, thit bo, ba chỉ, rau muống, hành, tôm, cá basa, gà, trứng, nước mắm, "bo" không dấu…) — báo top 5 mỗi từ; "bò" không có "bột/bơ" ở top; báo số ảnh đã chuyển/lỗi/dung lượng trước–sau/thời gian tải trước–sau.

## WP6 — Truy vết điều chỉnh tối thiểu (SOP B2–B3: không tự đổi hàng khi chưa thống nhất khách)

Chỉ làm mức tối thiểu để "số lượng cuối cùng" trong file tổng đáng tin:
1. `ordered_quantity` giữ nguyên số khách đặt (WP1); file tổng & màn Đơn tổng luôn hiện cả hai số.
2. Khi nhân viên chốt/sửa đơn (`app/api/admin/orders/route.ts` POST finalize + luồng `PosCreatePage` chế độ `processOrderId`): **trước** khi gọi RPC, so dòng hiện có với dòng gửi lên, ghi `order_history` (action `items_changed`, `actor` = tên thật) `payload.itemChanges=[{type:'qty'|'removed'|'added'|'replaced', productName, orderedQty, oldQty, newQty, reason}]`.
3. UI xử lý đơn: dòng khác `ordered_quantity`/bị xóa/thay → **bắt buộc chọn lý do** (Hết hàng / Khách yêu cầu / Thay thế đã thống nhất KH / Khác) + tick "Đã thống nhất với khách" khi loại `replaced|added`; thiếu thì không cho lưu; hiện cột "Khách đặt: X" cạnh SL đang sửa.
4. **Hoãn:** khối "Điều chỉnh so với đơn bạn đặt" cho khách + push thông báo.

Nghiệm thu: sửa SL/xóa/thay → đúng bản ghi `itemChanges`, actor là tên thật.

## WP6b — Yêu cầu điều chỉnh / hủy của khách (anh chốt 20/09: làm trong Phase 1)

**Bối cảnh:** hiện khách xem phiếu xác nhận thấy sai, hoặc muốn hủy sau giờ chốt, đều phải gọi/nhắn Zalo cho sale rồi sale sửa/hủy tay và không có dấu vết. Luồng chuẩn hóa (quyết định D9): khách **gửi yêu cầu** trên đơn → sale thấy trong hàng đợi "Cần xử lý" → sale **duyệt/từ chối** (đủ thẩm quyền, không cần Trưởng phòng) → hệ thống báo khách + giúp sale báo Thu mua.

1. **Migration `20260920e_order_change_requests.sql`** (viết file, không chạy; **bật RLS, không policy** — chỉ service-role): bảng `order_change_requests(id uuid pk, order_id uuid not null references orders(id) on delete cascade, customer_id uuid not null, type text check (type in ('adjust','cancel')), message text not null, status text not null default 'open' check (status in ('open','approved','rejected','done')), order_status_at_request text, packing_status_at_request text, after_cutoff boolean not null default false, requested_at timestamptz default now(), handled_by text, handled_at timestamptz, handled_note text)` + index `(status, requested_at)`, `(order_id)` + **unique partial index: tối đa 1 yêu cầu `open` cho mỗi đơn**. Thêm hàm SQL **`restore_inventory_for_order(p_order_id uuid, p_actor text)`** (security definer, chỉ `service_role`): với mỗi dòng `inventory_transactions` `type='out'` của đơn mà **chưa có** dòng `type='in'` cùng `order_id`+`product_id` có ghi chú bắt đầu bằng `'Hoàn kho hủy đơn'` → chèn dòng `in` cùng số lượng (trigger cập nhật `stock_qty`); **idempotent** (gọi 2 lần không hoàn 2 lần); viết theo mẫu `deduct_inventory_for_order` (`20260910_giai_doan_b_inventory_pricing.sql:90-122`). Kèm test SQL `tps1-miniapp/supabase/tests/restore_inventory.sql` (chỉ câu SELECT + kết quả mong đợi ghi comment).
2. **API khách** `POST /api/customer/orders/request-change` `{orderId, type, message (bắt buộc, ≤500 ký tự)}`: đơn phải thuộc khách; trạng thái `pending|confirmed|preparing` (không cho `shipping|completed|canceled`); mỗi đơn 1 yêu cầu `open` (trùng → 409 "Đã có yêu cầu đang chờ xử lý"); lưu `order_status_at_request`, `packing_status_at_request`, `after_cutoff` (tính bằng `getOrderCutoffInfo`); ghi `order_history` (action `change_requested`). `GET /api/customer/orders` trả thêm `change_request` (yêu cầu mới nhất: type/status/handled_note). Giữ nguyên `orders/cancel` cho đơn `pending` trước giờ chốt (khách tự hủy ngay; đơn `pending` chưa trừ kho nên không cần hoàn kho).
3. **API nhân viên:**
   - `GET /api/admin/order-change-requests?status=open&deliveryDate=` (quyền `orders.view`): danh sách kèm mã đơn, khách, ngày giao, tổng tiền, **`packing_status` hiện tại** (`not_started|in_progress|done`), `exportedToProcurement` (đơn có nằm trong lần xuất file tổng gần nhất của ngày giao đó không), thời gian đã chờ.
   - `POST /api/admin/order-change-requests/resolve` `{requestId, action:'approve'|'reject'|'done', note}` (quyền `orders.edit`; `sale` chỉ xử lý khách mình phụ trách, quy tắc giống `bulk-confirm`; **không cần Trưởng phòng**): `reject` bắt buộc `note`; `approve` với `cancel` → **hủy đơn**: `status='canceled'`, `cancel_reason`=lời khách, `canceled_by`=tên nhân viên, ghi `order_history` (actor thật), gọi `restore_inventory_for_order` nếu đơn đang `confirmed|preparing`; nếu `packing_status != 'not_started'` vẫn cho hủy nhưng **trả `warnings:['already_packing']`** để UI nhắc sale báo Kho; `approve` với `adjust` → chỉ đổi yêu cầu sang `approved` và trả `orderId` để UI mở màn **Xử lý đơn hàng** (sale sửa như hiện nay); `done` (sau khi sale chốt lại giá/phiên bản mới) → đóng yêu cầu. Mọi kết quả **gửi push cho khách** bằng `sendPushToCustomer` ("Đơn X đã được hủy theo yêu cầu" / "đã điều chỉnh, tải phiếu R{n}" / "yêu cầu bị từ chối: <note>").
   - Sửa **PATCH đổi trạng thái sang `canceled`** ở `app/api/admin/orders/route.ts` (nhân viên hủy tay): cũng gọi `restore_inventory_for_order` khi đơn đang `confirmed|preparing` (bịt lỗ hổng lệch tồn kho đã ghi nhận ở Đợt 2).
4. **Báo Thu mua/Kho (sale tự báo — hệ thống hỗ trợ):** trong `GET /api/admin/procurement/summary`, `changedSinceLastExport[]` phải **gồm cả đơn đã `canceled` sau lần xuất** (hiện đơn hủy bị loại khỏi truy vấn nên KHÔNG được cảnh báo) với `kind:'canceled'|'edited'|'change_requested'`. Màn `/don-tong` hiện **khối đỏ "Thay đổi sau lần xuất lúc HH:mm — cần báo Thu mua/Kho"** liệt kê từng đơn + nút **"Sao chép thông báo Zalo"** tạo sẵn đoạn chữ, VD: `⚠️ Giao ngày 22/09 — ĐƠN HỦY: HD123 (Cty ABC), gồm: Thịt bò 12kg; Rau muống 8kg. Sale <tên> báo lúc 17:12.`
5. **UI khách** (`MyOrderDetailPage.tsx`, sau đó Mini App ở WP7): đơn `pending` trước giờ chốt → giữ nút **Hủy đơn** (tự hủy); đơn `pending|confirmed|preparing` còn lại → nút **"Yêu cầu điều chỉnh"** và **"Yêu cầu hủy"** mở hộp nhập lý do (bắt buộc); có yêu cầu `open` → ẩn nút, hiện băng "Đã gửi yêu cầu lúc HH:mm — đang chờ Vận hành"; yêu cầu đã xử lý → hiện kết quả + ghi chú của nhân viên.
6. **UI nhân viên:** `OrdersPage` thêm cột/lọc "Có yêu cầu" (badge số yêu cầu đang mở, tính bằng 1 truy vấn gộp, không N+1); `OrderDetailPage` thêm khung **"Yêu cầu của khách"** (nội dung, giờ gửi, `packing_status`, đã xuất file tổng chưa, cảnh báo "Đơn đã/đang soạn — nhớ báo Kho") với nút **Duyệt hủy / Duyệt điều chỉnh (mở Xử lý đơn hàng) / Từ chối / Đã điều chỉnh xong**; tab "Cần xử lý" của `/don-tong` (WP5) có mục **"Yêu cầu của khách"**.
7. **Nghiệm thu:** (a) khách gửi yêu cầu hủy cho đơn `confirmed` sau giờ chốt → sale duyệt → đơn `canceled`, tồn kho hoàn đúng 1 lần (duyệt lại không hoàn thêm), khách nhận push; (b) đơn đã xuất file tổng bị hủy → xuất hiện trong khối đỏ + nút sao chép ra đúng nội dung; (c) yêu cầu điều chỉnh → sale sửa qua Xử lý đơn hàng, chốt lại → phiếu R2 → bấm "Đã điều chỉnh xong" → khách nhận push; (d) khách gửi 2 yêu cầu liên tiếp cho cùng đơn → bị chặn; (e) khách A không gửi/xem được yêu cầu của đơn khách B; (f) `sale` không duyệt được đơn khách người khác phụ trách; (g) hủy đơn `pending` trước giờ chốt vẫn tự hủy được như cũ.

## WP7 — Zalo Mini App (`tps1-miniapp/src`)

Sau khi WP3 & WP4 được duyệt, áp cùng hợp đồng API: checkout chọn *ngày giao* + *điểm giao* (`order-config`, thay địa chỉ text tự do ở `hooks.ts:161-201` bằng `addressId`), banner giờ chốt, ghi chú dòng, số lượng thập phân, tìm kiếm mới + thumbnail, "Đặt lại đơn này" mang theo ghi chú và hỏi ngày giao, hiển thị ngày giao/điểm giao ở chi tiết đơn, nút hủy đơn. Không sửa 2 lỗi typecheck cũ (`pages/orders/index.tsx:50`, `state.ts:153`).

## WP8 — Nghiệm thu tổng: `docs/PHASE1_KICH_BAN_KIEM_THU.md`

1. Đặt 16:00 giao ngày mai → không trễ; 16:45 → `is_late_order=true` + cảnh báo.
2. Giao Chủ nhật/Thứ Hai: đặt Thứ Bảy 16:50 (trước 17:00) không trễ, 17:10 trễ.
3. ≥4 đơn/3 khách/2 nhóm hàng → Đơn tổng, checksum, file Excel 3 sheet, đối chiếu tay (WP5).
4. Sửa đơn sau khi xuất → cảnh báo lệch; điều chỉnh SL cần lý do.
5. Khách hủy trước/sau giờ chốt.
6. Khách A gọi API địa chỉ/đơn khách B → bị chặn; 6 vai trò × API đúng ma trận.
7. **Luồng cũ không hỏng:** đơn mới đặt → xác nhận → (soạn) → nhập SL đã giao (`quantity_delivered`) → `completed` → tải **hóa đơn PDF** ở sale-webapp, miniapp, portal web; hóa đơn hiển thị đúng số thực giao.
8. Đơn cũ (trước migration) mở được ở mọi màn, xuất được file tổng nếu có `delivery_date`.
9. Chưa chạy migration → màn mới báo rõ, không sập.

## WP9 — Kết nối API KiotViet (SAU; chưa làm cho tới khi anh cấp khóa)

Chỉ **kéo về một chiều**, Supabase vẫn là dữ liệu chính (D8). Tên gian hàng `Retailer`: **`thucphamso1dongnai`** (anh xác nhận). Tài liệu: `https://www.kiotviet.vn/huong-dan-su-dung-kiotviet/retail-ket-noi-api/public-api/` (Gemini đọc lại bản gốc & gọi thử trước khi code). Tóm tắt: token `POST https://id.kiotviet.vn/connect/token` (`client_credentials`, scope `PublicApi.Access`); gốc `https://public.kiotapi.com`, header `Retailer` + `Authorization: Bearer`; `/products`, `/categories`, `/customers`, `pageSize` ≤ 100, `currentItem`, `lastModifiedFrom`; **GET ≤ 5.000 request/giờ**. Khóa do anh nhập vào Vercel env (`KIOTVIET_CLIENT_ID`, `KIOTVIET_CLIENT_SECRET`, `KIOTVIET_RETAILER`), **không dán vào chat/repo**. Việc: `lib/kiotviet.ts` (cache token, backoff, đếm request); đồng bộ hàng hóa tăng dần (Vercel Cron 15–30 phút) upsert theo `products.kiotviet_id unique` (hết trùng SKU), không mặc định ĐVT 'Kg', tồn kho chỉ ghi qua `inventory_transactions` (adjust); đồng bộ khách map theo mã. Nghiệm thu: ~5.295 sản phẩm không trùng, chạy lại không tạo mới, đổi 1 ảnh/giá ở KiotViet → về webapp ≤ 30 phút.

---

## 3. Quy tắc chung cho Gemini

- Không đụng repo `quanly`; không sửa RPC `customer_create_order`/`admin_create_order_full`/`admin_finalize_order_v2` (một phần định nghĩa nằm trong Dashboard) — dùng trigger + UPDATE sau RPC.
- Khách **không có Supabase Auth** → mọi truy vấn phía khách đi qua `/api/customer/**`, cấm `supabase.from()` trong trang khách.
- Migration chỉ viết file; code chịu được migration chưa chạy (mẫu `paymentsAvailable` ở `OrderDetailPage.tsx`).
- Env service-role thật: `SUPABASE_PRODUCTS_SERVICE_ROLE_KEY` (ưu tiên trước `SUPABASE_SERVICE_ROLE_KEY`) — không đổi `lib/customer-supabase-server.ts`.
- Không N+1; không tải cả bảng; không thư viện mới (trừ `sharp` cho script ảnh); tiếng Việt; giữ theme hiện có.
- Sau mỗi WP: `cd sale-webapp && npx tsc --noEmit -p tsconfig.json`; root: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -i "<file đã sửa>"` (bỏ qua lỗi cũ `.next/types`); miniapp: `cd tps1-miniapp && npx tsc --noEmit -p tsconfig.json`.
- Báo cáo cuối mỗi đợt theo mẫu trong `GIAO_VIEC_GEMINI_PHASE1.md`.

## 4. Checklist Claude rà soát

- [ ] Không lấn phạm vi (không tuyến/tươi-khô/NCC/status mới/sửa RPC/đẩy sang KiotViet).
- [ ] File tổng: số khớp 3 nơi (màn hình, Sheet 1, Sheet 2); nhóm hàng đúng; tên khách, SL cuối cùng + SL ban đầu, ghi chú đủ.
- [ ] Bảo mật: khách A/B; quyền 6 vai trò; giá/địa chỉ/giờ chốt không lấy từ client.
- [ ] Múi giờ VN đúng; giờ chốt dùng giờ server.
- [ ] **Luồng thực giao → hoàn thành → hóa đơn cũ vẫn chạy.**
- [ ] Đơn cũ (cột mới null) không làm sập màn nào; không N+1, không `.limit(500)` ngầm.
- [ ] Typecheck sạch trong file đã sửa.
