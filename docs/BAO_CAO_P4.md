# BÁO CÁO GÓI P4 — WP5 ĐƠN TỔNG & FILE EXCEL THU MUA (20/09/2026)

**Đã thực hiện:**
1. Tạo `sale-webapp/src/pages/DonTongPage.tsx`, nối vào route `/don-tong` trong `App.tsx` (quyền `procurement.view`).
2. Bộ lọc: chọn ngày giao (mặc định sớm nhất/ngày mai; nút Hôm nay/Ngày mai), checkbox gồm đơn chờ xác nhận (`includePending`).
3. Tab 1 "Tổng hợp soạn hàng": gom nhóm danh mục, cột SL cuối / ban đầu / tồn kho / cần bù (đỏ khi thiếu), bấm dòng mở rộng phân bổ từng khách, hộp đối chiếu checksum (khớp ✓ / lệch ✗), nút tải file Excel `/api/admin/procurement/export`.
4. Tab 2 "Cần xử lý": hàng đợi đơn `pending`/trễ giờ chốt, nút "Xác nhận tất cả đơn sạch" & "Xác nhận đơn đã chọn" gọi `/api/admin/orders/bulk-confirm` (chia lô ≤ 50 đơn).
5. Khối đỏ cảnh báo thay đổi sau lần xuất file (`changedSinceLastExport`) + nút sao chép thông báo Zalo.
6. `SoanHangPage.tsx`: bổ sung bộ lọc `delivery_date` cho nhân viên kho.

| Đã kiểm tra được | Chưa kiểm tra được |
|---|---|
| `cd sale-webapp && npx tsc --noEmit -p tsconfig.app.json` (0 lỗi, exit 0) | Chưa mở giao diện trình duyệt thật để bấm luồng (dev server chưa bật) |
| `npx tsc --noEmit -p tsconfig.json` (root: 0 lỗi, exit 0) | Chưa tải thử file `.xlsx` thật trên máy client qua giao diện web |
| Tích hợp API summary/export/bulk-confirm/cutoff sẵn có | Chưa thử duyệt đồng thời > 50 đơn thật từ KiotViet |

> Dừng lại chờ Claude và anh rà soát P4.
