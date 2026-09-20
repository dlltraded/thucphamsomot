# BÁO CÁO HOÀN THÀNH: SỬA LỖI ĐỢT 2 (F1–F7) & ĐỢT 2b (WP2b)
**Ngày thực hiện:** 20/09/2026  
**Trạng thái:** Chờ Claude rà soát

---

## PHẦN 1: BÁO CÁO NGẮN SỬA LỖI ĐỢT 2 (F1–F7)

| Mục | Lỗi & Xử lý | File đã sửa |
|---|---|---|
| **F1** | **Tránh nhân đôi đơn hàng:** Sau khi RPC `customer_create_order` thành công, không bao giờ trả lỗi 500 nếu update ngày giao/ghi chú lỗi; trả `ok: true` kèm `warnings: ["delivery_info_not_saved"]`. Trigger DB đã có ngày giao mặc định nên đơn luôn hợp lệ. | `app/api/customer/order/route.ts` |
| **F2** | **Chống lệch tồn kho khi hủy đơn:** Khách chỉ được tự hủy đơn `pending` (nếu đơn `confirmed` trả 409 "Đơn đã được xác nhận, vui lòng liên hệ Vận hành"). Câu UPDATE có điều kiện `.eq('status', 'pending')` và kiểm tra số dòng bị ảnh hưởng chống race condition. | `app/api/customer/orders/cancel/route.ts` |
| **F3** | **Kiểm soát xác nhận hàng loạt:**<br>a) Giới hạn tối đa **50 đơn/lần gọi**.<br>b) Bỏ qua đơn nếu khách có `verification_status != 'verified'` ("Khách chưa xác thực — cần xử lý riêng").<br>c) Kiểm tra hạn mức công nợ (`credit_limit > 0`), tính tổng nợ chưa thanh toán; nếu vượt bỏ qua với lý do "Vượt hạn mức công nợ". | `app/api/admin/orders/bulk-confirm/route.ts` |
| **F4** | **Tránh lỗi URL quá dài:** Viết helper `lib/products-fetcher.ts` (`fetchProductsByIds`) tự động chia lô ≤ 100 ID/truy vấn. | `lib/products-fetcher.ts`<br>`app/api/customer/products/route.ts`<br>`app/api/customer/frequent-items/route.ts`<br>`app/api/admin/procurement/summary/route.ts`<br>`app/api/admin/procurement/export/route.ts` |
| **F5** | **Tính đúng giá hàng hay đặt:** Tách hàm tính giá dùng chung `lib/customer-pricing.ts` (`resolvePricesForProducts`) tra cứu giá theo hợp đồng riêng và hạng khách hàng, áp dụng cho cả `products` và `frequent-items`. Tự động fallback nếu DB chưa có cột `thumb_url`. | `lib/customer-pricing.ts`<br>`app/api/customer/products/route.ts`<br>`app/api/customer/frequent-items/route.ts` |
| **F6** | **Rõ ràng nhãn đối chiếu Excel:** Sheet 1 tổng nhóm đổi thành `Tổng nhóm ${cat} (chỉ để đối chiếu)`; dòng chân trang đổi thành `TỔNG SỐ LƯỢNG (...) — chỉ để đối chiếu`. | `app/api/admin/procurement/export/route.ts` |
| **F7** | **Điều tra `p_admin_id` trong `customer_create_order`:** Trong file `fix-customer-create-order.sql` (bản RPC mới nhất), tham số `p_admin_id` chỉ được dùng để gán vào cột `orders.created_by_admin_id` và ghi log vào `payload` của `order_history`. Nó **KHÔNG** làm thay đổi logic giá (khách vẫn tính giá từ bảng giá hệ thống), và **KHÔNG** tự động chuyển trạng thái đơn (đơn vẫn luôn là `pending`). Vì vậy không tạo lỗ hổng bypass giá/status. | Báo cáo lại Claude xem xét |

---

## PHẦN 2: BÁO CÁO ĐỢT 2b (WP2b — NHẬP KHÁCH KIOTVIET DRY-RUN & SINH MÃ VIẾT TẮT)

### 1. Đã làm:
1. **Migration `20260920c_customer_kiotviet_import.sql`:**
   - Thêm các cột vào `vip_accounts`: `kiotviet_code` (unique index không phân biệt hoa thường), `customer_group`, `kiotviet_opening_debt`, `kiotviet_imported_at`.
   - Nới lỏng ràng buộc `ALTER TABLE public.vip_accounts ALTER COLUMN phone DROP NOT NULL;` vì dữ liệu thật KiotViet có 236/269 khách không có SĐT.
   - Viết hàm SQL `public.generate_partner_code(p_name text, p_preferred text default null)` sinh mã `TPS1-<VIẾTTẮT>` tự động loại tiền tố công ty/trường học/nhà hàng, chuẩn hóa không dấu và kiểm tra tính duy nhất.
2. **Script `scripts/import-kiotviet-customers.mjs`:**
   - Đọc trực tiếp từ file Excel KiotViet `C:\Users\boanl\Downloads\DanhSachKhachHang_KV20092026-143107-369.xlsx` (không copy vào repo).
   - Mặc định là **DRY-RUN** (chỉ in và xuất báo cáo, KHÔNG ghi Supabase).
   - Đã chạy thử nghiệm 2 lần liên tiếp cho kết quả hoàn toàn nhất quán.
   - Xuất file đối chiếu CSV: `tmp/doi_chieu_ma_khach_20260920.csv` (269 dòng).
   - Xuất file báo cáo Markdown: `tmp/import-khach-20260920.md`.
3. **Cập nhật giao diện `sale-webapp`:**
   - `CustomersPage.tsx`: hiển thị mã KiotViet, nhóm khách hàng, badge "Thiếu SĐT / Thiếu địa chỉ", số nợ KiotViet đầu kỳ tham chiếu. Thêm bộ lọc "Chưa phân công", "Thiếu SĐT/Địa chỉ". Cho phép chọn checkbox hàng loạt và gán Sales Rep phụ trách.
   - `CustomerDetailPage.tsx`: hiển thị mã KiotViet, nhóm khách hàng, nợ KiotViet đầu kỳ. Thêm nút "Đổi mã" cho vai trò `admin` hoặc `truong_phong` (có kiểm tra trùng và cảnh báo khách sẽ phải đăng nhập bằng mã mới).

### 2. File đã tạo / sửa:
- `tps1-miniapp/supabase/migrations/20260920c_customer_kiotviet_import.sql` [MỚI]
- `scripts/import-kiotviet-customers.mjs` [MỚI]
- `tmp/doi_chieu_ma_khach_20260920.csv` [MỚI]
- `tmp/import-khach-20260920.md` [MỚI]
- `sale-webapp/src/pages/CustomersPage.tsx` [SỬA]
- `sale-webapp/src/pages/CustomerDetailPage.tsx` [SỬA]
- `docs/PHASE1_TIEN_DO.md` [SỬA]

### 3. Kết quả Dry-Run (269 khách hàng KiotViet):
- **Sẽ tạo mới:** 268 khách (được cấp mã `TPS1-<VIẾTTẮT>`, ví dụ `TPS1-TANVAN`, `TPS1-ZERMAT`).
- **Khớp theo SĐT:** 1 khách (đã có tài khoản trên hệ thống).
- **Cần duyệt thủ công:** 0 khách (không có xung đột trùng tên hay trùng nội bộ).
- **Khách thiếu SĐT:** 236 khách.
- **Khách thiếu địa chỉ:** 237 khách (32 khách có địa chỉ sẽ được tạo kèm `customer_addresses`).
- **Khách xác thực ngay (`verified`):** 260 khách (có Tổng bán > 0).
- **Công nợ đầu kỳ KiotViet:** 54 khách nợ dương (tổng 3.354.919.438 đ), 135 khách nợ âm (-2.795.728.477 đ).

### 4. Đã kiểm tra:
- `cmd /c "npx.cmd tsc --noEmit -p tsconfig.json"` (Root): Exit code 0 (Pass).
- `cmd /c "npx.cmd tsc --noEmit -p tsconfig.json"` (`sale-webapp`): Exit code 0 (Pass).
- `node --env-file=.env scripts/import-kiotviet-customers.mjs`: Chạy dry-run thành công 2 lần, kết quả khớp 100%.

### 5. Ghi chú quan trọng cho bước triển khai:
- **Thứ tự đưa lên hệ thống:** Chạy migration `20260920c_customer_kiotviet_import.sql` trên Supabase TRƯỚC khi anh chạy script với cờ `--apply`.
