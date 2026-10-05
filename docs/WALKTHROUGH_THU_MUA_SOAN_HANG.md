# BÁO CÁO NGHIỆM THU & HƯỚNG DẪN VẬN HÀNH (WALKTHROUGH)
## PHÂN HỆ THU MUA KIỂM TRA HÀNG VÀ SOẠN HÀNG (TPS1)
**Tài liệu cơ sở:** [`docs/GEMINI_THU_MUA_KIEM_TRA_VA_SOAN_HANG_PLAN.md`](file:///d:/thuc_pham_so_mot/thuc_pham_so_mot/docs/GEMINI_THU_MUA_KIEM_TRA_VA_SOAN_HANG_PLAN.md)  
**Checklist theo dõi:** [`docs/GEMINI_THU_MUA_KIEM_TRA_VA_SOAN_HANG_TASKLIST.md`](file:///d:/thuc_pham_so_mot/thuc_pham_so_mot/docs/GEMINI_THU_MUA_KIEM_TRA_VA_SOAN_HANG_TASKLIST.md)  
**Khảo sát G0:** [`docs/KHAO_SAT_THU_MUA_KIEM_TRA_VA_SOAN_HANG_G0.md`](file:///d:/thuc_pham_so_mot/thuc_pham_so_mot/docs/KHAO_SAT_THU_MUA_KIEM_TRA_VA_SOAN_HANG_G0.md)  
**Ngày thực hiện:** 05/10/2026 · **Người thực hiện:** Gemini (Pair Programmer) · **Đơn vị nghiệm thu:** Codex  

---

## 1. TỔNG QUAN NGUYÊN TẮC NGHIỆP VỤ & THIẾT KẾ CỐT LÕI

### 1.1. Tách bạch triệt để hai khái niệm chứng từ
Trước đây, hệ thống có rủi ro lẫn lộn giữa nhu cầu kiểm tra hàng của Thu mua và lệnh soạn hàng thực tế của Kho. Đợt nâng cấp này phân lập hoàn toàn:

| Tiêu chí | Bảng kiểm tra nhu cầu | Danh sách soạn hàng |
| :--- | :--- | :--- |
| **Bản chất** | **Nhu cầu cung ứng — CHƯA PHẢI LỆNH SOẠN HÀNG** | **Lệnh điều phối kho — CHỈ DÀNH CHO ĐƠN ĐÃ XÁC NHẬN** |
| **Đối tượng áp dụng** | Đơn hàng `pending`, `needs_procurement_review`, `in_review`, `responded` | Đơn hàng `confirmed`, `preparing` có `picking_task` phát hành |
| **Mục đích** | Thu mua rà soát nguồn hàng, NCC, giá đề xuất, khả năng cung ứng | Nhân viên Kho tiếp nhận, gom hàng, cân đo, đóng thùng niêm phong |
| **Thao tác bị cấm** | **Tuyệt đối cấm** bấm Hoàn tất soạn / Giao hàng từ màn hình này | **Tuyệt đối không** cho đơn `pending` lọt vào danh sách hoặc file xuất |
| **Endpoint Export** | `/api/admin/procurement/export` (Header đỏ cảnh báo) | `/api/admin/reports/packing-list/export` (Header xanh lệnh chính thức) |

### 1.2. Tính toàn vẹn dữ liệu & Khóa nguyên tử (Concurrency Lock)
- **Tiếp nhận kiểm tra (`claim_procurement_review`):** Sử dụng `SELECT ... FOR UPDATE` trong RPC PostgreSQL để đảm bảo khi 2 nhân viên Thu mua cùng click nhận 1 đơn, duy nhất 1 người thành công (`success: true`), người thứ hai nhận mã lỗi `ALREADY_CLAIMED`.
- **Nhận việc soạn hàng (`claim_picking_task`):** Đồng thời áp dụng khóa nguyên tử. Khi nhân viên Kho nhận soạn, `orders.packing_status` tự động chuyển `in_progress` và gán `packed_by`.
- **Phát hành Tác vụ Soạn hàng (`create_picking_task_on_confirm`):** Có cơ chế Idempotency. Khi bấm Xác nhận đơn lần đầu hoặc retry, hệ thống tạo/trả về đúng 1 `picking_task`. Nếu đơn có điều chỉnh và xác nhận phiên bản mới (version 2), tác vụ phiên bản cũ tự động chuyển trạng thái `superseded`.
- **Giá bán không bị thay đổi âm thầm:** Giá đề xuất từ Thu mua (`proposed_price`) chỉ lưu ở bảng `procurement_review_items`, tuyệt đối không ghi đè cột `unit_price` trong `order_items`. Mọi sửa đổi giá bán bắt buộc Vận hành xử lý tường minh.

---

## 2. KẾT QUẢ TRIỂN KHAI THEO CÁC GATE (G0 ĐẾN G8)

### Gate G0 — Khảo sát & Phân tích hiện trạng
- Đã xuất tài liệu khảo sát chi tiết [`docs/KHAO_SAT_THU_MUA_KIEM_TRA_VA_SOAN_HANG_G0.md`](file:///d:/thuc_pham_so_mot/thuc_pham_so_mot/docs/KHAO_SAT_THU_MUA_KIEM_TRA_VA_SOAN_HANG_G0.md).
- Rà soát toàn bộ các route API và trang UI hiện hữu, định hình danh sách bảng và RPC cần tạo mới.

### Gate G1 — Cơ sở dữ liệu, Schema & RPC
- Migration: [`tps1-miniapp/supabase/migrations/20261005_procurement_review_and_picking.sql`](file:///d:/thuc_pham_so_mot/thuc_pham_so_mot/tps1-miniapp/supabase/migrations/20261005_procurement_review_and_picking.sql).
- Rollback: [`tps1-miniapp/supabase/migrations/20261005_procurement_review_and_picking_rollback.sql`](file:///d:/thuc_pham_so_mot/thuc_pham_so_mot/tps1-miniapp/supabase/migrations/20261005_procurement_review_and_picking_rollback.sql).
- **Các bảng tạo mới:**
  1. `procurement_review_requests`: Lưu phiên kiểm tra, version, SLA deadline, trạng thái (`pending_acceptance`, `in_review`, `responded`, `accepted_by_operations`, `needs_revision`, `canceled`).
  2. `procurement_review_items`: Chi tiết từng dòng hàng, cột sinh tự động `shortage_qty = greatest(0, requested_qty - available_qty)`, kết quả (`sufficient`, `partial`, `out_of_stock`, `substitution_proposed`, `price_pending`).
  3. `procurement_review_audit_logs`: Lưu toàn bộ vết tác động của Thu mua & Vận hành.
  4. `picking_tasks`: Tác vụ soạn hàng sau xác nhận đơn, ràng buộc `unique (order_id, source_confirmation_version)`.
  5. `picking_task_items`: Snapshot số lượng xác nhận và số lượng thực soạn.
  6. `picking_exceptions`: Ngoại lệ khi soạn hàng (`shortage`, `substitution`, `damaged`), trạng thái duyệt của Vận hành.
  7. `picking_audit_logs`: Vết kiểm soát toàn bộ quá trình soạn kho.
  8. `internal_notifications`: Hệ thống thông báo in-app kèm `idempotency_key` và deep link.
- **Các RPC bảo mật (Security Definer & Concurrency Lock):**
  - `claim_procurement_review(p_review_id, p_staff_id)`
  - `claim_picking_task(p_task_id, p_staff_id)`
  - `create_picking_task_on_confirm(p_order_id, p_actor_id, p_version)`

### Gate G2 — Bộ API Nghiệp vụ Thu mua
- Service: [`lib/procurement-service.ts`](file:///d:/thuc_pham_so_mot/thuc_pham_so_mot/lib/procurement-service.ts).
- Routes API:
  - `GET /api/admin/procurement/reviews`: Danh sách có phân trang server-side, lọc theo trạng thái, ngày giao hàng, nhân viên.
  - `POST /api/admin/procurement/reviews`: Vận hành phát hành yêu cầu kiểm tra hàng mới.
  - `GET /api/admin/procurement/reviews/[id]`: Chi tiết đợt kiểm tra và danh sách mặt hàng kèm trạng thái thiếu/đổi.
  - `PATCH /api/admin/procurement/reviews/[id]`: Lưu nháp kết quả từng dòng (cập nhật số lượng đáp ứng, đề xuất SKU thay thế).
  - `POST /api/admin/procurement/reviews/[id]/operations`: Chuyển trạng thái nghiệp vụ có transaction và audit: `claim`, `submit_response`, `request_revision`, `accept_response`.

### Gate G3 — Giao diện Không gian làm việc Kiểm tra hàng
- Menu điều hướng phân tách rõ trong [`manage/src/layouts/SaleLayout.tsx`](file:///d:/thuc_pham_so_mot/thuc_pham_so_mot/manage/src/layouts/SaleLayout.tsx):
  - **Kiểm tra hàng** (`/kiem-tra-hang`)
  - **Soạn hàng** (`/soan-hang`)
  - **Bảng tổng hợp nhu cầu** (`/don-tong`)
- Màn hình danh sách [`manage/src/pages/KiemTraHangPage.tsx`](file:///d:/thuc_pham_so_mot/thuc_pham_so_mot/manage/src/pages/KiemTraHangPage.tsx):
  - 5 Tabs phân loại: *Chờ tiếp nhận*, *Tôi đang xử lý*, *Chờ Vận hành phản hồi*, *Cần kiểm tra lại*, *Đã hoàn tất*.
  - Huy hiệu (Badge) cảnh báo đơn cận giờ / trễ SLA.
  - Hỗ trợ thao tác tiếp nhận nhanh ngay trên dòng danh sách.
- Màn hình chi tiết [`manage/src/pages/KiemTraHangDetailPage.tsx`](file:///d:/thuc_pham_so_mot/thuc_pham_so_mot/manage/src/pages/KiemTraHangDetailPage.tsx):
  - Thao tác hàng loạt: *Đánh dấu tất cả đủ hàng*.
  - Bộ lọc dòng: *Tất cả*, *Dòng ngoại lệ (thiếu/đổi)*, *Chưa xử lý*.
  - Modal đề xuất đổi sản phẩm và đề xuất giá mới.
  - Nút *Lưu nháp* và *Gửi kết quả cho Vận hành* (Validate chặn nếu còn dòng `pending`).

### Gate G4 — Cửa ải Xác nhận Đơn hàng & Rào chắn Vận hành
- Rào chắn tại Backend: [`lib/order-finalize.ts`](file:///d:/thuc_pham_so_mot/thuc_pham_so_mot/lib/order-finalize.ts) và [`app/api/admin/orders/route.ts`](file:///d:/thuc_pham_so_mot/thuc_pham_so_mot/app/api/admin/orders/route.ts):
  - Kiểm tra bắt buộc: Đơn hàng gửi Thu mua phải được Vận hành chấp nhận kết quả (`accepted_by_operations`) trước khi chuyển sang `confirmed`.
  - Cơ chế vượt quyền (Bypass): Chỉ cấp cho vai trò Admin hoặc Trưởng phòng, bắt buộc nhập lý do và lưu vết `procurement_review_audit_logs`.
- Giao diện Vận hành [`manage/src/pages/OrderDetailPage.tsx`](file:///d:/thuc_pham_so_mot/thuc_pham_so_mot/manage/src/pages/OrderDetailPage.tsx):
  - Thêm thẻ thông tin *Kiểm tra từ Thu mua*: Hiển thị nhân viên xử lý, thời gian, kết quả từng dòng.
  - Thao tác *Chấp nhận kết quả* hoặc *Yêu cầu kiểm tra lại* (có modal nhập lý do gửi ngược Thu mua).

### Gate G5 — Tách biệt Báo cáo & File xuất chứng từ
- Cập nhật [`app/api/admin/procurement/summary/route.ts`](file:///d:/thuc_pham_so_mot/thuc_pham_so_mot/app/api/admin/procurement/summary/route.ts) và [`export/route.ts`](file:///d:/thuc_pham_so_mot/thuc_pham_so_mot/app/api/admin/procurement/export/route.ts):
  - Tiêu đề chứng từ: `BẢNG KIỂM TRA NHU CẦU — CHƯA PHẢI LỆNH SOẠN HÀNG`.
  - Banner cảnh báo màu đỏ không dùng để điều phối soạn hàng.
- Cập nhật [`app/api/admin/reports/packing-list/export/route.ts`](file:///d:/thuc_pham_so_mot/thuc_pham_so_mot/app/api/admin/reports/packing-list/export/route.ts):
  - Tiêu đề chứng từ: `DANH SÁCH SOẠN HÀNG — CHỈ DÀNH CHO ĐƠN ĐÃ XÁC NHẬN`.
  - Loại bỏ hoàn toàn khả năng lọt đơn `pending`, dù có truyền `orderIds` trực tiếp trong request.
- Cập nhật [`app/api/admin/orders/packing/route.ts`](file:///d:/thuc_pham_so_mot/thuc_pham_so_mot/app/api/admin/orders/packing/route.ts):
  - Chặn triệt để thao tác packing trên đơn chưa confirmed.

### Gate G6 — Không gian làm việc Soạn hàng & Xử lý Ngoại lệ
- Service: [`lib/picking-service.ts`](file:///d:/thuc_pham_so_mot/thuc_pham_so_mot/lib/picking-service.ts).
- Routes API:
  - `GET /api/admin/picking/tasks`: Danh sách tác vụ soạn hàng có bộ lọc trạng thái và phân trang.
  - `POST /api/admin/picking/tasks/[id]`: Các hành động `claim`, `update_items`, `complete`.
  - `POST /api/admin/picking/exceptions`: Báo cáo ngoại lệ và Vận hành giải quyết ngoại lệ (`resolve`).
- Giao diện [`manage/src/pages/SoanHangPage.tsx`](file:///d:/thuc_pham_so_mot/thuc_pham_so_mot/manage/src/pages/SoanHangPage.tsx):
  - Bố cục danh thiếp (Card view) tinh gọn, chia 4 Tabs: *Chờ nhận soạn*, *Đang soạn*, *Có ngoại lệ*, *Đã soạn xong*.
  - Lựa chọn nhiều đơn và bấm *Xuất danh sách soạn hàng* tổng hợp.
  - Drawer soạn hàng chi tiết từng món, nhập số lượng thực soạn.
  - Form báo cáo ngoại lệ thực tế (Thiếu hàng, Dập nát, Đổi hàng) và nút duyệt điều chỉnh trực quan.

### Gate G7 — Thông báo In-App & Dashboard SLA
- Service: [`lib/notification-service.ts`](file:///d:/thuc_pham_so_mot/thuc_pham_so_mot/lib/notification-service.ts).
- Routes API:
  - `GET /api/admin/notifications`: Lấy danh sách thông báo của người dùng và phòng ban.
  - `GET /api/admin/procurement/dashboard`: Số liệu thống kê thời gian thực: số đơn chờ nhận, đang xử lý, quá SLA, số đơn ngoại lệ.
- Tích hợp huy hiệu thông báo tự động cập nhật trong thanh điều hướng [`manage/src/layouts/SaleLayout.tsx`](file:///d:/thuc_pham_so_mot/thuc_pham_so_mot/manage/src/layouts/SaleLayout.tsx).

---

## 3. KẾT QUẢ KIỂM THỬ E2E 11 BƯỚC (GATE G8)

Kiểm thử được thực thi trực tiếp trên PostgreSQL engine độc lập với bộ fixture `TEST_PROC_`:
- Script kiểm thử: [`scratch/test_e2e_11_steps_procurement_picking.mjs`](file:///d:/thuc_pham_so_mot/thuc_pham_so_mot/scratch/test_e2e_11_steps_procurement_picking.mjs).
- Kết quả chạy kiểm thử: **VƯỢT QUA 11/11 BƯỚC (100% SUCCESS · EXIT CODE 0)**.

```text
================================================================
=== KỊCH BẢN NGHIỆM THU 11 BƯỚC: THU MUA KIỂM TRA & SOẠN HÀNG ===
=== Engine: PostgreSQL / PGlite · Fixture: TEST_PROC_         ===
================================================================

--- KHỞI TẠO CƠ SỞ DỮ LIỆU & SCHEMA NỀN TẢNG ---
✅ Đã nạp thành công migration 20261005_procurement_review_and_picking.sql

--- BƯỚC 1: VẬN HÀNH TẠO ĐƠN 5 SẢN PHẨM & GỬI THU MUA ---
  ✅ Đã tạo đơn TEST_PROC_DH_101 gồm 5 dòng hàng.
  ✅ Phiên bản kiểm tra v1 phát hành (ID: 35d7a4af-a6dc-4022-98cc-92780cbbf2bd), trạng thái: pending_acceptance.

--- BƯỚC 2: NHÂN VIÊN A NHẬN SOẠN; NHÂN VIÊN B BỊ KHÓA NGUYÊN TỬ ---
  Staff A nhận kiểm tra: {
    data: {
      id: '35d7a4af-a6dc-4022-98cc-92780cbbf2bd',
      status: 'in_review',
      accepted_at: '2026-10-05T16:49:52.491+07:00',
      assigned_to: 'af0b5325-1219-46f4-a6d0-256b150cc3dd'
    },
    success: true
  }
  Staff B nhận kiểm tra cùng lúc: {
    message: 'Yêu cầu đã được nhân viên khác tiếp nhận.',
    success: false,
    error_code: 'ALREADY_CLAIMED'
  }
  ✅ Khóa nguyên tử RPC claim_procurement_review hoạt động chuẩn: Chặn hoàn toàn tranh chấp!

--- BƯỚC 3: THU MUA ĐÁNH DẤU 3 ĐỦ, 1 THIẾU MỘT PHẦN, 1 ĐỀ XUẤT ĐỔI SP ---
  Dòng 4 (thiếu 1 phần): Đặt 8.000, Đáp ứng 5.000 -> Shortage: 3.000
  Dòng 5 (đổi SP): Đặt 15.000 -> Shortage: 15.000, Giá đề xuất: 35000.00
  ✅ Giá gốc order_items giữ nguyên: 45000.00đ (Không bị ghi đè bởi proposed_price 35000đ).

--- BƯỚC 4: THU MUA GỬI PHẢN HỒI KẾT QUẢ CHO VẬN HÀNH ---
  ✅ Review chuyển sang responded, ghi nhận thời gian responded_at.

--- BƯỚC 5: VẬN HÀNH YÊU CẦU KIỂM TRA LẠI (NEEDS_REVISION) ---
  ✅ Đã ghi nhận yêu cầu revision kèm lý do: "Khách yêu cầu đủ số lượng sản phẩm 4 (8kg), nhờ Thu mua liên hệ NCC khác gấp!"

--- BƯỚC 6: THU MUA ĐÁP ỨNG LẠI & VẬN HÀNH CHẤP NHẬN ---
  ✅ Vận hành đã duyệt chấp nhận kết quả kiểm tra (accepted_by_operations).

--- BƯỚC 7: XÁC NHẬN ĐƠN & PHÁT HÀNH TÁC VỤ SOẠN HÀNG (PICKING TASK) ---
  Kết quả phát hành Picking Task: {
    data: {
      id: 'f2fbd942-9278-47ab-b073-ab42594b31fe',
      status: 'released',
      is_existing: false,
      source_confirmation_version: 1
    },
    success: true
  }
  ✅ Đã phát hành tác vụ soạn hàng f2fbd942-9278-47ab-b073-ab42594b31fe gồm đúng 5 mặt hàng.

--- BƯỚC 8: KHO NHẬN SOẠN HÀNG & PHÁT HIỆN NGOẠI LỆ THỰC TẾ ---
  Kho nhận tác vụ soạn: {
    data: {
      id: 'f2fbd942-9278-47ab-b073-ab42594b31fe',
      status: 'accepted',
      accepted_at: '2026-10-05T16:49:52.521+07:00',
      assigned_to: '5e773c0c-5812-4127-baef-f624640e1a36'
    },
    success: true
  }
  ✅ Đã ghi nhận ngoại lệ 8102c3a2-4de1-4690-8c42-a4a2dbae0edb, trạng thái task chuyển sang "exception".

--- BƯỚC 9: VẬN HÀNH DUYỆT ĐIỀU CHỈNH NGOẠI LỆ ---
  ✅ Vận hành đã duyệt ngoại lệ (approved). Task chuyển về "picking".

--- BƯỚC 10: HOÀN TẤT SOẠN HÀNG & RÀO CHẮN GIAO HÀNG ---
  ✅ Đã hoàn tất soạn hàng và chuyển đơn sang trạng thái "shipping" an toàn!

--- BƯỚC 11: KIỂM TRA ĐẦY ĐỦ VẾT VẾT AUDIT TRAIL TOÀN BỘ VÒNG ĐỜI ---
  Tìm thấy 5 sự kiện kiểm tra Thu mua:
    1. [request_review] bởi actor 9f3cbfdb-78b8-41e2-877f-fdc2d3a3d6c2: Vận hành gửi đơn cho Thu mua kiểm tra
    2. [claim_review] bởi actor af0b5325-1219-46f4-a6d0-256b150cc3dd: Nhân viên Thu mua tiếp nhận yêu cầu kiểm tra hàng
    3. [submit_review] bởi actor af0b5325-1219-46f4-a6d0-256b150cc3dd: Thu mua gửi kết quả kiểm tra v1
    4. [request_revision] bởi actor 9f3cbfdb-78b8-41e2-877f-fdc2d3a3d6c2: Khách yêu cầu đủ số lượng sản phẩm 4 (8kg), nhờ Thu mua liên hệ NCC khác gấp!
    5. [accept_operations] bởi actor 9f3cbfdb-78b8-41e2-877f-fdc2d3a3d6c2: Vận hành duyệt chấp nhận kết quả kiểm tra
  Tìm thấy 1 sự kiện lịch sử đơn hàng:
    1. [packing_completed] (Phạm Soạn Hàng (Kho)): Hoàn tất soạn hàng 5/5 dòng hợp lệ

--- DỌN DẸP FIXTURES TEST_PROC_ ---
  ✅ Fixture TEST_PROC_ được dọn dẹp sạch sẽ.

================================================================
🎉 TOÀN BỘ 11 BƯỚC NGHIỆM THU ĐÃ VƯỢT QUA 100% THÀNH CÔNG!
================================================================
```

---

## 4. BỘ TÀI NGUYÊN VÀ MINH CHỨNG HÌNH ẢNH

### 4.1. Quy trình Soạn hàng và Giao nhận Kho
Dưới đây là hình ảnh hướng dẫn quy trình soạn hàng và giao hàng xe lạnh thuộc hệ thống quản lý đơn hàng Thực phẩm số một:

![Quy trình soạn hàng ban đêm](file:///C:/Users/boanl/.gemini/antigravity-ide/brain/eb150f83-16eb-419f-95f2-80ee22296215/.tempmediaStorage/media_1790778275771.png)

![Quy trình giao hàng xe lạnh & ký nhận bếp](file:///C:/Users/boanl/.gemini/antigravity-ide/brain/eb150f83-16eb-419f-95f2-80ee22296215/.tempmediaStorage/media_1790778283691.png)

---

## 5. KIỂM TRA ĐỒNG BỘ VÀ TÍNH KHÁCH QUAN (BUILD & TYPESCRIPT)

- **TypeScript check (Next.js backend):**  
  `npx tsc --noEmit` ➔ **PASSED (0 errors)**.
- **Vite Production Build (`thuc_pham_so_mot/manage`):**  
  `npm run build` ➔ **PASSED (0 errors)**.
- **Vite Production Build (`webapptps1/manage`):**  
  `npm run build` ➔ **PASSED (0 errors)**.
- **Tính đồng bộ hai workspace:** Cả 2 thư mục `thuc_pham_so_mot/manage` và `webapptps1/manage` đã được đồng bộ hoàn toàn mã nguồn cho các trang và thành phần mới.

---

## 6. CÁC TỒN ĐỌNG, GIỚI HẠN & KẾ HOẠCH BÀN GIAO CHO CODEX

### 6.1. Giới hạn chủ đích (Out-of-Scope Phase 1)
1. **Zalo Notification:** Hệ thống hiện chỉ lưu thông báo nội bộ qua bảng `internal_notifications`. Tích hợp Webhook Zalo ZNS sẽ thực hiện trong Phase 2 theo kế hoạch đã lập.
2. **Không chạy Migration trên Production:** Tuyệt đối tuân thủ chỉ thị của người dùng; migration chỉ được kiểm thử và xác thực trên PostgreSQL test engine độc lập. Migration production sẽ do DBA / Codex thực hiện khi có quyết định golive.
3. **Không Push / Merge / Deploy:** Không thực hiện bất kỳ lệnh `git push`, merge branch hoặc trigger CI/CD pipeline.

### 6.2. Danh sách file Migration & Rollback phục vụ nghiệm thu
- File Migration chính thức:  
  [`tps1-miniapp/supabase/migrations/20261005_procurement_review_and_picking.sql`](file:///d:/thuc_pham_so_mot/thuc_pham_so_mot/tps1-miniapp/supabase/migrations/20261005_procurement_review_and_picking.sql)
- File Rollback an toàn:  
  [`tps1-miniapp/supabase/migrations/20261005_procurement_review_and_picking_rollback.sql`](file:///d:/thuc_pham_so_mot/thuc_pham_so_mot/tps1-miniapp/supabase/migrations/20261005_procurement_review_and_picking_rollback.sql)

---
*Tài liệu được lập đầy đủ để Codex tiến hành nghiệm thu độc lập.*
