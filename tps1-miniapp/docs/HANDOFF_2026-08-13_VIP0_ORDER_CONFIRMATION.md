# Bàn giao luồng VIP0 và xác nhận đơn hàng - 13/08/2026

## Trạng thái triển khai

- Website/API production: commit `d5b8a8d` trên `dlltraded/thucphamsomot`.
- Admin production: commit `c5dbb88` trên `dlltraded-tps1/quanly`.
- Zalo Mini App: bản `Testing 49`, chưa gửi duyệt Production.
- Migration `20260813_vip0_order_finalization.sql` đã chạy thành công trên Supabase production.

## Quy tắc nghiệp vụ đã khóa

- `verification_status` và `discount_tier` là hai trạng thái độc lập.
- Khách tự đăng ký được tạo ở `VIP0`, trạng thái `pending`.
- VIP0 là hạng hợp lệ sau xác thực và có chiết khấu mặc định 0%.
- Mọi đơn mới đều có `pricing_status = provisional` và phải qua sale xác nhận.
- Đơn tạm tính không thể chuyển sang xử lý/giao hàng hoặc đã thanh toán.
- Sale có thể chọn giá theo hạng, chiết khấu riêng toàn đơn hoặc đơn giá thủ công từng sản phẩm.
- Khi chốt giá, hệ thống xác thực/phân hạng khách, khóa giá theo revision và chuyển đơn sang `confirmed`.
- Mỗi lần chốt tạo PDF xác nhận riêng trong bucket private `order-confirmations`.
- Website và Mini App đọc cùng trạng thái giá, hạng khách, trạng thái xác thực và đơn hàng từ Supabase.

## Kiểm tra đã hoàn tất

- Supabase: VIP0 = 0%; bảng chứng từ và RPC đăng ký/chốt giá tồn tại; đủ các cột pricing của order.
- Website: TypeScript, ESLint và `next build` đạt; API production trả 400 với đăng ký thiếu dữ liệu, 401 với phiên/token thiếu.
- Mini App: TypeScript và Vite production build đạt; bản Testing 49 xuất hiện trên Zalo Mini App Console.
- Admin: JavaScript syntax đạt; production tải được đơn, modal phân loại/chốt giá và layout mobile không tràn ngang.
- PDF: đã render kiểm tra trực quan A4, tiếng Việt đúng, không cắt nội dung.

## Kịch bản test nghiệp vụ tiếp theo

1. Mở QR bản Testing 49 bằng một số điện thoại chưa có tài khoản.
2. Thêm sản phẩm khi chưa đăng nhập, bấm đặt mua và đăng ký tài khoản.
3. Đăng nhập bằng mã TPS1 vừa cấp, hoàn tất địa chỉ và gửi đơn tạm tính.
4. Kiểm tra đơn xuất hiện trong Admin với trạng thái chờ xác nhận giá.
5. Chọn VIP0 hoặc nâng VIP, thử cả ba chế độ giá rồi chốt đơn.
6. Tải PDF từ Admin; kiểm tra Website và Mini App cùng hiển thị tổng giá cuối và cho khách tải PDF.
7. Chỉ sau khi các bước trên đạt mới gửi bản 49 để xét duyệt Production.
