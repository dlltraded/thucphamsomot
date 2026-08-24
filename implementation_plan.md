# Kế Hoạch Xây Dựng Trang Tạo Đơn Hàng Chuyên Nghiệp (Admin POS)

Do yêu cầu nâng cấp toàn diện giao diện và tính năng Tạo đơn hàng dành cho Sale/Admin, em sẽ tiến hành chuyển đổi từ Modal nhỏ gọn sang một giao diện toàn màn hình (Full-width) chuyên nghiệp giống hệt hệ thống POS/Checkout.

## Các Yêu Cầu Đã Ghi Nhận
1. **Giao diện toàn trang (Full-width)**: Rộng rãi, dễ thao tác, có hình ảnh sản phẩm.
2. **Sản phẩm tùy chỉnh (Custom Product)**: Cho phép Sale nhập tên và giá bất kỳ cho sản phẩm không có trong Database (dùng logo TPS1 làm hình mặc định).
3. **Điều chỉnh giá tự do**: Có thể sửa giá trực tiếp cho các sản phẩm lấy từ Database.
4. **Áp dụng Mã khuyến mãi (Voucher) & Chiết khấu riêng**.
5. **Điền đầy đủ thông tin giao hàng & Ghi chú**.

---

## Proposed Changes (Chi tiết triển khai)

### 1. Database & Backend (RPC & API)
Hiện tại, hàm tạo đơn bảo mật của hệ thống (`customer_create_order`) luôn ép lấy giá gốc từ Database để chống hack. Để Sale có thể tự định giá và thêm sản phẩm ngoài, ta cần một luồng API riêng biệt chỉ dành cho Admin.

#### [NEW] Supabase RPC: `admin_create_order_full`
- Xây dựng một hàm SQL mới nhận vào giỏ hàng (`p_items`) với giá trị do Sale tự nhập.
- Cho phép `product_id` bị bỏ trống (null) đối với các Sản phẩm ngoài (Custom).
- Nhận thêm các tham số: `p_voucher_code`, `p_voucher_discount`, `p_discount_amount`, `p_discount_percent` để lưu chiết khấu riêng của Sale.

#### [MODIFY] API Route: `app/api/admin/orders/create/route.ts`
- Cập nhật API để nhận các trường dữ liệu mới từ giao diện và truyền vào RPC `admin_create_order_full`.

### 2. Giao diện Frontend (Quản Lý Admin)

#### [MODIFY] `quanly/index.html`
- Bỏ phần Modal cũ.
- Thêm một Tab riêng biệt `tab-create-order` chiếm trọn màn hình.
- Layout chia làm 2 cột chuyên nghiệp:
  - **Cột Trái (Giỏ hàng & Sản phẩm)**:
    - Ô tìm kiếm sản phẩm lớn (hiển thị Ảnh + Tên + Giá).
    - Form "Thêm Sản phẩm ngoài hệ thống" (Nhập Tên & Giá).
    - Bảng Giỏ Hàng (Cart Table) hiển thị rõ Ảnh (logo mặc định nếu là hàng ngoài), Tên, Số lượng, Ô nhập Đơn Giá (cho phép Sale sửa giá tự do), và Thành Tiền.
  - **Cột Phải (Thông tin Đơn hàng & Thanh toán)**:
    - Chọn khách hàng (Khách VIP / CUSTOM).
    - Form Thông tin giao hàng (Tên, SĐT, Địa chỉ) + Ghi chú.
    - Input nhập Mã Khuyến Mãi (Voucher) & Nút "Kiểm tra".
    - Input nhập Chiết Khấu Riêng (theo % hoặc số tiền mặt).
    - Bảng Tóm tắt (Subtotal, Giảm giá, Tổng cộng).
    - Nút Chốt "Tạo Đơn Hàng (Nháp)" cực lớn.

#### [NEW] `quanly/js/admin-order-create-v2.js`
- Viết lại toàn bộ Logic quản lý State (Giỏ hàng, Khách hàng, Tính toán tổng tiền, Kiểm tra Voucher) cho giao diện POS mới này.
- Loại bỏ hoàn toàn script `admin-order-create.js` cũ bé tí xíu.

---

## User Review Required
> [!IMPORTANT]  
> Anh vui lòng xác nhận xem layout **2 cột (Trái: Giỏ hàng & Tìm SP / Phải: Khách hàng & Thanh toán)** như các máy POS siêu thị/phần mềm bán hàng là đúng ý anh chưa nhé?
> Nếu anh đồng ý với kế hoạch nâng cấp toàn diện này, em sẽ bắt tay vào code ngay lập tức!
