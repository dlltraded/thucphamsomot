# TÀI LIỆU BÀN GIAO NGỮ CẢNH HỆ THỐNG
## DỰ ÁN: TPS1 Lead Manager - Thực phẩm số 1

Tài liệu này tổng hợp toàn bộ thông tin hệ thống, các tính năng đã thực hiện và mô tả chi tiết các lỗi kỹ thuật hiện tại để lập trình viên tiếp theo có thể nắm bắt ngữ cảnh nhanh nhất và tiến hành xử lý lỗi.

---

## 1. THÔNG TIN HỆ THỐNG & ĐƯỜNG DẪN QUAN TRỌNG

- **Mã Pin/Mã khóa mở ứng dụng:** `893491` (Được cấu hình cứng tại biến `SYSTEM_PASSWORD` trong file [app.js](file:///d:/thuc_pham_so_mot/js/app.js)).
- **Cổng chạy ứng dụng cục bộ:** `http://localhost:8080/`
- **Cấu trúc mã nguồn chính:**
  - [index.html](file:///d:/thuc_pham_so_mot/index.html): File giao diện HTML chính của ứng dụng. Chứa các layout Dashboard, Kanban, Leads List, Quote Builder và cấu trúc mã nguồn hướng dẫn Google Apps Script.
  - [css/style.css](file:///d:/thuc_pham_so_mot/css/style.css): Hệ thống stylesheet (CSS thuần). Chứa các token thiết kế (màu sắc sẫm, viền xanh ngọc, font chữ *Be Vietnam Pro* và *Inter*) cùng cấu hình responsive cho mobile.
  - [js/app.js](file:///d:/thuc_pham_so_mot/js/app.js): Chứa trạng thái dữ liệu toàn cục (`state`), xác thực mã khóa, logic chuyển tab navigation, render danh sách lead khẩn cấp và logic cài đặt PWA.
  - [js/quote.js](file:///d:/thuc_pham_so_mot/js/quote.js): Trình dựng báo giá (Quote Builder), tính toán tiền hàng, chiết khấu %, vận chuyển, tiền cọc và xuất văn bản gửi Zalo hoặc in hóa đơn PDF.
  - [js/sheets.js](file:///d:/thuc_pham_so_mot/js/sheets.js): Chịu trách nhiệm đồng bộ tự động dữ liệu 2 chiều (bằng API Apps Script hoặc xuất CSV) và tải lên file Excel `CustomerProfit.xls` offline bằng thư viện SheetJS.
  - [js/kanban.js](file:///d:/thuc_pham_so_mot/js/kanban.js): Điều khiển bảng Kanban Leads (hỗ trợ kéo thả thay đổi trạng thái) và bảng danh sách khách hàng (phân trang & xuất JSON backup).
  - [js/data.js](file:///d:/thuc_pham_so_mot/js/data.js): Định nghĩa dữ liệu sản phẩm, danh sách kênh Marketing và các lead mẫu hạt giống ban đầu.
  - [service-worker.js](file:///d:/thuc_pham_so_mot/service-worker.js): Cấu hình Service Worker lưu bộ nhớ đệm offline của PWA (Phiên bản cache hiện tại: `tps1-lead-manager-v12`).

---

## 2. CÁC TÍNH NĂNG VÀ THAY ĐỔI ĐÃ THỰC HIỆN THÀNH CÔNG

1. **Đồng bộ cột "Trạng thái" thứ 12 trên Google Sheets:**
   - Cấu trúc cột thứ 12 (Cột L) đại diện cho trạng thái của Lead trên Google Sheets.
   - Các trạng thái được chuẩn hóa đồng bộ 2 chiều: `new` (Mới nhận), `contacting` (Đang liên hệ), `quoted` (Đã gửi báo giá), `negotiating` (Thương lượng), `won` (Chốt đơn), `lost` (Thất bại).
   - Đã cập nhật ánh xạ đồng bộ trong [sheets.js](file:///d:/thuc_pham_so_mot/js/sheets.js) (`mapRowFields()`). Khi cập nhật trạng thái từ Drawer chi tiết hoặc kéo thả Kanban, ứng dụng sẽ gửi yêu cầu `update_status` thông qua API POST thời gian thực của Google Apps Script.
   - Đã viết sẵn code mẫu Google Apps Script đồng bộ 2 chiều hiển thị trực quan ở phần cuối tab cấu hình trong `index.html`.

2. **Cải tiến Popup/Banner Cài đặt PWA:**
   - Thêm logic phát hiện nếu ứng dụng đã được cài đặt (standalone mode) thì tự động ẩn banner.
   - Hỗ trợ hiển thị hướng dẫn tùy biến riêng cho thiết bị iOS Safari (Click nút chia sẻ Safari -> Chọn "Thêm vào màn hình chính").
   - Hỗ trợ tắt banner tạm thời thông qua lưu trữ biến `tps1_pwa_dismissed` dưới LocalStorage.

3. **Ghi đè hộp xác nhận Confirm:**
   - Đã thay thế hàm `confirm()` gốc của trình duyệt tại hành động Đăng xuất bằng Modal xác nhận custom do hệ thống dựng sẵn nhằm tránh bị chặn/block bởi tự động hóa trình duyệt.

---

## 3. CÁC LỖI HIỆN TẠI CẦN LẬP TRÌNH VIÊN TIẾP THEO XỬ LÝ CHÍNH

### Lỗi 1: Kẹt và không thể chuyển tab khi đang ở trang "Lên Đơn & Báo Giá"
- **Mô tả:** Khi người dùng đang ở tab "Lên Đơn & Báo Giá" (`tab-quote`), việc nhấp chuột vào các menu chuyển tab khác ở Sidebar bên trái bị treo/không có phản hồi chuyển tab.
- **Nguyên nhân tiềm năng:**
  1. Trong file [app.js](file:///d:/thuc_pham_so_mot/js/app.js) tại hàm `setupNavigationListeners()`, sự kiện click được lắng nghe trên toàn bộ các phần tử `.sidebar-nav .nav-item`.
  2. Khi click, sự kiện sẽ gọi `triggerTabRefresh(targetTab)`. Nếu chuyển sang một tab khác, hàm `triggerTabRefresh` sẽ gọi các hàm render liên quan.
  3. Có khả năng cao một lỗi ngoại lệ (JS exception) xảy ra ở đâu đó trong quá trình render hoặc tính toán tiền hàng trong các module liên kết dẫn tới block luồng chạy của sự kiện click, hoặc có phần tử DOM nào đó bị đè chồng lên làm mất click event trên di động.
  4. **Lưu ý đặc biệt về UI Mobile:** Trên thiết bị di động có chiều rộng màn hình `< 768px`, sidebar có thuộc tính `transform: translateX(-100%)` tức ẩn đi. Tuy nhiên, nếu không có lớp phủ (backdrop) hoặc cấu hình không đúng, việc click vào các tọa độ menu tab thực tế lại tác động vào các phần tử nằm *phía sau* sidebar bị ẩn. Lập trình viên tiếp theo cần kiểm tra lại tính năng đóng/mở menu toggle sidebar trên Mobile để đảm bảo không bị chặn click.

### Lỗi 2: Tràn viewport ngang (Horizontal Scroll/Overflow) trên giao diện điện thoại
- **Mô tả:** Khi truy cập trang "Lên Đơn & Báo Giá" bằng điện thoại di động (hoặc giả lập kích thước màn hình nhỏ), giao diện bị tràn chiều rộng, người dùng phải cuộn ngang để xem hết nội dung, gây mất thẩm mỹ và giảm trải nghiệm người dùng.
- **Vị trí cần xử lý:**
  - File [css/style.css](file:///d:/thuc_pham_so_mot/css/style.css) tại phần Media Queries `@media (max-width: 768px)` từ dòng 1851.
  - Các phần tử cần tối ưu hóa kích thước: `.quote-builder-layout` (cần chuyển thành `flex-direction: column` và rộng `100%`), và khối xem trước hóa đơn `.invoice-paper` (cần đặt lại `padding` nhỏ hơn, giới hạn `max-width: 100%`, và ẩn phần tràn bảng bằng `overflow-x: auto`).

### Lỗi 3: Selector Chọn Khách Hàng bị trống trong Trình Dựng Báo Giá
- **Mô tả:** Trong tab "Lên Đơn & Báo Giá", dropdown chọn khách hàng (`#quote-lead-selector`) đôi khi bị trống hoặc không load được danh sách khách hàng.
- **Nguyên nhân tiềm năng:**
  - Hàm `initQuoteBuilder()` lọc danh sách khách hàng bằng lệnh `state.leads.filter(l => l.status !== 'lost')`. Nếu biến toàn cục `state.leads` bị lỗi cú pháp parse từ LocalStorage (ví dụ do một trường khảo sát từ Sheets như `selectedItems` chứa ký tự đặc biệt hoặc JSON sai định dạng làm crash quá trình khởi động `initAppState`), dropdown sẽ bị lỗi không hiển thị được phần tử nào.

---

## 4. HƯỚNG DẪN CÁCH DEBUG VÀ PHỤC HỒI NHANH CHO LẬP TRÌNH VIÊN TIẾP THEO

1. **Khởi chạy máy chủ nội bộ:**
   - Chạy Python HTTP Server trong thư mục dự án `d:\thuc_pham_so_mot` bằng lệnh:
     ```bash
     python -m http.server 8080
     ```
   - **Lưu ý xung đột cổng:** Kiểm tra xem có tiến trình nào khác đang chiếm giữ cổng `8080` hay không để tắt đi trước khi chạy máy chủ HTTP (sử dụng lệnh `netstat -ano | findstr 8080` và kill PID tương ứng).

2. **Cách kiểm tra logs của trình duyệt:**
   - Nhấn `F12` chọn thẻ `Console` để theo dõi các lỗi Javascript đỏ.
   - Thử click chuyển đổi giữa các tab để xem có lỗi ngoại lệ nào được ném ra từ `triggerTabRefresh` hay các hàm khởi tạo.
   - Kiểm tra xem dữ liệu trong `localStorage.getItem('tps1_leads')` có bị null hoặc chứa chuỗi JSON lỗi hay không. Nếu có, có thể chạy lệnh `localStorage.clear()` để làm sạch trạng thái và tải lại dữ liệu seed mặc định từ `js/data.js`.
