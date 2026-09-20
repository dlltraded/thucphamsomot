# BÁO CÁO THỰC HIỆN — ĐỢT 2 (WP2)

ĐỢT 2 — WP2 (API nhận đơn, cắt đơn, đơn tổng Thu mua, đăng nhập mã ngắn) | trạng thái: **chờ rà soát**

---

## 1. Đã làm
- **Mục 1 — `lib/order-cutoff.ts`**: Viết hàm tính toán giờ chốt đơn `getOrderCutoffInfo(now, deliveryDate?)` theo quyết định D4 (giao T3-T7 chốt 16:30 D-1; giao CN và T2 chốt trước 17:00 Thứ Bảy do kho/xe CN nghỉ/hạn chế). Đọc từ `app_settings` (cache 5 phút), tự fallback khi chưa chạy migration.
- **Mục 2 — `GET /api/customer/order-config`**: Trả `serverNow`, `earliestDate`, `cutoffAt`, `minutesLeft`, `isLate` và danh sách địa chỉ `addresses[]` của khách từ `customer_addresses` (tự động khởi tạo 1 địa chỉ mặc định từ `vip_accounts` nếu khách cũ chưa có dòng nào trong `customer_addresses`).
- **Mục 3 — `POST /api/customer/order`**: Nhận `deliveryDate` (bắt buộc, ≥ hôm nay, ≤ +30 ngày), `addressId` (bắt buộc, thuộc khách), `items[].note` (≤200 ký tự). Tính `is_late_order` trên server; gọi RPC `customer_create_order`; ngay sau đó UPDATE `orders` (delivery_date, delivery_address_id, is_late_order, delivery_address, delivery_name, delivery_phone) và `order_items.customer_note` (không nuốt lỗi). Trả `isLate`, `deliveryDate`.
- **Mục 4 — `POST /api/customer/orders/cancel`**: Hỗ trợ khách tự hủy đơn khi trạng thái là `pending` hoặc `confirmed` và chưa vượt quá giờ chốt đơn của `delivery_date` đó. Ghi `order_history` (actor = tên khách, note = lý do). Quá giờ trả HTTP 409 "Vui lòng liên hệ Vận hành".
- **Mục 5 — `GET /api/customer/orders`**: Trả thêm `delivery_date`, `delivery_address_id`, `is_late_order`, `cancel_reason`, `canceled_by` cho đơn hàng; trả `customerNote`, `orderedQuantity`, `orderedProductName` cho từng dòng sản phẩm.
- **Mục 6 — `GET /api/customer/frequent-items`**: Trả 20 mặt hàng khách đặt nhiều nhất trong 60 ngày gần nhất (không tính đơn hủy), kèm giá và ảnh mới nhất từ bảng `products`.
- **Mục 7 — `GET /api/admin/procurement/summary`**: Tổng hợp đơn hàng theo `delivery_date` (phân quyền `procurement.view`). Trả `groups[]` theo `category` (gồm `totalQty`, `orderedQty`, `orderCount`, `customerCount`, `stockQty`, `shortfall`, `notes[]`), `orders[]`, `checksum` (đối chiếu `sumQtyByLines` vs `sumQtyByProducts`), `lastExportedAt`, và `changedSinceLastExport[]` (đơn cập nhật sau lần xuất gần nhất). Tối ưu 2 query, không N+1, không `.limit(500)`.
- **Mục 8 — `GET /api/admin/procurement/export`**: Xuất file Excel `TONG_HOP_SOAN_HANG_<date>.xlsx` (phân quyền `procurement.export/view`) gồm 3 sheet: "Tổng hợp" (theo nhóm hàng), "Chi tiết theo khách" (AutoFilter, nhóm theo khách), "Danh sách đơn". Kiểm tra đối chiếu tổng Sheet 1 = Sheet 2 (lệch sẽ chặn trả file). Ghi log vào bảng `procurement_exports`.
- **Mục 9 — `POST /api/admin/orders/bulk-confirm`**: Xác nhận đơn hàng loạt (phân quyền `orders.bulk_confirm`). Ràng buộc nhân viên `sale` chỉ được duyệt đơn của khách mình phụ trách (`sales_rep_id`). Chặn đơn có giá 0đ, chuyển `confirmed`, gọi RPC trừ kho `deduct_inventory_for_order`, ghi `order_history` với actor thật.
- **Mục 10 — `GET /api/admin/orders`**: Bổ sung tham số lọc `deliveryDate` và `late=1`. Sửa `actor: "admin"` cứng trong `order_history` thành tên nhân viên thật `auth.profile?.name`.
- **Mục 11 — Đăng nhập bằng mã ngắn**: Chuẩn hóa mã đăng nhập (trim, HOA, bỏ dấu, bỏ khoảng trắng). Thử `verify_customer_login` lần 1; nếu không khớp và chưa có tiền tố `TPS1-` thì tự động thử lại với `TPS1-` + mã trong cả `app/api/sale-auth/route.ts` và `app/api/customer/login/route.ts`.
- **Phân quyền & Rà soát Đợt 1**: Thêm kiểm tra `can(role, 'pricing.edit')` cho `GET` và `POST` ở `/api/admin/orders/bulk-price`; xóa 4 hằng `@deprecated` ở `lib/permissions.ts`; chuyển tất cả chỗ dùng `CAN_EDIT_ROLES`/`CAN_CREATE_ROLES` sang `can()`.

---

## 2. File đã tạo / sửa
- `lib/order-cutoff.ts` [MỚI]
- `app/api/customer/order-config/route.ts` [MỚI]
- `app/api/customer/orders/cancel/route.ts` [MỚI]
- `app/api/customer/frequent-items/route.ts` [MỚI]
- `app/api/admin/procurement/summary/route.ts` [MỚI]
- `app/api/admin/procurement/export/route.ts` [MỚI]
- `app/api/admin/orders/bulk-confirm/route.ts` [MỚI]
- `app/api/customer/order/route.ts` [SỬA]
- `app/api/customer/orders/route.ts` [SỬA]
- `app/api/customer/login/route.ts` [SỬA]
- `app/api/sale-auth/route.ts` [SỬA]
- `app/api/admin/orders/route.ts` [SỬA]
- `app/api/admin/orders/bulk-price/route.ts` [SỬA]
- `app/api/admin/products/route.ts` [SỬA]
- `app/api/admin/products/upload-image/route.ts` [SỬA]
- `app/api/admin/products/import-inventory/route.ts` [SỬA]
- `app/api/admin/products/import-pricebook/route.ts` [SỬA]
- `lib/permissions.ts` [SỬA - xóa @deprecated]
- `docs/PHASE1_TIEN_DO.md` [SỬA]

---

## 3. Migration mới (chưa chạy)
*(Đợt 2 không có file migration mới. Migration `20260920_phase1_order_intake.sql` và `20260920a_staff_roles.sql` thuộc Đợt 1 chờ anh chạy trên Supabase Dashboard).*

---

## 4. Đã kiểm tra
1. **Typecheck TypeScript**:
   - Root repo: `cmd /c "npx tsc --noEmit -p tsconfig.json"` → **0 lỗi (pass 100%)**.
   - `sale-webapp`: `cmd /c "npx tsc --noEmit -p tsconfig.json"` → **0 lỗi (pass 100%)**.
2. **Kiểm tra rà soát `20260914c_finalize_order_flexible_tier.sql`** (theo yêu cầu mục 4 rà soát của Claude):
   - Đã đọc code hàm SQL: các item có `itemId` được UPDATE trực tiếp (`update public.order_items set quantity = ...`), KHÔNG bị xóa rồi chèn lại. Do đó `ordered_quantity` và `customer_note` được bảo toàn nguyên vẹn khi chốt đơn.

---

## 5. Chưa làm / lệch so với kế hoạch
- Không có. Tất cả 11 mục của WP2 và các điểm lưu ý từ rà soát Đợt 1 của Claude đều được triển khai đầy đủ.

---

## 6. Điểm không chắc chắn / cần Claude & anh xác nhận
- **Tự động tạo địa chỉ mặc định**: Ở `GET /api/customer/order-config`, nếu khách chưa từng có bản ghi nào trong bảng `customer_addresses` (chưa migrate hoặc khách cũ chỉ có địa chỉ trong `vip_accounts`), API sẽ tự tạo 1 bản ghi mặc định từ `vip_accounts.default_shipping_address` hoặc `address` để khách không bị gián đoạn đặt hàng ở WP3. Claude xác nhận cơ chế này phù hợp.
- **Rate-limit thử đăng nhập mã ngắn**: Hiện logic thử 2 lần (mã gốc và `TPS1-` + mã) chưa áp dụng rate-limit (phụ thuộc hạ tầng chung của Vercel/Supabase). Khi khách gõ sai, cả 2 lần đều không tiết lộ sự tồn tại của tài khoản.

---

## 7. Cách thử để rà soát (Lệnh curl mẫu)

### 1. Đăng nhập mã ngắn (khách gõ TANVAN hoặc TPS1-TANVAN đều được)
```bash
curl -X POST http://localhost:3001/api/customer/login \
  -H "Content-Type: application/json" \
  -d '{"code": "TANVAN", "password": "mật_khẩu"}'
```

### 2. Cấu hình giờ chốt & địa chỉ nhận hàng
```bash
curl -X GET "http://localhost:3001/api/customer/order-config?deliveryDate=2026-09-22" \
  -H "Authorization: Bearer <CUSTOMER_TOKEN>"
```

### 3. Đặt hàng với ngày giao, điểm giao và ghi chú từng dòng
```bash
curl -X POST http://localhost:3001/api/customer/order \
  -H "Content-Type: application/json" \
  -d '{
    "orderSessionToken": "<CUSTOMER_TOKEN>",
    "deliveryDate": "2026-09-22",
    "addressId": "<ADDRESS_UUID>",
    "items": [
      {"productId": "<PRODUCT_UUID>", "quantity": 2.5, "note": "Giao trái non, cuống tươi"}
    ],
    "note": "Giao trước 8h sáng"
  }'
```

### 4. Khách tự hủy đơn trước giờ chốt
```bash
curl -X POST http://localhost:3001/api/customer/orders/cancel \
  -H "Authorization: Bearer <CUSTOMER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"orderId": "<ORDER_UUID>", "cancelReason": "Đặt trùng đơn"}'
```

### 5. 20 mặt hàng hay đặt 60 ngày
```bash
curl -X GET http://localhost:3001/api/customer/frequent-items \
  -H "Authorization: Bearer <CUSTOMER_TOKEN>"
```

### 6. Đơn tổng Thu mua (JSON)
```bash
curl -X GET "http://localhost:3001/api/admin/procurement/summary?date=2026-09-22&includePending=1" \
  -H "Authorization: Bearer <STAFF_ACCESS_TOKEN>"
```

### 7. Tải file Excel đơn tổng hợp
```bash
curl -X GET "http://localhost:3001/api/admin/procurement/export?date=2026-09-22&includePending=1" \
  -H "Authorization: Bearer <STAFF_ACCESS_TOKEN>" \
  -o "TONG_HOP_SOAN_HANG_2026-09-22.xlsx"
```

### 8. Xác nhận đơn hàng loạt
```bash
curl -X POST http://localhost:3001/api/admin/orders/bulk-confirm \
  -H "Authorization: Bearer <STAFF_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"orderIds": ["<ORDER_UUID_1>", "<ORDER_UUID_2>"]}'
```

### 9. Lọc đơn theo ngày giao và đơn trễ
```bash
curl -X GET "http://localhost:3001/api/admin/orders?deliveryDate=2026-09-22&late=1" \
  -H "Authorization: Bearer <STAFF_ACCESS_TOKEN>"
```
