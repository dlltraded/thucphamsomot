# TPS1 — Kết luận nghiệp vụ giá và luồng đơn hàng

> Ghi nhận ngày 22/09/2026 từ trao đổi thực tế với anh Vũ Vương. Đây là căn cứ để rà soát lại Phase 2; các điểm chưa được xác nhận được đánh dấu rõ, không tự suy diễn thành quy định.

## 1. Nguồn giá chuẩn

- Khoảng 5 ngày cuối tháng, Phòng Thu mua tổng hợp **giá vốn** cho tháng kế tiếp.
- Từ giá vốn, Thu mua lập **bảng báo giá chung** và chạy công thức tạo **bảng giá riêng theo từng khách hàng**.
- Thu mua gửi bảng giá cho Phòng Vận hành và Phòng Kế toán.
- Vận hành gửi báo giá tháng kế tiếp cho khách hàng.
- Kế toán cập nhật bảng giá tháng mới tương ứng từng khách hàng lên hệ thống vận hành hiện tại (KiotViet); TPS1 WebApp sau này phải thay thế được bước này.
- Bảng giá tháng đã bao gồm hầu hết hàng tươi. Chỉ hỏi giá trong tháng đối với hàng đặt đột xuất, hàng rất ít người mua hoặc khi thị trường/nguồn cung biến động.

### Hệ quả thiết kế

- Giá chính của đơn phải lấy từ **bảng giá khách hàng đang có hiệu lực**, theo từng sản phẩm; không lấy VIP hoặc một tỷ lệ chiết khấu chung làm nguồn giá cuối cùng.
- VIP/nhóm khách vẫn hữu ích để phân khúc, gợi ý chính sách và tạo bảng giá, nhưng không được tự động thay thế bảng giá riêng đã duyệt.
- Không bắt mọi đơn hoặc mọi hàng tươi đi qua bước xin giá.
- Dòng chưa có giá/giá biến động phải trở thành **ngoại lệ xin giá Thu mua**, có người trả giá, thời điểm, lý do và lịch sử thay đổi.
- Bảng giá phải có phiên bản, thời gian hiệu lực, trạng thái nháp/đang áp dụng/hết hiệu lực và khả năng truy vết người nhập hoặc phát hành.

## 2. Luồng đơn hàng thực tế cần mô hình hóa

1. Khách/Vận hành tạo đơn; hệ thống tự nạp bảng giá riêng của khách đang có hiệu lực.
2. Vận hành kiểm tra thông tin, quy cách, ngày/ca giao và các dòng thiếu giá.
3. Nếu có ngoại lệ, Vận hành xin giá/tình trạng hàng từ Thu mua; không buộc hỏi lại các dòng đã có bảng giá hợp lệ.
4. Vận hành **chuyển đơn sang Thu mua xử lý nội bộ**.
5. Thu mua kiểm tra nguồn hàng, kiểm kê và đề xuất/ghi nhận các điều chỉnh cần thiết.
6. Vận hành nhận kết quả xử lý, liên hệ và **xác nhận phương án cuối với khách hàng**.
7. Sau khi khách xác nhận, đơn được khóa làm căn cứ xuất:
   - Phiếu xác nhận/chi tiết đơn;
   - Đơn tổng;
   - Danh sách chi tiết;
   - Danh sách phân theo xe/tuyến giao.
8. Thu mua/Kho soạn hàng.
9. Vận hành nhận hàng, bàn giao tài xế và theo dõi giao hàng.
10. Ghi nhận thực giao, hoàn tất đơn, hóa đơn và công nợ theo quyền tương ứng.

## 3. Điểm cần sửa so với giả định cũ

- Không gộp “Vận hành xác nhận chuyển Thu mua” và “xác nhận cuối với khách” thành cùng một trạng thái `confirmed`.
- Không để việc chuyển `confirmed` vừa có nghĩa khách đã đồng ý, vừa tự động coi là Thu mua đã xử lý, vừa trừ kho. Cần các mốc nghiệp vụ riêng.
- “Phân loại khách & chốt giá” không phải thao tác bắt buộc trên từng đơn. Phân loại/chính sách giá chủ yếu nằm ở quy trình bảng giá theo tháng.
- Sale/Vận hành có thể nhập giá ngoại lệ do Thu mua cung cấp, nhưng không nên có quyền tự ý thay đổi giá tùy ý mà không lưu nguồn và lịch sử.
- Trưởng phòng là quyền cao nhất trong phòng và duyệt các điều chỉnh cần kiểm soát; không biến trưởng phòng thành nút duyệt bắt buộc của mọi đơn sạch thông thường.
- Đơn tổng chỉ nên xuất chính thức sau khi Thu mua đã rà khả năng đáp ứng và Vận hành đã xác nhận phương án cuối với khách.

## 4. Gợi ý trạng thái nghiệp vụ

Tên kỹ thuật sẽ được chốt khi rà schema; về nghiệp vụ cần tối thiểu các mốc:

- `draft` / `pending`: mới nhận, Vận hành đang kiểm tra;
- `pricing_required`: có dòng cần Thu mua báo giá hoặc xác nhận nguồn;
- `submitted_to_procurement`: đã chuyển Thu mua xử lý;
- `procurement_reviewing`: Thu mua đang kiểm kê/xử lý;
- `awaiting_customer_confirmation`: đã có phương án để Vận hành xác nhận với khách;
- `customer_confirmed`: khách đã đồng ý, khóa phiên bản đơn;
- `preparing`: đang soạn hàng;
- `ready_for_handover`: sẵn sàng bàn giao;
- `delivering`: đang giao;
- `delivered` / `reconciled`: đã ghi nhận thực giao;
- `completed`: hoàn tất nghiệp vụ;
- `cancelled`: đã hủy, kèm lý do và quyền duyệt phù hợp.

Không bắt buộc thay toàn bộ enum ngay. Có thể dùng trạng thái chính kết hợp `workflow_stage`, nhưng giao diện phải thể hiện đúng hai lần xác nhận khác nhau.

## 5. Các câu hỏi còn phải xác nhận

- CEO có duyệt từng bảng giá khách hàng/tháng hay chỉ duyệt chính sách/công thức/biên lợi nhuận? Cuộc trao đổi hiện chưa xác nhận bước này.
- Ai có quyền phát hành/kích hoạt bảng giá trên TPS1 WebApp: Kế toán, Thu mua, hay cần hai bước lập và duyệt?
- Thu mua “xử lý đơn” đến mức nào: chỉ xác nhận khả năng cung ứng, hay được sửa số lượng/sản phẩm/giá trực tiếp?
- Điều chỉnh trước khi khách xác nhận và sau khi khách xác nhận có các ngưỡng nào bắt buộc Trưởng phòng duyệt?
- “Kho” là một vai trò độc lập hay nằm trong Thu mua/Vận hành ở tổ chức hiện tại?

## 6. Nguyên tắc triển khai tiếp theo

- Chưa thay schema/trạng thái sản xuất chỉ từ đoạn trao đổi này.
- Trước khi sửa workflow, lập bảng đối chiếu trạng thái hiện tại với mốc nghiệp vụ mới và kế hoạch migrate tương thích Website, Mini App, Admin, PDF/Excel.
- Tiếp tục cải tiến UI đặt hàng độc lập vì không xung đột: tìm nhanh, thường mua, yêu thích, đặt lại, mobile/desktop và tự nạp bảng giá khách hàng.
- Không hiển thị “Liên hệ báo giá” cho sản phẩm đã có giá trong bảng giá hiệu lực; chỉ đánh dấu ngoại lệ thực sự.
