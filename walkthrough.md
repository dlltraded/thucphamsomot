# Quá Trình Hoàn Thiện Tính Năng POS Tạo Đơn Hàng Admin

Hệ thống đã được nâng cấp toàn diện chức năng "Tạo Đơn Hàng Mới", chuyển đổi từ một popup modal chật chội sang giao diện POS 2 cột cực kỳ rộng rãi và chuyên nghiệp!

## 1. Những Nâng Cấp Nổi Bật Trên Giao Diện (Admin UI)
- **Thiết Kế 2 Cột Chuyên Nghiệp:** Giống hệt máy POS, bên trái là kho hàng & giỏ hàng, bên phải là thông tin thanh toán & khách hàng.
- **Thêm Sản Phẩm Ngoài (Custom):** Sale giờ đây có thể gõ tên và giá của bất kỳ món hàng nào nằm ngoài hệ thống. Logo TPS1 sẽ tự động được sử dụng làm hình mặc định!
- **Sửa Đơn Giá Trực Tiếp:** Tại bảng giỏ hàng, Sale có thể bấm vào cột Đơn giá để thay đổi mức giá theo ý muốn cho từng món hàng cụ thể (kể cả hàng trong Database).
- **Chế Độ Chiết Khấu Toàn Diện:** Bổ sung các ô nhập:
  - Mã Voucher / Số tiền giảm của Voucher.
  - Chiết khấu thêm riêng (Tiền mặt).
  - Phí giao hàng (Shipping).
- **Trải Nghiệm Mượt Mà:** Tổng tiền được tự động tính toán ngay lập tức khi thay đổi bất kỳ ô số lượng, giá, hoặc chiết khấu nào.

## 2. Nâng Cấp Kỹ Thuật (Backend)
- Đã bổ sung Script RPC `admin_create_order_full` (Siêu hàm tạo đơn). Khác với hàm tạo đơn của khách (ép giá gốc), hàm này **tuyệt đối tin tưởng giá trị Sale truyền lên** để lưu trữ chính xác các mức giá đã tinh chỉnh.
- Cập nhật API Next.js Route `/api/admin/orders/create` để trung chuyển toàn bộ dữ liệu Vouchers & Chiết khấu xuống hàm RPC mới.

---

## 3. Các Bước Cần Thực Hiện Của Anh
> [!IMPORTANT]  
> Để hệ thống hoạt động hoàn chỉnh, anh cần cập nhật **Database Supabase** để khai báo hàm RPC mới (`admin_create_order_full`).

1. Anh truy cập vào [Supabase Dashboard](https://supabase.com/dashboard/project/_/sql).
2. Copy và Chạy nội dung trong file [tps1-miniapp/supabase/migrations/20260824_admin_pos_create_order.sql](file:///d:/thuc_pham_so_mot/thuc_pham_so_mot/tps1-miniapp/supabase/migrations/20260824_admin_pos_create_order.sql) vào công cụ SQL Editor.
3. Nhấn **RUN** để khởi tạo hàm.
4. Mở `quanly/index.html` hoặc tải lại trang Vercel để trải nghiệm thành quả ngay lập tức!

## 4. G1.2 — Bảng giá và bảo mật (bổ sung)

- Bảng giá chung active có thể được đọc qua policy giới hạn; bảng giá riêng, assignment, import, audit và dữ liệu phân công không được client truy cập trực tiếp.
- API resolve giá dùng `POST` với `orderSessionToken`, lấy `customer_id` từ `customer_sessions`, kiểm tra session còn hạn và kiểm tra hiệu lực bảng giá/assignment/item.
- Giá riêng thiếu dòng sẽ fallback sang bảng giá chung và trả về `price_source=general_fallback`.
- Fixture staging có bảng giá chung, bảng giá riêng, bảng giá hết hạn, fallback và đơn `merged`; fixture có thể chạy lại.
- Rollback không xoá các cột legacy như `pricing_status`, `final_unit_price`, `department_id`; chỉ rollback các cột G1 mới và dừng nếu còn đơn `merged`.
- Migration snapshot dùng `price_resolution_status` riêng để không xung đột với `orders.pricing_status` cũ (`provisional/finalized`).

### Kết quả kiểm thử thực tế G1.2 (Đã thông qua)

Lệnh test:
```powershell
$env:API_BASE_URL="http://localhost:3000"
$env:ORDER_SESSION_TOKEN="77396351-669f-49b4-ab89-4164b3ef9b45"
node scratch/test_resolve.js "5d3330d0-8438-4c85-9b00-bc1b3291dee3" "3f4ea85a-6de5-4bf4-9409-2e1c7c45a0a2"
```

Kết quả phản hồi HTTP 200 OK:
```json
{
  "status": 200,
  "body": {
    "data": [
      {
        "product_id": "5d3330d0-8438-4c85-9b00-bc1b3291dee3",
        "price": 95000,
        "price_source": "customer_price_book",
        "price_book_id": "21d79706-e2bd-49e1-9f4f-1121b0770c5e"
      },
      {
        "product_id": "3f4ea85a-6de5-4bf4-9409-2e1c7c45a0a2",
        "price": 150000,
        "price_source": "general_fallback",
        "price_book_id": "d3dbbe46-2ecf-4cc2-8f6b-549920bc78e1"
      }
    ]
  }
}
```
- **Sản phẩm 1 (`5d3330d0-8438-4c85-9b00-bc1b3291dee3`)**: Lấy đúng giá từ bảng giá riêng của khách (`customer_price_book`) với giá 95.000đ.
- **Sản phẩm 2 (`3f4ea85a-6de5-4bf4-9409-2e1c7c45a0a2`)**: Bảng giá riêng không có món này -> Tự động fallback sang bảng giá chung (`general_fallback`) với giá 150.000đ.
- Bảng giá hết hạn (`PB_EXPIRED`) và bảng giá nháp (`PB_DRAFT`) được lọc bỏ chính xác, không bị nhầm lẫn.
- Đơn gộp giả định (`status = 'merged'`) cùng `order_merge_audit` chạy sạch sẽ qua migration fixture.

---

## 5. G2 — Import Bảng Giá Phức Tạp (Hoàn Thành Nghiệm Thu Kỹ Thuật)

### 5.1 Các tính năng cốt lõi đã triển khai
1. **Module lõi Import Engine (`lib/price-book-import/`)**:
   - `inspector.ts`: Tính mã băm SHA-256 xác thực tính duy nhất (idempotent), kiểm tra dung lượng (<15MB), định dạng `.xlsx/.xls`, phân loại tự động `standard_template` hoặc `multi_level_kitchen`.
   - `detector.ts`: Tự động nhận diện header đa tầng (gộp tên bếp/khách + GIÁ + C.KHẤU), sinh cấu hình mapping cột.
   - `matcher.ts`: Chuẩn hóa văn bản Unicode NFC, khớp theo thứ tự ưu tiên tuyệt đối: (1) SKU exact -> (2) Tên chuẩn hóa + ĐVT exact -> (3) Phát hiện ambiguous -> (4) Unmatched -> (5) Bỏ qua tiêu đề nhóm danh mục (`skipped_category`).
   - `validator.ts`: Xử lý giá blank (thiếu giá), giá 0 (zero_price), giá âm, chiết khấu 0-100%, định dạng số.
   - `previewer.ts`: Thống kê tổng hợp số liệu phân loại và hỗ trợ phân trang preview.
   - `committer.ts`: Cơ chế commit an toàn vào bảng giá ở trạng thái `draft`, kiểm tra chặn trùng lặp file (idempotent) theo SHA-256 checksum, tuyệt đối không ghi đè bảng giá `active`.

2. **Hệ thống Server API (`app/api/admin/price-books/`)**:
   - `POST /api/admin/price-books/import/inspect`: Upload file, đọc metadata và cấu hình mapping đề xuất.
   - `POST /api/admin/price-books/import/preview`: Kiểm tra toàn bộ dữ liệu, phân loại dòng và trả về kết quả preview.
   - `POST /api/admin/price-books/import/commit`: Lưu các dòng hợp lệ vào bảng giá nháp (`draft`) và ghi audit log.
   - `POST /api/admin/price-books/activate`: Cho phép quản trị viên/CEO chuyển bảng giá từ `draft` -> `active`, tự động chuyển version cũ sang `archived`.
   - `GET /api/admin/price-books`: Liệt kê danh sách bảng giá trong hệ thống.

3. **Giao diện Quản lý Admin (`webapptps1/manage/src/pages/PriceBooksPage.tsx`)**:
   - Quy trình Wizard 4 bước: Tải file & kiểm tra Checksum -> Cấu hình mapping -> Rà soát preview phân trang với 7 thẻ thống kê -> Lưu nháp (Draft) & Kích hoạt (Active).
   - Tải file báo cáo lỗi (JSON/Excel).
   - Tích hợp menu "Bảng giá (G2)" trên thanh điều hướng.

4. **Database Migration (`tps1-miniapp/supabase/migrations/20260923_price_book_import_g2.sql`)**:
   - Bổ sung `file_name`, `file_checksum`, `sheet_name`, `mapping_config`, `committed_at` cho `price_book_import_jobs`.
   - Mở rộng ràng buộc `validation_status` cho `price_book_import_rows` hỗ trợ đầy đủ các trạng thái thống kê.

---

### 5.2 Kết quả kiểm thử thực tế trên 4 bộ file Excel

| File Kiểm Thử | Loại Bảng | Tổng Dòng | Khớp Hợp Lệ | Giá 0đ | Chưa Khớp (Unmatched) | Trùng Tên (Ambiguous) | Thiếu Giá (Blank) | Dòng Danh Mục Bỏ Qua |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **`MauFileBangGia.xlsx`** | Template đơn tầng (KiotViet) | 3 | 0 | 0 | 3 | 0 | 0 | 0 |
| **`BẢNG TÍNH GIÁ CÁC BẾP TP 09.26.xlsx`** (`BÁO GIÁ`) | Đa tầng nhiều bếp (38 cột, 13 bảng giá) | 4.032 | 1.903 | 2.099 | 162 | 5 | 51 | 17 |
| **`BangGia_KV22092026-164602-820.xlsx`** | Bảng giá KiotViet xuất | 5.313 | 2.040 | 3.273 | 22 | 0 | 0 | 0 |
| **`BangGia_KV22092026-213634-533.xlsx`** | Bảng giá KiotViet xuất | 5.314 | 2.040 | 3.274 | 23 | 0 | 0 | 0 |

- **Kiểm tra Idempotency**: Thử commit lần 2 với cùng mã băm SHA-256 -> Hệ thống chặn thành công với thông báo: *"File này đã được import và commit thành công trước đó... Tránh nhập trùng lặp!"*.
- **Kiểm tra An toàn Bảng giá Active**: Bảng giá import luôn được gắn cờ `status = 'draft'`.
- **Kiểm tra Tính nguyên vẹn G1.2 Resolve**: Gọi API `POST /api/customer/price-books/resolve` sau import -> Sản phẩm 1 vẫn trả `95.000đ` (`customer_price_book`), Sản phẩm 2 vẫn trả `150.000đ` (`general_fallback`), không bị ảnh hưởng.
