# HƯỚNG DẪN SỬ DỤNG — BỘ PHẬN THU MUA

> **Tài liệu hướng dẫn nghiệp vụ chuẩn TPS1 — Giai đoạn Phase 1**  
> **Áp dụng cho:** Bộ phận Thu mua, Quản lý Thu mua, Ban Giám đốc

---

## 1. Mục tiêu & Quyền truy cập

Bộ phận Thu mua chịu trách nhiệm tổng hợp toàn bộ lượng hàng cần giao cho ngày hôm sau ngay sau giờ chốt đơn (Cutoff), đối chiếu tồn kho khả dụng để xác định số lượng thực tế cần đặt nhà cung cấp (NCC), và xuất file Excel 3 sheet chuẩn xác phục vụ việc đi chợ/đặt hàng đêm.

- **Địa chỉ truy cập**: `https://<domain>/don-tong`
- **Tài khoản**: Đăng nhập bằng tài khoản có vai trò `thu_mua` (hoặc `admin`, `truong_phong`).
- **Màn hình làm việc chính**: **Đơn tổng** (`/don-tong`) — Tab **"Tổng hợp soạn hàng"**.

---

## 2. Thời điểm gom hàng & Giờ chốt (Cutoff)

Để đảm bảo không sót đơn và số liệu gom hàng chuẩn xác nhất:

| Ngày giao hàng | Hạn chốt đơn của khách / Vận hành | Thời điểm Thu mua xuất file |
|---|---|---|
| **Thứ 3 đến Thứ 7** | **16:30** chiều ngày hôm trước (D-1) | **Từ 16:35** chiều ngày hôm trước |
| **Chủ nhật & Thứ 2** | **17:00** chiều Thứ 7 | **Từ 17:05** chiều Thứ 7 |

> [!TIP]
> Trước khi xuất file, hãy liên hệ nhanh với Vận hành để đảm bảo Vận hành đã bấm "Xác nhận tất cả đơn sạch" tại tab *Cần xử lý*.

---

## 3. Thao tác trên Trang Đơn tổng (`/don-tong`)

```
[Chọn Ngày giao hàng] ──► [Xem Bảng tổng hợp gom hàng] ──► [Kiểm tra Checksum] ──► [Xuất file Excel] ──► [Theo dõi Biến động sau xuất]
```

### Bước 1: Chọn ngày giao hàng cần gom
- Tại thanh công cụ đầu trang, chọn đúng **Ngày giao hàng** (hệ thống có sẵn nút bấm nhanh *"Hôm nay"* / *"Ngày mai"*).
- Tùy chọn **"Bao gồm đơn chờ xác nhận" (`includePending`)**:
  - *Khi chưa đến giờ chốt*: Tích chọn ô này để xem trước số lượng dự kiến cần mua (dự trù nguồn hàng sớm).
  - *Sau giờ chốt (chính thức)*: Bỏ tích ô này nếu chỉ muốn lấy các đơn đã được Vận hành chính thức phê duyệt (`confirmed`).

### Bước 2: Đọc bảng tổng hợp số lượng
Bảng gom hàng tự động phân nhóm theo danh mục sản phẩm (Rau củ quả, Thịt heo, Bò, Gia vị...):
- **Cột Tên sản phẩm & ĐVT**: Đơn vị tính chuẩn (kg, bó, khay, túi...).
- **Cột Số lượng đặt (Tổng SL)**: Tổng lượng khách hàng đặt cho ngày giao đó.
- **Cột Tồn kho**: Tồn kho khả dụng hiện tại trong kho TPS1.
- **Cột Cần mua / Cần bù**:
  - Nếu hiện **chữ đỏ âm** (ví dụ: `-15.5 kg`): Đây là số lượng thiếu hụt bắt buộc phải đặt NCC hoặc đi chợ gom về.
  - Nếu bằng `0` hoặc dương: Kho hiện tại đã đủ hàng, không cần mua thêm.

### Bước 3: Xem chi tiết phân bổ từng khách hàng & Quy cách
- Bấm vào biểu tượng **Mũi tên mở rộng (▼)** ở đầu mỗi dòng sản phẩm.
- Hệ thống sẽ xổ ra danh sách chi tiết: Khách hàng nào đặt, số lượng bao nhiêu, mã đơn TPS1, mã đơn KiotViet tương ứng.
- **Đặc biệt lưu ý cột Ghi chú**: Đọc rõ các yêu cầu quy cách riêng của khách (ví dụ: *"lấy bắp bò hoa"*, *"thịt đùi nạc ít mỡ"*, *"bí xanh trái dài"*) để chọn hàng chuẩn khi làm việc với NCC.

---

## 4. Kiểm tra Đối chiếu Checksum & Xuất file Excel

### Hộp đối chiếu Checksum (Kiểm tra toàn vẹn)
Ngay phía trên nút Xuất file có khối **Hộp đối chiếu Checksum**:
- Hệ thống tự động tính toán tổng số lượng gom theo mặt hàng (Sheet 1) và tổng chi tiết phân bổ cho từng khách (Sheet 2).
- Nếu hiển thị **`Khớp ✓ (Tổng Sheet 1 = Tổng Sheet 2)`**: Dữ liệu hoàn toàn khớp, sẵn sàng xuất file.
- Nếu hiển thị cảnh báo đỏ **`Lệch ✗`**: Liên hệ ngay Vận hành/Kỹ thuật để kiểm tra đơn hàng đang bị khóa hoặc lỗi đồng bộ.

### Bấm "Xuất file Excel" (`/api/admin/procurement/export`)
Bấm nút màu xanh **"📥 Xuất file Excel"**. File tải về có tên dạng: `Don_Tong_YYYY-MM-DD.xlsx` gồm 3 sheet:

1. **Sheet 1 — Tổng hợp soạn hàng**:
   - Nhóm theo ngành hàng, sắp xếp khoa học.
   - Thể hiện rõ: Mã SP, Tên hàng, ĐVT, Tổng SL đặt, Tồn kho hiện tại, Số lượng cần bù NCC.
   - Dòng tổng cộng ghi chú rõ *"Tổng số lượng (chỉ để đối chiếu)"*.
2. **Sheet 2 — Chi tiết theo khách**:
   - Thể hiện rõ: Tên khách hàng, Mã khách, Mã đơn TPS1, **Mã đơn KiotViet (`external_ref`)**, Tên hàng, Số lượng, và **Ghi chú sơ chế/quy cách**.
3. **Sheet 3 — Danh sách đơn hàng**:
   - Thống kê toàn bộ các đơn hàng trong ngày giao: Mã đơn, Khách hàng, Giờ đặt, Trạng thái đơn, Nhân viên phụ trách.

---

## 5. Xử lý Biến động Đơn hàng sau khi đã Xuất file (`changedSinceLastExport`)

Trong thực tế, sau mốc 16:30 có thể có khách phát sinh đơn khẩn cấp hoặc xin sửa/hủy món:

1. **Nhận biết biến động**:
   - Nếu có bất kỳ đơn hàng nào được thêm mới, sửa số lượng hoặc hủy sau mốc thời gian bạn bấm Xuất file gần nhất:
   - Màn hình Đơn tổng sẽ xuất hiện ngay một **Khối màu đỏ cảnh báo**:
     > *"⚠️ Có [N] đơn hàng thay đổi sau lần xuất file gần nhất lúc [HH:mm:ss]"*
2. **Nhận thông báo Zalo từ Vận hành**:
   - Nhân viên Vận hành sẽ gửi thông báo khẩn qua nhóm Zalo Thu mua (nội dung sao chép tự động từ hệ thống, nêu rõ mã đơn, tên khách và mặt hàng đổi).
3. **Thao tác của Thu mua**:
   - Kiểm tra danh sách đơn thay đổi được liệt kê trong khối đỏ.
   - Nếu biến động lớn: Bấm nút **"Xuất file Excel"** một lần nữa để tải bản cập nhật mới nhất.
   - Gọi điện cho NCC hoặc ghi chú trực tiếp bổ sung vào danh sách mua hàng đêm.
