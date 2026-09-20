# BÁO CÁO GÓI P2 — POS LÀ ĐƯỜNG NHẬP ĐƠN CHÍNH (20/09/2026)

**Đã thực hiện:**
1. Tạo migration `20260920f_orders_external_ref.sql` (thêm cột `orders.external_ref` & index `upper(trim())`).
2. API server `POST /api/admin/orders/create`: kiểm quyền `orders.create`, tính ngày giao + cờ trễ giờ, hạn mức công nợ/log override, gọi RPC `admin_create_order`, UPDATE an toàn theo F1, lưu ghi chú dòng.
3. `PosCreatePage.tsx`: chuyển sang gọi API server; thêm ngày giao, mã KiotViet, điểm giao/lưu nhanh, ghi chú dòng, SL thập phân (`0.001`), Enter thêm nhanh SP.
4. `OrdersPage.tsx`: query & tìm theo `external_ref`, badge `KV: {external_ref}`.
5. Procurement `export` & `summary`: thêm `external_ref` vào Sheet 2, Sheet 3 và API JSON.

| Đã kiểm tra được | Chưa kiểm tra được |
|---|---|
| `tsc` cả 2 repo (root & `sale-webapp`) pass 100% | Chưa chạy migration `20260920f` trên Supabase (anh chạy) |
| Logic tính ngày giao + trễ giờ khớp chuẩn D4 | Chưa bấm tạo đơn trên giao diện POS live với database |
| Không sửa file Claude giữ (`OrderDetailPage`...) | Chưa in phiếu tạm thực tế trên máy in |

> **Dừng lại chờ Claude và anh duyệt P2 trước khi chuyển sang P3/P4.**
