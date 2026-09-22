# Kế hoạch giao Gemini thiết kế lại TPS1 Order Webapp

## 1. Mục tiêu sản phẩm

Thiết kế lại `order-webapp` thành webapp đặt hàng B2B độc lập với Zalo, dành cho người dùng chính là bếp, căng tin, nhà máy và bộ phận đặt hàng của khách doanh nghiệp.

Ứng dụng phải:

- Dùng tốt trên điện thoại lẫn desktop.
- Thao tác nhanh khi khách cần đặt nhiều mặt hàng mỗi ngày.
- Có cảm giác gần gũi với Zalo Mini App TPS1 nhưng chuyên nghiệp hơn trên màn hình lớn.
- Giữ nhận diện riêng của Thực Phẩm Số Một: xanh lá đậm, xanh tươi, cam thương hiệu, nền sáng tự nhiên.
- Không phụ thuộc SDK, tài khoản hoặc thành phần giao diện của Zalo.
- Giữ nguyên API, xác thực, giá riêng theo khách, giỏ hàng, lịch sử đơn và cơ chế cache hiện tại.

## 2. Phạm vi Gemini được sửa

Thư mục chính:

```text
order-webapp/
```

Ưu tiên chỉnh:

```text
order-webapp/src/pages/ProductsPage.tsx
order-webapp/src/pages/CartPage.tsx
order-webapp/src/pages/OrdersPage.tsx
order-webapp/src/pages/OrderDetailPage.tsx
order-webapp/src/pages/LoginPage.tsx
order-webapp/src/layouts/CustomerLayout.tsx
order-webapp/src/index.css
order-webapp/src/components/
order-webapp/index.html
order-webapp/public/
```

Không được:

- Thay đổi schema Supabase hoặc migration.
- Thay đổi contract của các API hiện có.
- Xóa các tính năng tìm kiếm, cache catalog, yêu thích, thường mua, đặt lại, nhiều đơn/tab, ghi chú sản phẩm, địa chỉ mặc định, ngày/ca giao hàng.
- Thêm thư viện UI nặng nếu có thể làm bằng React, Tailwind và `lucide-react` đang có.
- Commit, push GitHub hoặc deploy. Gemini chỉ sửa source và báo cáo file đã đổi để Codex kiểm tra.
- Dùng mock data trong luồng thật.

## 3. Tài sản thương hiệu bắt buộc

Logo ngang dùng trong header, đăng nhập và màn hình trống:

```text
order-webapp/public/images/tps1-logo-horizontal.png
```

Logo nền trong suốt thay thế khi cần:

```text
order-webapp/public/images/tps1-logo-transparent.png
```

Icon và favicon phải dùng đúng biểu tượng TPS1 đã có:

```text
order-webapp/public/favicon.png
order-webapp/public/favicon-16.png
order-webapp/public/favicon-32.png
order-webapp/public/apple-touch-icon.png
order-webapp/public/pwa-192x192.png
order-webapp/public/pwa-512x512.png
order-webapp/public/pwa-maskable-512x512.png
```

Không dùng chữ `T1`, logo tự vẽ, emoji cây, hình minh họa AI hoặc biểu tượng không phải logo TPS1 để thay thương hiệu.

Kiểm tra `order-webapp/index.html` và cấu hình PWA để favicon, Apple icon và manifest trỏ đúng các file trên.

## 4. Người dùng và nguyên tắc UX

Người dùng chính thường đang đứng trong bếp hoặc kho:

- Có thể thao tác một tay trên điện thoại.
- Có thể đeo găng, cần nút lớn và khoảng bấm thoáng.
- Thường đặt lại những mặt hàng quen thuộc.
- Có thể nhập số lượng thập phân cho hàng theo Kg.
- Cần nhìn rõ đơn vị tính, giá tạm tính, quy cách và ghi chú.
- Muốn tìm sản phẩm ngay khi gõ, không bấm Enter.
- Có thể mạng yếu; giao diện phải phản hồi tức thời và giữ giỏ hàng nếu reload.

Nguyên tắc:

- Tìm kiếm luôn là hành động nổi bật nhất.
- Mặt hàng quen thuộc, yêu thích và đặt lại phải xuất hiện trước danh mục dài.
- Nút tăng giảm số lượng tối thiểu 40–44 px trên mobile.
- Không dùng bảng rộng trên mobile.
- Không dùng modal toàn màn hình nếu một bottom sheet hoặc trang riêng dễ thao tác hơn.
- Mọi trạng thái tải phải có skeleton ổn định, không làm nhảy bố cục.
- Mọi lỗi phải mô tả bằng tiếng Việt và giữ nguyên dữ liệu khách đã nhập.

## 5. Kiến trúc giao diện cần thực hiện

### 5.1 Khung ứng dụng

Desktop:

- Header gọn, logo TPS1 rõ nét bên trái.
- Khu vực giữa là điều hướng: Đặt hàng, Đặt bằng Excel, Đơn hàng của tôi.
- Bên phải: hotline, thông báo, tài khoản.
- Nội dung tối đa khoảng 1440–1560 px; tránh trải bảng sát hai cạnh màn hình.

Mobile:

- Header một hàng: logo, thông báo, avatar/tài khoản.
- Bottom navigation cố định bốn mục: Đặt hàng, Excel, Đơn hàng, Tài khoản.
- Tôn trọng safe-area của iPhone.
- Giỏ hàng dùng thanh nổi cố định phía trên bottom navigation khi có sản phẩm.

### 5.2 Trang đăng nhập

- Dùng logo TPS1 thật, không dùng biểu tượng khóa làm nhận diện chính.
- Form đơn giản: Mã khách hàng, mật khẩu, hiện/ẩn mật khẩu.
- Giải thích ngắn: đây là Cổng đặt hàng doanh nghiệp TPS1.
- Hiển thị hotline `089.890.2222` và hướng dẫn liên hệ để được cấp tài khoản.
- Tối ưu bàn phím mobile, autocomplete và trạng thái đang đăng nhập.

### 5.3 Trang đặt hàng

Đây là màn hình quan trọng nhất.

Phần đầu:

- Lời chào cá nhân hóa theo tên/công ty khách hàng.
- Badge hạng khách và mã khách gọn, không chiếm diện tích.
- Thanh tìm kiếm sticky khi cuộn: tìm theo tên, SKU, nhóm hàng; debounce hiện tại phải được giữ.
- Nút quét/tìm bằng giọng nói không cần làm ở giai đoạn này.

Các khối đặt nhanh theo thứ tự:

1. Đặt lại đơn gần nhất.
2. Mặt hàng thường mua.
3. Sản phẩm yêu thích.
4. Danh mục sản phẩm.
5. Kết quả tìm kiếm/toàn bộ hàng hóa.

Card sản phẩm mobile:

- Ảnh 64–72 px; fallback đẹp nếu thiếu ảnh.
- Tên tối đa hai dòng, SKU và đơn vị nhỏ hơn.
- Giá khách hàng hoặc nhãn `Liên hệ báo giá`.
- Nút yêu thích không che tên/ảnh.
- Nút `Thêm` lớn; sau khi thêm chuyển thành bộ `− số lượng +`.
- Có thao tác thêm ghi chú/quy cách theo từng sản phẩm.

Desktop:

- Không quay lại bảng POS khô cứng như phần quản lý.
- Dùng lưới/card compact 3–5 cột tùy viewport hoặc danh sách hai cột khi cần nhiều thông tin.
- Giỏ tóm tắt đặt ở panel phải sticky, nhưng không làm vùng sản phẩm quá hẹp.
- Panel giỏ có thể thu gọn; hiển thị số mặt hàng, tổng số lượng và tạm tính.

### 5.4 Giỏ hàng và xác nhận đơn

- Mobile dùng trang/bottom sheet rõ ràng, không dùng bảng.
- Mỗi dòng có ảnh, tên, đơn vị, số lượng, ghi chú, giá và nút xóa.
- Tự điền người nhận, điện thoại, địa chỉ mặc định từ session/database.
- Cho chọn địa chỉ khác nếu API hiện có hỗ trợ; không làm mất địa chỉ mặc định.
- Ngày giao hàng và ca giao hàng phải dễ chạm, có mô tả giới hạn/chốt đơn.
- Ghi rõ giá là tạm tính và TPS1 sẽ xác nhận giá cuối.
- CTA cuối trang: `Gửi đơn hàng` hoặc `Xác nhận đặt hàng`, không dùng từ ngữ thanh toán gây hiểu nhầm công nợ.
- Khi submit phải khóa chống bấm hai lần nhưng không xóa giỏ nếu request thất bại.

### 5.5 Đơn hàng của tôi

- Mặc định là danh sách card theo thời gian, không dùng bảng tràn ngang.
- Có chip lọc: Chờ xác nhận, Đã xác nhận, Đang chuẩn bị, Đang giao, Hoàn thành, Đã hủy.
- Mỗi card hiển thị mã đơn, ngày giao, trạng thái, số mặt hàng, tổng tiền cuối/tạm tính.
- Nút xem chi tiết, đặt lại và tải PDF khi chứng từ sẵn sàng.
- Desktop có thể dùng list có cột nhưng phải responsive và không scroll ngang ở 1366 px.

### 5.6 Chi tiết đơn hàng

- Timeline trạng thái rõ ràng.
- Phân biệt giá tạm tính và giá đã chốt.
- Danh sách hàng hóa hiển thị ghi chú/quy cách từng dòng.
- Hiển thị địa chỉ, người nhận, ngày/ca giao, phương thức thanh toán/công nợ.
- Nếu được phép điều chỉnh/hủy theo API hiện tại, CTA phải rõ và yêu cầu nhập lý do.
- PDF xác nhận đơn hàng phải tải được trên desktop và mobile.

## 6. Hệ thống thiết kế TPS1

Màu đề xuất:

- Primary dark: `#0B4F34` hoặc màu xanh đậm hiện có.
- Primary: `#0F7A4F`.
- Fresh green: `#19A85B`.
- Brand orange: lấy gần màu logo, chỉ dùng cho điểm nhấn/cảnh báo nhẹ.
- Background: `#F5F7F3`.
- Text: `#17231D`.

Quy tắc:

- Không dùng xanh dương làm màu active chính; dùng xanh TPS1.
- Border nhẹ, radius 12–18 px; bóng đổ rất tiết chế.
- Font hệ thống hoặc font đang có, ưu tiên tải nhanh và hỗ trợ tiếng Việt.
- Icon thống nhất từ `lucide-react`.
- Không dùng gradient quá mạnh, glassmorphism dày hoặc hiệu ứng trang trí làm giảm tốc độ.
- Các màn phải có cùng spacing, button, input, badge, empty state và skeleton.

## 7. Yêu cầu hiệu năng bắt buộc

- Giữ local catalog search, cache memory/session hiện tại trong `ProductsPage.tsx`.
- Không gọi API mỗi lần gõ nếu catalog đã có; không bỏ debounce/AbortController.
- Ảnh sản phẩm phải `loading="lazy"`, `decoding="async"`, có kích thước cố định chống layout shift.
- Không tải ảnh hero lớn trên màn đặt hàng.
- Không thêm animation library.
- Không tạo effect gây request lặp hoặc render dây chuyền.
- Memo hóa phần danh sách/card khi cần; không tối ưu mù quáng làm code khó bảo trì.
- Chia component để `ProductsPage.tsx` không tiếp tục phình lớn, nhưng không thay đổi business logic.
- Route phụ có thể lazy-load nếu chưa có.
- Build production không lỗi TypeScript.

Mục tiêu kiểm thử thực tế:

- Gõ tìm kiếm thấy kết quả gần như tức thì sau khi catalog đã cache.
- Thêm/trừ số lượng không chờ server.
- Reload vẫn giữ đơn/giỏ đang soạn.
- Không có layout shift lớn khi ảnh tải.
- Không scroll ngang ở 360 px, 390 px, 768 px, 1366 px và 1920 px.

## 8. Khả năng truy cập và độ tin cậy

- Tất cả input có label thực.
- Nút icon có `aria-label`.
- Focus keyboard rõ trên desktop.
- Màu trạng thái không phải dấu hiệu duy nhất; luôn có chữ.
- Contrast đủ đọc ngoài trời.
- Tôn trọng `prefers-reduced-motion`.
- Empty state, lỗi API, offline và ảnh lỗi đều có fallback.
- Không dùng `alert()` cho trải nghiệm chính nếu có thể thay bằng toast/banner inline nhẹ.

## 9. Trình tự Gemini thực hiện

### Giai đoạn A: Audit và design system

1. Đọc toàn bộ các file trong `order-webapp/src` liên quan đến layout, products, cart, orders và auth.
2. Ghi lại business logic phải giữ nguyên.
3. Chuẩn hóa token CSS, màu, spacing, button, input, card, skeleton.
4. Xác nhận logo/favicon dùng đúng file TPS1.

### Giai đoạn B: Khung và trang đặt hàng

1. Làm lại `CustomerLayout` responsive.
2. Tách `ProductsPage` thành các component giao diện nhỏ nhưng giữ nguyên search/cache/state.
3. Hoàn thiện đặt nhanh, thường mua, yêu thích, đặt lại và danh mục.
4. Hoàn thiện sticky cart mobile và summary panel desktop.

### Giai đoạn C: Giỏ và lịch sử đơn

1. Làm lại Cart/checkout.
2. Làm lại danh sách đơn.
3. Làm lại chi tiết đơn và PDF CTA.
4. Đồng bộ visual với login/change password/Excel order.

### Giai đoạn D: Kiểm thử

Chạy:

```powershell
cd order-webapp
npm.cmd run build
npm.cmd run lint
```

Kiểm tra thủ công:

- Desktop 1366×768 và 1920×1080.
- Tablet 768×1024.
- Mobile 360×800 và 390×844.
- Tìm kiếm tên/SKU không cần Enter.
- Thêm, sửa số lượng, ghi chú, xóa sản phẩm.
- Mặt hàng thường mua, yêu thích, đặt lại.
- Địa chỉ mặc định, ngày giao và ca giao.
- Submit lỗi không mất dữ liệu; submit thành công không tạo trùng đơn.
- Danh sách/chi tiết đơn và tải PDF.
- Favicon/PWA icon hiển thị đúng TPS1.

## 10. Tiêu chí Codex nghiệm thu

Codex chỉ chấp nhận để push khi:

- Không mất bất kỳ chức năng hiện có nào.
- Không thay API contract hoặc database.
- Build production và lint đạt.
- Giao diện không tràn ở các viewport yêu cầu.
- Logo, favicon và PWA icon là tài sản TPS1 thật.
- Search sau cache phản hồi tức thời.
- Mobile có nút đủ lớn, bottom navigation không che CTA/giỏ.
- Desktop tận dụng không gian nhưng không biến thành bảng quản trị.
- Mọi chữ hiển thị là tiếng Việt tự nhiên, thống nhất thuật ngữ TPS1.
- Gemini gửi báo cáo ngắn: file đã đổi, logic giữ nguyên, test đã chạy, điểm còn nghi ngờ.

## 11. Prompt ngắn giao trực tiếp cho Gemini

Thực hiện đầy đủ kế hoạch trong file `planning/GEMINI_ORDER_WEBAPP_REDESIGN_PLAN.md`. Chỉ chỉnh `order-webapp`, không sửa backend/schema/API, không commit hoặc push. Giữ nguyên toàn bộ business logic và tối ưu catalog/search hiện có. Thiết kế mobile-first cho người dùng bếp đặt hàng hằng ngày, đồng thời tối ưu desktop. Dùng đúng logo, favicon và PWA icon TPS1 đã chỉ định. Sau khi hoàn tất, chạy build và lint, tự kiểm tra responsive, rồi báo cáo chính xác các file đã sửa và vấn đề còn lại để Codex nghiệm thu.

