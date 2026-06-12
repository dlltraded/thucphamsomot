# TÀI LIỆU BÀN GIAO NGỮ CẢNH HỆ THỐNG
## DỰ ÁN: TPS1 Lead Manager - Thực phẩm số 1

Tài liệu này dùng để bàn giao cho agent khác tiếp quản code nhanh nhất có thể. Nội dung đã được cập nhật theo trạng thái hiện tại của repo.

---

## 1. Thông Tin Cần Nhớ Ngay

- Mã khóa mở ứng dụng: `19871988`
- App chạy local: `http://localhost:8080/`
- Repo GitHub: `https://github.com/dlltraded-tps1/quanly.git`
- Cần hard reload hoặc unregister Service Worker nếu thấy giao diện cũ.
- File cache hiện tại:
  - `service-worker.js` cache name: `tps1-lead-manager-v35`
  - `css/style.css?v=22`

---

## 2. Kiến Trúc Hiện Tại

- [index.html](file:///d:/thuc_pham_so_mot/index.html): giao diện chính, toàn bộ tab dashboard/kanban/leads/quote/settings, modal, banner PWA và cả block Google Apps Script mẫu.
- [css/style.css](file:///d:/thuc_pham_so_mot/css/style.css): theme, layout, responsive, print, badge/status color.
- [js/app.js](file:///d:/thuc_pham_so_mot/js/app.js): state core, auth gate, navigation, PWA banner, lead status helpers, KPI, drawer, cập nhật lead field.
- [js/kanban.js](file:///d:/thuc_pham_so_mot/js/kanban.js): Kanban lead 7 cột, filter danh sách, kéo thả trạng thái.
- [js/sheets.js](file:///d:/thuc_pham_so_mot/js/sheets.js): đồng bộ Google Sheets / Apps Script, mapping cột, merge dữ liệu.
- [js/charts.js](file:///d:/thuc_pham_so_mot/js/charts.js): biểu đồ funnel và nguồn lead.
- [js/quote.js](file:///d:/thuc_pham_so_mot/js/quote.js): báo giá, custom product, VAT, preview/in PDF, quản lý báo giá, xóa/cập nhật trạng thái.
- [js/supabase.js](file:///d:/thuc_pham_so_mot/js/supabase.js): đồng bộ Supabase cho quotes/products/history/status.
- [js/data.js](file:///d:/thuc_pham_so_mot/js/data.js): seed data local.
- [supabase-schema.sql](file:///d:/thuc_pham_so_mot/supabase-schema.sql): SQL reset schema Supabase.
- [supabase-products-seed.sql](file:///d:/thuc_pham_so_mot/supabase-products-seed.sql): seed catalog sản phẩm.
- [service-worker.js](file:///d:/thuc_pham_so_mot/service-worker.js): PWA cache/offline.
- [tai_lieu_ban_giao.md](file:///d:/thuc_pham_so_mot/tai_lieu_ban_giao.md): file bàn giao hiện tại.

---

## 3. Những Chức Năng Đã Làm Xong

### 3.1 Auth và PWA

- Mã khóa hệ thống đổi sang `19871988`.
- Banner cài app PWA chỉ hiện ở `index.html` trên mobile và khi chưa đăng nhập.
- Banner bị ẩn sau khi vào admin.
- Tên app sau khi cài là `TPS1-Admin`.
- Icon app dùng logo công ty.
- Banner PWA không hiện lặp vô hạn nhờ localStorage flags.

### 3.2 Báo Giá

- Có nút `Tạo/Lưu báo giá`.
- Có tab riêng `Quản Lý Báo Giá`.
- Có modal xác nhận khi xóa báo giá.
- Xóa báo giá đi qua Supabase trước, sau đó mới xóa local.
- Báo giá có:
  - chọn sản phẩm từ catalog
  - thêm sản phẩm mới / giá riêng
  - sửa đơn giá trực tiếp
  - VAT `0% / 8% / 10%`
  - tổng trước VAT, VAT, tổng thanh toán
  - in PDF riêng, không in cả app
  - preview chỉ hiện khi bấm in
  - margin PDF đã chỉnh để không tràn sát mép

### 3.3 Quản Lý Báo Giá

- Có danh sách báo giá đã lưu.
- Có tìm kiếm, lọc trạng thái, xem lịch sử.
- Có mở lại để sửa.
- Có xóa đồng bộ Supabase.
- Có modal đổi trạng thái, bắt tick xác nhận trước khi cập nhật.

### 3.4 Supabase

- Đồng bộ quotes, quote history và product catalog.
- Có seed catalog sản phẩm khoảng 500 mặt hàng B2B thực phẩm.
- App hydrate dữ liệu từ Supabase về local state.
- Có cấu hình Supabase trong tab cấu hình.
- Lưu ý: không dùng `service_role` trong frontend.

### 3.5 Google Sheets

- Lead trạng thái đã đồng bộ theo bộ mới.
- Khi đổi trạng thái trong app sẽ đẩy lên Google Sheets.
- Apps Script sample trong `index.html` đã cập nhật theo status mới.

### 3.6 Lead Status

Lead status canonical hiện tại:

- `new` -> `Mới`
- `contacting` -> `Đã liên hệ`
- `quoting` -> `Đang báo giá`
- `quoted` -> `Đã báo giá`
- `won` -> `Đã chốt đơn`
- `unqualified` -> `Không tiềm năng`
- `canceled` -> `Hủy`

Các file đã được normalize để đọc dữ liệu cũ sang bộ status mới.

### 3.7 Kanban / List / Charts

- Kanban lead thành 7 cột.
- Danh sách lead filter theo status mới.
- Biểu đồ funnel đã đổi theo bộ status mới.

---

## 4. Luồng Dữ Liệu Hiện Tại

### 4.1 Lead

- Tạo lead từ modal manual nhập.
- Lead từ Google Sheets/Apps Script được merge vào local.
- Lead status được normalize khi load.
- Mỗi lần đổi status:
  - cập nhật local
  - ghi note hệ thống
  - sync sang Google Sheets
  - sync sang Supabase nếu có liên quan quote

### 4.2 Quote

- Quote lưu local trước.
- `Lưu báo giá` đẩy sang Supabase.
- `Xóa` quote xóa remote trước, rồi xóa local.
- Status quote hiện vẫn dùng logic quote riêng:
  - `draft`
  - `sent`
  - `quoted`
  - `negotiating`
  - `won`
  - `lost`

### 4.3 Product Catalog

- Product catalog sống ở Supabase + local cache.
- Có custom product/giá riêng để báo giá thực tế.
- Giá có thể chỉnh tay theo biến động thị trường.

---

## 5. Các File Quan Trọng Đã Sửa Nhiều

- [js/app.js](file:///d:/thuc_pham_so_mot/js/app.js)
  - `SYSTEM_PASSWORD`
  - `LEAD_STATUS_ORDER`
  - `normalizeLeadStatus()`
  - `getLeadStatusLabel()`
  - `updateLeadField()`
  - `calculateKPIs()`
  - `renderRecentLeads()`
  - `openLeadDrawer()`

- [js/sheets.js](file:///d:/thuc_pham_so_mot/js/sheets.js)
  - `normalizeSheetStatus()`
  - `mergeLeadsData()`
  - `mapRowFields()`
  - mapping trạng thái từ Google Sheets

- [js/kanban.js](file:///d:/thuc_pham_so_mot/js/kanban.js)
  - 7 cột status
  - filter list
  - kéo thả update status

- [js/charts.js](file:///d:/thuc_pham_so_mot/js/charts.js)
  - funnel 7 trạng thái

- [js/quote.js](file:///d:/thuc_pham_so_mot/js/quote.js)
  - custom product
  - editable price
  - VAT
  - preview/in PDF
  - quote management
  - delete confirmation modal

- [js/supabase.js](file:///d:/thuc_pham_so_mot/js/supabase.js)
  - `syncQuote()`
  - `syncLeadStatus()`
  - hydrate products/quotes
  - upsert/delete logic

- [index.html](file:///d:/thuc_pham_so_mot/index.html)
  - Kanban markup
  - Lead form select
  - quản lý báo giá UI
  - Apps Script sample `doGet` / `doPost`

---

## 6. SQL / Setup Cần Chạy

### Supabase

- Chạy `supabase-schema.sql` để reset schema và quyền truy cập.
- Nếu cần load catalog riêng, chạy `supabase-products-seed.sql`.
- Sau khi chạy SQL:
  - hard reload app
  - nếu vẫn dính cache thì unregister Service Worker

### Google Sheets

- Tab trạng thái trên Sheets phải có cột status.
- Apps Script sample trong `index.html` đã map trạng thái mới.
- Nếu route Sheet/WebApp cũ không khớp, check lại URL cấu hình trong tab Sheets settings.

---

## 7. Lịch Sử Commit Gần Đây

- `ec80824` - Add lead status sync for Sheets and Kanban
- `005be27` - Add VAT and total breakdown to quotes
- `a501109` - Add custom quote products and editable prices
- `488bd99` - Add quote delete confirmation modal
- `70e96d5` - Restore hard delete sync for quotes
- `5be2d18` - Add quote save button and full Supabase reset
- `12f3e6d` - Add Supabase grants and safer quote delete

---

## 8. Những Điểm Cần Nhớ Khi Tiếp Tục Code

1. Dữ liệu lead cũ vẫn có thể mang status kiểu cũ, nhưng app đã normalize khi load.
2. Nếu sửa logic status, phải chạm đồng thời:
   - `app.js`
   - `kanban.js`
   - `sheets.js`
   - `charts.js`
   - `index.html`
3. Nếu đổi cache hoặc layout, nhớ bump:
   - `service-worker.js`
   - query string của `style.css`
4. Nếu test xóa/lưu quote mà không thấy gì:
   - xem Console
   - kiểm tra Supabase schema/policy
   - kiểm tra bản cache cũ của PWA

---

## 9. Trạng Thái Hiện Tại

- Hệ thống đang chạy ổn theo bản mới.
- Không còn blocker lớn đã biết trong luồng lead status.
- Handover cho agent khác có thể bắt đầu từ:
  1. quản lý sản phẩm CRUD trên app
  2. tối ưu quote management
  3. cải thiện sync và lịch sử trạng thái
  4. làm backup/import/export dữ liệu đầy đủ hơn
