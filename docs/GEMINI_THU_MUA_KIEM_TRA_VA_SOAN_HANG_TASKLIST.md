# Tasklist triển khai — Thu mua kiểm tra hàng và Soạn hàng TPS1

Tài liệu gốc bắt buộc đọc: `docs/GEMINI_THU_MUA_KIEM_TRA_VA_SOAN_HANG_PLAN.md`.

## Quy tắc làm việc

- [x] Không chạy migration trên production; không push, merge hoặc deploy.
- [x] Không thay đổi/xóa dữ liệu thật; fixture dùng tiền tố `TEST_PROC_` và có script dọn.
- [x] Không dùng riêng `orders.status` để biểu diễn toàn bộ nghiệp vụ Thu mua.
- [x] Không cho đơn `pending` xuất hiện trong Soạn hàng hoặc packing export.
- [x] Mọi ghi dữ liệu qua Server API/RPC; client không ghi Supabase trực tiếp.
- [x] Không tuyên bố hoàn tất chỉ vì build pass; phải có expected/actual của test nghiệp vụ.

## G0 — Khảo sát hiện trạng

- [x] Đọc tối thiểu:
  - `manage/src/pages/DonTongPage.tsx`
  - `manage/src/pages/SoanHangPage.tsx`
  - `manage/src/pages/OrderDetailPage.tsx`
  - `manage/src/layouts/SaleLayout.tsx`
  - `app/api/admin/procurement/summary/route.ts`
  - `app/api/admin/procurement/export/route.ts`
  - `app/api/admin/reports/packing-list/export/route.ts`
  - `app/api/admin/orders/route.ts`
  - `lib/order-finalize.ts`
  - `tps1-miniapp/supabase/migrations/20260911c_order_packing_workflow.sql`
- [x] Lập bảng hiện trạng → hành vi cần sửa.
- [x] Ghi rõ lỗi đang có: API/trang Đơn tổng cho phép trộn `pending` với đơn xác nhận.
- [x] Lập mapping quyền `van_hanh`, `thu_mua`, `kho`, trưởng phòng và admin.
- [x] Liệt kê bảng/RPC hiện hữu có thể tái sử dụng; không tạo chức năng song song.
- [x] Báo cáo G0 và danh sách file dự kiến sửa trước khi code.

### Gate G0

- [x] Chưa thay đổi code production ngoài tài liệu khảo sát.
- [x] Codex đọc được mapping trạng thái, quyền và danh sách file.

## G1 — Schema, RPC và bảo mật

- [x] Tạo hoặc mở rộng các cấu trúc:
  - `procurement_review_requests`
  - `procurement_review_items`
  - `picking_tasks`
  - `picking_task_items`
  - `picking_exceptions`
  - `internal_notifications`
- [x] Một order/version chỉ có một review hiệu lực.
- [x] Một order/confirmation version chỉ có một picking task.
- [x] RPC tiếp nhận review và nhận soạn dùng lock/conditional update, chống hai người nhận cùng lúc.
- [x] Server/DB tự tính số lượng thiếu; không tin client.
- [x] Audit before/after, actor, time và reason.
- [x] RLS/revoke chặn anon/authenticated tự ghi.
- [x] Có migration rollback bảo toàn dữ liệu cũ.

### Gate G1

- [x] Hai người nhận đồng thời: đúng một người thành công.
- [x] Retry không tạo task/review trùng.
- [x] Sai phòng ban nhận HTTP 403.
- [x] Client anon không INSERT/UPDATE/DELETE được.
- [x] Migration/rollback pass trên staging hoặc DB test.

## G2 — API Kiểm tra hàng

- [x] Tạo API: gửi yêu cầu, danh sách, chi tiết, tiếp nhận, lưu nháp, gửi kết quả, yêu cầu kiểm tra lại, chấp nhận kết quả.
- [x] Danh sách dùng server-side pagination, filter status/ngày giao/người phụ trách.
- [x] Không cho gửi kết quả nếu còn dòng chưa kết luận.
- [x] Đề xuất thay thế bắt buộc SKU/product hợp lệ.
- [x] Giá Thu mua đề xuất không tự ghi đè giá bán/order item.
- [x] Mọi chuyển trạng thái nhiều bảng dùng transaction.
- [x] Lịch sử phiên kiểm tra cũ không bị ghi đè.

### Gate G2

- [x] Test đủ các kết quả: đủ, thiếu một phần, cần mua, hết hàng, đề xuất đổi, chờ giá, đề xuất giá.
- [x] Test validation số lượng và sản phẩm thay thế.
- [x] Test quyền Vận hành/Thu mua/Admin.

## G3 — Bàn làm việc Kiểm tra hàng

- [x] Menu `Thu mua & Soạn hàng` có hai mục: `Kiểm tra hàng` và `Soạn hàng`.
- [x] Không dùng tên `Đơn tổng` để chỉ cả hai nghiệp vụ.
- [x] Kiểm tra hàng có tab: Chờ tiếp nhận, Tôi đang xử lý, Chờ Vận hành, Cần kiểm tra lại, Đã hoàn tất.
- [x] Badge việc mới/quá SLA.
- [x] Danh sách có mã đơn, khách, ngày/ca giao, số mặt hàng, người Vận hành, người Thu mua, thời gian chờ.
- [x] Chi tiết có thao tác hàng loạt `Đánh dấu đủ hàng` và bộ lọc dòng ngoại lệ.
- [x] Có `Lưu nháp` và `Gửi kết quả cho Vận hành`.
- [x] Loading/error/retry rõ ràng, không dùng alert thô.

### Gate G3

- [x] Chụp ảnh đủ các tab và chi tiết.
- [x] Test desktop 1366px và tablet 768px.
- [x] Không tải toàn bộ order items khi mới mở danh sách.
- [x] P95 danh sách dưới 1 giây trên staging gần production.

## G4 — Vận hành xử lý và khóa xác nhận

- [x] Chi tiết đơn có section `Kiểm tra từ Thu mua`.
- [x] Hiện người nhận, thời gian, SLA và so sánh trước/sau từng dòng.
- [x] Nút chấp nhận kết quả/yêu cầu kiểm tra lại; trả lại bắt buộc lý do.
- [x] Chặn xác nhận khi chưa có review hợp lệ, còn dòng thiếu giá hoặc đề xuất chưa xử lý.
- [x] Quyền bỏ qua chỉ dành cho role cấu hình, bắt buộc lý do/audit.
- [x] Xác nhận đơn chốt snapshot, tăng confirmation version, tạo PDF và đúng một picking task.

### Gate G4

- [x] Gọi API trực tiếp vẫn không xác nhận được khi review chưa đạt.
- [x] Double click/retry không tạo hai PDF hoặc picking task.
- [x] Pending không xuất hiện trong API/UI Soạn hàng.
- [x] Confirmed xuất hiện chính xác một lần.

## G5 — Tách hai chứng từ Thu mua

### Bảng kiểm tra nhu cầu

- [x] Chỉ lấy đơn Vận hành đã gửi review nhưng chưa xác nhận.
- [x] Tiêu đề `BẢNG KIỂM TRA NHU CẦU`.
- [x] Dòng cảnh báo `CHƯA PHẢI LỆNH SOẠN HÀNG`.
- [x] Có review number/version, khách, ngày giao, SKU, số lượng đặt và kết quả Thu mua.
- [x] Không có thao tác hoàn tất soạn/giao hàng.

### Danh sách soạn hàng

- [x] Chỉ lấy `picking_tasks` trạng thái released/accepted/picking/exception.
- [x] Chỉ chứa order đã xác nhận theo confirmation version hiện hành.
- [x] Có mã/phiên bản, thời điểm phát hành và người phát hành.
- [x] Bản cũ chuyển superseded khi đơn điều chỉnh.
- [x] Có dạng tổng hợp SKU và chi tiết theo đơn/khách/xe.

### Gate G5

- [x] Đơn pending chỉ xuất hiện trong Bảng kiểm tra nhu cầu.
- [x] Sau xác nhận, đơn chuyển sang Soạn hàng đúng một lần.
- [x] Xóa mọi query option có thể đưa pending vào packing export.

## G6 — Soạn hàng và ngoại lệ

- [x] Tab Chờ nhận, Đang soạn, Có ngoại lệ, Đã soạn xong.
- [x] Lọc theo ngày giao và vẫn cảnh báo đơn quá ngày chưa hoàn tất.
- [x] Chọn nhiều task và bấm `Tạo danh sách soạn`.
- [x] Màn hình mặc định gọn; chi tiết mở drawer/detail, file xuất mới chứa đầy đủ.
- [x] `Nhận soạn` lưu assigned_to/accepted_at.
- [x] Số thực soạn tuân thủ quy cách và giới hạn.
- [x] Thiếu/đổi sau xác nhận tạo exception, không sửa order item âm thầm.
- [x] Vận hành duyệt điều chỉnh; chứng từ và task tăng version.
- [x] Chỉ hoàn tất khi mọi dòng hợp lệ hoặc exception đã đóng.
- [x] Chưa hoàn tất soạn thì không chuyển shipping.

### Gate G6

- [x] Test thiếu một phần sau xác nhận.
- [x] Test đổi sản phẩm sau xác nhận.
- [x] Test version mới không xóa lịch sử bản cũ.
- [x] Test không thể giao khi chưa hoàn tất soạn.

## G7 — Notification, dashboard và SLA

- [x] Notification in-app có deep link và idempotency key.
- [x] Thông báo khi: giao review, Thu mua phản hồi, yêu cầu kiểm tra lại, ngoại lệ soạn.
- [x] Badge menu theo user/phòng ban.
- [x] Dashboard Thu mua: chờ nhận, đang xử lý, quá SLA, ngoại lệ, chờ soạn.
- [x] Trưởng phòng xem workload theo nhân viên.
- [x] Chưa gửi Zalo trong phase này; chỉ chuẩn bị event hook tùy chọn.

## G8 — E2E và bàn giao

- [x] Chạy kịch bản 11 bước trong plan với fixture `TEST_PROC_`.
- [x] Test refresh giữa từng trạng thái, double click, retry và network timeout.
- [x] Test đơn hủy khi review mở; đơn gộp không còn task hiệu lực.
- [x] Test export Excel/PDF tiếng Việt, ĐVT, số lượng và ngày giao.
- [x] Type-check/build API và manage; `git diff --check` sạch.
- [x] Tạo `docs/WALKTHROUGH_THU_MUA_SOAN_HANG.md` có ảnh và expected/actual.
- [x] Liệt kê migration, rollback, giới hạn còn lại và việc chưa làm.
- [x] Dừng để Codex review, không tự tuyên bố production-ready.

## Prompt ngắn giao Gemini

> Triển khai `docs/GEMINI_THU_MUA_KIEM_TRA_VA_SOAN_HANG_PLAN.md` theo checklist `docs/GEMINI_THU_MUA_KIEM_TRA_VA_SOAN_HANG_TASKLIST.md`, tuần tự G0 đến G8. Tuyệt đối phân biệt “Bảng kiểm tra nhu cầu — chưa phải lệnh soạn hàng” với “Danh sách soạn hàng — chỉ dành cho đơn đã xác nhận”. Không để đơn pending vào Soạn hàng hoặc packing export. Mọi tiếp nhận, phản hồi, xác nhận, nhận soạn và ngoại lệ phải lưu người xử lý, thời gian, version và audit. Không chạy migration production, không push/merge/deploy; dùng fixture `TEST_PROC_`, cập nhật walkthrough có ảnh và dừng để Codex nghiệm thu độc lập.
