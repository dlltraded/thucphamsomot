# BÁO CÁO GÓI P3 — WP4-3B TÌM KIẾM & ẢNH SẢN PHẨM (20/09/2026)

**Đã thực hiện:**
1. Sửa POS (`PosCreatePage.tsx`): bỏ hàm tự tính; dùng `/api/admin/order-cutoff` (nguồn giờ server, `earliestDate`, `cutoffInfo`, banner trễ); thêm `idempotencyKey` per-tab; xử lý nhẹ `warnings`.
2. API products (`app/api/admin/products`, `app/api/customer/products`): nâng cấp dùng RPC `search_products` + `get_distinct_categories`, tính giá tier/hợp đồng qua `resolvePricesForProducts`.
3. Component dùng chung `ProductSearchBox.tsx`: thumbnail 64px, tô đậm từ khoá khớp, debounce 250ms + `AbortController`, phím mũi tên/Enter, fallback placeholder TPS1.
4. Tích hợp `ProductSearchBox` vào `PosCreatePage.tsx` và `DatHangPage.tsx` (nâng cấp thumbnail 64px).

| Đã kiểm tra được | Chưa kiểm tra được |
|---|---|
| `cd sale-webapp && npx tsc --noEmit -p tsconfig.app.json` (0 lỗi, exit 0) | Chưa kiểm tra tương tác chuột/phím trên trình duyệt thật (dev server chưa bật) |
| `npx tsc --noEmit -p tsconfig.json` (root: 0 lỗi, exit 0) | Chưa chạy script `--apply` chuyển ảnh về Supabase (đang chạy nền đến lô 73/87) |
| Route API nhận param `search`, `category`, `customerId` đúng chuẩn | Chưa đo độ trễ mạng thực tế khi tải đồng thời nhiều ảnh 64px |

> Dừng lại chờ Claude và anh rà soát P3.
