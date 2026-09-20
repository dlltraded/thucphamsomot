# HƯỚNG DẪN SỬ DỤNG — BỘ PHẬN VẬN HÀNH & BÁN HÀNG (SALE)

> **Tài liệu hướng dẫn nghiệp vụ chuẩn TPS1 — Giai đoạn Phase 1**  
> **Áp dụng cho:** Trưởng phòng Vận hành, Nhân viên Vận hành, Nhân viên Bán hàng (Sale)

---

## 1. Tổng quan & Đăng nhập

Nhân viên Vận hành & Sale chịu trách nhiệm tiếp nhận đơn hàng, nhập đơn từ KiotViet/Zalo vào hệ thống qua POS, duyệt đơn hàng ngày trước giờ chốt, xử lý các yêu cầu điều chỉnh/hủy đơn từ khách hàng và phối hợp thông tin với Thu mua.

- **Địa chỉ truy cập**: `https://<domain>/sale-login` (hoặc cổng nội bộ `http://localhost:5173/sale-login`)
- **Tài khoản**: Đăng nhập bằng email/mã nhân viên và mật khẩu được cấp.
- **Các màn hình chính trên thanh điều hướng**:
  - **Tạo đơn (POS)** (`/tao-don-hang`): Nhập đơn nhanh cho khách.
  - **Quản lý đơn** (`/don-hang`): Danh sách đơn, theo dõi trạng thái, lọc yêu cầu sửa/hủy.
  - **Đơn tổng** (`/don-tong`): Hàng đợi "Cần xử lý", duyệt đơn hàng loạt, xem tổng hợp gom hàng.
  - **Khách hàng** (`/khach-hang`): Danh sách khách hàng, công nợ, phân công sale phụ trách.
  - **Soạn hàng** (`/soan-hang`): Xem danh sách soạn và in phiếu tạm.

---

## 2. Quy trình Nhập đơn hàng qua POS (`/tao-don-hang`)

Trong giai đoạn đầu (vận hành thử 10 đơn), POS là cổng nhập liệu chính để đưa đơn từ KiotViet/Zalo vào hệ thống.

```
[Chọn Khách hàng] ──► [Chọn Ngày giao] ──► [Nhập Mã đơn KV] ──► [Chọn Điểm giao] ──► [Thêm Hàng & Ghi chú] ──► [Kiểm tra Nợ] ──► [Bấm Tạo đơn]
```

### Bước 1: Chọn khách hàng
- Gõ tên khách, số điện thoại hoặc mã ngắn (ví dụ: `TPS1-TANVAN`, `KH00123`) vào ô tìm kiếm khách.
- Hệ thống tự động nạp bảng giá riêng của khách (giá hợp đồng hoặc giá theo hạng thành viên) và kiểm tra hạn mức công nợ hiện tại.

### Bước 2: Chọn ngày giao hàng & Kiểm tra giờ chốt (Cutoff)
- **Quy tắc giờ chốt server**:
  - **Thứ 2 đến Thứ 7**: Giờ chốt là **16:30** ngày hôm trước cho ngày hôm sau (D-1).
  - **Thứ 7 chốt cho Chủ nhật và Thứ 2**: Hạn chót là **17:00 Thứ 7**.
- Ô **Ngày giao hàng** mặc định hiển thị ngày sớm nhất (`earliestDate`).
- **Lưu ý**: Nếu nhập đơn sau giờ chốt cho ngày hôm sau, hệ thống sẽ hiện **Banner cảnh báo màu cam** `⚠️ Đơn trễ giờ chốt`. Vẫn có thể tạo đơn nhưng đơn sẽ mang cờ `is_late_order = true` để duyệt riêng.

### Bước 3: Nhập Mã đơn KiotViet (`external_ref`)
- Nhập chính xác mã đơn hoặc mã hóa đơn KiotViet tương ứng (ví dụ: `DH001092`, `HD004521`).
- *Mục đích*: Phục vụ đối chiếu chéo tự động giữa hệ thống TPS1 và KiotViet cuối ngày.

### Bước 4: Chọn điểm giao hàng
- Chọn từ danh sách các địa chỉ đã lưu trong sổ địa chỉ của khách (`customer_addresses`).
- Nếu khách giao đến địa điểm mới: Gõ trực tiếp địa chỉ vào ô và tích chọn **"Lưu vào sổ địa chỉ khách"** để tái sử dụng cho các đơn sau.

### Bước 5: Tìm kiếm sản phẩm & Nhập dòng hàng
- **Ô tìm kiếm sản phẩm**:
  - Tích hợp ảnh thumbnail trực quan (64px), hỗ trợ gõ có dấu hoặc không dấu (ví dụ: `thit bo` hoặc `thịt bò`).
  - Phím tắt: Gõ từ khóa → bấm **Enter** để thêm ngay sản phẩm đầu tiên vào giỏ.
- **Số lượng thập phân**: Hỗ trợ nhập số lượng lẻ (ví dụ: `1.25` kg, `0.75` kg) với bước nhảy linh hoạt.
- **Ghi chú từng dòng hàng (`items[].note`)**:
  - Bắt buộc nhập quy cách sơ chế, đóng gói nếu khách có yêu cầu (ví dụ: *"thái mỏng xào"*, *"chia túi 0.5kg"*, *"chặt khúc vừa ăn"*). Ghi chú này sẽ in trên file Thu mua và phiếu Soạn hàng.

### Bước 6: Kiểm tra hạn mức công nợ & Bấm Tạo đơn
- Nếu khách có nợ cũ vượt quá `credit_limit` (và `credit_limit > 0`), hệ thống sẽ hiển thị cảnh báo đỏ.
- Nếu được phép duyệt đơn vượt nợ: Tích chọn **"Duyệt vượt hạn mức công nợ"** và nhập rõ lý do.
- Bấm **"Tạo đơn hàng"**. Hệ thống tự sinh khóa chống trùng lặp (`idempotencyKey`). Khi đang tạo đơn, nút bấm tự khóa để tránh gửi trùng 2 lần.

---

## 3. Quy trình Duyệt đơn hàng ngày tại "Cần xử lý" (`/don-tong`)

Mỗi ngày trước và tại mốc 16:30, Vận hành truy cập trang **Đơn tổng** (`/don-tong`), chọn tab **"Cần xử lý"**:

1. **Duyệt đơn sạch hàng loạt**:
   - Các đơn hàng hợp lệ (khách đã xác thực, không vượt hạn mức, trước giờ chốt) sẽ được gom vào danh sách đơn sạch.
   - Bấm **"Xác nhận tất cả đơn sạch"** (hệ thống chia lô tối đa 50 đơn/lần gọi API) để chuyển trạng thái sang `confirmed`.
2. **Xử lý đơn có cảnh báo**:
   - Đơn trễ giờ chốt (`is_late_order`): Kiểm tra với Thu mua xem còn khả năng lấy hàng không trước khi bấm xác nhận lẻ từng đơn.
   - Đơn vượt công nợ / Khách chưa xác thực: Chuyển Kế toán hoặc Trưởng phòng kiểm tra.

---

## 4. Xử lý Yêu cầu Điều chỉnh & Hủy đơn từ Khách

Khi khách hàng gửi yêu cầu sửa hoặc hủy đơn qua WebApp/Mini App:

### Nhận biết đơn có yêu cầu
- Tại trang **Quản lý đơn** (`/don-hang`), nút lọc **"Có yêu cầu (N)"** sẽ phát xung nhịp viền đỏ nổi bật.
- Bấm vào nút này để lọc ra toàn bộ đơn có yêu cầu đang mở (`status = 'open'`).

### Thao tác xử lý:
1. **Yêu cầu Hủy đơn (`cancel_order`)**:
   - Bấm vào chi tiết đơn, đọc lý do khách xin hủy.
   - Nếu chấp thuận: Bấm **"Duyệt hủy đơn"** → Hệ thống tự động:
     - Chuyển trạng thái đơn sang `canceled`.
     - Tự động gọi RPC `sync_order_inventory` để **hoàn lại tồn kho khả dụng**.
     - Cập nhật cảnh báo biến động cho Thu mua.
2. **Yêu cầu Sửa đơn (`edit_order`)**:
   - Bấm **"Vào điều chỉnh đơn"** (chuyển sang màn hình POS chế độ xử lý đơn `?orderId=...`).
   - Màn hình giữ nguyên số lượng gốc khách đặt để đối chiếu (`ordered_quantity`).
   - Thực hiện đổi số lượng, thêm món hoặc xóa món:
     - Với mỗi dòng thay đổi: **Bắt buộc chọn Lý do điều chỉnh** (Hết hàng, Khách đổi ý, Sai quy cách...).
     - Nếu xóa dòng: Nhập lý do xóa dòng.
     - Tích chọn bắt buộc: **"☑ Đã thống nhất với khách hàng"**.
   - Bấm **"Hoàn tất điều chỉnh"**: Hệ thống tự động cập nhật đơn và lưu vết chi tiết lịch sử thay đổi vào `order_history` qua API `track-adjustment`.

---

## 5. Phối hợp với Bộ phận Thu mua khi có biến động sau Cutoff

> [!IMPORTANT]
> Sau mốc **16:30**, Thu mua đã xuất file Excel để đi chợ/đặt nhà cung cấp. Mọi thay đổi đơn hàng sau giờ này đều gây ảnh hưởng trực tiếp đến việc lấy hàng.

- Khi có đơn mới duyệt trễ hoặc đơn bị sửa/hủy sau khi Thu mua đã xuất file:
  - Khối màu đỏ cảnh báo **"Có N đơn thay đổi sau lần xuất file gần nhất"** sẽ hiện lên tại trang Đơn tổng.
  - Nhân viên Vận hành bấm nút **"📋 Sao chép thông báo Zalo"**.
  - Dán nội dung thông báo vào nhóm chat Zalo nội bộ của Thu mua để bộ phận Thu mua cập nhật số lượng kịp thời.
