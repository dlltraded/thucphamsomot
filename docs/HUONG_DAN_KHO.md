# HƯỚNG DẪN SỬ DỤNG — BỘ PHẬN KHO & SOẠN HÀNG

> **Tài liệu hướng dẫn nghiệp vụ chuẩn TPS1 — Giai đoạn Phase 1**  
> **Áp dụng cho:** Thủ kho, Nhân viên Soạn hàng, Nhân viên Đóng gói

---

## 1. Mục tiêu & Quyền truy cập

Bộ phận Kho chịu trách nhiệm nhận hàng đêm từ Thu mua nhập về, phân loại, cân đo, sơ chế theo đúng quy cách của từng khách hàng, đóng gói theo đơn và chuẩn bị sẵn sàng cho Tài xế đi giao vào sáng sớm.

- **Địa chỉ truy cập**: `https://<domain>/soan-hang`
- **Tài khoản**: Đăng nhập bằng tài khoản có vai trò `kho` (hoặc `sale` có quyền soạn hàng).
- **Màn hình làm việc chính**: **Soạn hàng** (`/soan-hang`) và **Quản lý đơn** (`/don-hang`).

---

## 2. Quy trình Soạn hàng theo Ngày giao (`/soan-hang`)

```
[Chọn Ngày giao hàng] ──► [Chọn Đơn cần soạn] ──► [Đọc Quy cách & Cân hàng] ──► [Cập nhật Tiến độ Soạn] ──► [In Phiếu tạm & Bàn giao]
```

### Bước 1: Chọn ngày giao hàng
- Màn hình Soạn hàng có bộ lọc **Ngày giao hàng** ở góc trên.
- **Bắt buộc**: Chọn đúng ngày giao cần soạn (mặc định hiển thị ngày hôm nay hoặc ngày mai).
- Danh sách bên dưới sẽ chỉ hiển thị các đơn hàng có ngày giao trùng khớp và đã được Vận hành xác nhận (`confirmed` hoặc `preparing`).

### Bước 2: Xem chi tiết đơn hàng & Quy cách sơ chế
- Bấm chọn vào đơn hàng của từng khách để mở danh sách các mặt hàng cần chuẩn bị.
- Quan sát kỹ các cột:
  - **Mã & Tên sản phẩm**: Đảm bảo lấy đúng mã mặt hàng.
  - **Đơn vị tính & Số lượng**: Hỗ trợ số lượng thập phân (ví dụ: `1.5 kg`, `0.75 kg`).
  - **CỘT GHI CHÚ (QUAN TRỌNG NHẤT)**: Đọc kỹ yêu cầu cụ thể của từng khách:
    - *Yêu cầu thái/cắt*: "Thái mỏng xào", "chặt khúc kho", "lọc bỏ xương"...
    - *Yêu cầu đóng gói*: "Chia 2 khay", "đóng túi 1kg/túi", "để riêng cuống"...
    - *Yêu cầu lựa chọn*: "Trái vừa chín tới", "rau già bỏ bớt gốc"...

### Bước 3: Cập nhật trạng thái Soạn hàng / Đóng gói
Hệ thống cho phép cập nhật trạng thái theo từng đơn để quản lý và điều phối xe giao hàng:
- **Chưa soạn (`not_started`)**: Đơn mới nhận, chưa bắt đầu gom/sơ chế.
- **Đang soạn (`in_progress`)**: Nhân viên đang cân hàng, sơ chế hoặc đóng thùng.
- **Đã soạn xong (`done`)**: Đơn đã hoàn tất 100%, hàng đã vào thùng/túi, sẵn sàng giao xe.

### Bước 4: In Phiếu tạm / Phiếu soạn hàng
- Bấm nút **"In phiếu"** trên màn hình đơn hàng để in phiếu tạm dán lên thùng hàng.
- Phiếu thể hiện đầy đủ: Tên khách hàng, Mã đơn TPS1, Mã KiotViet (`external_ref`), Địa chỉ giao hàng, danh sách món và số lượng cân để người nhận/tài xế dễ kiểm tra.

---

## 3. Quy tắc Trừ kho & Hoàn trả Tồn kho

Hệ thống quản lý tồn kho tự động theo các mốc trạng thái nghiệp vụ:

1. **Trừ kho tự động khi xác nhận đơn**:
   - Ngay khi Vận hành duyệt đơn (`status = 'confirmed'`), hệ thống tự động xuất kho tạm tính cho số lượng sản phẩm trong đơn.
2. **Hoàn kho tự động khi hủy đơn**:
   - Nếu khách hàng hoặc Vận hành hủy một đơn hàng đã xác nhận: Hệ thống tự động kích hoạt hàm RPC `sync_order_inventory` để **hoàn lại đúng số lượng tồn kho** vào kho khả dụng. Thủ kho không cần phải nhập tay phiếu bù kho.
3. **Đối soát số lượng thực xuất khi giao hàng**:
   - Trường hợp thực tế kho bị thiếu hàng hoặc cân lệch (ví dụ: khách đặt 2.0 kg nhưng thực tế chỉ cân được 1.9 kg):
   - Báo ngay cho Vận hành để ghi nhận tại bước **Xác nhận thực giao** (`reconcile-delivery`). Số lượng tồn kho sẽ được hệ thống cân chỉnh lại theo đúng số thực giao.

---

## 4. Lưu ý An toàn & Chất lượng thực phẩm
- Ưu tiên soạn hàng mát/hàng đông lạnh (thịt, cá tươi) sau cùng hoặc bảo quản trong thùng xốp giữ nhiệt trước khi chất lên xe.
- Kiểm tra bao bì, niêm phong túi và tem nhãn ghi rõ tên khách hàng trước khi bàn giao cho Tài xế.
