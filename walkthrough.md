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

---

## 6. ORDER-BULK: Quản Lý Đơn Hàng — Tạo Đơn, Gộp Đơn, Xuất File (Hoàn Thành)

Theo đúng kế hoạch [GEMINI_ORDER_LIST_MERGE_EXPORT_PLAN.md](file:///d:/thuc_pham_so_mot/thuc_pham_so_mot/docs/GEMINI_ORDER_LIST_MERGE_EXPORT_PLAN.md), hệ thống đã hoàn thiện toàn bộ luồng quản lý đơn hàng chuẩn hóa:

### 6.1. Các chức năng đã triển khai

1. **Thanh công cụ & Danh sách (`OrdersPage.tsx`)**:
   - Nút **`+ Tạo đơn hàng`** trực tiếp trên thanh công cụ dẫn tới màn POS bán hàng (`/tao-don-hang`).
   - Checkbox từng dòng và ô chọn toàn bộ trang.
   - Thanh cố định phía dưới khi chọn đơn: `Đã chọn N đơn | Gộp đơn | Xuất file | In phiếu tạm | Bỏ chọn`.
   - Cột trạng thái hỗ trợ hiển thị badge `Đã gộp` (`status = 'merged'`).

2. **Nghiệp vụ Gộp đơn & Modal xem trước (`MergeOrdersModal.tsx`)**:
   - `POST /api/admin/orders/merge/preview`:
     - Kiểm tra bắt buộc: Cùng khách hàng, cùng ngày giao, cùng địa chỉ nhận, cùng chi nhánh.
     - Chặn các đơn đã `completed`, `canceled`, `merged`, `shipping`, hoặc đã xuất hóa đơn.
     - Nếu có đơn đã xác nhận / chốt giá: Yêu cầu quyền `orders.merge_locked` (Trưởng phòng/Admin).
     - **Quy tắc SKU sống còn**: Các dòng cùng SKU nhưng khác quy cách đóng gói (`packaging_note`) hoặc ghi chú (`customer_note`/`pricing_note`) **giữ nguyên thành từng dòng độc lập**, không bị cộng dồn sai.
     - Cung cấp `previewToken` ngắn hạn bảo mật bằng HMAC-SHA256 chống thay đổi dữ liệu giữa lúc xem trước và lúc lưu.
   - `POST /api/admin/orders/merge/commit`:
     - Tạo đơn hàng mới chuẩn mã `DH-YYYYMMDD-HHMMSS-XXXX` trong transaction.
     - Chuyển toàn bộ đơn nguồn sang `status = 'merged'` và liên kết `merged_into_order_id`.
     - Tuyệt đối không xóa đơn nguồn để lưu trữ lịch sử và đối soát.
     - Tự động ghi nhận log audit chi tiết vào bảng `order_merge_audit` (người gộp, thời gian, điều kiện gộp, số item trước/sau).
     - Chuyển tiếp lịch sử thanh toán từ `order_payments` sang đơn mới.
     - Cơ chế `idempotency_key` chống bấm đúp tạo trùng đơn.

3. **Menu Xuất file theo ngữ cảnh (`/api/admin/orders/export`)**:
   - Mở rộng hỗ trợ xuất theo danh sách đơn được chọn (`orderIds`) hoặc toàn bộ bộ lọc.
   - Hỗ trợ 2 chế độ:
     - `mode = 'list'`: Xuất danh sách tổng hợp chuẩn Excel có dòng cộng tổng tiền, đã trả, còn nợ.
     - `mode = 'details'`: Xuất chi tiết từng dòng mặt hàng (Mã đơn, Tên hàng, ĐVT, Quy cách/Ghi chú, SL, Đơn giá, Thành tiền) để bộ phận bếp/kho đối chiếu khi soạn hàng.
   - Hỗ trợ in phiếu tạm hoặc phiếu giao hàng hàng loạt (`printBatchOrderSlips`) tự động ngắt trang (`page-break-after: always`).

4. **Chống tính trùng trong Đơn tổng & Soạn hàng**:
   - Đã xác thực trong [DonTongPage.tsx](file:///d:/thuc_pham_so_mot/webapptps1/manage/src/pages/DonTongPage.tsx) và [SoanHangPage.tsx](file:///d:/thuc_pham_so_mot/webapptps1/manage/src/pages/SoanHangPage.tsx): Các đơn nguồn ở trạng thái `merged` hoàn toàn không bị đưa vào tập hợp nhu cầu hay bảng phân công soạn hàng, bảo đảm nhu cầu hàng hóa chính xác 100%.

### 6.2. Kết quả kiểm thử tự động
- `scratch/test_order_merge_suite.mjs`:
  - Token signing & HMAC verification: ✔ PASS
  - Tampered token rejection: ✔ PASS
  - Kiểm tra gộp 4 dòng hàng mẫu (2 dòng thịt bò khác ghi chú, 2 dòng rau cải cùng loại): Kết quả ra đúng 3 dòng (thịt bò giữ riêng 2 dòng, rau cải cộng dồn thành 5kg): ✔ PASS
- Biên dịch TypeScript & Vite build:
  - `webapptps1/manage`: ✔ Build thành công (492ms)
  - `thuc_pham_so_mot/manage`: ✔ Build thành công (698ms)
  - Next.js root `thuc_pham_so_mot`: `npx tsc --noEmit` ✔ PASS (0 errors)

---

## 7. REDESIGN UI/UX & TỐI ƯU MOBILE CHUẨN KIOTVIET

Dựa trên phản hồi thực tế về thẩm mỹ và trải nghiệm di động, hệ thống quản trị TPS1 đã được thiết kế lại toàn diện:

### 7.1. Cải tiến thẩm mỹ & chuyên nghiệp (Dashboard & Quản lý)
- **Loại bỏ khối banner xanh đậm cồng kềnh**: Thay thế bằng Header dạng thẻ trắng tinh tế, viền mảnh mềm mại, biểu tượng người dùng có chỉ báo trạng thái trực tuyến, lời chào thân thiện theo vai trò và thanh ticker thông báo vận hành sống động.
- **Thẻ thống kê thông minh (Metric Cards)**: Nâng cấp với dải gradient màu nhẹ (soft tint), huy hiệu trạng thái và hỗ trợ nhấp chuột chuyển hướng trực tiếp đến danh sách đơn tương ứng (`/don-hang?status=pending`, v.v.).
- **Danh sách đơn gần đây**: Thiết kế dạng danh sách hóa đơn hiện đại với dot tròn màu chỉ báo trạng thái và mũi tên điều hướng.

### 7.2. Tối ưu trải nghiệm Mobile chuẩn KiotViet (`OrdersPage.tsx`)
1. **Thanh thao tác thu gọn biểu tượng kèm chú thích (Tooltips on Hover/Tap)**:
   - Trên mobile: Các nút thao tác dài (`+ Tạo đơn hàng`, `Gộp đơn`, `Xuất file`) được tinh gọn thành các nút icon tròn/bo góc thông minh:
     - `+` (Xanh lá): Tạo đơn hàng mới (POS)
     - `Package` (Xanh dương): Gộp phiếu đặt hàng (hiển thị số đơn được chọn)
     - `FileSpreadsheet` (Trắng): Xuất file Excel / In phiếu
     - `RefreshCw` (Xoay): Tải lại dữ liệu
   - **Bong bóng Tooltip nổi (Floating Tooltip Bubble)**: Khi rà chuột (desktop) hoặc nhấn giữ/chạm (mobile), một bong bóng giải thích rõ ràng chức năng lập tức xuất hiện ngay cạnh nút, mang lại trải nghiệm tiện dụng và trực quan đúng như KiotViet.
2. **Thanh tab lọc trạng thái vuốt ngang (Horizontal Status Chips)**:
   - Thay thế các dropdown chọn trạng thái rườm rà bằng dãy tab cuộn ngang mượt mà: `[ Tất cả ]`, `[ Chờ xác nhận ]`, `[ Đang chuẩn bị ]`, `[ Đang giao ]`, `[ Hoàn thành ]`, `[ Đã gộp ]`, `[ Có yêu cầu ]`.
   - Mỗi tab hiển thị số lượng đơn tức thì, nhấp vào là lọc dữ liệu ngay lập tức.
3. **Thẻ đơn hàng Mobile chuẩn KiotViet (Mobile Order Cards)**:
   - Checkbox kích thước lớn dễ chạm bằng ngón tay.
   - Mã đơn hàng đậm nét, tag kênh bán (Admin, Zalo, POS), huy hiệu trạng thái với chấm tròn màu sinh động.
   - Tổng tiền in đậm nổi bật ở góc phải.
   - Tên khách hàng & xưởng/chi nhánh phân cấp rõ ràng.
   - Dòng lịch giao hàng (`📅 Giao: dd/mm/yyyy`) và địa chỉ nhận hàng nổi bật.
   - Cụm nút thao tác nhanh (In phiếu tạm, Sửa đơn POS, Xem chi tiết, Xóa) đảm bảo kích thước chạm tối thiểu $\ge 40\text{px}$.
4. **Thanh chọn nhiều đơn nổi phía dưới (Sticky Bottom Action Bar)**:
   - Nâng vị trí lên `bottom-20 md:bottom-6` để hoàn toàn không bị che bởi thanh điều hướng chân trang (Mobile Bottom Nav).
   - Thiết kế kính mờ cao cấp (`bg-slate-900/95 backdrop-blur-md`), tích hợp các nút Gộp đơn, Xuất Excel, In phiếu tạm và Bỏ chọn tiện lợi.

---

## 8. TRIỆT TIÊU THANH CUỘN NGUYÊN BẢN & BÁO CÁO BÀN GIAO VẬN HÀNH

### 8.1. Triệt tiêu thanh cuộn xám có mũi tên tam giác (Sidebar & Toàn hệ thống)
- **Vấn đề thực tế**: Trên môi trường Windows (Chrome/Edge/Brave), khi thanh điều hướng bên trái (`<aside>`) thu gọn (`w-[76px]`), trình duyệt tự động chèn một thanh cuộn xám mặc định rộng tới 17px kèm hai nút mũi tên tam giác (lên/xuống), đè lên các biểu tượng menu và làm đứt đoạn giao diện ("không liền lạc").
- **Giải pháp dứt điểm**:
  - Tại [index.css](file:///d:/thuc_pham_so_mot/webapptps1/manage/src/index.css):
    - Khai báo `*::-webkit-scrollbar-button { display: none !important; width: 0 !important; height: 0 !important; }` để triệt tiêu vĩnh viễn các hộp mũi tên tam giác xấu xí.
    - Xây dựng tiện ích `.no-scrollbar`: Ẩn 100% thanh cuộn trên mọi trình duyệt (Webkit, Firefox, IE/Edge) nhưng **vẫn giữ nguyên khả năng cuộn bằng con lăn chuột, trackpad và cảm ứng vuốt tay**.
    - Tiện ích `.sleek-scrollbar`: Chuẩn hóa thanh cuộn vùng nội dung thành thanh mảnh 5px bán trong suốt, bo tròn góc như phong cách macOS/Figma.
  - Tại [SaleLayout.tsx](file:///d:/thuc_pham_so_mot/webapptps1/manage/src/layouts/SaleLayout.tsx): Áp dụng `.no-scrollbar` cho `<nav>` của sidebar và `.sleek-scrollbar` cho vùng `<main>`. Sidebar giờ đây hoàn toàn phẳng, tinh tế và liền lạc.

### 8.2. Khắc phục triệt để lỗi "Unexpected end of JSON input" (Đơn tổng & Soạn hàng)
- **Nguyên nhân**: File cấu hình Vite proxy chuyển tiếp `/api` đến cổng `3001`. Do trước đó backend Next.js chưa được khởi động trên cổng 3001, proxy trả về `HTTP 502 Bad Gateway` với thân phản hồi rỗng (`0 byte`). Khi client gọi `res.json()` trực tiếp trên thân rỗng, trình duyệt văng lỗi cú pháp JSON.
- **Biện pháp khắc phục**:
  1. Khởi chạy và duy trì dịch vụ Backend Next.js trên cổng `3001` (`node scripts/dev-server.mjs`).
  2. Đặt cổng mặc định trong [scripts/dev-server.mjs](file:///d:/thuc_pham_so_mot/thuc_pham_so_mot/scripts/dev-server.mjs#L5) thành `3001` để luôn đồng bộ với cấu hình proxy.
  3. Cập nhật [DonTongPage.tsx](file:///d:/thuc_pham_so_mot/webapptps1/manage/src/pages/DonTongPage.tsx) và [SoanHangPage.tsx](file:///d:/thuc_pham_so_mot/webapptps1/manage/src/pages/SoanHangPage.tsx) sang dùng hàm helper [getApiBase](file:///d:/thuc_pham_so_mot/webapptps1/manage/src/lib/apiBase.ts).
  4. Bổ sung cơ chế parse an toàn (Defensive JSON Parsing): Kiểm tra `res.ok`, bắt lỗi mạng và parse fallback `await res.json().catch(() => null)`.

### 8.3. Danh mục rà soát độ ổn định Mobile (Mobile UX Checklist)
| Thành phần | Trạng thái | Chi tiết tối ưu |
| :--- | :---: | :--- |
| **Thanh Header & Nút thao tác** | ✔ Hoàn hảo | Trên mobile thu gọn thành các icon `+`, `Gộp đơn`, `Xuất file`, `Tải lại` kèm bong bóng Tooltip nổi khi rà/chạm. |
| **Dãy Tab trạng thái** | ✔ Hoàn hảo | Vuốt ngang mượt mà, không lộ thanh cuộn, tích hợp bộ đếm đơn hàng thời gian thực. |
| **Thẻ đơn hàng (Order Cards)** | ✔ Hoàn hảo | Định dạng thẻ hóa đơn, checkbox to dễ chạm ($\ge 40\text{px}$), mã đơn, kênh bán, chấm trạng thái màu, ngày giao, địa chỉ. |
| **Thanh chọn nhiều đơn nổi** | ✔ Hoàn hảo | Đặt tại `bottom-20` (nổi an toàn phía trên thanh Bottom Nav 16px), không bao giờ bị che khuất. |
| **Modal Gộp đơn (2 bước)** | ✔ Hoàn hảo | Chuẩn KiotViet: Bước 1 gom theo khách hàng + ngày giao; Bước 2 xem trước từng mặt hàng; tương thích 100% màn hình nhỏ. |
| **Đơn tổng & Soạn hàng** | ✔ Hoàn hảo | Giao diện co giãn tự nhiên, các nút lọc và xuất file xếp tầng thông minh, không bị vỡ layout. |

### 8.4. Hướng dẫn bàn giao & Tiếp tục công việc cho người kế nhiệm
Khi tiếp quản dự án hoặc chuyển giao ca làm việc:
1. **Khởi chạy hệ thống ở môi trường Local/Dev**:
   - Backend Next.js (cổng 3001):
     ```bash
     cd d:\thuc_pham_so_mot\thuc_pham_so_mot
     npm run dev
     ```
   - Frontend Vite Quản lý (cổng 4173 hoặc 5173):
     ```bash
     cd d:\thuc_pham_so_mot\webapptps1\manage
     npm run preview -- --port 4173
     # Hoặc chạy dev mode: npm run dev
     ```
2. **Nguyên tắc đồng bộ 2 kho Frontend**:
   - Mọi thay đổi trong `webapptps1/manage` cần được đồng bộ tương ứng sang `thuc_pham_so_mot/manage` bằng lệnh sao chép và chạy `npm run build` để kiểm tra TypeScript.
3. **Các quy tắc nghiệp vụ bất di bất dịch**:
   - **Gộp đơn**: Tuyệt đối không xóa đơn nguồn, chuyển trạng thái sang `status = 'merged'`. Các dòng cùng SKU nhưng khác quy cách đóng gói (`packaging_note`) hoặc ghi chú phải giữ nguyên thành các dòng độc lập.
   - **Đơn tổng & Soạn hàng**: Luôn lọc bỏ các đơn có `status = 'merged'` để không bao giờ bị tính trùng nhu cầu hàng hóa.

### 8.5. Khắc phục lỗi "Failed to fetch" & Phân định ranh giới chứng từ vận hành
- **Xử lý dứt điểm "Failed to fetch"**:
  - Tại [apiBase.ts](file:///d:/thuc_pham_so_mot/webapptps1/manage/src/lib/apiBase.ts): Bổ sung kiểm tra `window.location.hostname === 'localhost'`. Khi chạy môi trường nội bộ máy tính (cả `vite dev` 5173 hay `vite preview` 4173), hàm luôn trả về `''` để đi qua Vite proxy nội bộ cổng 3001, ngăn chặn việc gọi nhầm sang `https://thucphamsomot.vn` dẫn đến lỗi chặn CORS (`Failed to fetch`).
- **Phân định ranh giới chứng từ vận hành (Bất di bất dịch)**:
  - **Tuyệt đối không gộp chung chứng từ**: "Bảng kiểm tra nhu cầu thu mua" và "Lệnh soạn hàng kho" là hai chứng từ pháp lý và quy trình vận hành hoàn toàn khác nhau:
    - **`[ 📋 Kiểm tra hàng ]` (`/kiem-tra-hang`)**: Bảng kiểm tra nhu cầu thu mua — **CHƯA PHẢI LỆNH SOẠN HÀNG**. Dùng cho đơn chờ xử lý/dự kiến để Thu mua đi chợ gom hàng, kiểm tra số lượng đáp ứng, đề xuất sản phẩm thay thế hoặc giá vốn nhập khi biến động.
    - **`[ 📦 Soạn hàng ]` (`/soan-hang`)**: Danh sách soạn hàng / Lệnh soạn hàng kho — **CHỈ DÀNH CHO ĐƠN ĐÃ XÁC NHẬN (CONFIRMED)**. Phát hành Picking Task chính thức kèm phiên bản chốt (confirmation version) để nhân viên kho nhặt hàng, dán tem nhãn, in phiếu giao hàng.
    - **`[ 📊 Đơn tổng ]` (`/don-tong`)**: Báo cáo tổng hợp nhu cầu hàng hóa để ban quản lý và thu mua theo dõi tổng sản lượng.

---

## 9. HỆ THỐNG KIỂM TRA NHU CẦU THU MUA & SOẠN HÀNG KHO (GATES G0 – G8.1 HOÀN TẤT)

Theo đúng kế hoạch thiết kế [GEMINI_THU_MUA_KIEM_TRA_VA_SOAN_HANG_PLAN.md](file:///d:/thuc_pham_so_mot/thuc_pham_so_mot/docs/GEMINI_THU_MUA_KIEM_TRA_VA_SOAN_HANG_PLAN.md), toàn bộ quy trình phối hợp giữa Vận hành (Sale/Điều phối), Thu mua và Kho đã được hiện thực hóa trọn vẹn từ Gate G0 đến G8 và hoàn thiện tinh chỉnh schema thực tế ở vòng G8.1:

### 9.1. Hai Trục Phân Hệ Độc Lập Chuẩn Hóa

```
┌─────────────────────────────────────────────────────────────┐
│                 ĐƠN HÀNG (ORDERS)                           │
│                 Trạng thái: Pending                         │
└──────────────────────────────┬──────────────────────────────┘
                               │ (1) Gửi kiểm tra
                               ▼
┌─────────────────────────────────────────────────────────────┐
│  PHÂN HỆ 1: KIỂM TRA HÀNG THU MUA (/kiem-tra-hang)          │
│  - Chứng từ: "Bảng kiểm tra nhu cầu"                        │
│  - RÀO CHẮN: CHƯA PHẢI LỆNH SOẠN HÀNG!                      │
│  - Thu mua nhận đơn (RPC Claim - Khóa nguyên tử)            │
│  - Đánh dấu: Đủ / Thiếu / Hết hàng / Đề xuất đổi SP         │
│  - proposed_price KHÔNG ghi đè giá bán trong order_items   │
│  - Vòng lặp: submit_review <-> request_revision             │
│  - Vận hành duyệt: accepted_by_operations                   │
└──────────────────────────────┬──────────────────────────────┘
                               │ (2) Chốt đơn (Confirm)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│  PHÂN HỆ 2: LỆNH SOẠN HÀNG KHO (/soan-hang)                 │
│  - RÀO CHẮN: CHỈ PHÁT HÀNH KHI ĐƠN ĐÃ CONFIRMED!            │
│  - Sinh Picking Task phiên bản chốt v1, v2...                │
│  - Chống trùng lặp (Idempotent theo confirmation version)   │
│  - Khi đơn sửa & chốt lại (V2), Task V1 tự thành superseded │
│  - Kho nhận soạn (RPC Claim - Khóa nguyên tử)               │
│  - Báo cáo ngoại lệ thực tế (Picking Exceptions)            │
│  - Vận hành phê duyệt ngoại lệ -> Kho hoàn tất soạn         │
│  - Rào chắn: Không thể giao hàng (shipping) nếu chưa xong   │
└─────────────────────────────────────────────────────────────┘
```

### 9.2. Tinh Chỉnh Schema & Dịch Vụ Vòng G8.1 & G8.2 (Trước Khi Chạy DB Thật)
Sau quá trình rà soát đối chiếu chi tiết với schema cơ sở dữ liệu Supabase thực tế và phản hồi từ Codex, toàn bộ 6 điểm lệch pha kỹ thuật đã được xử lý triệt để ở vòng G8.2:

1. **Khớp nối cột `admin_profiles`**:
   - Sử dụng chuẩn cột `name` (thay vì `full_name`).
   - Khắc phục `app/api/admin/procurement/dashboard/route.ts`: trước đây query `from("profiles").select("id, full_name, ...")`, nay đã sửa thành `from("admin_profiles").select("id, name, role, email")`.
   - Chuẩn hóa hàm normalize profile `p.name || p.full_name`.

2. **Khớp nối cột `order_items`**:
   - Sử dụng chuẩn cột `name` (không có `product_name`) và `line_total` (không có `subtotal`).
   - Chuẩn hóa mapping `product_name = oi.name` và `subtotal = oi.line_total` trong toàn bộ `procurement-service.ts`, `picking-service.ts`, và API routes.

3. **Khớp nối cột `orders`**:
   - Sử dụng chuẩn cột `delivery_shift` (thay vì `delivery_time_slot`) và `subtotal` / `grand_total` (thay vì `total_amount`), và `packing_status`.
   - Khắc phục `app/api/admin/procurement/dashboard/route.ts`: trước đây query `procurement_reviews` và `picking_tasks.delivery_date` (không tồn tại), nay đã sửa thành `procurement_review_requests` và join `orders(delivery_date)`.

4. **Chuẩn hóa cấu trúc bảng và RPC `picking_tasks`**:
   - Chỉ truy vấn các cột tồn tại thực tế: `id, order_id, status, assigned_to, accepted_at, completed_at, source_confirmation_version, note, created_at, updated_at`.
   - Khắc phục chữ ký RPC `claim_picking_task`: hỗ trợ cả `p_actor_id` và `p_staff_id` để tương thích hoàn toàn, cập nhật `orders.packing_status = 'in_progress'` và `packed_by = actor`.
   - Trạng thái hoàn tất chuẩn hóa là `'completed'` trong DB và tương thích `'done'` trên frontend.

5. **Chuẩn hóa cấu trúc bảng `picking_task_items`**:
   - Chỉ truy vấn và cập nhật các cột tồn tại: `id, picking_task_id, order_item_id, confirmed_qty, picked_qty, status, exception_reason`.
   - Tham chiếu `order_item:order_items(id, name, sku, unit, quantity, unit_price, line_total)`.

6. **Khắc phục lỗi Foreign Key & cấu trúc `picking_exceptions`**:
   - Khắc phục lỗi chí mạng trong `reportPickingExceptionCore`: Khi nhận `taskItemId` (ID của `picking_task_items`), hệ thống tự động tra cứu để lấy đúng `order_item_id` (ID của `order_items`), loại bỏ hoàn toàn lỗi vi phạm khóa ngoại `picking_exceptions_order_item_id_fkey` (`Key order_item_id is not present in table order_items`).
   - Cột `requested_change jsonb` lưu trữ an toàn `{ requested_qty, actual_qty, proposed_product_id }`.

### 9.3. Danh Mục Các File Đã Triển Khai & Kiểm Tra

| Nhóm chức năng | Đường dẫn file | Vai trò |
| :--- | :--- | :--- |
| **Database Migration** | `tps1-miniapp/supabase/migrations/20261005_procurement_review_and_picking.sql` | 5 bảng mới, 3 RPCs nguyên tử, RLS bảo mật, Generated Columns, Triggers tự động |
| **Rollback Migration** | `tps1-miniapp/supabase/migrations/20261005_rollback_procurement_review_and_picking.sql` | Kịch bản hoàn nguyên an toàn, có thể chạy lại nhiều lần (idempotent) |
| **Procurement Service** | `lib/procurement-service.ts` | Business logic kiểm tra hàng, RPC claim, submit review, revision, bảo tồn giá bán |
| **Picking Service** | `lib/picking-service.ts` | Business logic phát hành lệnh soạn, snapshot, claim task, ngoại lệ, hoàn tất |
| **Notification Service**| `lib/notification-service.ts` | Dispatch thông báo chuông theo phòng ban (`department_id`) và vai trò |
| **API Backend (Next.js)**| `app/api/admin/procurement/**` & `app/api/admin/picking/**` | 13 REST API endpoints phân quyền chặt chẽ (`can(role, ...)`) |
| **UI Kiểm Tra Hàng** | `webapptps1/manage/src/pages/KiemTraHangPage.tsx` | Bảng nhu cầu, lọc đợt giao, tìm kiếm, claim đơn, badge đếm thời gian thực |
| **UI Chi Tiết Kiểm Tra**| `webapptps1/manage/src/pages/KiemTraHangDetailPage.tsx` | Đánh dấu từng mặt hàng, đề xuất đổi SP, đề xuất giá nhập, gửi phản hồi |
| **UI Soạn Hàng Kho** | `webapptps1/manage/src/pages/SoanHangPage.tsx` | Danh sách lệnh soạn, thẻ đơn hàng, check số lượng thực soạn, xử lý ngoại lệ |
| **Navigation & Layout** | `webapptps1/manage/src/layouts/SaleLayout.tsx` | Tách biệt menu Kiểm tra hàng & Soạn hàng, badges đếm thời gian thực |

### 9.4. Bằng Chứng Kiểm Thử Tự Động Toàn Diện (G8.2 Service Integration Suite)

1. **Bộ Integration Test Gọi Trực Tiếp Qua Các Hàm Service Thật (`scratch/test_g8_2_service_integration_suite.mjs`)**:
   - `createProcurementReview()`: Tạo yêu cầu kiểm tra v1 cho đơn hàng ✔
   - `listProcurementReviews()` & `getProcurementReviewDetail()`: Lấy danh sách & chi tiết kèm quan hệ quan sát ✔
   - `claimProcurementReview()`: Khóa nguyên tử RPC, nhân viên A nhận, nhân viên B bị chặn tranh chấp `ALREADY_CLAIMED` ✔
   - `saveProcurementReviewDraft()`: Lưu nháp, cơ sở dữ liệu tự tính `shortage_qty` chính xác ✔
   - `submitProcurementReview()`: Kiểm tra bắt buộc hoàn tất các dòng pending, chuyển `responded` ✔
   - `operationsRequestRevision()`: Vận hành yêu cầu kiểm tra lại, chuyển `needs_revision` ✔
   - `operationsAcceptReview()`: Vận hành duyệt phương án thay thế, chuyển `accepted_by_operations` ✔
   - `create_picking_task_on_confirm()`: Phát hành lệnh soạn hàng, idempotent chống trùng lặp phiên bản ✔
   - `listPickingTasks()` & `getPickingTaskDetail()`: Lấy danh sách & chi tiết tác vụ soạn hàng ✔
   - `claimPickingTaskCore()`: Kho nhận việc, đồng bộ `orders.packing_status = 'in_progress'` và gán `packed_by` ✔
   - `updatePickingItems()`: Cập nhật số lượng thực soạn, chuyển trạng thái task sang `picking` ✔
   - `reportPickingExceptionCore()`: Báo cáo ngoại lệ thiếu hàng, tra cứu `order_item_id` chuẩn xác, chuyển task sang `exception` ✔
   - `resolvePickingExceptionCore()`: Vận hành duyệt ngoại lệ, chuyển task quay lại `picking` ✔
   - `completePickingTaskCore()`: Hoàn tất soạn hàng, chuyển `picking_tasks.status = 'completed'`, đồng bộ `orders.packing_status = 'done'`, ghi audit log `order_history` ✔
   - Tự động thay thế `superseded` khi đơn hàng chốt phiên bản 2 ✔
   - `createInternalNotification()`, `listInternalNotifications()`, `markNotificationAsRead()`: Chu trình thông báo nội bộ hoàn tất ✔

2. **Kiểm tra TypeScript & Đóng gói Production**:
   - Next.js root: `npx tsc --noEmit` ✔ 0 errors.
   - `thuc_pham_so_mot/manage`: `npm run build` ✔ `built in 779ms` (0 errors).
   - `webapptps1/manage`: `npm run build` ✔ `built in 530ms` (0 errors).

3. **Tuân thủ cam kết an toàn G8.2/G8.3**:
   - **Chưa chạy migration lên Supabase Production**.
   - **Chưa thực hiện git push, merge hoặc deploy**.

---

## 10. BÁO CÁO NGHIỆM THU VÒNG G8.4: BACKEND CHỐT CHẶT TOÀN DIỆN (44/44 TESTS PASS)

Lệnh thực thi kiểm thử tích hợp tự động qua [`package.json`](file:///d:/thuc_pham_so_mot/thuc_pham_so_mot/package.json):
```bash
npm run test:g84
# hoặc
npm run test:g83
```

### 10.1. Chi tiết 6 điểm chốt backend được xử lý chuẩn mực:

1. **Migration Security (RLS & Service Role Bypass Policies)**:
   - File: [`tps1-miniapp/supabase/migrations/20261005_procurement_review_and_picking.sql`](file:///d:/thuc_pham_so_mot/thuc_pham_so_mot/tps1-miniapp/supabase/migrations/20261005_procurement_review_and_picking.sql)
   - Bật Row Level Security trên cả 8 bảng mới.
   - Bổ sung 8 policies bypass tường minh cho `service_role`.
   - RPC `claim_procurement_review`: Phân quyền chặt chẽ (chỉ role `thu_mua`, `truong_phong`, `admin` được nhận việc; role `kho`, `sale` bị chặn `FORBIDDEN`).
   - RPC `claim_picking_task`: Phân quyền chặt chẽ (chỉ role `kho`, `truong_phong`, `admin` được nhận việc; role `sale`, `thu_mua` bị chặn `FORBIDDEN`).

2. **RPC Transactions Nguyên Tử & Khối EXCEPTION Rollback Bảo Vệ**:
   - Cả 3 RPC nghiệp vụ cốt lõi:
     + `claim_procurement_review`
     + `claim_picking_task`
     + `create_picking_task_on_confirm`
   - Đều có khối `EXCEPTION WHEN OTHERS THEN` đảm bảo an toàn tuyệt đối, rollback tự động khi gặp lỗi phát sinh bất ngờ.
   - Sử dụng khóa dòng `FOR UPDATE` trên `procurement_review_requests`, `picking_tasks`, và `orders`.
   - Guard `NO_ITEMS`: Chặn đơn hàng không có mặt hàng (`quantity > 0`) phát hành lệnh soạn.
   - Cơ chế Idempotency chống tạo trùng lặp tác vụ (`is_existing = true`).

3. **Kiểm Tra Người Được Giao Việc (Task Ownership Check Toàn Diện)**:
   - **Phía Thu Mua** (`lib/procurement-service.ts`):
     + `saveProcurementReviewDraft`: Chỉ người được giao việc (`assigned_to`) hoặc quản lý (`admin`, `truong_phong`) mới được phép lưu nháp. Nhân viên khác bị chặn ngay lập tức.
     + `submitProcurementReview`: Kế thừa xác thực quyền sở hữu khi gửi kết quả.
   - **Phía Kho Soạn Hàng** (`lib/picking-service.ts`):
     + `updatePickingItems`: Khi task đã có `assigned_to`, nhân viên kho khác cố tình cập nhật số lượng soạn sẽ bị chặn với thông báo rõ ràng.
     + `completePickingTaskCore`: Nhân viên kho khác cố tình hoàn tất task sẽ bị từ chối.

4. **Định Tuyến Notification Theo Người & Phòng Ban**:
   - `createProcurementReview`: Tự động tra cứu `department_id` của Phòng Thu Mua (`function_group = 'procurement'`) để thông báo tới toàn bộ nhân viên phòng Thu Mua.
   - `reportPickingExceptionCore`: Tự động tra cứu `department_id` của Phòng Vận Hành (`function_group in ('operations', 'sale')`) để thông báo cho bộ phận Vận hành xử lý.
   - `resolvePickingExceptionCore`: Tự động gửi thông báo đích danh tới người báo cáo ngoại lệ (`recipient_user_id = exception.reported_by`).
   - `operationsAcceptReview`: Tự động gửi thông báo đích danh tới nhân viên Thu mua phụ trách (`recipient_user_id = review.assigned_to`).

5. **Xử Lý Bắt Buộc Lỗi RPC Khi Xác Nhận Đơn**:
   - File: [`lib/order-finalize.ts`](file:///d:/thuc_pham_so_mot/thuc_pham_so_mot/lib/order-finalize.ts) & [`app/api/admin/orders/route.ts`](file:///d:/thuc_pham_so_mot/thuc_pham_so_mot/app/api/admin/orders/route.ts)
   - Loại bỏ hoàn toàn việc nuốt lỗi âm thầm.
   - Bắt cả lỗi kết nối Supabase (`pickResult.error`) và lỗi logic nghiệp vụ (`pickResult.data.success === false`).
   - Tổng hợp cảnh báo lỗi (`pickingTaskWarning`) và trả về trực tiếp trong `documentWarning` cũng như trường `warning` của API Next.js `/api/admin/orders`.

6. **Kết Quả Kiểm Thử Thực Tế (`npm run test:g84`)**:
   - File test: [`scratch/test_g8_3_integration_suite.mjs`](file:///d:/thuc_pham_so_mot/thuc_pham_so_mot/scratch/test_g8_3_integration_suite.mjs)
   - Kết quả: **44/44 PASSED (100%), 0 FAILED**.
   - Kiểm tra kiểu dữ liệu toàn dự án: `npx tsc --noEmit` hoàn thành với **0 lỗi**.
   - Build UI quản trị: `npm run build` thành công trong **779ms**.
   - Cam kết: **Chưa chạy migration lên Supabase Production, chưa merge và chưa deploy.**




