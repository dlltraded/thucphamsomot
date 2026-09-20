# TÀI LIỆU BÀN GIAO TOÀN DIỆN — PHASE 1: LUỒNG ĐƠN HÀNG & THU MUA TPS1

> **Dự án:** Hệ thống Quản lý Bán hàng, Thu mua & Khách hàng TPS1 (Thực Phẩm Số Một)  
> **Giai đoạn:** Phase 1 — Vận hành thử nghiệm 10 đơn thật/ngày từ KiotViet  
> **Ngày hoàn thiện:** 20/09/2026  
> **Đối tượng bàn giao:** Ban Quản trị, Kỹ sư tiếp quản, Đội ngũ Vận hành

---

## 1. Tổng quan & Mục tiêu Vận hành thử (Pilot 10 Đơn)

Phase 1 tập trung vào **lát cắt nghiệp vụ đầu-cuối** quan trọng nhất:
```
Nhập đơn (POS) ──► Chốt đơn/Duyệt sạch ──► Đơn tổng (Thu mua) ──► Soạn hàng ──► Thực giao (Reconcile) ──► Hóa đơn & Công nợ
```
- **KiotViet vẫn là sổ chính song song**: Đơn hàng ban đầu được lấy từ KiotViet, nhập vào TPS1 qua POS, đối chiếu doanh thu và dòng hàng 1-1 bằng mã tham chiếu `orders.external_ref`.
- **Mục tiêu đạt**: 10/10 đơn đi hết vòng đời trơn tru; tổng tiền hóa đơn sau thực giao khớp KiotViet; file Excel Đơn tổng gom đúng số lượng (Checksum Sheet 1 = Sheet 2); các trường hợp trễ cutoff, điều chỉnh dòng hàng và xin hủy đơn được xử lý đúng quy trình.

---

## 2. Bản đồ Hạ tầng, Kho mã nguồn & Triển khai

Hệ thống được tổ chức thành các repo và dịch vụ tách biệt:

| Tên thành phần | Thư mục cục bộ | Repo Git / Triển khai | Công nghệ | Nhiệm vụ chính |
|---|---|---|---|---|
| **API & Web chính** | `D:\thuc_pham_so_mot\thuc_pham_so_mot` | `https://github.com/dlltraded/thucphamsomot.git` (nhánh `main`) → Deploy Vercel `https://thucphamsomot.vn` | Next.js (App Router), Node.js | Cung cấp toàn bộ REST API (`/api/**`), landing page, xác thực, PDF, RPC bridge. |
| **Web Quản lý (Manage)** | `manage/` & `sale-webapp/` | `https://github.com/saigonmotor368/webapptps1.git` (nhánh `main`) → Deploy Vercel | React 19, Vite, TailwindCSS | Ứng dụng SPA cho nhân viên (POS, Đơn tổng, Quản lý đơn, Khách hàng, Soạn hàng). |
| **Zalo Mini App** | `tps1-miniapp/` | Subdirectory trong repo gốc | React, Zalo UI (ZAUI), Recoil | Khách hàng đặt hàng qua Zalo: giỏ hàng, chọn ngày giao/điểm giao, tra cứu đơn, xin đổi/hủy. |
| **Cơ sở dữ liệu** | `supabase/` | Supabase Cloud (`yntgxollwjemyidizhnn.supabase.co`) | PostgreSQL 15, PostgREST, Supabase Storage | Bảng dữ liệu, RLS, Storage bucket `products` & `product-images`, RPC functions. |

> [!NOTE]
> - Repo `quanly/` là ứng dụng cũ chạy Vercel riêng, **tuyệt đối không đụng vào**.
> - Backend local dev chạy cổng **3001** (để tránh xung đột cổng 3000).

---

## 3. Các Gói việc Đã Hoàn thành trong Phase 1

### WP0 — Phân quyền theo vai trò (RBAC)
- Nguồn sự thật phân quyền server: `lib/permissions.ts`.
- Đồng bộ client: `sale-webapp/src/lib/permissions.ts`.
- Bổ sung các vai trò mới vào check constraint: `kho`, `ke_toan`, `tai_xe` bên cạnh `admin`, `truong_phong`, `sale`.
- Lọc menu và Route Guard `StaffOnlyRoute` tự động theo quyền hạn của từng tài khoản.

### WP1 — Database Migrations (19 migration đã áp dụng)
Các migration bổ sung tính năng Phase 1:
- `20260920a_staff_roles.sql`: Mở rộng enum/check constraint các vai trò nhân viên.
- `20260920_phase1_order_intake.sql`: Thêm `delivery_date`, `cutoff_time`, `is_late_order`, `customer_note` vào `orders` & `order_items`; bảng `app_settings` (RLS); bảng `procurement_exports`.
- `20260920b_product_search.sql`: Extensions `unaccent`, `pg_trgm`; trigger tự sinh `search_text_plain`; RPC `search_products` và `get_distinct_categories`.
- `20260920c_customer_kiotviet_import.sql`: Cột `kiotviet_code`, `kiotviet_debt`, hàm sinh mã `generate_partner_code`.
- `20260920d_customer_code_generation.sql`: Tích hợp sinh mã viết tắt `TPS1-XYZ` vào luồng đăng ký khách.
- `20260920e_order_change_requests.sql`: Bảng `order_change_requests` lưu yêu cầu sửa/hủy từ khách; hàm `sync_order_inventory` hoàn kho tự động.
- `20260920f_orders_external_ref.sql`: Cột `orders.external_ref` lưu mã đơn tham chiếu KiotViet kèm index tìm kiếm nhanh.
- `20260920g_delivery_reconcile.sql`: Cột `delivery_confirmed_at/by`, `original_grand_total`, hoàn thiện `sync_order_inventory`.
- `20260920h_auth_attempts.sql`: Bảng giới hạn số lần đăng nhập sai (rate limiting).

### WP2 & WP2b — Backend APIs & Dữ liệu Khách hàng KiotViet
- Tính giờ chốt server: `lib/order-cutoff.ts` (16:30 T2-T7; 17:00 Thứ 7 cho CN & T2).
- API giờ chốt nhân viên: `GET /api/admin/order-cutoff` (trả `serverNow`, `earliestDate`, `minutesLeft`, `isLate`).
- API cấu hình đặt hàng khách: `GET /api/customer/order-config`.
- API tạo đơn POS: `POST /api/admin/orders/create` (service role, kiểm tra công nợ, duyệt vượt hạn mức, `idempotencyKey`).
- API Đơn tổng & Xuất Excel: `GET /api/admin/procurement/summary` và `GET /api/admin/procurement/export`.
- API Xác nhận đơn hàng loạt: `POST /api/admin/orders/bulk-confirm` (chia lô ≤ 50 đơn, lọc theo sale phụ trách).
- Quản lý khách hàng: `GET /api/admin/customers/list`, `POST /api/admin/customers/assign-rep`, `POST /api/admin/customers/change-code`.
- **Dữ liệu 269 khách KiotViet**: Đã import thành công vào hệ thống với mã viết tắt `TPS1-XYZ`.

### WP4 — Tìm kiếm Thông minh & Tối ưu Ảnh
- Component dùng chung: `ProductSearchBox.tsx` (thumbnail 64px, tô đậm từ khóa, debounce 250ms, phím Enter thêm nhanh, category pills).
- Tích hợp ảnh WebP 200x200 (`thumb_url`) tải nhanh, lưu trữ trên Supabase Storage bucket `product-images` / `products`.
- Script chuyển đổi ảnh: `scripts/backfill-product-images.mjs` (đã xử lý hơn 4.700 ảnh sản phẩm).

### WP5 — Đơn tổng & File Excel Thu mua (`/don-tong`)
- Màn hình `DonTongPage.tsx`:
  - Lọc ngày giao hàng, xem tổng hợp gom hàng theo nhóm sản phẩm.
  - Cột: Tổng SL đặt, Tồn kho hiện có, Cần bù NCC (chữ đỏ khi thiếu hụt).
  - Bấm mở rộng xem phân bổ từng khách hàng (`customerLines`) kèm ghi chú quy cách.
  - Hộp đối chiếu Checksum (Khớp ✓ / Lệch ✗) giữa tổng gom và chi tiết khách.
  - Nút xuất file Excel 3 sheet chuẩn xác (`procurement/export`).
  - Tab "Cần xử lý": Hàng đợi đơn sạch → nút "Xác nhận tất cả đơn sạch" (bulk-confirm).
  - Khối đỏ cảnh báo biến động đơn sau khi đã xuất file (`changedSinceLastExport`) + nút "Sao chép thông báo Zalo".

### WP6 & WP6b — Truy vết Điều chỉnh & Yêu cầu từ Khách
- API lưu vết: `POST /api/admin/orders/track-adjustment` (ghi nhận chi tiết thay đổi dòng hàng vào `order_history`).
- Quản lý đơn `OrdersPage.tsx`: Nút lọc "Có yêu cầu (N)" phát xung nhịp đỏ, hiển thị badge Yêu cầu sửa / Yêu cầu hủy.
- POS xử lý đơn (`PosCreatePage.tsx?processOrderId=...`): Giữ nguyên số lượng gốc, bắt buộc chọn lý do thay đổi/xóa dòng, tích chọn "Đã thống nhất với khách".
- Quy trình duyệt hủy đơn: Tự động hoàn kho khả dụng bằng RPC `sync_order_inventory`.

### WP3 & WP7 — Ứng dụng Đặt hàng cho Khách (WebApp & Mini App)
- **WebApp Khách hàng (`DatHangPage.tsx`, `DatHangExcelPage.tsx`, `MyOrdersPage.tsx`)**:
  - Chọn ngày giao hàng (từ `earliestDate`), dropdown chọn sổ địa chỉ.
  - Section "Sản phẩm hay đặt" (`frequent-items`).
  - Hỗ trợ số lượng thập phân, ghi chú từng dòng hàng.
  - Nút "Đặt lại đơn này", cờ trễ giờ chốt.
- **Zalo Mini App (`tps1-miniapp`)**:
  - Giao diện giỏ hàng hỗ trợ ghi chú dòng, số lượng thập phân.
  - Màn hình giao hàng tích hợp `/api/customer/order-config`, banner đếm ngược giờ chốt.
  - Chi tiết đơn: Hiển thị ngày giao, badge trễ, nút "Hủy đơn" (`pending`), nút "Yêu cầu sửa / Hủy" (`confirmed`/`preparing`).

---

## 4. Bộ Tài liệu Nghiệp vụ theo Vai trò

Đội ngũ đã biên soạn 4 tài liệu nghiệp vụ chi tiết đặt trong thư mục `docs/`:

1. **[docs/HUONG_DAN_VAN_HANH.md](file:///d:/thuc_pham_so_mot/thuc_pham_so_mot/docs/HUONG_DAN_VAN_HANH.md)**:
   - Dành cho: Trưởng phòng Vận hành, Nhân viên Vận hành, Sale.
   - Nội dung: Quy trình nhập đơn POS (chọn khách, ngày giao, mã đơn KV, ghi chú dòng, duyệt vượt hạn mức nợ), quy trình duyệt đơn sạch tại `/don-tong`, xử lý yêu cầu sửa/hủy đơn, sao chép thông báo Zalo cho Thu mua.
2. **[docs/HUONG_DAN_THU_MUA.md](file:///d:/thuc_pham_so_mot/thuc_pham_so_mot/docs/HUONG_DAN_THU_MUA.md)**:
   - Dành cho: Bộ phận Thu mua.
   - Nội dung: Mốc giờ chốt (16:30 T2-T7, 17:00 Thứ 7), đọc bảng gom hàng theo nhóm ngành hàng, đối chiếu Checksum, cấu trúc file Excel 3 sheet, xử lý cảnh báo thay đổi sau khi xuất file.
3. **[docs/HUONG_DAN_KHO.md](file:///d:/thuc_pham_so_mot/thuc_pham_so_mot/docs/HUONG_DAN_KHO.md)**:
   - Dành cho: Thủ kho, Nhân viên Soạn hàng, Đóng gói.
   - Nội dung: Màn hình `/soan-hang`, lọc theo ngày giao hàng, cập nhật tiến độ (`not_started` -> `in_progress` -> `done`), đọc kỹ cột ghi chú quy cách sơ chế, quy tắc trừ kho và hoàn kho tự động.
4. **[docs/HUONG_DAN_KE_TOAN.md](file:///d:/thuc_pham_so_mot/thuc_pham_so_mot/docs/HUONG_DAN_KE_TOAN.md)**:
   - Dành cho: Kế toán Bán hàng, Kế toán Công nợ.
   - Nội dung: **Quy tắc cốt lõi: Chỉ xuất hóa đơn sau khi Xác nhận thực giao** (`reconcile-delivery`), quản lý mã khách KiotViet (`kiotviet_code`), theo dõi nợ đầu kỳ (`kiotviet_debt`), giám sát hạn mức công nợ.

---

## 5. Tài khoản & Thông tin Xác thực Vận hành

### Tài khoản Nhân viên hiện có:
| Email đăng nhập | Mật khẩu | Tên nhân viên | Vai trò (`role`) | Ghi chú |
|---|---|---|---|---|
| `admin@thucphamsomot.vn` | (đã ẩn — hỏi anh chủ dự án; KHÔNG ghi mật khẩu vào file) | Admin Tổng | `admin` | Quản trị toàn hệ thống (đã reset & test OK). |
| `sale01@thucphamsomot.vn` | (Theo cấu hình cũ) | Nguyễn Thái Hoà | `sale` | Đã được gán phụ trách 276 khách hàng active. |
| `xuandinh.avg@gmail.com` | (Theo cấu hình cũ) | Phạm Xuân Định | `truong_phong` | Trưởng phòng Vận hành. |

### Script khởi tạo thêm tài khoản nhân viên thử nghiệm:
Khi cần tạo thêm tài khoản cho Thu mua, Kho, Kế toán, chạy lệnh:
```bash
node --env-file=.env scripts/create-staff-accounts.mjs --apply
```
Script sẽ tự động tạo: `thumua@thucphamsomot.vn`, `kho@thucphamsomot.vn`, `ketoan@thucphamsomot.vn`, `sale02@thucphamsomot.vn` và in mật khẩu một lần ra màn hình console.

---

## 6. Lịch sử Xử lý Sự cố & Kinh nghiệm Kỹ thuật

1. **Lỗi Cross-Origin API trên Web Quản lý (`manage`)**:
   - *Hiện tượng*: Khi bấm "Xử lý đơn hàng" trên web quản lý, báo lỗi `Unexpected token 'T', "The page c"... is not valid JSON`.
   - *Nguyên nhân*: Web `manage` deploy độc lập trên Vercel như một static SPA. `VITE_API_BASE_URL` trống khiến lệnh fetch gọi relative link `/api/admin/orders` vào domain của frontend, Vercel trả về 404 HTML `"The page could not be found."`.
   - *Khắc phục*: 
     - Tạo module `lib/apiBase.ts` với hàm `getApiBase()` tự động fallback về `https://thucphamsomot.vn` ở môi trường production.
     - Cấu hình reverse proxy trong `manage/vercel.json`: `{ "source": "/api/:path*", "destination": "https://thucphamsomot.vn/api/:path*" }`.
2. **Quy tắc Typecheck bắt buộc**:
   - Dự án `sale-webapp`: **Bắt buộc** chạy lệnh `cd sale-webapp && npx tsc --noEmit -p tsconfig.app.json` (lệnh mặc định `-p tsconfig.json` bị rỗng không kiểm tra gì).
   - Dự án `tps1-miniapp`: Chạy `cd tps1-miniapp && npx tsc --noEmit -p tsconfig.json` (có 2 lỗi cũ được miễn trừ: `orders/index.tsx:50` và `state.ts:153`).
   - Root project: `npx tsc --noEmit`.

---

## 7. Các bước Tiếp theo trước Ngày Thử 10 Đơn

1. **Chạy Migration `20260920d_customer_code_generation.sql`**: Chạy trên Supabase SQL Editor khi chính thức chuyển đổi hàm đăng ký khách sang mã viết tắt.
2. **Chọn 3–5 khách hàng thử nghiệm**:
   - Bổ sung số điện thoại, mật khẩu và địa chỉ giao hàng trong sổ địa chỉ.
   - Kiểm tra bảng giá hợp đồng/hạng riêng tương ứng trên KiotViet.
3. **Thực hiện kịch bản thử nghiệm 10 đơn**:
   - Làm theo kịch bản chi tiết tại [docs/PHASE1_KICH_BAN_KIEM_THU.md](file:///d:/thuc_pham_so_mot/thuc_pham_so_mot/docs/PHASE1_KICH_BAN_KIEM_THU.md).
   - Chạy script đối chiếu tự động cuối ngày: `node --env-file=.env scripts/pilot-compare.mjs`.
