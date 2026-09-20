# HƯỚNG DẪN SỬ DỤNG — BỘ PHẬN KẾ TOÁN

> **Tài liệu hướng dẫn nghiệp vụ chuẩn TPS1 — Giai đoạn Phase 1**  
> **Áp dụng cho:** Kế toán Trưởng, Kế toán Bán hàng, Kế toán Công nợ

---

## 1. Mục tiêu & Phạm vi Quyền hạn

Bộ phận Kế toán là chốt chặn kiểm soát tài chính cuối cùng trong vòng đời đơn hàng: giám sát số liệu công nợ, đối chiếu mã khách hàng với KiotViet, theo dõi thanh toán và **kiểm soát quy trình xuất hóa đơn bán hàng**.

- **Địa chỉ truy cập**: `https://<domain>/` (Menu nhân viên)
- **Tài khoản**: Đăng nhập bằng tài khoản có vai trò `ke_toan`.
- **Phân quyền vai trò**:
  - Có quyền xem toàn bộ đơn hàng (`orders.view`), công nợ & tài chính (`finance.view`, `reports.view`), danh sách khách hàng (`customers.view`).
  - Kế toán **không** trực tiếp tạo hoặc sửa đổi đơn hàng POS (đây là quyền của Vận hành & Sale).

---

## 2. QUY TẮC CỐT LÕI: Chỉ xuất Hóa đơn sau khi "Xác nhận Thực giao"

> [!CAUTION]
> **Tuyệt đối KHÔNG xuất hóa đơn hoặc in hóa đơn tài chính khi đơn hàng ở trạng thái `pending`, `confirmed` hoặc `preparing`.**

### Lý do nghiệp vụ:
- Đặc thù kinh doanh thực phẩm tươi sống (rau, củ, thịt, thủy hải sản) luôn có **chênh lệch hao hụt hoặc trọng lượng cân thực tế** so với số lượng khách đặt ban đầu (ví dụ: khách đặt 2.0 kg sườn non, nhưng thực tế cân chia túi chỉ đạt 1.95 kg hoặc 2.05 kg).
- Nếu xuất hóa đơn theo số lượng đặt ban đầu: Sẽ dẫn đến sai lệch hóa đơn VAT, kế toán phải làm biên bản hủy/điều chỉnh hóa đơn phức tạp và gây tranh chấp công nợ với khách.

### Quy trình chuẩn:
```
[Khách đặt hàng] ──► [Vận hành duyệt] ──► [Kho soạn & Giao] ──► [Vận hành Xác nhận Thực giao] ──► [Đơn hoàn tất (completed)] ──► [KẾ TOÁN XUẤT HÓA ĐƠN]
```
1. Tài xế giao hàng và có chữ ký nhận thực tế của khách hàng trên phiếu giao.
2. Vận hành vào chi tiết đơn thực hiện bước **Xác nhận thực giao (`reconcile-delivery`)**:
   - Nhập số lượng thực nhận của từng dòng (`quantity_delivered`).
   - Hệ thống tự động tính lại tổng tiền đơn hàng (`grand_total`) và công nợ phát sinh theo số thực nhận.
3. Đơn hàng chuyển trạng thái **`completed`** (Hoàn tất):
   - Lúc này Kế toán mới tiến hành xuất hóa đơn PDF / hóa đơn điện tử dựa trên số liệu thực giao chính thức.

---

## 3. Quản lý Khách hàng & Đối chiếu KiotViet (`/khach-hang`)

Tại màn hình **Khách hàng** (`/khach-hang`), Kế toán kiểm soát các thông tin trọng yếu:

1. **Mã KiotViet (`kiotviet_code`)**:
   - Mã khách hàng gốc trên hệ thống KiotViet (ví dụ: `KH00123`, `KH00456`).
   - Phục vụ đối soát doanh thu giữa 2 hệ thống trong giai đoạn chạy song song.
2. **Mã Đối tác TPS1 (`partner_code`)**:
   - Mã viết tắt dễ nhớ dùng cho khách đăng nhập (ví dụ: `TPS1-TANVAN`, `TPS1-ZERMAT`).
3. **Số dư nợ KiotViet đầu kỳ (`kiotviet_debt`)**:
   - Số dư nợ cũ của khách hàng được import từ file sao kê KiotViet ngày 20/09/2026.
   - Kế toán theo dõi số dư này để chốt số dư đầu kỳ khi chuyển giao hoàn toàn sổ cái sang hệ thống mới.
4. **Hạn mức công nợ (`credit_limit`)**:
   - Hạn mức tín dụng tối đa cho phép khách nợ gối đầu (ví dụ: 20,000,000 đ).
   - Nếu khách hàng có tổng nợ chưa thanh toán vượt quá hạn mức này: Hệ thống sẽ tự động chặn hoặc cảnh báo khi Vận hành lên đơn mới.

---

## 4. Theo dõi Công nợ & Ghi nhận Thanh toán (`/bao-cao`)

Kế toán thực hiện đối chiếu công nợ định kỳ (hàng ngày / hàng tuần):

1. **Báo cáo Công nợ Khách hàng**:
   - Truy cập `/bao-cao` → chọn Báo cáo Công nợ.
   - Lọc theo từng nhân viên phụ trách (Sale rep) hoặc lọc theo khách hàng cụ thể.
   - Thể hiện: Doanh số mua trong kỳ, Số tiền đã thanh toán (`paid_amount`), Số nợ còn lại (`debt_amount`).
2. **Ghi nhận Thanh toán**:
   - Khi nhận được sao kê ngân hàng hoặc phiếu nộp tiền mặt từ khách:
   - Vào chi tiết đơn hàng tương ứng, kiểm tra số tiền cần thanh toán.
   - Thực hiện ghi nhận thanh toán (hệ thống tự động trừ dần vào `debt_amount` của khách).
3. **Đối chiếu cuối ngày (Giai đoạn thử 10 đơn)**:
   - Đối chiếu danh sách 10 đơn trong ngày giữa hệ thống TPS1 và KiotViet thông qua cột **Mã đơn KiotViet (`external_ref`)**.
   - Đảm bảo tổng giá trị thực giao trên TPS1 khớp đúng với giá trị hóa đơn trên KiotViet.
