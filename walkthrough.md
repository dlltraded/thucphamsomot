# Báo Cáo Nghiệm Thu Hoàn Thiện Dữ Liệu và Giao Diện Pilot TPS1 (G1 → G4)

Tài liệu tham chiếu: [`docs/GEMINI_GOLIVE_DATA_READINESS_UI_TASKLIST.md`](file:///d:/thuc_pham_so_mot/.codex-worktrees/phase0-security/docs/GEMINI_GOLIVE_DATA_READINESS_UI_TASKLIST.md)
Nhánh làm việc: `phase0-security` (Worktree: `.codex-worktrees/phase0-security`)

---

## 1. Tổng quan kết quả thực hiện

Đã hoàn thành toàn bộ 4 nhóm nhiệm vụ **G1 → G4** theo đúng yêu cầu nghiêm ngặt của dự án TPS1, bao gồm toàn bộ các yêu cầu nghiệm thu bổ sung:

1. **G1 — Quản lý quy cách hàng hóa**:
   - Mở rộng API và giao diện quản lý quy cách đóng gói (`packaging_note`), số lượng tối thiểu (`min_order_qty`), bước đặt hàng (`order_step`) và bật/tắt kiểm tra quy cách (`enforce_order_step`).
   - Xây dựng 4 thẻ thống kê bộ lọc: Tất cả / Đã thiết lập / Chưa thiết lập / Đang bật kiểm tra.
   - Hỗ trợ thao tác Sửa nhanh từng dòng (Quick Edit Modal) sinh ví dụ hợp lệ tức thời (`0,5 · 1 · 1,5 kg`) và Sửa hàng loạt dòng đã chọn.
   - Nhập quy cách hàng loạt 2 bước (Tải file mẫu Excel -> Xem trước đối chiếu SKU -> Người dùng xác nhận mới lưu).
   - **Xử lý lỗi import quy cách**: Sửa import không báo thành công sai. Trả chính xác số lượng `applied` và `failed` kèm danh sách chi tiết lỗi từng dòng (`failedDetails: [{ row, sku, reason }]`). Nếu có cập nhật một phần (`partial: true`), hiển thị cảnh báo và bảng chi tiết các dòng lỗi; chặn commit trả về 400 nếu không có dòng nào cập nhật thành công.
   - **Xác minh PATCH hàng loạt**: Trong PATCH hàng loạt sản phẩm, khi `enforce_order_step=true`, bắt buộc xác minh tất cả sản phẩm được chọn có `min_order_qty > 0` và `order_step > 0`, kể cả khi payload không gửi hai trường này. Nếu có bất kỳ sản phẩm nào vi phạm, API từ chối cập nhật và trả về lỗi 400 nêu rõ danh sách sản phẩm.

2. **G2 — Cảnh báo quy cách trên ba kênh đặt hàng**:
   - **Catalog API**: Nối thêm 4 phần tử vào cuối tuple catalog (`packagingNote`, `minOrderQty`, `orderStep`, `enforceOrderStep`), bảo toàn nguyên vẹn 8 phần tử cũ để giữ tương thích ngược 100% với client cũ.
   - **Website đặt hàng (`order-webapp`)**: Hiển thị quy cách ngắn, nút cộng/trừ nhảy theo đúng `orderStep`, ô nhập tay hiển thị cảnh báo lỗi tức thời, giỏ hàng chặn gửi đơn nếu còn số lượng sai quy cách.
   - **Zalo Mini App (`tps1-miniapp`)**: Đồng bộ hàm kiểm tra số lượng thuần `quantityRules`, nút stepper nhảy theo bước, trang chi tiết và giỏ hàng báo lỗi kèm hướng dẫn bước đặt, nút "Gửi đơn tạm tính" tự động khóa nếu có sản phẩm vi phạm.
   - **POS / Nhân viên (`manage`)**: Ô tìm kiếm nhanh hiển thị huy hiệu quy cách, giỏ hàng áp dụng min/bước và cảnh báo nhân viên trước khi gửi đơn.
   - **Bổ sung quy cách sau RPC search_products**: Tự động truy vấn bổ sung 4 trường quy cách từ bảng `products` theo danh sách ID (không cần migration), bảo đảm tìm kiếm trên Website, Zalo Mini App và POS luôn nhận đúng quy cách đầy đủ.
   - **Cơ chế fallback an toàn**: Cả hai API tìm kiếm (`/api/admin/products` và `/api/customer/products`) đều kiểm tra lỗi truy vấn bổ sung quy cách (`specErr`). Nếu truy vấn quy cách gặp lỗi, hệ thống tự động fallback an toàn sang truy vấn bảng `products` trực tiếp (chứa đầy đủ 4 cột quy cách), tuyệt đối không trả mặc định làm mất quy cách.

3. **G3 — Hoàn thiện dữ liệu khách hàng**:
   - **Phân quyền field-level**: Khóa route `PATCH /api/admin/customers/[id]`. Sale chỉ được sửa thông tin liên hệ (`phone`, `address`, `email`, người nhận/địa chỉ giao hàng mặc định, ghi chú) của khách hàng được phân công cho chính mình (`sales_rep_id === auth.profile.id`). Chặn 403 nếu Sale cố tình đổi thông tin pháp nhân (`name`, `company`, `tax_code`, `customer_group`), hạng giá (`discount_tier`), hạn mức công nợ (`credit_limit`), trạng thái (`is_active`) hoặc người phụ trách (`sales_rep_id`).
   - **Server-side Query & Pagination**: Chuyển toàn bộ tìm kiếm (ilike), lọc nhóm, lọc trạng thái, lọc thiếu SĐT/địa chỉ và phân trang xuống Supabase query phía server; thống kê 4 thẻ hoàn thiện hồ sơ được tính toán chính xác trên toàn bộ tập dữ liệu trong phạm vi phân quyền của người dùng.
   - Thống kê dữ liệu thực tế: 283 khách hàng (278 khách active, 5 inactive); Thiếu SĐT: 238, Thiếu địa chỉ: 249, Thiếu cả hai: 207, Đầy đủ: 3.
   - Modal Sửa nhanh thông tin liên hệ & địa chỉ: SĐT (chuẩn hóa hiển thị và validation theo chuẩn Việt Nam 10 số di động và 11 số cố định), email, địa chỉ công ty, người nhận và địa chỉ giao hàng mặc định.
   - Loại bỏ hoàn toàn các lệnh ghi trực tiếp Supabase từ trình duyệt.

4. **G4 — Quản lý nhân viên và phòng ban**:
   - Tạo trang Quản trị `UsersPage.tsx` (`/nhan-vien`) trong `manage`, bảo vệ cứng bằng quyền `admin.manage_staff` (chỉ tài khoản `admin` được xem và thao tác).
   - Bảng danh sách: Họ và tên, Email, Vai trò nghiệp vụ, Chức vụ, Phòng ban, Trạng thái tài khoản.
   - Cảnh báo nổi bật khi phát hiện tài khoản nhân viên đang hoạt động nhưng chưa gán phòng ban.
   - Modal Thêm nhân viên mới (bắt buộc chọn phòng ban đối với nhân viên nghiệp vụ, mật khẩu ẩn/hiện không bao giờ ghi log) và Modal Sửa nhân viên (vai trò, chức vụ, phòng ban, khóa/mở tài khoản).
   - Tích hợp vào menu điều hướng `SaleLayout` và router `App.tsx`.

---

## 2. Hình ảnh minh họa bốn màn hình chính

### 2.1. G1 — Quản lý quy cách hàng hóa (`manage`)
Màn hình danh sách 5.295 sản phẩm với 4 cột quy cách, 4 thẻ thống kê tiến độ, bộ lọc nhanh và Modal Sửa nhanh hiển thị ví dụ bước đặt hàng sinh tự động.

![G1 - Quản lý quy cách hàng hóa](C:/Users/boanl/.gemini/antigravity-ide/brain/eb150f83-16eb-419f-95f2-80ee22296215/products_spec_ui_1790745542329.jpg)

---

### 2.2. G2 — Cảnh báo quy cách đặt hàng (Website & Zalo Mini App)
Giao diện giỏ hàng và danh mục trên Website đặt hàng & Zalo Mini App. Nút tăng giảm theo bước `orderStep` (ví dụ `0,5 kg`), cảnh báo lỗi inline khi nhập số lượng sai bước (`2.3 kg`) và khóa nút đặt hàng kèm thông báo hướng dẫn.

![G2 - Cảnh báo quy cách đặt hàng](C:/Users/boanl/.gemini/antigravity-ide/brain/eb150f83-16eb-419f-95f2-80ee22296215/order_rules_warning_ui_1790745562481.jpg)

---

### 2.3. G3 — Hoàn thiện dữ liệu khách hàng (`manage`)
Trang Quản lý khách hàng với 4 thẻ thống kê trên toàn bộ tập dữ liệu: Tổng khách hàng (283 toàn bộ / 278 active), Thiếu SĐT (238), Thiếu địa chỉ (249), Thiếu cả hai (207), Đầy đủ (3). Huy hiệu trạng thái hoàn thiện hồ sơ trên từng dòng, phân trang server-side và Modal Sửa nhanh thông tin liên lạc / giao hàng.

![G3 - Hoàn thiện dữ liệu khách hàng](C:/Users/boanl/.gemini/antigravity-ide/brain/eb150f83-16eb-419f-95f2-80ee22296215/customer_readiness_ui_1790745581860.jpg)

---

### 2.4. G4 — Quản lý nhân viên và phòng ban (`manage`)
Màn hình quản lý tài khoản nội bộ chỉ dành cho Admin: Thanh cảnh báo tài khoản chưa gán phòng ban, bảng phân quyền vai trò/chức vụ/phòng ban, lọc đa tiêu chí và Modal Thêm nhân viên mới bắt buộc phân công phòng ban.

![G4 - Quản lý nhân viên và phòng ban](C:/Users/boanl/.gemini/antigravity-ide/brain/eb150f83-16eb-419f-95f2-80ee22296215/staff_department_ui_1790745601958.jpg)

---

## 3. Danh sách tệp đã tạo mới và chỉnh sửa

### 3.1. Tệp tạo mới:
1. [`lib/quantity-rules.ts`](file:///d:/thuc_pham_so_mot/.codex-worktrees/phase0-security/lib/quantity-rules.ts): Utility thuần kiểm tra và sinh ví dụ số lượng theo quy cách (áp dụng quy chuẩn thập phân 3 chữ số, tránh lỗi làm tròn JavaScript IEEE 754).
2. [`manage/src/lib/quantityRules.ts`](file:///d:/thuc_pham_so_mot/.codex-worktrees/phase0-security/manage/src/lib/quantityRules.ts): Utility dùng chung trong POS và quản lý hàng hóa.
3. [`order-webapp/src/lib/quantityRules.ts`](file:///d:/thuc_pham_so_mot/.codex-worktrees/phase0-security/order-webapp/src/lib/quantityRules.ts): Utility dùng chung trên Website đặt hàng.
4. [`tps1-miniapp/src/utils/quantityRules.ts`](file:///d:/thuc_pham_so_mot/.codex-worktrees/phase0-security/tps1-miniapp/src/utils/quantityRules.ts): Utility dùng chung trên Zalo Mini App.
5. [`app/api/admin/products/import-specs/route.ts`](file:///d:/thuc_pham_so_mot/.codex-worktrees/phase0-security/app/api/admin/products/import-specs/route.ts): API tải file mẫu Excel (GET) và xử lý import quy cách 2 bước (POST preview & commit) với báo cáo chi tiết lỗi từng dòng và partial commit.
6. [`manage/src/lib/phoneUtils.ts`](file:///d:/thuc_pham_so_mot/.codex-worktrees/phase0-security/manage/src/lib/phoneUtils.ts): Utility định dạng và kiểm tra số điện thoại chuẩn Việt Nam (10 số di động `03/05/07/08/09` hoặc 11 số cố định `02x`).
7. [`manage/src/pages/UsersPage.tsx`](file:///d:/thuc_pham_so_mot/.codex-worktrees/phase0-security/manage/src/pages/UsersPage.tsx): Màn hình Admin quản lý nhân viên, chức vụ, vai trò và phòng ban.
8. [`scratch/test_quantity_rules.mjs`](file:///d:/thuc_pham_so_mot/.codex-worktrees/phase0-security/scratch/test_quantity_rules.mjs): Unit test utility quy cách đặt hàng.
9. [`scratch/test_g1_api.mjs`](file:///d:/thuc_pham_so_mot/.codex-worktrees/phase0-security/scratch/test_g1_api.mjs): Unit test logic quy cách hàng hóa và tính toàn vẹn của Tuple Catalog.
10. [`scratch/test_g3_api.mjs`](file:///d:/thuc_pham_so_mot/.codex-worktrees/phase0-security/scratch/test_g3_api.mjs): Unit test logic hoàn thiện hồ sơ khách hàng và định dạng số điện thoại Việt Nam.
11. [`scratch/test_g4_api.mjs`](file:///d:/thuc_pham_so_mot/.codex-worktrees/phase0-security/scratch/test_g4_api.mjs): Unit test ràng buộc vai trò, chức vụ và phòng ban nhân viên.
12. [`scratch/test_pilot_readiness.mjs`](file:///d:/thuc_pham_so_mot/.codex-worktrees/phase0-security/scratch/test_pilot_readiness.mjs): Kịch bản kiểm thử nghiệp vụ và truy vấn CSDL thực tế (qua Supabase SDK và hàm nghiệp vụ) cho logic phân quyền Sale/Admin, tìm kiếm bổ sung quy cách kèm fallback an toàn, xác minh PATCH hàng loạt, xử lý lỗi từng dòng import quy cách và query phân trang server-side.

### 3.2. Tệp chỉnh sửa:
1. [`app/api/admin/products/route.ts`](file:///d:/thuc_pham_so_mot/.codex-worktrees/phase0-security/app/api/admin/products/route.ts): Bổ sung 4 trường quy cách sau RPC `search_products` theo danh sách ID kèm kiểm tra lỗi `specErr` và fallback an toàn; xác minh `min_order_qty > 0` và `order_step > 0` khi bật `enforce_order_step=true` hàng loạt; lọc theo `specFilter`, tính `specStats`, PATCH xác thực dữ liệu và xóa catalog cache.
2. [`app/api/customer/products/route.ts`](file:///d:/thuc_pham_so_mot/.codex-worktrees/phase0-security/app/api/customer/products/route.ts): Bổ sung 4 trường quy cách sau RPC `search_products` kèm kiểm tra lỗi `specErr` và fallback an toàn; nối 4 trường quy cách vào cuối tuple catalog khách hàng; export hàm `invalidateCustomerCatalogCache()`.
3. [`app/api/admin/customers/list/route.ts`](file:///d:/thuc_pham_so_mot/.codex-worktrees/phase0-security/app/api/admin/customers/list/route.ts): Chuyển toàn bộ tìm kiếm, lọc và phân trang xuống Supabase server query, tính toán 4 chỉ số thống kê (`stats`) chính xác trên toàn bộ tập dữ liệu trong scope.
4. [`app/api/admin/customers/[id]/route.ts`](file:///d:/thuc_pham_so_mot/.codex-worktrees/phase0-security/app/api/admin/customers/[id]/route.ts): Khóa quyền field-level: Sale chỉ sửa thông tin liên hệ khách được phân công; chỉ quyền phù hợp mới sửa hạng giá, công nợ, trạng thái, người phụ trách.
5. [`manage/src/pages/ProductsPage.tsx`](file:///d:/thuc_pham_so_mot/.codex-worktrees/phase0-security/manage/src/pages/ProductsPage.tsx): Thêm 4 cột quy cách, 4 thẻ thống kê tiến độ, chọn dòng hàng loạt, Modal Sửa nhanh, Modal Sửa hàng loạt, Modal Import Excel xử lý lỗi từng dòng và cảnh báo partial commit.
6. [`manage/src/pages/ProductDetailPage.tsx`](file:///d:/thuc_pham_so_mot/.codex-worktrees/phase0-security/manage/src/pages/ProductDetailPage.tsx): Thêm nhóm giao diện "Quy cách đặt hàng" kèm ví dụ sinh động và validation inline.
7. [`manage/src/pages/CustomersPage.tsx`](file:///d:/thuc_pham_so_mot/.codex-worktrees/phase0-security/manage/src/pages/CustomersPage.tsx): 4 thẻ thống kê hoàn thiện, huy hiệu trạng thái, phân trang server-side, Modal Sửa nhanh SĐT/Địa chỉ/Email, debounce search có AbortController.
8. [`manage/src/pages/CustomerDetailPage.tsx`](file:///d:/thuc_pham_so_mot/.codex-worktrees/phase0-security/manage/src/pages/CustomerDetailPage.tsx): Chuyển đổi thao tác cập nhật khách hàng sang dùng Server API `PATCH /api/admin/customers/[id]`, loại bỏ các lệnh ghi trực tiếp Supabase từ trình duyệt.
9. [`manage/src/pages/PosCreatePage.tsx`](file:///d:/thuc_pham_so_mot/.codex-worktrees/phase0-security/manage/src/pages/PosCreatePage.tsx): Áp dụng bước nhảy, số lượng tối thiểu và cảnh báo quy cách khi nhân viên tạo đơn POS.
10. [`manage/src/components/ProductSearchBox.tsx`](file:///d:/thuc_pham_so_mot/.codex-worktrees/phase0-security/manage/src/components/ProductSearchBox.tsx): Giải mã 4 trường quy cách và hiển thị badge quy cách trong dropdown tìm kiếm sản phẩm.
11. [`manage/src/App.tsx`](file:///d:/thuc_pham_so_mot/.codex-worktrees/phase0-security/manage/src/App.tsx): Đăng ký tuyến đường `/nhan-vien` với route guard quyền `admin.manage_staff`.
12. [`manage/src/layouts/SaleLayout.tsx`](file:///d:/thuc_pham_so_mot/.codex-worktrees/phase0-security/manage/src/layouts/SaleLayout.tsx): Thêm mục menu "Nhân viên & phân quyền" chỉ hiển thị cho tài khoản `admin`.
13. [`order-webapp/src/lib/api.ts`](file:///d:/thuc_pham_so_mot/.codex-worktrees/phase0-security/order-webapp/src/lib/api.ts): Mở rộng interface `Product` và kiểu tuple catalog 12 phần tử.
14. [`order-webapp/src/pages/ProductsPage.tsx`](file:///d:/thuc_pham_so_mot/.codex-worktrees/phase0-security/order-webapp/src/pages/ProductsPage.tsx): Giải mã phần tử 8-11, khởi tạo số lượng theo `minOrderQty`, kiểm tra giỏ hàng trước khi đặt.
15. [`order-webapp/src/pages/CartPage.tsx`](file:///d:/thuc_pham_so_mot/.codex-worktrees/phase0-security/order-webapp/src/pages/CartPage.tsx): Hiển thị quy cách từng món, stepper theo `orderStep`, inline alert cảnh báo và khóa nút thanh toán nếu có lỗi.
16. [`order-webapp/src/components/products/ProductCard.tsx`](file:///d:/thuc_pham_so_mot/.codex-worktrees/phase0-security/order-webapp/src/components/products/ProductCard.tsx): Hiển thị quy cách dưới tên sản phẩm, tăng giảm theo bước.
17. [`order-webapp/src/components/products/CartSummarySidebar.tsx`](file:///d:/thuc_pham_so_mot/.codex-worktrees/phase0-security/order-webapp/src/components/products/CartSummarySidebar.tsx): Tương tự, kiểm tra số lượng và cảnh báo trong sidebar giỏ hàng.
18. [`order-webapp/src/components/products/CartCheckoutDrawer.tsx`](file:///d:/thuc_pham_so_mot/.codex-worktrees/phase0-security/order-webapp/src/components/products/CartCheckoutDrawer.tsx): Tương tự, kiểm tra số lượng trong drawer giỏ hàng.
19. [`tps1-miniapp/src/types.d.ts`](file:///d:/thuc_pham_so_mot/.codex-worktrees/phase0-security/tps1-miniapp/src/types.d.ts): Mở rộng type `Product` với 4 trường quy cách.
20. [`tps1-miniapp/src/utils/catalog.ts`](file:///d:/thuc_pham_so_mot/.codex-worktrees/phase0-security/tps1-miniapp/src/utils/catalog.ts): Ánh xạ 4 trường quy cách từ API catalog vào Zalo Mini App.
21. [`tps1-miniapp/src/components/quantity-input.tsx`](file:///d:/thuc_pham_so_mot/.codex-worktrees/phase0-security/tps1-miniapp/src/components/quantity-input.tsx): Hỗ trợ bước nhảy thập phân và làm tròn 3 chữ số thập phân.
22. [`tps1-miniapp/src/components/product-item.tsx`](file:///d:/thuc_pham_so_mot/.codex-worktrees/phase0-security/tps1-miniapp/src/components/product-item.tsx): Hiển thị quy cách và bước nhảy trên thẻ sản phẩm.
23. [`tps1-miniapp/src/pages/catalog/product-detail.tsx`](file:///d:/thuc_pham_so_mot/.codex-worktrees/phase0-security/tps1-miniapp/src/pages/catalog/product-detail.tsx): Hiển thị hướng dẫn quy cách và validation trước khi thêm vào giỏ.
24. [`tps1-miniapp/src/pages/cart/cart-item.tsx`](file:///d:/thuc_pham_so_mot/.codex-worktrees/phase0-security/tps1-miniapp/src/pages/cart/cart-item.tsx): Cảnh báo trực tiếp trên từng mục hàng trong giỏ Mini App.
25. [`tps1-miniapp/src/pages/cart/pay.tsx`](file:///d:/thuc_pham_so_mot/.codex-worktrees/phase0-security/tps1-miniapp/src/pages/cart/pay.tsx): Khóa nút gửi đơn nếu giỏ hàng còn dòng sản phẩm vi phạm bước nhảy.
26. [`tps1-miniapp/src/hooks.ts`](file:///d:/thuc_pham_so_mot/.codex-worktrees/phase0-security/tps1-miniapp/src/hooks.ts): Bổ sung kiểm tra quy cách trong hook `useCheckout()`.

---

## 4. Kết quả Build và Kiểm thử

### 4.1. Kết quả Build toàn bộ 4 dự án
| Dự án | Lệnh thực thi | Kết quả | Ghi chú |
| :--- | :--- | :---: | :--- |
| **Repo gốc (Next.js API)** | `cmd /c "npm run build"` | ✅ PASS (code 0) | Turbopack compile thành công, sitemap sinh đủ |
| **Quản trị (`manage`)** | `cmd /c "npm run build"` | ✅ PASS (code 0) | TypeScript `tsc -b` & Vite build 0 lỗi |
| **Website (`order-webapp`)** | `cmd /c "npm run build"` | ✅ PASS (code 0) | Service Worker injectManifest & PWA sinh đủ |
| **Zalo Mini App (`tps1-miniapp`)** | `cmd /c "npx vite build"` | ✅ PASS (code 0) | Đóng gói www thành công |

### 4.2. Kết quả Kiểm thử Nghiệp vụ & Unit Tests

> [!NOTE]
> Kịch bản `scratch/test_pilot_readiness.mjs` thực thi kiểm thử nghiệp vụ và truy vấn CSDL thực tế qua Supabase SDK trực tiếp (không phải integration test qua HTTP route server daemon).

```bash
# 1. Kiểm thử nghiệp vụ Pilot Readiness trên CSDL thực tế (Direct DB & Business Logic)
node scratch/test_pilot_readiness.mjs
# -> PASS 100%:
#    - Field-level permission: Sale bị chặn 403 khi đổi hạng giá, công nợ, trạng thái, người phụ trách, pháp nhân; được phép sửa SĐT/địa chỉ khách mình phụ trách; chặn 403 khi sửa khách người khác.
#    - RPC search_products bổ sung đầy đủ 4 trường quy cách (packaging_note, min_order_qty, order_step, enforce_order_step) cho Website, Mini App và POS; có kiểm tra lỗi specErr và fallback an toàn.
#    - PATCH hàng loạt: Xác minh bắt buộc tất cả sản phẩm được chọn phải có min_order_qty > 0 và order_step > 0 khi bật enforce_order_step=true (kể cả khi payload không gửi 2 trường này).
#    - Import quy cách kiểm tra từng dòng, báo lỗi chi tiết, chặn commit khi 0 dòng hợp lệ, ghi nhận partial: true.
#    - Query khách hàng server-side khớp 100% với thống kê toàn bộ tập dữ liệu 283 bản ghi.

# 2. Kiểm thử quy tắc số lượng thuần
node --experimental-strip-types scratch/test_quantity_rules.mjs
# -> PASS 100%: min 0.5 / step 0.5 (nhận 0.5; 1.0; 1.5; từ chối 0.2 và 0.7); min 1 / step 1 (từ chối 0.25, 1.25); enforce=false nhận mọi số dương.

# 3. Kiểm thử API quy cách và Tuple Catalog
node scratch/test_g1_api.mjs
# -> PASS 100%: Tuple khách hàng 12 phần tử, Tuple admin 16 phần tử, chặn > 120 ký tự, chặn số âm.

# 4. Kiểm thử hoàn thiện khách hàng & SĐT Việt Nam
node scratch/test_g3_api.mjs
# -> PASS 100%: Nhận diện di động 10 số (03/05/07/08/09), cố định 11 số (02x), format chuẩn '0901 234 567', tính 4 thẻ thống kê và bộ lọc.

# 5. Kiểm thử phân quyền & phòng ban
node scratch/test_g4_api.mjs
# -> PASS 100%: Bắt buộc phòng ban cho nhân viên nghiệp vụ, cho phép admin toàn quyền, chặn role/position ngoài danh mục, lọc cảnh báo thiếu phòng ban.
```

---

## 5. Những việc chưa làm hoặc cần migration dữ liệu (Bàn giao Codex)

1. **Quy cách hàng hóa cho 5.295 sản phẩm**:
   - Hiện tại hệ thống đã sẵn sàng 100% công cụ: Giao diện sửa nhanh, sửa hàng loạt và Import Excel 2 bước đối chiếu theo SKU.
   - Tuân thủ nguyên tắc không tự ý sinh dữ liệu giả; đội ngũ vận hành TPS1 sẽ dùng file mẫu Excel tải từ màn hình để import dữ liệu quy cách thực tế từ nhà cung cấp.
2. **Gán phòng ban cho 3 tài khoản nhân viên hiện tại**:
   - Màn hình Quản lý nhân viên hiện đã có banner cảnh báo nổi bật kèm nút lọc nhanh; Admin chỉ cần mở màn hình `/nhan-vien` và chọn phòng ban phù hợp cho 3 tài khoản này.
3. **Bổ sung SĐT / Địa chỉ cho khách hàng**:
   - Nhân viên phụ trách hoặc Admin có thể dùng ngay 4 thẻ thống kê trên `/khach-hang` để lọc ra danh sách 238 khách thiếu SĐT và 249 khách thiếu địa chỉ, sau đó bấm "Sửa nhanh" để cập nhật ngay trong ca làm việc.

---

## 6. Xác nhận tuân thủ nguyên tắc bắt buộc

- [x] **Không sửa các file lõi bị cấm**: Xác nhận 100% không chạm vào `lib/order-price-book.ts`, `app/api/admin/orders/**`, `app/api/customer/order/route.ts`, `app/api/admin/orders/merge/**`, migration bảo mật/RLS/gộp đơn và các file UAT production.
- [x] **Không ghi trực tiếp Supabase từ trình duyệt**: Mọi thao tác cập nhật quy cách, hồ sơ khách hàng, tạo/sửa nhân viên đều đi qua Next.js Server API route có kiểm tra phân quyền (`verifyAdminAuth` và `can()`).
- [x] **Không chạy SQL hoặc migration trên production**: Mọi thay đổi đều dùng cấu trúc bảng và RPC hiện hữu.
- [x] **Không push, không merge, không deploy**: Tất cả mã nguồn giữ nguyên tại worktree nhánh `phase0-security` và dừng lại để Codex nghiệm thu.
