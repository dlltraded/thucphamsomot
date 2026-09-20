# BÁO CÁO ĐỢT 1 — WP0 + WP1 | Trạng thái: chờ rà soát

> Ngày hoàn thành: 2026-09-20  
> Người thực hiện: Gemini  
> Người rà soát: Claude

---

## 1. Đã làm

### WP0 — Phân quyền theo vai trò

- **`lib/permissions.ts`** (server, MỚI): nguồn sự thật duy nhất cho 22 permission, hàm `can(role, perm)`. Giữ lại các `Set` cũ (`CAN_EDIT_ROLES`, `OVERRIDE_ROLES`, `CAN_CREATE_ROLES`, `CAN_PACK_ROLES`) dưới dạng `@deprecated` để các route hiện tại không bị phá — sẽ thay bằng `can()` ở WP2.
- **`sale-webapp/src/lib/permissions.ts`** (client, MỚI): nội dung đồng bộ với server, kèm comment "giữ đồng bộ 2 file".
- **`sale-webapp/src/layouts/SaleLayout.tsx`** (SỬA):
  - Xóa `ROLE_LABELS` local, import từ `permissions.ts`.
  - Menu nhân viên lọc qua `can()` — mỗi mục kèm `perm` tương ứng; mục nào role không có quyền thì không hiện.
  - Thêm mục **"Đơn tổng / Tuyến"** (`/don-tong`, icon `Truck`) cho các role có `procurement.view`.
- **`sale-webapp/src/App.tsx`** (SỬA):
  - `StaffOnlyRoute` nhận thêm prop `perm?: string`; nếu có, nhân viên không đủ quyền bị redirect về `/` thay vì render trang.
  - Thêm route `/don-tong` với `perm="procurement.view"` (placeholder tạm dùng `DashboardPage` — WP4 thay bằng `DonTongPage`).
  - Gắn `perm` vào các route đã có: `soan-hang` → `orders.packing`, `ap-gia-hang-ngay` → `pricing.edit`, `cong-no` → `finance.view`, `bao-cao` → `reports.view`.

### WP1 — Migration

- **`20260920a_staff_roles.sql`** (MỚI): mở rộng check constraint `admin_profiles.role` thêm `kho`, `ke_toan`, `tai_xe`. Dùng kỹ thuật tìm tên constraint động (DO $$…$$) như `20260910_extend_admin_roles.sql`, không đoán tên cứng → idempotent thật sự.

- **`20260920_phase1_order_intake.sql`** (MỚI): bao gồm:
  1. Bảng **`delivery_routes`** + RLS policy (staff đọc; admin/truong_phong ghi) + **seed 17 tuyến** từ `GGmap các tuyến giao hàng P.VH.xlsx` (đọc bằng script Node, sinh INSERT thủ công vào migration, không nhét file Excel vào DB).
  2. **`customer_addresses`**: thêm `route_id uuid references delivery_routes(id)`, `delivery_window text`, `is_active boolean default true`.
  3. **`orders`**: thêm `delivery_date date`, `delivery_address_id uuid`, `route_id uuid`, `is_late_order boolean default false`, `cancel_reason text`, `canceled_by text`. Index `(delivery_date, status)`. Backfill `delivery_date` = ngày tạo theo giờ VN.
  4. **`order_items`**: thêm `customer_note text`, `ordered_quantity numeric(12,3)`, `ordered_product_name text`. Backfill `ordered_quantity = quantity` cho đơn cũ.
  5. **`products`**: thêm `supply_type text check (in ('fresh','dry'))` + default `'dry'` + backfill theo D3 (`track_inventory=false` → `fresh`, còn lại → `dry`).
  6. **`app_settings`**: tạo bảng + seed `order_cutoff = {"time":"16:30","satTime":"17:00","tz":"Asia/Ho_Chi_Minh"}`.
  7. **Trigger `orders_set_delivery_date`** (BEFORE INSERT): nếu `delivery_date IS NULL` → gán ngày VN hiện tại + 1.
  8. **Trigger `order_items_set_ordered_fields`** (BEFORE INSERT): `ordered_quantity := coalesce(ordered_quantity, quantity)`, `ordered_product_name := coalesce(ordered_product_name, name)` — hoạt động bất kể RPC nào tạo đơn, không sửa RPC.

---

## 2. File đã tạo/sửa

| File | Loại |
|------|------|
| `lib/permissions.ts` | MỚI |
| `sale-webapp/src/lib/permissions.ts` | MỚI |
| `sale-webapp/src/layouts/SaleLayout.tsx` | SỬA |
| `sale-webapp/src/App.tsx` | SỬA |
| `tps1-miniapp/supabase/migrations/20260920a_staff_roles.sql` | MỚI |
| `tps1-miniapp/supabase/migrations/20260920_phase1_order_intake.sql` | MỚI |
| `docs/PHASE1_TIEN_DO.md` | MỚI |
| `docs/BAO_CAO_DOT1.md` | MỚI (file này) |

---

## 3. Migration mới (chưa chạy trên Supabase)

| File | Tóm tắt |
|------|---------|
| `20260920a_staff_roles.sql` | Mở rộng check constraint role: thêm `kho`, `ke_toan`, `tai_xe` |
| `20260920_phase1_order_intake.sql` | delivery_routes + seed 17 tuyến; cột mới customer_addresses/orders/order_items/products; app_settings; 2 trigger BEFORE INSERT |

**⚠️ Cần anh chạy trên Supabase Dashboard sau khi Claude duyệt.**

---

## 4. Đã kiểm tra

| Kiểm tra | Kết quả |
|----------|---------|
| `cd sale-webapp && npx tsc --noEmit` | ✅ 0 lỗi |
| Root `npx tsc --noEmit` (lọc file đã sửa) | ✅ 0 lỗi mới (lỗi cũ trong `.next/types` và miniapp không thay đổi) |
| Giao diện trình duyệt | ❌ Chưa kiểm tra — dev server chưa bật |

---

## 5. Chưa làm / lệch so với kế hoạch

- Các route API hiện dùng `Set([...])` rải rác (`packing/route.ts:20`, `credit-override/route.ts:26`, `products/route.ts:60,64`) **chưa được thay bằng `can()`** — giữ nguyên để không thay đổi hành vi Đợt 1; sẽ migrate ở WP2.
- `supply_type` để **nullable** (không ép `NOT NULL` sau backfill) vì có thể có sản phẩm chưa qua backfill — xem mục 6.

---

## 6. Điểm không chắc chắn / cần Claude hoặc anh quyết

1. **`supply_type NOT NULL`**: Migration hiện chỉ set `DEFAULT 'dry'` nhưng không ép `NOT NULL` vì muốn an toàn (tránh lỗi nếu có dòng null còn sót). Nếu Claude muốn ép NOT NULL thì cần thêm `alter column supply_type set not null;` — nhưng phải đảm bảo backfill phủ hết (hiện tại UPDATE không có WHERE thêm nên phủ hết nếu không có race condition). **Đề xuất: ép NOT NULL để schema chặt hơn, chấp nhận rủi ro thấp.**

2. **Luật cứng — `kho` được soạn hàng**: Ma trận WP0 ghi `orders.packing` gồm `admin, truong_phong, thu_mua, kho`. Em đã gắn route `/soan-hang` với `perm="orders.packing"` → `kho` vào được. **Xác nhận đúng không?**

3. **`ke_toan` xem được đơn hàng**: Ma trận ghi `orders.view` gồm `ke_toan` (cột cuối "R"). Em đã thêm vào. `ke_toan` hiện thấy menu "Quản lý Đơn hàng" nhưng không thấy "Tạo đơn (POS)". **Xác nhận đúng không?**

---

## 7. Cách thử để rà soát

```sql
-- Sau 20260920a_staff_roles.sql:
-- Thành công:
INSERT INTO admin_profiles (id, name, role, is_active) 
VALUES (gen_random_uuid(), 'Test Kho', 'kho', true);
-- Lỗi constraint (role không hợp lệ):
INSERT INTO admin_profiles (id, name, role, is_active) 
VALUES (gen_random_uuid(), 'Test Bad', 'warehouse', true);

-- Sau 20260920_phase1_order_intake.sql:
SELECT count(*) FROM delivery_routes;           -- phải = 17
SELECT * FROM app_settings WHERE key = 'order_cutoff';  -- phải có 1 dòng
SELECT count(*) FROM orders WHERE delivery_date IS NOT NULL; -- phải = tổng số đơn
SELECT count(*) FROM order_items WHERE ordered_quantity IS NOT NULL; -- phải = tổng số dòng

-- Kiểm tra trigger:
-- Tạo 1 đơn mới qua RPC hiện có → sau đó:
SELECT delivery_date, ordered_quantity FROM orders o
JOIN order_items oi ON oi.order_id = o.id
ORDER BY o.created_at DESC LIMIT 5;
-- delivery_date và ordered_quantity phải được tự điền.
```

**Xong Đợt 1. Dừng chờ Claude rà soát.**
