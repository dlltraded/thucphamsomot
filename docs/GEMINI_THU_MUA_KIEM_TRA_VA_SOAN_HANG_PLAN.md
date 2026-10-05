# Kế hoạch triển khai luồng Thu mua kiểm tra hàng và Soạn hàng TPS1

## 1. Mục tiêu nghiệp vụ

Xây dựng một luồng khép kín trong hệ thống để:

1. Vận hành tiếp nhận đơn của khách/Sale.
2. Vận hành gửi yêu cầu kiểm tra hàng cho Thu mua.
3. Thu mua có hàng đợi riêng, biết ai đã tiếp nhận và đang xử lý.
4. Thu mua kiểm tra từng mặt hàng: đủ, thiếu, cần mua, hết hàng, đề xuất đổi hoặc chờ giá.
5. Thu mua trả kết quả cho Vận hành ngay trong hệ thống, có lịch sử và thông báo nội bộ.
6. Vận hành xử lý đề xuất, trao đổi với khách nếu cần, chốt giá và xác nhận đơn.
7. Chỉ đơn đã xác nhận mới được phát hành sang hàng đợi Soạn hàng.
8. Thu mua/Kho nhận soạn, cập nhật số lượng thực soạn và báo ngoại lệ nếu phát sinh.
9. Hoàn tất soạn hàng mới được chuyển sang bàn giao/giao hàng.

Không sử dụng Zalo làm nguồn dữ liệu nghiệp vụ chính. Zalo chỉ có thể dùng làm kênh nhắc việc; trạng thái và nội dung phản hồi phải được lưu trong hệ thống.

### Phân biệt hai chứng từ tuyệt đối không được trộn

1. **Bảng kiểm tra nhu cầu**
   - Sinh từ các đơn Vận hành đã nhận nhưng **chưa xác nhận**.
   - Dùng để Thu mua kiểm tra khả năng đáp ứng, thiếu hàng, hàng thay thế và giá cần bổ sung.
   - Có tiêu đề rõ: `BẢNG KIỂM TRA NHU CẦU — CHƯA PHẢI LỆNH SOẠN HÀNG`.
   - Không được dùng để giao hàng hoặc ghi nhận đã soạn.

2. **Danh sách soạn hàng**
   - Chỉ sinh từ các đơn đã `confirmed` và có `picking_task` hợp lệ.
   - Là lệnh nghiệp vụ để Thu mua/Kho thực hiện chia, soạn và bàn giao hàng.
   - Ghi rõ phiên bản xác nhận đơn; nếu đơn được điều chỉnh phải phát hành phiên bản soạn mới và vô hiệu phiên bản cũ.

Trang và API hiện tại đang cho `pending` xuất hiện trong Đơn tổng/Thu mua. Gemini phải sửa để dữ liệu chưa xác nhận chỉ nằm ở **Kiểm tra hàng**, tuyệt đối không lẫn vào **Soạn hàng**.

## 2. Luồng chuẩn Phase 1

```text
Khách/Sale tạo đơn
→ Đã đặt hàng
→ Vận hành bấm “Nhận đơn”
→ Vận hành rà soát thông tin và gửi “Yêu cầu Thu mua kiểm tra”
→ Thu mua: Chờ tiếp nhận
→ Nhân viên Thu mua bấm “Tiếp nhận”
→ Thu mua kiểm tra từng mặt hàng và giá
→ Thu mua bấm “Gửi kết quả cho Vận hành”
→ Vận hành xem chênh lệch/đề xuất
→ Vận hành liên hệ khách nếu có thay đổi
→ Vận hành chốt giá và xác nhận đơn
→ Phát hành Phiếu xác nhận
→ Đơn tự xuất hiện trong “Soạn hàng”
→ Thu mua/Kho bấm “Nhận soạn”
→ Cập nhật số lượng thực soạn
→ Hoàn tất soạn hàng
→ Bàn giao vận hành/tài xế
→ Đang giao
→ Hoàn thành
→ Hóa đơn/Công nợ
```

### Nguyên tắc khóa luồng

- Chưa có phản hồi Thu mua thì Vận hành không được xác nhận đơn, trừ người có quyền bỏ qua và bắt buộc ghi lý do.
- Thu mua không được tự xác nhận đơn với khách và không sửa trực tiếp đơn giá chính thức.
- Đơn chưa xác nhận không xuất hiện trong hàng đợi Soạn hàng.
- Đơn đã xác nhận không được sửa âm thầm. Mọi thay đổi phải tạo yêu cầu điều chỉnh và phiên bản mới.
- Một tác vụ chỉ có một người đang phụ trách chính tại một thời điểm; Admin/Trưởng phòng có quyền chuyển người xử lý và phải lưu audit log.

## 3. Phân tách trạng thái

Không nhồi toàn bộ nghiệp vụ vào một cột `orders.status`. Dùng ba lớp trạng thái độc lập.

### 3.1. Trạng thái đơn hàng

- `pending`: Đã đặt hàng, chưa có người nhận.
- `processing`: Vận hành đã nhận và đang xử lý.
- `confirmed`: Vận hành đã xác nhận đơn và phát hành Phiếu xác nhận.
- `preparing`: Đang soạn hàng.
- `ready_to_ship`: Đã soạn xong, chờ bàn giao/giao hàng.
- `shipping`: Đang giao.
- `completed`: Hoàn thành, chuyển sang Hóa đơn/Công nợ.
- `canceled`: Đã hủy.
- `merged`: Đơn nguồn đã gộp, không tính số liệu.

### 3.2. Trạng thái yêu cầu Thu mua kiểm tra

- `pending_acceptance`: Chờ Thu mua tiếp nhận.
- `in_review`: Thu mua đang kiểm tra.
- `responded`: Thu mua đã gửi kết quả.
- `needs_revision`: Vận hành yêu cầu Thu mua kiểm tra lại.
- `accepted_by_operations`: Vận hành đã chấp nhận kết quả.
- `superseded`: Phiên cũ bị thay thế bởi phiên kiểm tra mới.
- `canceled`: Đơn hủy hoặc yêu cầu bị hủy.

### 3.3. Trạng thái tác vụ soạn hàng

- `released`: Đơn đã xác nhận, chờ nhận soạn.
- `accepted`: Nhân viên đã nhận soạn.
- `picking`: Đang soạn.
- `exception`: Có thiếu/đổi/sai số lượng cần Vận hành xử lý.
- `completed`: Soạn xong.
- `canceled`: Đơn bị hủy hợp lệ trước khi giao.

## 4. Kết quả kiểm tra theo từng mặt hàng

Mỗi dòng hàng phải có một kết quả độc lập:

- `available`: Đủ hàng.
- `partial`: Chỉ đáp ứng được một phần.
- `need_purchase`: Cần mua thêm, có thời gian dự kiến.
- `out_of_stock`: Hết hàng/không thể đáp ứng.
- `substitution_proposed`: Đề xuất sản phẩm thay thế.
- `price_pending`: Chờ xác nhận giá.
- `price_proposed`: Thu mua đã đề xuất giá đầu vào/giá tham khảo.

Thông tin bắt buộc hoặc tùy trạng thái:

- Số lượng khách đặt.
- Số lượng có thể đáp ứng.
- Số lượng thiếu.
- Giá hiện tại từ bảng giá.
- Giá Thu mua đề xuất (không tự thành giá bán chính thức).
- SKU/sản phẩm thay thế.
- Ngày/giờ có hàng dự kiến.
- Ghi chú ngắn, rõ nghĩa.
- Người kiểm tra và thời điểm cập nhật.

Hệ thống phải tự tính `số lượng thiếu = số lượng đặt - số lượng có thể đáp ứng`, không tin số do client tự gửi.

## 5. Giao diện cho Thu mua

Menu **Thu mua & Soạn hàng** gồm hai menu con:

### 5.1. Kiểm tra hàng

Các tab:

- Chờ tiếp nhận.
- Tôi đang xử lý.
- Chờ Vận hành phản hồi.
- Cần kiểm tra lại.
- Đã hoàn tất.

Danh sách phải hiển thị:

- Mã đơn.
- Khách hàng/mã khách.
- Ngày và ca giao.
- Thời gian Vận hành gửi yêu cầu.
- Số mặt hàng cần kiểm tra.
- Mức ưu tiên/cảnh báo sát giờ giao.
- Người Vận hành phụ trách.
- Người Thu mua đang xử lý.
- Trạng thái và thời gian đã chờ.

Màn hình chi tiết:

- Thông tin khách và giao hàng chỉ đọc.
- Bảng sản phẩm gọn, hỗ trợ thao tác hàng loạt “Đủ hàng”.
- Có bộ lọc chỉ hiện dòng thiếu/chờ giá/đề xuất thay thế.
- Có ô cập nhật nhanh số lượng đáp ứng, tình trạng, giá đề xuất và ghi chú.
- Có nút “Lưu nháp” và “Gửi kết quả cho Vận hành”.
- Không cho gửi nếu còn dòng chưa có kết luận.
- Hiển thị lịch sử lần kiểm tra và ai đã thay đổi nội dung.

### 5.2. Soạn hàng

Các tab:

- Chờ nhận soạn.
- Đang soạn.
- Có ngoại lệ.
- Đã soạn xong.

Danh sách được lọc mặc định theo ngày giao, đồng thời cho phép chọn thêm đơn giao trước ngày đó chưa hoàn tất.

Chức năng:

- Chọn nhiều đơn và bấm “Tạo danh sách soạn”.
- Xem dạng tổng hợp theo SKU và dạng chi tiết theo từng đơn.
- Nhân viên bấm “Nhận soạn” để hệ thống lưu người phụ trách/thời gian.
- Nhập số lượng thực soạn; không cho vượt quá số lượng xác nhận nếu không có quyền và lý do.
- Nếu thiếu/đổi sau xác nhận, tạo “Ngoại lệ soạn hàng” gửi về Vận hành; không sửa âm thầm đơn đã xác nhận.
- Sau khi Vận hành duyệt điều chỉnh, hệ thống tạo phiên bản Phiếu xác nhận mới và cập nhật danh sách soạn.
- Nút “Hoàn tất soạn hàng” chỉ bật khi tất cả dòng đã đủ hoặc ngoại lệ đã được xử lý.

## 6. Giao diện cho Vận hành

Trong chi tiết đơn có một section **Kiểm tra từ Thu mua**:

- Trạng thái yêu cầu.
- Người Thu mua đang xử lý.
- Thời gian tiếp nhận và thời gian phản hồi.
- So sánh trước/sau theo từng dòng: số lượng đặt, khả năng đáp ứng, giá hiện tại, giá đề xuất, hàng thay thế.
- Chỉ làm nổi bật các dòng có thay đổi; dòng đủ hàng có thể thu gọn.
- Nút “Chấp nhận kết quả”, “Yêu cầu kiểm tra lại”, “Điều chỉnh đơn” và “Liên hệ khách”.
- Mọi thay đổi phải có lý do và lưu lịch sử.

Nút cuối luồng:

- Trước khi nhận: **Nhận đơn**.
- Sau khi nhận và chưa gửi Thu mua: **Gửi Thu mua kiểm tra**.
- Đang chờ Thu mua: hiển thị người phụ trách và thời gian chờ; không hiện nút xác nhận.
- Thu mua đã phản hồi: **Xử lý phản hồi Thu mua**.
- Đủ điều kiện: **Xác nhận đơn & phát hành Phiếu xác nhận**.

## 7. Thông báo nội bộ

Xây thông báo trong hệ thống, không phụ thuộc Zalo:

- Badge số lượng công việc mới ở menu.
- Notification khi được giao/nhận việc.
- Thông báo Vận hành khi Thu mua gửi kết quả.
- Thông báo Thu mua khi Vận hành yêu cầu kiểm tra lại.
- Thông báo Vận hành khi Soạn hàng báo ngoại lệ.
- Cảnh báo quá SLA.

Không gửi thông báo lặp. Mỗi sự kiện có khóa idempotency. Zalo/Telegram chỉ là kênh tùy chọn về sau và nội dung phải dẫn về đúng màn hình xử lý trong hệ thống.

## 8. Dữ liệu và API

Thiết kế migration tương thích dữ liệu cũ, không xóa cột cũ trong phase này.

### Bảng đề xuất

- `procurement_review_requests`
  - order_id, version, status, requested_by, assigned_to, accepted_at, responded_at, operation_accepted_at, due_at, note.
- `procurement_review_items`
  - review_id, order_item_id, result_status, requested_qty, available_qty, shortage_qty, proposed_product_id, proposed_price, expected_at, note, updated_by.
- `picking_tasks`
  - order_id, status, assigned_to, accepted_at, completed_at, source_confirmation_version.
- `picking_task_items`
  - picking_task_id, order_item_id, confirmed_qty, picked_qty, status, exception_reason.
- `picking_exceptions`
  - picking_task_id, order_id, order_item_id, type, requested_change, reason, status, resolved_by, resolved_at.
- `internal_notifications`
  - recipient_user_id/department_id, event_type, entity_type, entity_id, title, read_at, idempotency_key.

Mọi bảng phải có `created_at`, `updated_at`, người thao tác và audit log phù hợp.

### API bắt buộc

- Danh sách hàng đợi kiểm tra theo quyền/phòng ban.
- Tiếp nhận yêu cầu theo cơ chế nguyên tử, ngăn hai người nhận đồng thời.
- Lưu nháp/gửi kết quả kiểm tra.
- Vận hành chấp nhận/yêu cầu kiểm tra lại.
- Xác nhận đơn có kiểm tra điều kiện Thu mua đã hoàn tất.
- Tự tạo picking task khi xác nhận đơn, idempotent, không tạo trùng.
- Nhận soạn/cập nhật số lượng/hoàn tất soạn.
- Tạo và xử lý ngoại lệ soạn hàng.
- Đọc/thao tác notification.

Mọi ghi dữ liệu đi qua Server API/RPC; client không được ghi trực tiếp bằng Supabase anon key.

## 9. Phân quyền

- **Vận hành/Sale Admin**: nhận đơn, gửi kiểm tra, xử lý phản hồi, xác nhận đơn theo quyền.
- **Nhân viên Thu mua**: xem hàng đợi Thu mua, tiếp nhận, nhập kết quả, nhận soạn và cập nhật thực soạn.
- **Trưởng phòng Thu mua**: toàn quyền trong phòng, phân công lại, xem SLA và xử lý ngoại lệ.
- **Trưởng phòng Vận hành**: quyền cao nhất trong phòng, duyệt điều chỉnh sau xác nhận.
- **Admin/Ban Giám Đốc**: xem toàn hệ thống, cấu hình SLA và có quyền can thiệp có audit.
- **Kế toán**: chỉ đọc thông tin cần cho giá/hóa đơn/công nợ, không thao tác Thu mua hoặc soạn hàng nếu không được cấp thêm quyền.

Phân quyền dựa trên `department_id` + role/permission, không hard-code email hay tên nhân viên.

## 10. SLA và dashboard

Mặc định có thể cấu hình:

- Chờ Thu mua tiếp nhận: cảnh báo sau 15 phút.
- Thu mua đang kiểm tra: cảnh báo sau 30 phút hoặc khi gần giờ giao.
- Ngoại lệ soạn hàng: cảnh báo ngay cho Vận hành.

Dashboard Thu mua:

- Chờ tiếp nhận.
- Đang kiểm tra.
- Quá SLA.
- Đơn giao hôm nay/ngày mai.
- Số dòng thiếu hàng/đề xuất thay thế.
- Tác vụ soạn hàng chưa hoàn tất.

## 11. Hiệu năng

- Danh sách phân trang phía server, không tải toàn bộ đơn/dòng hàng một lần.
- Chỉ tải chi tiết khi mở yêu cầu.
- Có chỉ mục theo status, department, assigned_to, delivery_date, requested_at và order_id.
- Debounce tìm kiếm.
- Bulk update “Đủ hàng” trong một request nguyên tử.
- Không polling liên tục; ưu tiên refresh theo sự kiện hoặc polling giãn cách khi tab đang mở.
- Mục tiêu P95: danh sách dưới 1 giây, mở chi tiết dưới 1,5 giây với tải 150 đơn/ngày.

## 12. Thứ tự triển khai cho Gemini

### G0 — Khảo sát và bảo vệ dữ liệu

- Đọc toàn bộ schema/order status/API hiện tại.
- Lập bảng mapping trạng thái cũ → mới.
- Không xóa dữ liệu thật, không đổi trạng thái đơn thật.
- Ghi rõ file sẽ sửa và migration rollback.

### G1 — Database, RPC và quyền

- Tạo migration các bảng mới, chỉ mục, RLS và audit.
- Tạo RPC/API tiếp nhận nguyên tử và chống thao tác trùng.
- Viết fixture biệt lập và rollback.

### G2 — Bàn làm việc Kiểm tra hàng

- Làm menu, danh sách, chi tiết và thao tác cho Thu mua.
- Làm section phản hồi Thu mua trong chi tiết đơn của Vận hành.
- Thêm notification nội bộ.

### G3 — Khóa xác nhận và phát hành Soạn hàng

- Chặn xác nhận khi chưa đủ điều kiện.
- Khi xác nhận thành công, tự sinh một picking task duy nhất.
- Bảo đảm đơn chưa xác nhận không xuất hiện trong Soạn hàng.

### G4 — Bàn làm việc Soạn hàng và ngoại lệ

- Danh sách theo ngày giao, chọn đơn, tổng hợp SKU và chi tiết đơn.
- Nhận soạn, cập nhật thực soạn, báo ngoại lệ và hoàn tất.
- Luồng Vận hành duyệt điều chỉnh sau xác nhận và phát hành lại chứng từ có version.

### G5 — Kiểm thử và tài liệu

- Test quyền từng phòng ban.
- Test hai người cùng bấm tiếp nhận.
- Test gửi phản hồi thiếu hàng/thay thế/chờ giá.
- Test không xác nhận được khi review chưa hoàn tất.
- Test xác nhận hai lần không tạo hai picking task.
- Test ngoại lệ sau xác nhận và phiên bản chứng từ.
- Test tải 150 đơn/ngày.
- Build/type-check cả API và manage.
- Chụp ảnh các màn hình và cập nhật walkthrough.

## 13. Kịch bản nghiệm thu bắt buộc

1. Vận hành nhận một đơn có 5 sản phẩm và gửi Thu mua.
2. Nhân viên A tiếp nhận; nhân viên B không thể nhận trùng.
3. Thu mua đánh dấu 3 dòng đủ, 1 dòng thiếu một phần và 1 dòng đề xuất thay thế.
4. Vận hành thấy thông báo và phần chênh lệch rõ ràng.
5. Vận hành yêu cầu kiểm tra lại một dòng; lịch sử cũ vẫn còn.
6. Thu mua gửi lại; Vận hành chấp nhận và xác nhận đơn.
7. Hệ thống tạo Phiếu xác nhận và đúng một tác vụ Soạn hàng.
8. Thu mua nhận soạn, phát hiện thiếu thực tế và tạo ngoại lệ.
9. Vận hành duyệt điều chỉnh; chứng từ tăng version và danh sách soạn cập nhật.
10. Hoàn tất soạn, chuyển ready_to_ship; chưa hoàn tất thì không được giao.
11. Audit thể hiện đầy đủ ai nhận đơn, ai kiểm tra, ai phản hồi, ai xác nhận và ai soạn.

## 14. Giới hạn công việc và bàn giao

- Không sửa bảng giá/VIP/công nợ ngoài phần cần đọc để hiển thị.
- Không push, merge, deploy hoặc chạy migration production.
- Không dùng dữ liệu thật để tạo giao dịch kiểm thử; dùng fixture có tiền tố `TEST_PROC_` và có script dọn riêng.
- Không được tuyên bố hoàn tất chỉ vì build pass. Phải cung cấp kết quả từng kịch bản nghiệm thu.
- Dừng ở nhánh làm việc để Codex review độc lập.
- Cập nhật `walkthrough.md` và tạo `docs/WALKTHROUGH_THU_MUA_SOAN_HANG.md` với ảnh rõ từng bước.

## 15. Prompt giao Gemini

> Hãy triển khai đúng toàn bộ kế hoạch trong `docs/GEMINI_THU_MUA_KIEM_TRA_VA_SOAN_HANG_PLAN.md`. Trước khi code, khảo sát schema, API, quyền và UI hiện tại rồi lập checklist file sẽ thay đổi. Không phỏng đoán trạng thái hoặc tạo luồng song song với logic hiện có. Ưu tiên luồng vận hành thực tế: Thu mua tiếp nhận và phản hồi trong hệ thống trước khi Vận hành xác nhận; chỉ đơn đã xác nhận mới sang Soạn hàng. Mọi thao tác phải có người phụ trách, thời gian và audit log. Thực hiện theo G0 → G5, chạy đầy đủ kiểm thử nghiệm thu, cập nhật walkthrough có ảnh. Tuyệt đối không chạy migration production, không push/merge/deploy và dừng để Codex nghiệm thu độc lập.
