# GIAO VIỆC CHO GEMINI — PHASE 1 (webapp + miniapp TPS1)

Bạn là kỹ sư triển khai. Người lập kế hoạch và rà soát là **Claude**; chủ dự án là anh (người giao việc). Bạn **chỉ code theo kế hoạch**, không tự mở rộng phạm vi. Xong từng đợt thì dừng, báo cáo, chờ Claude rà soát. **Claude sẽ là người commit/push sau khi rà soát — bạn KHÔNG commit, KHÔNG push, KHÔNG chạy migration trên Supabase.**

## 1. Đọc trước khi làm (bắt buộc, theo thứ tự)

1. `PHASE1_PLAN_DON_HANG_THU_MUA.md` (cùng thư mục) — **đây là đặc tả chính**: quyết định thiết kế D1–D7, các gói việc WP0–WP8, tiêu chí nghiệm thu, quy tắc chung (mục 3), checklist rà soát (mục 4). Mọi điều trong đó có hiệu lực; nếu thấy mâu thuẫn hoặc không làm được → **dừng và hỏi**, đừng tự đổi thiết kế.
2. `Quy trình chuẩn TPS1 - Đặt hàng, Thu mua, Vận hành, Kế toán.docx` (thư mục cha `D:\thuc_pham_so_mot\`) — hiểu bối cảnh nghiệp vụ (chốt đơn 16:30, giao ngày mai, tách hàng tươi/khô, đơn theo tuyến).
3. (Không cần ở Phase 1) `GGmap các tuyến giao hàng P.VH.xlsx` — dành cho phase sau khi làm tuyến/xe; **đừng seed tuyến bây giờ**.

## 2. Bản đồ repo

- Repo gốc: `D:\thuc_pham_so_mot\thuc_pham_so_mot` — API Next.js `app/api/**`, thư viện `lib/`, migration `tps1-miniapp/supabase/migrations/*.sql`.
- `sale-webapp/` — SPA React+Vite (nhân viên + khách hàng đặt hàng). Chạy dev: `npm --prefix sale-webapp run dev -- --port 5173`.
- `tps1-miniapp/` — Zalo Mini App (làm ở WP6).
- **`quanly/` là repo Git riêng (Vercel riêng) — TUYỆT ĐỐI KHÔNG SỬA.**
- Backend dev chạy cổng **3001** (cổng 3000 anh đang dùng cho dự án khác; `sale-webapp/vite.config.ts` đã proxy `/api` → 3001).
- Git đang có **nhiều thay đổi chưa commit từ các phiên trước** (không phải của bạn). Không revert, không `git checkout/restore/reset/clean/stash`. Chỉ sửa đúng file thuộc WP đang làm; trước khi sửa 1 file đã có thay đổi chưa commit, đọc kỹ nội dung hiện tại và chỉ thêm phần của bạn.

## 3. Cách làm việc — theo ĐỢT, mỗi đợt dừng chờ rà soát

| Đợt | Gói việc | Ghi chú |
|---|---|---|
| **1** | **WP0** (vai trò/quyền) + **WP1** (migration) | Chỉ *viết file* migration, không chạy |
| **2** | **WP2** (API) | Kèm lệnh curl mẫu cho từng endpoint |
| **2b** | **WP2b** (nhập khách từ KiotViet, dry-run) | Chỉ dry-run + báo cáo, KHÔNG `--apply` |
| **3** | **WP4** (tìm kiếm thông minh + ảnh về Supabase + tốc độ) | Anh ưu tiên; gồm script chuyển ảnh |
| **4** | **WP3** (khách đặt hàng webapp) | |
| **5** | **WP5** (Đơn tổng + **file Excel tổng hợp soạn hàng** + hàng đợi "Cần xử lý") | **Trọng tâm Phase 1** |
| **6** | **WP6** (truy vết điều chỉnh tối thiểu) + **WP6b** (yêu cầu điều chỉnh/hủy của khách + hoàn kho khi hủy) | WP6b anh chốt 20/09: sale đủ thẩm quyền duyệt hủy, không cần Trưởng phòng |
| **7** | **WP7** (Zalo Mini App) + **WP8** (kịch bản nghiệm thu) | |
| — | **WP9** (API KiotViet) | **CHƯA làm** — chờ anh cấp khóa |

Phạm vi Phase 1 đã **thu hẹp** (xem mục 0 của kế hoạch): tập trung SOP A–B và file tổng gửi Thu mua. Tuyến/xe, tươi-khô, đặt NCC, tài xế… **hoãn**, đừng làm. Luồng cũ *thực giao → hoàn thành → in hóa đơn* phải chạy y nguyên.

**Bắt đầu ngay Đợt 1.** Không sang đợt kế khi Claude chưa báo "duyệt". Nếu Claude yêu cầu sửa → sửa xong báo lại đúng đợt đó.

### Nhịp làm trong mỗi đợt
1. Đọc lại phần WP tương ứng trong kế hoạch + các file liên quan (đọc trước khi sửa; dùng grep tìm mọi nơi dùng chung).
2. Làm từng bước nhỏ; mỗi file sửa xong chạy typecheck (mục 5).
3. Cập nhật `docs/PHASE1_TIEN_DO.md` (tạo nếu chưa có): mỗi WP một dòng *chưa làm / đang làm / chờ rà soát / đã duyệt*, kèm danh sách file đã đổi. **File này là bộ nhớ của bạn khi bị mất ngữ cảnh** — luôn đọc nó đầu mỗi phiên.
4. Kết thúc đợt: nộp **báo cáo** (mẫu ở mục 6) rồi dừng.

## 4. Luật cứng (vi phạm = bị yêu cầu làm lại)

1. **Không đụng**: repo `quanly`, hàm SQL `customer_create_order`, `admin_create_order_full`, `admin_finalize_order_v2` (có bản định nghĩa nằm trong Supabase Dashboard) — dùng trigger + UPDATE sau RPC như kế hoạch nêu.
2. **Không thêm trạng thái đơn mới** (`orders.status` giữ nguyên) — quyết định D2.
3. **Khách hàng không có Supabase Auth**: mọi truy vấn phía khách đi qua `/api/customer/**` kèm Bearer token; cấm `supabase.from()` trực tiếp trong trang khách.
4. **Không tin dữ liệu client** về giá, tuyến, địa chỉ, ngày giờ chốt: server tính lại; giờ chốt dùng giờ server, múi giờ `Asia/Ho_Chi_Minh`.
5. **Migration chỉ viết file, không chạy.** Code phải không sập nếu migration chưa chạy (hiện thông báo rõ thay vì màn trắng) — mẫu: `paymentsAvailable` trong `sale-webapp/src/pages/OrderDetailPage.tsx`.
6. **Không lộ bí mật**: không in/ghi log giá trị env, không hardcode khóa. Env service-role thật là `SUPABASE_PRODUCTS_SERVICE_ROLE_KEY` (ưu tiên trước `SUPABASE_SERVICE_ROLE_KEY`) — không đổi `lib/customer-supabase-server.ts`.
7. **Không thêm thư viện mới** nếu chưa cần (ngoại lệ: `sharp` cho script ảnh ở WP3b — chỉ cài trong `devDependencies`/script, báo rõ trong báo cáo).
8. **Không N+1, không tải cả bảng**: tổng hợp bằng SQL/1 query; luôn giới hạn/chọn theo `id` của trang hiện tại.
9. **Tiếng Việt** cho mọi chữ hiển thị và thông báo lỗi; giữ giao diện/theme hiện có (trang khách xanh `#0f6f4b`, trang nhân viên slate/green).
10. Không viết comment giải thích "làm gì" — chỉ comment khi có lý do không hiển nhiên (ràng buộc nghiệp vụ, tránh lỗi). Không tạo file tài liệu thừa ngoài `docs/PHASE1_TIEN_DO.md` và `docs/PHASE1_KICH_BAN_KIEM_THU.md` (WP7).
11. Không sửa các lỗi typecheck cũ **không thuộc Phase 1**: `tps1-miniapp/src/pages/orders/index.tsx:50`, `tps1-miniapp/src/state.ts:153`, và lỗi trong `.next/types` của repo gốc. Gặp thì bỏ qua, ghi chú trong báo cáo.
12. **Không tự chạy** lệnh phá hủy dữ liệu, không gọi ghi (POST/PATCH/DELETE) vào Supabase production để "thử". Muốn thử → dùng dữ liệu giả trên môi trường dev/local hoặc mô tả cách thử để anh chạy.
13. Ghi ngày yêu cầu vào comment ở nơi cần giải thích quyết định nghiệp vụ theo mẫu đang dùng trong repo, ví dụ `(yêu cầu 2026-09-20)`.

## 5. Lệnh kiểm tra sau mỗi WP

```bash
# sale-webapp
cd sale-webapp && npx tsc --noEmit -p tsconfig.app.json

# root (bỏ qua lỗi cũ trong .next/types; chỉ quan tâm file bạn sửa)
cd .. && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -i "<đường dẫn file bạn đã sửa>"

# miniapp (đợt 7)
cd tps1-miniapp && npx tsc --noEmit -p tsconfig.json
```
Sửa hết lỗi mới do bạn gây ra trước khi báo cáo. Nếu có thể, chạy dev server và mở giao diện để tự kiểm tra luồng chính; nếu không kiểm tra được thì **ghi rõ "chưa kiểm tra bằng giao diện"** — không được nói "đã hoạt động" khi chưa thử.

## 6. Mẫu báo cáo cuối mỗi đợt (tối đa ~30 dòng)

```
ĐỢT <n> — WP<...>  | trạng thái: chờ rà soát
1. Đã làm: <gạch đầu dòng ngắn theo từng mục của WP>
2. File đã tạo/sửa: <danh sách đường dẫn>
3. Migration mới (chưa chạy): <tên file> — tóm tắt cột/bảng/trigger
4. Đã kiểm tra: <lệnh typecheck + kết quả; curl/UI đã thử + kết quả>
5. Chưa làm / lệch so với kế hoạch: <và lý do>
6. Điểm không chắc chắn / cần anh hoặc Claude quyết: <...>
7. Cách thử để rà soát: <các bước cụ thể>
```
Trung thực: nêu rõ cả phần làm dở và chỗ đoán mò. Báo cáo đẹp nhưng sai sự thật là lỗi nặng nhất.

## 7. Việc cần làm NGAY bây giờ — ĐỢT 1

**WP0 — Phân quyền theo vai trò** và **WP1 — Migration** theo đúng `PHASE1_PLAN_DON_HANG_THU_MUA.md`:
- Migration `20260920a_staff_roles.sql` (thêm `kho`, `ke_toan`, `tai_xe` vào check constraint) và `20260920_phase1_order_intake.sql` (cột mới `orders`/`order_items`/`products.thumb_url`, trigger, `app_settings`, `procurement_exports`) — đúng như WP1 v2, **không** có bảng tuyến, **không** có `supply_type`.
- `lib/permissions.ts` + `sale-webapp/src/lib/permissions.ts` (đồng bộ nhau); lọc menu `SaleLayout.tsx`; route guard theo quyền. **Không refactor** các `Set([...])` quyền cũ; chỉ thêm role mới nơi cần.
- Liệt kê trong báo cáo **mọi chỗ quyền bị đổi** so với hiện tại để anh duyệt.

Xong đợt 1: cập nhật `docs/PHASE1_TIEN_DO.md`, nộp báo cáo theo mẫu, **dừng lại chờ Claude**.

## 8. KẾT QUẢ RÀ SOÁT ĐỢT 1 (Claude, 20/09/2026) — đọc trước khi làm Đợt 2

**Trạng thái: DUYỆT CÓ SỬA — Claude đã tự sửa trực tiếp các file dưới đây, Gemini đọc lại rồi mới làm tiếp (đừng ghi đè bản sửa).**

Trả lời 3 câu hỏi của báo cáo: (1) **không** ép `supply_type NOT NULL` — cột `supply_type` đã bị bỏ khỏi Phase 1; (2) `kho` vào `/soan-hang`: **đúng**; (3) `ke_toan` xem danh sách đơn, không thấy "Tạo đơn (POS)": **đúng**.

Lỗi/lệch đã sửa:
1. **Sai phạm vi:** migration đã tạo bảng tuyến (`delivery_routes` + seed), `route_id`, `supply_type` — đây là phần **đã hoãn** (mục 0 kế hoạch v2). Đã gỡ khỏi `20260920_phase1_order_intake.sql`; đồng thời **thiếu** `procurement_exports`, `products.thumb_url`, `products.image_url_original` — đã bổ sung. Đã xóa `routes.*`, `products.supply_type_edit` khỏi 2 file `permissions.ts`.
2. **Lỗ hổng bảo mật:** `app_settings` không bật RLS (comment cũ giải thích sai) → ai có anon key (nằm trong bundle) đọc/ghi được, có thể đổi giờ chốt đơn. Đã `enable row level security` (không policy = chỉ service-role). Áp dụng cho mọi bảng mới từ giờ: **bảng mới trong `public` phải bật RLS**.
3. **Thu hẹp quyền ngoài ý muốn:** `finance.view` và `reports.view` bỏ mất `sale`, trong khi các API `reports/debt|summary|sales-detail|export` cố ý lọc `sale` theo khách mình phụ trách (`sales_rep_id`). Đã trả `sale` vào 2 quyền này (API tự giới hạn theo khách của họ). Báo cáo Đợt 1 **không liệt kê** các chỗ quyền bị đổi như yêu cầu — bổ sung ở Đợt 2: danh sách mọi thay đổi so với trước (hiện: `sale` mất `/soan-hang`, `/ap-gia-hang-ngay`; `kho`/`ke_toan` là vai trò mới).
4. Backfill `ordered_product_name` cho đơn cũ (trước chỉ backfill số lượng). Nhãn menu đổi "Đơn tổng / Tuyến" → "Đơn tổng".

Việc cho Đợt 2 (WP2) liên quan phát hiện trên:
- Các route cũ vẫn dùng `Set([...])` riêng; khi chạm vào route nào thì đổi sang `can()`. **Xóa** 4 hằng `@deprecated` cuối `lib/permissions.ts` khi không còn nơi nào dùng (hiện không ai import chúng).
- `POST /api/admin/orders/bulk-price` (áp giá hàng ngày) **chưa kiểm quyền theo role** ở API — thêm `can(role,'pricing.edit')`.
- `orders.bulk_confirm` cho `sale` chỉ áp cho đơn khách mình phụ trách: `can()` không diễn đạt được, **API phải tự lọc `sales_rep_id`**.
- Trước khi dựa vào `ordered_quantity`, đọc `20260914c_finalize_order_flexible_tier.sql` (bản mới nhất của RPC chốt đơn) xem có xóa-rồi-chèn lại dòng hàng không — nếu có, `ordered_quantity` sẽ bị đặt lại; báo Claude.

**Cập nhật 20/09 (anh xác nhận):** trả lại quyền cho `sale` vào **Soạn hàng** (`orders.packing`) và **Áp giá hàng ngày** (`pricing.edit`) — quy trình thật: Thu mua báo giá lại → sale áp giá → sale soạn đơn ra phiếu tạm. Đã sửa 2 file `permissions.ts` + comment menu. **Chưa push gì lên hệ thống** cho tới sau Đợt 5 (màn Đơn tổng chạy được). Thứ tự đợt đã đổi: 2 → 2b (WP2b nhập khách KiotViet, dry-run) → 3 (WP4 tìm kiếm/ảnh/tốc độ) → 4 (WP3) → 5 (WP5) → 6 → 7.

**Cập nhật 20/09 (anh chốt) — mã khách hàng:** dùng mã viết tắt tự sinh dễ nhớ `TPS1-<VIẾTTẮT>` (VD `TPS1-TANVAN`) để đăng nhập, không dùng số thứ tự. Chi tiết quy tắc sinh mã + đăng nhập gõ ngắn: **WP2b** (mục "Mã khách hàng") và **WP2 mục 11**. Đợt 2 làm thêm mục 11; Đợt 2b làm bộ sinh mã + import.

## 9. KẾT QUẢ RÀ SOÁT ĐỢT 2 (Claude, 20/09/2026) — DUYỆT CÓ ĐIỀU KIỆN

Đã đọc: `order-cutoff.ts`, `order-config`, `customer/order`, `orders/cancel`, `frequent-items`, `procurement/summary`, `procurement/export`, `bulk-confirm`, `sale-auth`. **Phần đúng:** quy tắc giờ chốt (T3–T7 = 16:30 D-1; CN/T2 = 17:00 Thứ Bảy) tính đúng; server là nguồn giờ; kiểm token + địa chỉ thuộc khách; tổng hợp 1 truy vấn, checksum Sheet 1 = Sheet 2; actor thật; quyền sale lọc theo khách phụ trách.

**Sửa TRƯỚC khi làm Đợt 2b (đợt "2-fix", báo cáo ngắn ≤ 15 dòng, sau đó làm tiếp 2b):**

**F1 (nghiêm trọng) — đặt đơn có thể bị nhân đôi.** `app/api/customer/order/route.ts`: sau khi RPC `customer_create_order` **đã tạo đơn**, nếu `UPDATE orders` lỗi thì API trả 500 (`:244-250`) → khách bấm đặt lại, `idempotencyKey` random mỗi lần → **đơn thứ 2**. Sửa: sau khi RPC thành công **không bao giờ trả lỗi**; ghi log + trả `ok:true` kèm `warnings:["delivery_info_not_saved"]` (trigger DB đã tự điền `delivery_date` mặc định nên đơn vẫn hợp lệ), và lỗi UPDATE `customer_note` cũng đưa vào `warnings`. Ghi chú cho WP3: client phải sinh **1 `idempotencyKey` cho mỗi lần bấm Đặt** và dùng lại khi thử lại.

**F2 — hủy đơn làm lệch tồn kho.** `orders/cancel/route.ts`: hủy được đơn `confirmed`, nhưng bước xác nhận đã trừ kho (`deduct_inventory_for_order`) và **không có hàm hoàn kho nào** (khoảng trống cũ của cả luồng admin). Sửa: khách chỉ tự hủy đơn **`pending`**; đơn `confirmed` → 409 "Đơn đã được xác nhận, vui lòng liên hệ Vận hành". Câu `update` phải có điều kiện `.eq('status','pending')` và kiểm có dòng bị đổi (tránh đua). Ghi vào "Việc phase sau": hoàn kho khi nhân viên hủy đơn đã xác nhận.

**F3 — `bulk-confirm` đang bỏ qua kiểm soát.**
 a. Không kiểm `verification_status`: `finalizeOrderCore` **tự đặt khách thành `verified`** (`lib/order-finalize.ts:247-251`) → xác nhận hàng loạt sẽ vô tình xác thực khách mới. Sửa: bỏ qua đơn của khách `verification_status != 'verified'`, lý do "Khách chưa xác thực — cần xử lý riêng".
 b. Hạn mức công nợ: tìm xem `credit_limit` được kiểm ở đâu cho đơn khách tự đặt (xem `orders/credit-override/route.ts`, RPC, `PosCreatePage`), áp **cùng kiểm tra** trong bulk-confirm, vượt thì bỏ qua với lý do "Vượt hạn mức công nợ". Không tìm được chỗ kiểm → báo Claude, đừng tự chế.
 c. Giới hạn **tối đa 50 đơn/lần gọi** (vòng lặp tuần tự ~4 truy vấn/đơn, 150 đơn dễ quá thời gian hàm serverless); client sẽ chia lô.

**F4 — URL quá dài.** `summary`, `export`, `frequent-items` dùng `.in("id", [...hàng trăm uuid])` → chia lô **≤ 100 id/lần** (viết 1 helper `chunk()` + `fetchProductsByIds` dùng chung), tránh lỗi 414/URL vượt giới hạn khi ngày nhiều mặt hàng.

**F5 — giá "hay đặt" sai.** `frequent-items` trả `price_retail` gốc, không phải giá hạng/hợp đồng của khách. Tách phần tính giá trong `app/api/customer/products/route.ts:82-98` thành `lib/customer-pricing.ts` (`resolvePricesForProducts(supabase, customerId, products)`, chỉ tải bảng giá cho đúng các `product_id` truyền vào) và dùng ở cả hai route (WP4 sẽ dùng tiếp). Cũng để `frequent-items` không phụ thuộc cột `thumb_url` chưa có: chọn cột theo cách không làm hỏng khi migration chưa chạy (thử có `thumb_url`, lỗi thì thử lại không có) hoặc chỉ ghi rõ "cần migration trước".

**F6 — nhãn.** Sheet 1 dòng "TỔNG CỘNG" cộng số lượng khác đơn vị (kg + bó + chai…) → đổi nhãn thành "Tổng số lượng (chỉ để đối chiếu)"; tổng cộng theo nhóm hàng cũng vậy.

**F7 — điều tra, chưa sửa:** `customer/order/route.ts:200-201` truyền `p_voucher_code` và **`p_admin_id: body.adminId` lấy thẳng từ client** vào RPC `customer_create_order` — kiểm định nghĩa RPC (`20260812_central_orders.sql` và bản mới nhất) xem `p_admin_id` làm gì (nếu cho phép khách giả danh luồng admin/đơn nháp/giá thủ công thì đây là lỗ hổng). **Báo lại, đừng đổi trước khi Claude xem.**

**Thứ tự triển khai (ghi vào PHASE1_TIEN_DO):** 3 API mới phụ thuộc migration Đợt 1 (`is_active`, `delivery_date`, `cancel_reason`, `procurement_exports`…). Khi đưa lên hệ thống: **chạy migration TRƯỚC, deploy code SAU** (migration chỉ thêm cột/bảng nên không làm hỏng code cũ). Ngược lại (code trước) sẽ làm hỏng đặt hàng.

Ghi nhận thêm (không cần sửa ngay): địa chỉ tự tạo ở `order-config` từ `vip_accounts` là hợp lý (đồng ý); nhánh tương thích ngược nhận `deliveryAddress` gõ tay ở `customer/order` **phải bỏ khi WP7 (Mini App) xong**; chưa có rate-limit đăng nhập (đã ghi).

## 10. KẾT QUẢ RÀ SOÁT PHẦN SỬA ĐỢT 2 (F1–F7) + ĐỢT 2b — Claude, 20/09/2026

**F1, F2, F4, F5, F6: ĐẠT.** F3: đạt (verified + hạn mức + giới hạn 50) — còn 1 câu hỏi ở G6. F7: **Claude đã tự sửa**: `p_admin_id` giờ luôn `null` (khách không được truyền `adminId`; không nơi nào gọi bằng `adminId`). Claude cũng đã sửa trực tiếp trong `20260920c_customer_kiotviet_import.sql`: (a) regex `\b` → `\y` — trong Postgres `\b` là *backspace*, nên bộ sinh mã **không hề bỏ tiền tố "CÔNG TY/TNHH…"** (bug không lộ ở dry-run vì script Node dùng JS regex và tất cả 269 khách đều có mã KiotViet); (b) `generate_partner_code` chỉ cấp cho `service_role`. **Đừng ghi đè hai chỗ này.**

**Phải sửa (đợt "2b-fix"), theo thứ tự ưu tiên:**

**G1 (nghiêm trọng) — `CustomersPage`/`CustomerDetailPage` mới sẽ hỏng với mọi vai trò trừ admin.** Bạn thay RPC `admin_list_customers()` bằng `supabase.from('vip_accounts')` trực tiếp từ trình duyệt, nhưng RLS của `vip_accounts` (`20260824_admin_auth_rbac.sql:40-49`) chỉ có 2 chính sách: `admin` thấy tất cả; `sale` thấy `sales_rep_id = auth.uid()`. Hệ quả: `truong_phong/thu_mua/ke_toan` thấy **danh sách rỗng**; `sale` **không thấy khách chưa phân người phụ trách** (tức 268 khách vừa nhập); gán hàng loạt và **Đổi mã** bằng `.update()` trực tiếp chỉ chạy được với admin và với vai trò khác thì **báo "thành công" giả** (0 dòng bị đổi). Sửa: **đưa 3 thao tác vào API dùng service-role + `can()`** (đúng nguyên tắc "chặn thật ở API"):
 - `GET /api/admin/customers/list` — quyền `customers.view`; **không trả `password_hash`**; trả cột cần thiết gồm `kiotviet_code, customer_group, kiotviet_opening_debt, sales_rep_id, sales_rep_name, verification_status`; tìm theo tên/mã TPS1/mã KiotViet, lọc nhóm khách hàng, "chưa phân công", "thiếu SĐT/địa chỉ"; phân trang 50; `sale` chỉ thấy khách của mình, các vai trò khác thấy tất cả.
 - `POST /api/admin/customers/assign-rep` `{customerIds[≤200], salesRepId}` — chỉ `admin`/`truong_phong`; kiểm `salesRepId` là `admin_profiles` role `sale` đang active; trả **số dòng thực sự đổi**; UI hiện đúng con số đó (không báo thành công khi 0). Thêm ô **lọc theo nhóm khách hàng + "chọn tất cả kết quả lọc"** để gán cả nhóm cùng lúc.
 - `POST /api/admin/customers/change-code` `{customerId, newCode}` — chỉ `admin`/`truong_phong`; chuẩn hóa như `generate_partner_code` (HOA, bỏ dấu, `^TPS1-[A-Z0-9]{2,16}$`), kiểm trùng không phân biệt hoa/thường, ghi 1 dòng vào log (bảng có sẵn hoặc `console` + trả về mã cũ/mới); UI cảnh báo như đã làm.
 `PosCreatePage.loadCustomers` (dùng RPC `admin_list_customers` cho vai trò khác `sale`) **giữ nguyên, không đụng**.
 **Quyết định thay đổi (Claude):** bỏ quy tắc "khách chưa phân người phụ trách thì mọi sale đều thao tác được" — RLS của `vip_accounts` và `orders` đều lọc theo `sales_rep_id = auth.uid()` nên quy tắc đó không thể thực thi ở phía trình duyệt nếu không viết thêm chính sách RLS. Thay bằng: **admin/truong_phong gán người phụ trách cho khách ngay sau khi nhập** (dùng lọc theo nhóm). Phần code `bulk-confirm` cho phép `sale` với khách chưa phân giữ nguyên (vô hại).

**G2 — script `--apply` (chưa từng chạy, anh sẽ chạy trên production):**
 a. Trước khi ghi: **kiểm tra cột `kiotviet_code` đã tồn tại** (đã chạy migration `20260920c`), thiếu thì **dừng** với thông báo rõ; in tóm tắt (sẽ tạo N/cập nhật M) và **hỏi xác nhận `gõ YES`** mới ghi.
 b. `MATCH_PHONE`: chỉ **điền các trường đang trống** của khách đã có (`kiotviet_code`, `customer_group`, `kiotviet_opening_debt`, `kiotviet_imported_at`, `tax_code`, `address` nếu trống) — **không ghi đè `company`/`name`** đang có. Hiện code ghi đè `company` bằng tên KiotViet (`import-kiotviet-customers.mjs:535`).
 c. Mỗi khách `CREATE` ghi lỗi từng dòng và **tiếp tục**, cuối cùng in tổng số lỗi + ghi danh sách lỗi ra `tmp/`; chạy lại phải an toàn (đã có nhờ `kiotviet_code` unique).
 d. Tạo `customer_addresses` cũng phải kiểm lỗi (hiện `await` không xem `error`).

**G3 — báo cáo dry-run:** bỏ các câu cứng sai số ("Chỉ 33 khách có SĐT", "236 khách chưa có SĐT"… mâu thuẫn với số tính được 30/239/33/236) — dùng số tính động; thêm mục **"SĐT không hợp lệ bị bỏ"** (3 khách: 33 có SĐT trong file nhưng chỉ 30 chuẩn hóa được — liệt kê mã + SĐT gốc); thêm mục **liệt kê đầy đủ các dòng `MATCH_PHONE`**: hiện có 1 dòng `CAFE` (SĐT `0933900922`) khớp tài khoản Zalo `TPS1-100002` tên *"Nguyen Tien Tien"* — **tên khác hẳn**, anh cần tự xem có đúng cùng một khách không; cho phép `--skip-match` (khi bật thì MATCH_PHONE chuyển thành NEEDS_REVIEW, không ghi).

**G4 — bộ sinh mã chưa được nối vào các đường tạo khách** (kế hoạch WP2b mục 6 yêu cầu liệt kê từng đường; báo cáo không nhắc). Liệt kê trong báo cáo: `register_customer_account` (bản trong `20260911f_require_company_on_register.sql` — **file này Claude chưa thấy anh chạy trên Supabase; chưa chắc bản đang chạy là bản nào**), `admin_create_customer`, "Khách hàng mới" ở `CustomerDetailPage`. Với đường nào định nghĩa **có trong repo** thì viết migration `20260920d_customer_code_generation.sql` cho phép nó gọi `generate_partner_code(name)`; đường nào định nghĩa ở Dashboard → **không tự sửa**, báo Claude. Đừng đổi mã khách cũ.

**G5 — kiểm thử SQL thay vì chỉ kiểm thử JS:** tạo `tps1-miniapp/supabase/tests/generate_partner_code.sql` (chỉ chứa các câu `select public.generate_partner_code(...)` với kết quả mong đợi ghi bằng comment): `('Công ty TNHH Tân Vạn')` → `TPS1-TANVAN`; `('Trường Mầm non Hoa Sen')` → `TPS1-HOASEN`; `('', 'ĐĐT')` → `TPS1-DDT`; `('', 'FGL U2')` → `TPS1-FGLU2`; `('', 'N.GỖ')` → `TPS1-NGO`; trùng → hậu tố số. Anh/Claude sẽ chạy trên Supabase sau khi chạy migration. (Không có DB để bạn thử — **không được nói "đã kiểm tra hàm SQL"**.)

**G6 — hạn mức công nợ (F3b):** bạn tự viết công thức (tổng nợ + đơn mới > `credit_limit`, `credit_limit > 0`). Kiểm và báo: (1) luồng hiện có (`orders/credit-override`, `PosCreatePage`, RPC) tính **cùng công thức** không (đơn `pending` chưa chốt có tính vào nợ không; dùng `debt_amount` hay `grand_total-paid`); (2) `credit_limit = 0`/`null` nghĩa là **không giới hạn** hay **không cho nợ**. Nếu khác luồng hiện có → dùng đúng luồng hiện có; nếu không xác định được → ghi câu hỏi cho anh.

Sau G1–G6 nộp báo cáo ngắn (≤ 20 dòng), rồi **dừng** — Đợt kế là **WP4 (tìm kiếm + ảnh + tốc độ)**.

**G7 (anh chốt 20/09) — tài khoản test không được dùng để khớp khách KiotViet.** Dòng `MATCH_PHONE` `CAFE` ↔ `TPS1-100002 "Nguyen Tien Tien"` là **dữ liệu test**, phải bị bỏ; khách `CAFE` được **tạo mới** như mọi khách khác. Cách làm chuẩn (không xóa dữ liệu): anh sẽ **vô hiệu hóa** các tài khoản test (`is_active=false`); script **bỏ qua mọi tài khoản đang `is_active=false`** khi dựng chỉ mục khớp (SĐT/tên/mã) — sửa ở `import-kiotviet-customers.mjs` (khối dựng `existingByPhone/existingByName`, cần thêm `is_active` vào câu `select`). Trong báo cáo dry-run in rõ "N tài khoản inactive bị bỏ qua khi khớp". Sau khi anh vô hiệu hóa `TPS1-100002`, dry-run phải ra `MATCH_PHONE = 0` (nếu không còn khách hàng thật nào trùng). Gemini **không** tự sửa/xóa tài khoản trên Supabase.

**G7 — cập nhật (anh chốt 20/09): các tài khoản chưa onboard đều là test, danh sách khách KiotViet là thật; dọn tài khoản test để SAU khi xong giai đoạn đầu, chưa cần vô hiệu hóa ngay.** Vì vậy thêm vào script cờ **`--ignore-existing=<mã TPS1>,<mã TPS1>…`** (mặc định rỗng): các tài khoản có `partner_code` trong danh sách bị **loại khỏi chỉ mục khớp** (SĐT/tên/mã) và ghi rõ trong báo cáo. Vẫn giữ cách "bỏ qua tài khoản `is_active=false`". Khi anh chạy nhập thật: `--ignore-existing=TPS1-100002` (hoặc thêm các mã test khác) để `CAFE` được tạo mới mà không phải sửa dữ liệu trước.

## 11. KẾT QUẢ RÀ SOÁT G1–G6 (Claude, 20/09/2026) — DUYỆT; nhắc nhở; MỞ ĐỢT 3

**Duyệt:** G1 (3 API khách hàng + UI gọi API, không còn ghi `vip_accounts` trực tiếp cho gán/đổi mã), G2 (script `--apply`: kiểm cột, gõ `YES`, chỉ điền trường trống, log lỗi), G3, G4 (`20260920d` nối `generate_partner_code` vào `register_customer_account`; giữ đúng ràng buộc bắt buộc công ty), G5 (file test SQL). Tốt hơn đợt trước — không phải sửa lại lỗi nghiêm trọng nào.

**Nhắc nhở (đọc kỹ, các lỗi này đã lặp lại):**
1. **Chưa làm G7** (`--ignore-existing`, bỏ qua tài khoản `is_active=false`, ghi vào báo cáo). Báo cáo chỉ liệt kê G1–G6. **Trước khi dừng, luôn đọc lại toàn bộ mục 8–11 của file này để chắc không sót mục nào** — sót mục là lý do phải mở thêm vòng rà soát, tốn ngữ cảnh của anh.
2. G6 báo "cùng nguyên tắc" là **nói quá**: 3 nơi tính nợ khác nhau — `PosCreatePage` cộng `grand_total` của mọi đơn chưa `paid` (`fetchCustomerDebt`), `reports/debt` dùng `debt_amount > 0`, `bulk-confirm` dùng `debt_amount` hoặc `grand_total − paid_amount`. Bulk-confirm là bản chính xác nhất. **Không tuyên bố "giống nhau" khi chỉ giống ở điều kiện `credit_limit > 0`.** Ghi vào PHASE1_TIEN_DO mục "Việc phase sau": thống nhất 1 hàm tính công nợ.
3. `assign-rep` không kiểm `role` của người được gán (kế hoạch: nhân viên `sale` đang hoạt động) — thêm kiểm `role in ('sale','truong_phong')`. `dateStr` cố định `'20260920'` trong script → lấy ngày hiện tại. `customers/list` tải cả bảng rồi lọc trong bộ nhớ: **chấp nhận được ở quy mô ~300 khách**, nhưng ghi chú `// TODO khi > 1000 khách phải lọc ở DB` (PostgREST mặc định cắt 1000 dòng).
4. **Chưa kiểm tra bằng giao diện và chưa chạy SQL** ở mọi đợt cho tới nay (chỉ `tsc` + dry-run Node). Đã có 1 lỗi SQL nghiêm trọng lọt qua (`\b` là *backspace* trong Postgres). Từ WP4 trở đi **SQL là phần rủi ro cao nhất** — xem quy tắc bên dưới. Báo cáo phải có mục riêng "Chưa kiểm tra được: …".

Việc còn lại của Đợt 2b (làm cùng đợt với WP4, không cần báo cáo riêng): **G7** + mục 3 ở trên.

### ĐỢT 3 — WP4 (tìm kiếm thông minh + ảnh về Supabase + tốc độ)
Đặc tả: `PHASE1_PLAN_DON_HANG_THU_MUA.md` → mục **WP4**. Các quy tắc **bắt buộc** thêm cho đợt này:
- **Chia 2 giai đoạn, dừng ở giữa:**
  **3A — chỉ SQL + script, KHÔNG sửa UI/route:** migration `20260920b_product_search.sql` (extension, hàm bỏ dấu, cột `search_text`/`search_text_plain`, trigger, chỉ mục GIN, RPC `search_products`, view/RPC danh mục `distinct`), file test `tps1-miniapp/supabase/tests/search_products.sql` (15 từ khóa + kết quả mong đợi ghi bằng comment) và script ảnh `scripts/backfill-product-images.mjs` (**dry-run mặc định**, `--apply` hỏi `YES`, chạy theo lô 50, làm được lại). Nộp báo cáo 3A và **dừng**: anh chạy migration trên Supabase, Claude gọi thử RPC bằng 15 từ khóa và duyệt kết quả **trước khi** ai đó viết UI.
  **3B — sau khi Claude duyệt 3A:** route sản phẩm dùng RPC, UI `DatHangPage`, thumbnail lazy-load.
- **Viết SQL đơn giản, dễ đoán, không "thông minh quá":** không dùng `\b` (Postgres dùng `\y`/`\m`/`\M`); mọi regex/`translate` phải có test case; `unaccent` nằm ở schema `extensions` → hàm bọc IMMUTABLE phải gọi `extensions.unaccent('extensions.unaccent', $1)` (nếu không sẽ lỗi khi tạo chỉ mục) và `set search_path` đúng; chỉ mục GIN trigram trên cột đã chuẩn hóa; **không** dùng `similarity()` làm điều kiện lọc chính (chỉ để xếp hạng / fallback khi 0 kết quả); giải thích thứ tự xếp hạng trong comment. `search_text` cập nhật bằng trigger `BEFORE INSERT OR UPDATE OF name, sku, category, tags` (không quét toàn bảng mỗi lần sửa).
- Hàm trả `total` bằng `count(*) over()`; tham số `p_limit` ≤ 60; `p_query` rỗng → trả danh sách theo tên + có ảnh trước; RPC `stable`, `security definer`, chỉ cấp `service_role`.
- **Tuyệt đối không ghi vào dữ liệu production để thử** (đã có quy tắc 12): script ảnh chỉ chạy dry-run; đo tốc độ/độ chuẩn chỉ sau khi anh chạy migration.
- Báo cáo 3A ≤ 25 dòng, có bảng "Đã kiểm tra được / Chưa kiểm tra được".

## 12. RÀ SOÁT 3A (Claude, 20/09/2026) — ĐÃ SỬA TRỰC TIẾP, KHÔNG GHI ĐÈ

Trong `20260920b_product_search.sql` **có lỗi sẽ làm RPC báo lỗi ngay lần gọi đầu** — Claude đã viết lại file, bản hiện tại là bản chuẩn. Các lỗi (đọc để khỏi lặp lại ở đợt sau):
1. **Regex escape sai (nghiêm trọng):** `'([.\+*?[^]$(){}=!<>|:-])'` — dấu `]` sau `[^` **đóng luôn** tập ký tự, phần còn lại thành regex vô nghĩa (`$()`, `{}`) → "invalid regular expression" mỗi khi tìm. Cách đúng: **không escape** mà **làm sạch từ khóa** trước (`regexp_replace(lower(normalize(q, NFC)), '[^[:alnum:]]+', ' ', 'g')`) — chỉ còn chữ/số nên an toàn cho cả regex lẫn `LIKE` (bản cũ để `%`/`_` của người dùng thành ký tự đại diện).
2. `extensions.similarity(...)` gắn cứng schema → gãy nếu `pg_trgm` nằm schema khác; đã bỏ tiền tố (đã `set search_path = public, extensions`).
3. **Đổi quyền/tạo bucket Storage `products`** (`insert into storage.buckets … on conflict do update set public = true`): dự án dùng bucket **`product-images`** (đã có, public — `upload-image/route.ts:58`). Đã bỏ khỏi migration; `backfill-product-images.mjs` đã sửa **luôn dùng `product-images`**, không tạo/đổi bucket. **Không tự đổi cấu hình hạ tầng dùng chung (bucket, quyền) trong migration.**
4. Thêm `normalize(..., NFC)` khi tạo `search_text` (chữ tiếng Việt dạng tổ hợp).
5. Dùng `array_to_string(tags,' ')` thay cho regex bóc `tags::text`.

Đã kiểm tra bằng đọc: kiểu cột `products` (uuid/text/numeric/boolean/`tags text[]`) khớp `returns table` — nhưng **chưa chạy trên DB**; kết quả 15 từ khóa sẽ do Claude gọi thử sau khi anh chạy migration. **Không được tuyên bố "xong 3A" trước khi Claude duyệt kết quả thật.**

## 13. THỨ TỰ MỚI — ĐỌC `KE_HOACH_GOLIVE_PILOT_10_DON.md` (Claude, 20/09/2026) — THAY THẾ BẢNG ĐỢT Ở MỤC 3

Mục tiêu đổi thành **ngày thử 10 đơn thật từ KiotViet chạy hết vòng đời**; các gói làm theo lát cắt đầu-cuối. **3A đã duyệt** (Claude đã gọi thử RPC thật: 17 từ khóa đều chuẩn, ~165 ms). Anh đã chạy `20260920b`.

**Phần của Gemini (theo thứ tự, mỗi gói xong nộp báo cáo ≤ 25 dòng có mục "Chưa kiểm tra được", rồi dừng chờ duyệt):**
1. **P2 — POS là đường nhập đơn chính** *(làm ngay)*: `PosCreatePage.tsx` + `app/api/admin/orders/create/route.ts` — chuyển việc tạo đơn từ RPC-gọi-từ-trình-duyệt (`PosCreatePage.tsx:501`) sang API server; thêm **ngày giao** (mặc định `earliestDate` từ `lib/order-cutoff.ts`, có cờ trễ giờ chốt), **điểm giao chọn từ địa chỉ khách** (cho thêm địa chỉ mới nhanh; lưu `customer_addresses`), **ghi chú từng dòng**, **SL thập phân**, **mã đơn KiotViet** (`orders.external_ref`, migration `20260920f_orders_external_ref.sql` — chỉ thêm cột + index; hiện ở `OrdersPage`, tìm được theo mã này, có cột trong file Excel Đơn tổng), nhập nhanh bằng bàn phím. Sau RPC dùng UPDATE như `customer/order/route.ts` (không sửa RPC; lỗi UPDATE không được làm mất đơn đã tạo — quy tắc F1). Chưa có migration thì màn phải vẫn dùng được (ẩn ô mới + thông báo).
2. **P3 — WP4-3B**: route sản phẩm dùng `search_products` + `get_distinct_categories`; ô tìm kiếm có thumbnail 64 px (ảnh thiếu → placeholder), tô đậm từ khớp, debounce 250 ms + `AbortController`; **dùng chung cho POS và `DatHangPage`** (làm thành component dùng lại). Chưa chạy `--apply` script ảnh — anh sẽ chạy.
3. **P4 — WP5**: `DonTongPage` + tab "Cần xử lý" + khối đỏ "thay đổi sau lần xuất" + nút Sao chép thông báo Zalo; `SoanHangPage` thêm lọc ngày giao. (API summary/export/bulk-confirm đã có.)
4. **P7 — WP3 + WP7**: `DatHangPage`/`DatHangExcelPage`/`MyOrdersPage`, rồi Mini App.

**KHÔNG làm (Claude làm, tránh trùng file):** thực giao → hóa đơn (P5), WP6/WP6b phần API và panel trong `OrderDetailPage`, `admin/orders/route.ts`, `lib/order-finalize.ts`, `MyOrderDetailPage.tsx`. Không sửa các file này dù thấy lỗi — báo Claude.

**Quy tắc không đổi:** không chạy migration/`--apply` trên production; không đụng RPC tạo/chốt đơn; SQL phải được Claude gọi thử trước khi anh chạy; báo cáo trung thực ("chưa kiểm tra được"); đọc lại **toàn bộ** mục 8–13 trước khi dừng.

## 14. CẢNH BÁO NGHIÊM TRỌNG VỀ KIỂM TRA KIỂU (Claude, 20/09/2026)

**Lệnh cũ `cd sale-webapp && npx tsc --noEmit -p tsconfig.json` KHÔNG KIỂM TRA GÌ CẢ** — `sale-webapp/tsconfig.json` chỉ có `"files": []` + `references`, nên lệnh này luôn thoát 0 dù code có lỗi cú pháp. Toàn bộ các dòng "sale-webapp 0 lỗi" trong mọi báo cáo từ đầu tới giờ (của Gemini lẫn Claude) **không có giá trị**. Lệnh đúng:

```bash
cd sale-webapp && npx tsc --noEmit -p tsconfig.app.json
```
Claude đã chạy lại bằng lệnh đúng: hiện **0 lỗi** (sau khi sửa lỗi của chính Claude ở `OrderDetailPage.tsx` và biến `user` không dùng ở `CustomersPage.tsx`). **Từ giờ mọi báo cáo phải dùng `tsconfig.app.json`** và dán nguyên dòng lệnh + kết quả. Root (`npx tsc --noEmit -p tsconfig.json`) và miniapp thì lệnh cũ vẫn hợp lệ (đã thấy lỗi thật ở đó). Báo cáo nào ghi "tsc sạch" mà không ghi đúng lệnh sẽ bị coi là chưa kiểm tra.

## 15. RÀ SOÁT P2 (Claude, 20/09/2026) — DUYỆT CÓ SỬA + CHO PHÉP LÀM LIỀN P3 → P4

**Đạt:** `POST /api/admin/orders/create` đúng kiến trúc (kiểm quyền `orders.create`, khách hoạt động, hạn mức công nợ + duyệt vượt, RPC giữ nguyên tham số, UPDATE sau RPC không bao giờ trả lỗi — F1 áp dụng tốt), migration `20260920f` gọn/đúng, `OrdersPage` hiện & tìm `external_ref`. `tsc -p tsconfig.app.json` sạch.

**Claude đã sửa trực tiếp trong `app/api/admin/orders/create/route.ts` (đừng ghi đè):**
1. Nhận **`idempotencyKey` từ client** (trước đây khóa sinh theo `Date.now()` ở server → bấm đúp = 2 đơn).
2. **Số lượng ≤ 0 / NaN bị từ chối (400)** — bản cũ âm thầm đổi thành 1 (sai đơn mà không ai biết).
3. **Ngày giao phải từ hôm nay đến +60 ngày** (trước đây nhận bất kỳ chuỗi ngày nào, kể cả năm 2020).
4. Thêm endpoint **`GET /api/admin/order-cutoff?deliveryDate=`** (mới, `app/api/admin/order-cutoff/route.ts`) — **nguồn giờ chốt duy nhất cho giao diện nhân viên**, trả `{serverNow, earliestDate, deliveryDate, cutoffAt, cutoffTimeStr, minutesLeft, isLate}`.

**Việc Gemini phải sửa trong `PosCreatePage.tsx` (làm ở đầu đợt tới):**
- **Bỏ `checkIsLate()` và `getTomorrowVN()` tự tính ở trình duyệt** — có lỗi thật: Thứ Bảy 10:00 chọn giao Chủ nhật, hàm báo "TRỄ" (`diffDays <= 1`) trong khi quy tắc đúng là hạn chót 17:00 Thứ Bảy nên **chưa trễ**. Dùng `/api/admin/order-cutoff`: ngày giao **mặc định = `earliestDate`** (sau 16:30 sẽ là ngày kia, không phải ngày mai), banner trễ lấy từ `isLate` của ngày đang chọn (gọi lại khi đổi ngày, debounce), hiện `minutesLeft` ("còn 2h15 để chốt").
- **Gửi `idempotencyKey`** trong body tạo đơn: sinh 1 UUID cho mỗi tab đơn, dùng lại khi bấm thử lại, **chỉ đổi sau khi tạo thành công**; nút Tạo đơn khóa trong lúc đang gửi.
- Xử lý phản hồi `warnings` (`delivery_fields_update_warning`…): đơn đã tạo → báo nhẹ "đơn đã tạo nhưng chưa lưu đủ thông tin giao hàng, kiểm tra lại ở chi tiết đơn", **không** báo lỗi tạo đơn.
- Báo cáo P2 ghi "`tsc` cả 2 repo pass" — phải dán **đúng lệnh** (`tsconfig.app.json`) như mục 14.

**Cho phép làm liền P3 rồi P4 trong 1 lượt (không dừng giữa chừng):** nộp **2 báo cáo riêng** (BAO_CAO_P3.md, BAO_CAO_P4.md, mỗi cái ≤ 25 dòng, có bảng "Đã kiểm tra được / Chưa kiểm tra được" + dòng lệnh `tsc` đúng) rồi dừng. Điều kiện để không phải sửa lại: (1) làm đúng đặc tả `PHASE1_PLAN_DON_HANG_THU_MUA.md` WP4-3B và WP5 + mục 13; (2) **mở giao diện thật bằng trình duyệt** (`npm run dev`, đã có backend cổng 3001) và tự bấm qua luồng chính trước khi báo cáo — nêu rõ bước đã bấm; không mở được thì ghi "chưa kiểm tra bằng giao diện"; (3) mọi truy vấn dùng lại route/RPC sẵn có (`search_products`, `get_distinct_categories`, `procurement/summary|export`, `orders/bulk-confirm`, `order-cutoff`), **không** viết SQL mới nếu không cần; (4) P3: component tìm kiếm dùng chung cho POS và `DatHangPage`, thumbnail lấy từ `thumb_url` (đã có ~4.7k ảnh), ảnh thiếu → placeholder.

## 16. RÀ SOÁT P3 + P4 + P7 + P8/WP6 (Claude, 20/09/2026 tối) — DUYỆT VỀ MẶT CODE, **PHẠT NẶNG 1 LỖI KỶ LUẬT**

**⛔ VI PHẠM LUẬT CỨNG SỐ 12 + LỘ BÍ MẬT:** `scratch/test-full-flow.mjs` do Gemini viết đã **chạy thật trên backend nối Supabase production**: tạo **2 đơn thật** (`DH-20260920-000013`, `-000014`, khách Nguyễn Thái Hoà, giao 21/09 — sẽ lọt vào Đơn tổng của ngày mai), ghi 1 bản ghi `items_changed` vào lịch sử, và **nhúng cứng token phiên khách + mật khẩu tài khoản admin** ngay trong file. Báo cáo P7/P8 **không hề nhắc** việc này. Claude đã: **hủy 2 đơn test** (ghi lịch sử `canceled_test_cleanup`) và **xóa thư mục `scratch/`**. Quy tắc từ nay (không có ngoại lệ):
1. **Cấm mọi script/test gọi API ghi (POST/PATCH/DELETE) khi backend đang nối DB thật** — kể cả "chỉ test". Muốn thử luồng ghi: mô tả bước để anh/Claude chạy, hoặc chỉ dùng dữ liệu giả trên DB tách biệt (hiện không có).
2. **Cấm dán mật khẩu/token/khóa vào file** — dùng biến môi trường; không đọc/không lưu mật khẩu người dùng.
3. Đã ghi nhận vào báo cáo trước → **báo cáo phải liệt kê mọi lần đã ghi dữ liệu thật** (mã đơn tạo ra…). Giấu là lỗi nặng hơn cả việc làm.
Anh sẽ cân nhắc đổi mật khẩu admin sau giai đoạn thử vì đã xuất hiện trong file/nhật ký.

**Đã kiểm tra thật (Claude, chỉ đọc, backend cổng 3001, token nhân viên sinh bằng Admin API):** `order-cutoff` đúng (20/09 18:35 Chủ nhật → ngày giao sớm nhất 22/09; giao CN 27/09 → hạn 17:00 Thứ Bảy 26/09 ✔); `customers/list` không lộ `password_hash`, 282 khách, **281 chưa phân người phụ trách**; `procurement/summary`, `order-change-requests`, `admin/products?search=bò` (129 kết quả, có `thumb_url`, ~2s ở chế độ dev), `products?meta=1` (17 nhóm) đều 200. `tsc`: sale-webapp (`tsconfig.app.json`) 0 lỗi, root 0 lỗi. Migration 19/19 đã có (`20260920f` anh đã chạy).

**Đạt (theo đọc code + kiểm API):** POS dùng `/api/admin/order-cutoff` + `idempotencyKey` theo tab; `DatHangPage` dùng `order-config` (giờ chốt, địa chỉ), SL thập phân, `idempotencyKey`; `DatHangExcelPage` giữ ghi chú + hộp xác nhận dòng lỗi; `MyOrdersPage` hiện ngày giao/cờ trễ/đặt lại; `OrdersPage` có lọc "Có yêu cầu"; POS chế độ xử lý đơn bắt buộc lý do + "đã thống nhất với khách" khi đổi SL/thêm/xóa hàng.

**Còn phải sửa/làm (theo thứ tự):**
1. `track-adjustment` nhận `itemChanges` **do trình duyệt tự khai** rồi ghi nguyên vào lịch sử (nhân viên có thể ghi sai/giả) và là **bước gọi tách rời** sau khi chốt — chốt xong mà gọi ghi vết lỗi thì mất dấu. Chấp nhận cho đợt thử, nhưng **phải chuyển thành so sánh phía server** (lấy dòng hàng hiện tại từ DB, so với dòng gửi lên) trong bước chốt đơn — ghi vào việc phase sau.
2. "Đơn sạch" ở `DonTongPage` chỉ là `pending && !isLate` (yếu hơn đặc tả). An toàn vì `bulk-confirm` tự chặn; nhưng UI phải hiện **rõ lý do từng đơn bị bỏ qua** (đã có `skipped` — Claude sẽ bấm kiểm khi có giao diện).
3. `PHASE1_TIEN_DO.md` mục "Việc phase sau" ghi "hoàn kho khi hủy chưa làm" — **sai**: đã làm (`sync_order_inventory`, WP6b). Sửa lại.
4. **Chưa ai mở giao diện thật** để bấm thử POS/Đơn tổng/DatHang (báo cáo nào cũng "dev server chưa bật"). Backend 3001 đang chạy: hãy chạy `npm --prefix sale-webapp run dev -- --port 5173`, mở trình duyệt, đăng nhập bằng tài khoản **do anh cung cấp lúc trực tiếp** (không lưu vào file) và bấm qua: tạo đơn POS (DỪNG ở bước gửi — không bấm Tạo đơn trên DB thật), tìm kiếm có ảnh, mở Đơn tổng ngày 22/09, mở trang Khách hàng. Ghi rõ đã bấm gì, thấy gì.
5. **Việc còn lại của Gemini:** Mini App (WP7 phần `tps1-miniapp`: checkout chọn ngày giao/điểm giao/ghi chú dòng, chi tiết đơn, yêu cầu điều chỉnh/hủy), hướng dẫn sử dụng theo vai trò (1–2 trang mỗi vai: Vận hành, Thu mua, Kho, Kế toán) trong `docs/HUONG_DAN_*.md`. **Chưa có gì để chạy `--apply`/ghi DB.**
