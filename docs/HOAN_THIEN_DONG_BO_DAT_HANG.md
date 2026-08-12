# Kế hoạch hoàn thiện đồng bộ đặt hàng và báo giá

Cập nhật: 12/08/2026.

## Mục tiêu

- Website, Zalo Mini App và Admin dùng chung hồ sơ khách hàng, catalog và đơn hàng.
- Khách đăng nhập nhận đúng giá, chiết khấu và địa chỉ giao mặc định.
- Khách có thể thay đổi địa chỉ cho từng lần giao.
- Google Sheets là kênh vận hành/đối soát, không phải nguồn dữ liệu đơn hàng duy nhất.

## Chặng 1 — Hồ sơ khách hàng và địa chỉ giao hàng

Trạng thái source code: hoàn thành, chờ chạy migration và deploy.

- Admin có thêm email, mã số thuế, địa chỉ đơn vị và địa chỉ giao mặc định.
- RPC đăng nhập trả hồ sơ mở rộng cho Website và Mini App.
- Website tự điền địa chỉ mặc định và cho nhập địa chỉ khác theo đơn.
- Mini App tự nạp địa chỉ mặc định khi đăng nhập lần đầu/đổi tài khoản; địa chỉ khác được lưu trên thiết bị.
- Google Sheets nhận thêm mã khách, nhóm khách, chiết khấu và dữ liệu giao hàng có cấu trúc.
- Mini App tải đơn bằng số điện thoại trong tài khoản khách hàng, không dùng số Zalo rỗng.

### Triển khai chặng 1

1. Backup database Supabase.
2. Nếu chưa có hệ thống đăng nhập, chạy `tps1-miniapp/supabase/migrations/20260812_customer_login.sql`.
3. Chạy `tps1-miniapp/supabase/migrations/20260812_customer_profile_shipping.sql`.
4. Deploy lại `google-apps-script/Code.gs` thành Web App version mới.
5. Deploy Website, Admin và Zalo Mini App.
6. Đăng xuất/đăng nhập lại tài khoản cũ để cookie/local session nhận hồ sơ mới.

## Chặng 2 — Bảng orders trung tâm

Trạng thái source code: hoàn thành, chờ chạy migration và deploy.

- Đã tạo `orders`, `order_items`, `order_history` và `customer_sessions`.
- Website và Mini App tạo đơn bằng cùng RPC `customer_create_order`.
- Database tự đọc sản phẩm, lấy giá bán lẻ nền và áp chiết khấu tier; không tin giá client.
- Mỗi đơn có UUID, mã `DH-YYYYMMDD-NNNNNN` và idempotency key chống tạo trùng.
- Google Sheets chỉ nhận bản sao sau khi đơn trung tâm đã tạo thành công.
- Admin có tab `Đơn Hàng Trung Tâm`, xem chi tiết và chuyển trạng thái.
- Mỗi lần đổi trạng thái/thanh toán được ghi vào `order_history`.
- Zalo Checkout MAC chỉ được tạo khi số tiền khớp `orders.grand_total`.
- Callback Zalo Checkout cập nhật `payment_status = cod` và lưu mã giao dịch ngoài.

Trạng thái chuẩn:

`pending → confirmed → preparing → shipping → completed`

Đơn có thể chuyển sang `canceled`; thanh toán dùng `pending / cod / paid / failed / refunded`.

### Triển khai chặng 2

1. Chạy `tps1-miniapp/supabase/migrations/20260812_central_orders.sql`.
2. Thêm `SUPABASE_PRODUCTS_SERVICE_ROLE_KEY` vào Website/Vercel; chỉ lưu server-side.
3. Đảm bảo `ADMIN_TOKEN` trên Vercel trùng mã dùng để mở/kết nối Admin.
4. Deploy Website trước, sau đó Admin và Zalo Mini App.
5. Khách hàng phải đăng xuất/đăng nhập lại để nhận `order_session_token`.
6. Tạo một đơn test từ Website và một đơn test từ Mini App; chuyển đủ các trạng thái trong Admin.

## Chặng 3 — Giá, phân quyền và bảo mật

- Chốt một quy tắc giá chung: giá nền + tier + giá riêng theo khách/hợp đồng.
- Siết RLS cho `products`, `quotes`, `orders`, `vip_accounts`.
- Di chuyển RPC Admin ra API có xác thực server-side.
- Thu hồi token/private key đã từng nằm trong file tracked và bỏ `.env` khỏi Git.
- Thêm rate limit cho đăng nhập, webhook và endpoint tạo MAC.

## Chặng 4 — Khách mới và vận hành

- Luồng `lead → duyệt → tạo customer → gửi thông tin đăng nhập`.
- Cho phép quản lý nhiều địa chỉ đồng bộ trên server nếu cần dùng đa thiết bị.
- ZNS thông báo nhận đơn, báo giá, xác nhận và giao hàng.
- Audit log, idempotency, retry webhook và dashboard đối soát lỗi.
- Test end-to-end trên tài khoản test trước khi mở production.
