# Kế hoạch & bối cảnh kỹ thuật — Hệ thống bán hàng TPS1 (thay thế KiotViet)

> File này là bản đầy đủ của kế hoạch, xuất từ Claude Project "TPS1" ngày 10/09/2026, để dùng làm bối cảnh khi mở một công cụ code (Claude Code, Cursor, Codex...) trực tiếp trên repo này. Đọc mục "BẮT ĐẦU TỪ ĐÂY" trước, phần còn lại là toàn bộ lịch sử phân tích/quyết định/bảo mật để tra cứu khi cần.

## BẮT ĐẦU TỪ ĐÂY (cho AI coding assistant / dev tiếp theo)

> **Cập nhật 10/09/2026:** Giai đoạn A-D đã xong, Giai đoạn E (khách tự đặt hàng + Excel) đã có bản đầu. **Việc cần làm tiếp theo ngay bây giờ là mục 14** — đối chiếu trực tiếp với KiotViet thật + file export thật, liệt kê khoảng trống cụ thể còn lại (giao hàng tự vận chuyển, import bảng giá hàng loạt, giao thiếu/dư theo dòng...) theo đúng thứ tự ưu tiên ở mục 14.5. Phần dưới đây (Giai đoạn A) là bối cảnh lịch sử, giữ lại để tra cứu.

**Việc cần làm ngay (lịch sử — đã hoàn tất): Giai đoạn A ở mục 13.3** — nền tảng đăng nhập & phân quyền hợp nhất. Chi tiết đầy đủ nằm ở mục 13.3 bên dưới, tóm tắt nhanh:

1. Migration mới trong `tps1-miniapp/supabase/migrations/` (đặt tên theo ngày, ví dụ `20260910_extend_admin_roles.sql`) mở rộng ràng buộc `admin_profiles.role` từ `check (role in ('admin','sale'))` sang thêm `'truong_phong'`, `'thu_mua'`.
2. Viết lại `app/api/sale-auth/route.ts`: thử xác thực nhân viên (`admin_profiles` + Supabase Auth, cơ chế thật đã có từ đợt vá bảo mật) trước; nếu không khớp, thử xác thực khách hàng qua RPC `verify_customer_login` (đang dùng cho Zalo Mini App); trả về `{ userType: 'staff' | 'customer', role, ...profile }`.
3. Gộp `sale-webapp/src/pages/LoginPage.tsx` thành một màn đăng nhập duy nhất (không hỏi trước "bạn là ai").
4. Sửa `sale-webapp/src/App.tsx`: hai bộ khung điều hướng theo `userType`/`role`, và route guard chặn cứng ở tầng router (không chỉ ẩn menu) — khách hàng gõ thẳng URL nội bộ như `/pos` phải bị redirect.
5. Test tối thiểu trước khi coi là xong: đăng nhập đúng/sai cho cả 4 role nhân viên + khách hàng; khách hàng gõ thẳng URL nội bộ bị chặn.

**Điều kiện tiên quyết cần xác nhận trước khi bắt đầu (rất quan trọng):**
- Kiểm tra `git status` trong repo — tính đến 09/09/2026, toàn bộ code vá bảo mật (`lib/admin-auth.ts`, `app/api/sale-auth/route.ts`, `sale-webapp/src/contexts/AuthContext.tsx` và các trang liên quan) và file migration `20260909_fix_critical_rls_holes.sql` vẫn đang là **thay đổi local chưa commit** (`sale-webapp/` thậm chí đang không được git track — kiểm tra lại `.gitignore` nếu thấy lạ). Cần commit + deploy code TRƯỚC, sau đó mới chạy migration bảo mật trên Supabase thật (đúng thứ tự ở mục 12.6) — nếu thứ tự đã bị đảo ngược thì cần rà lại production ngay.
- Đảm bảo migration bảo mật `20260909_fix_critical_rls_holes.sql` đã chạy trên đúng project Supabase production trước khi build thêm tính năng mới lên trên, để không xây tiếp trên nền còn lỗ hổng.
- `admin_profiles.role` hiện tại (trước khi làm Giai đoạn A) chỉ nhận `'admin'` hoặc `'sale'` — đã xác nhận trực tiếp trong `tps1-miniapp/supabase/migrations/20260824_admin_auth_rbac.sql` dòng khai báo `create table`.
- Schema `orders`/`order_items` hiện tại (đã xác nhận trực tiếp trong `20260812_central_orders.sql`) CHƯA có cơ chế tách nhiều dòng thanh toán cho 1 đơn — chỉ có `payment_method`/`payment_status` ở cấp cả đơn. Giai đoạn C (mục 13.5) cần bảng `order_payments` mới, chưa tồn tại.

**Nguyên tắc bắt buộc giữ khi code (xem đầy đủ ở mục 13.1):** mọi thay đổi schema/RLS/RPC phải nằm trong file migration, không chạy tay trên Supabase SQL Editor; mỗi giai đoạn xong phải có người dùng thật thử trước khi sang giai đoạn kế; không xoá quanly, chuyển dần từng phần theo mục 13.8.

---

## 1. KiotViet thực tế đang được dùng như thế nào

Gói KiotViet mà TPS1 Đồng Nai đang dùng có menu khá gọn: Tổng quan, Hàng hóa, Đơn hàng, Khách hàng, Báo cáo, Bán online, và nút Bán hàng riêng để mở màn hình bán (POS). Phần Hàng hóa chỉ có hai mục là Danh sách hàng hóa và Thiết lập giá; phần Báo cáo chỉ có Cuối ngày và Đặt hàng — cho thấy đây là gói cơ bản, nên phần lớn giá trị thực sự nằm ở màn hình bán hàng và cách tổ chức dữ liệu khách hàng/hàng hóa/công nợ.

Màn hình Bán hàng cho phép mở nhiều đơn cùng lúc trên các tab riêng, tìm hàng bằng phím tắt F3 hoặc quét mã vạch, có ba chế độ Bán nhanh, Bán thường và Bán giao hàng. Mỗi dòng hàng trong giỏ có mã hàng, tên, đơn vị tính đổi được (Kg, Gói, Hộp, Thùng...), số lượng và đơn giá sửa tại chỗ — giá khác giá mặc định được tô đỏ để nhận biết ngay là giá thương lượng riêng. Khi chọn khách hàng, hệ thống hiện ngay công nợ hiện tại của khách trên màn hình bán, và ở bước thanh toán tách rõ ba phần: khách trả ngay bao nhiêu, có thu hộ COD hay không, và phần còn lại tự động tính vào công nợ. Chế độ Bán giao hàng có thêm người nhận khác khách đứng đơn, địa chỉ giao chi tiết, khối lượng/kích thước kiện hàng, và lựa chọn dùng đối tác giao hàng của KiotViet hoặc tự giao bằng xe công ty. Màn hình Xử lý đặt hàng là một hàng đợi các đơn "Phiếu tạm" tìm được theo mã đơn, tên khách, ghi chú, mã/tên hàng và khoảng ngày.

Phần Hàng hóa quản lý khoảng 5.300 mã hàng với giá vốn, giá bán, tồn kho, số lượng khách đã đặt trước, ngày dự kiến hết hàng, nhà cung cấp, thương hiệu, định mức tồn tối thiểu/tối đa và thẻ kho lịch sử nhập/xuất. Thiết lập giá cho phép tạo nhiều bảng giá song song ngoài Bảng giá chung — đúng cơ chế bảng giá riêng theo hạng khách mà TPS1 cần. Phần Khách hàng quản lý theo mã, tên, số điện thoại, công nợ hiện tại, lọc theo nhóm khách và loại cá nhân/công ty.

## 2. Đối chiếu với những gì TPS1 đã có sẵn

TPS1 không bắt đầu từ số 0. sale-webapp (React + Vite + Supabase, đang là MVP) đã có PosCreatePage gần như bản sao màn hình Bán hàng KiotViet: chọn khách (tự điền người nhận/địa chỉ mặc định), tìm và thêm sản phẩm, thêm hàng ngoài hệ thống, sửa số lượng/đơn giá từng dòng, áp voucher, nhập chiết khấu/phí giao hàng, tạo đơn nháp qua RPC admin_create_order để khách xác nhận lại trên Zalo Mini App. OrdersPage/OrderDetailPage đã có đúng vòng đời trạng thái đơn và thanh toán. Bảng orders/order_items đã có customer_tier, discount_percent, delivery_type, nguồn đơn; vip_accounts đã có sẵn credit_limit, discount_tier — khung công nợ/hạng giá đã có ở tầng dữ liệu.

quanly (trang quản trị JS thuần, ~8.700 dòng) đang đảm nhiệm phần lớn vai trò "Quản lý" của KiotViet: sản phẩm, giá hợp đồng riêng theo khách, tài khoản VIP/hạng khách, đơn hàng, báo giá (quote.js dài 1.795 dòng), voucher, phân quyền, đồng bộ Google Sheets, Kanban theo dõi công việc.

Khoảng trống so với KiotViet: PosCreatePage chưa hiện công nợ/hạn mức khách dù dữ liệu credit_limit đã có; SoanHangPage (bảng soạn hàng) hiện chỉ đọc từ quotes "Đã chốt" nên bỏ sót đơn tạo qua orders/order_items; chưa có tồn kho thực trừ/cộng theo đơn; `orders` hiện chỉ có `payment_method`/`payment_status` ở cấp cả đơn, chưa có cơ chế tách một đơn thành nhiều phần thanh toán (trả ngay/COD/công nợ) như KiotViet; báo cáo mới dừng ở đếm số đơn trên Dashboard, chưa có báo cáo cuối ngày/doanh thu/công nợ.

## 3. Nền tảng phát triển

Lấy sale-webapp làm lõi chính để phát triển tiếp thành "Bán hàng TPS1", không viết lại từ đầu và không gộp vào website Next.js chính, vì đã có đúng khung React/Vite/Supabase nhẹ, tách biệt với website marketing, và PosCreatePage đã tái hiện đúng luồng nghiệp vụ quan trọng nhất. quanly giữ vai trò back-office cho các phần chưa kịp chuyển sang, chuyển dần từng phần khi ổn định.

## 4. Các quyết định đã chốt với sếp

Về mô hình khách hàng: tách biệt hẳn khách tiềm năng và khách chính thức, không gộp. leads/quotes chỉ còn dùng cho giai đoạn tư vấn/báo giá trước khi khách mua hàng lần đầu; một khi khách đã có tài khoản chính thức thì mọi thao tác bán hàng, giá, công nợ đều chạy qua VIP-ACCOUNTS — đúng mô hình KiotViet đang dùng, mỗi hạng khách (VIP0, VIP1, VIP2, VIP3...) gắn với một bảng giá riêng. quote.js/Kanban tiếp tục phục vụ khách tiềm năng nhưng không còn liên quan trực tiếp tới đơn hàng/kho/công nợ.

Về nhập liệu ban đầu: phòng thu mua chịu trách nhiệm nhập tồn kho ban đầu và bảng giá ban đầu cho toàn bộ mã hàng, IT hỗ trợ về công cụ và kỹ thuật.

Về mốc thời gian: deadline 2 tháng cho toàn bộ dự án, tính luôn giai đoạn chạy song song với KiotViet để đối chiếu số liệu trước khi cân nhắc ngừng hẳn KiotViet.

## 5. Phát hiện quan trọng khi xem file KiotViet anh gửi

Bảng `products` mà sale-webapp và Mini App đang dùng để tìm/bán hàng hiện chỉ có khoảng 500 sản phẩm mẫu (dữ liệu demo được nạp sẵn lúc mới dựng hệ thống), hoàn toàn khác với 5.295 mã hàng thật đang bán mỗi ngày qua KiotViet. Đây là việc cần làm sớm nhất, xem công cụ đã chuẩn bị sẵn ở mục 6.

## 6. Đồng bộ hàng hóa thật từ KiotViet vào Supabase — đã làm xong bản đầu

- `tps1-miniapp/supabase/migrations/20260909_products_inventory_sync.sql`: thêm cột tồn kho (stock_qty), định mức tồn nhỏ nhất/lớn nhất (min_stock/max_stock), giá vốn (cost_price), nhóm hàng gốc KiotViet (kiotviet_group), cột nguồn dữ liệu (data_source).
- `scripts/sync-kiotviet-products.mjs`: script Node đọc file .xlsx xuất từ KiotViet, khớp theo Mã hàng (sku), chạy nhiều lần không trùng, không ghi đè giá bán bằng 0, cảnh báo tồn kho âm (656 mã, ~12%), mặc định dry-run, cần thêm `--apply` mới ghi thật.
- File gốc lưu ở `data/imports/DanhSachSanPham_KV_2026-09-09.xlsx`.
- Cách chạy: `npm install` → `node --env-file=.env scripts/sync-kiotviet-products.mjs data/imports/DanhSachSanPham_KV_2026-09-09.xlsx` (xem trước) → thêm `--apply` để ghi thật, sau khi phòng thu mua đối soát cảnh báo tồn kho âm.
- 19/19 nhóm hàng KiotViet đã map sang category hệ thống; nhóm mới sẽ được script tự cảnh báo "chưa có trong CATEGORY_MAP".

## 7. Lỗ hổng đăng nhập admin mặc định (đã vá, chi tiết ở mục 12)

`sale-webapp/src/contexts/AuthContext.tsx` từng tự tạo phiên admin mặc định khi chưa đăng nhập — đã vá cùng lúc với chuỗi lỗ hổng nghiêm trọng hơn phát hiện thêm ở tầng backend/database (mục 12).

## 8. Hệ thống đăng nhập nhiều vai trò — chi tiết triển khai ở mục 13.3 (Giai đoạn A, việc cần làm ngay)

Hai hệ đăng nhập tách rời: nhân viên/admin dùng `admin_profiles` + Supabase Auth thật (role hiện chỉ `admin`/`sale`), khách hàng dùng `vip_accounts` + `verify_customer_login`. Không gộp hai bảng vật lý, chỉ gộp ở lớp đăng nhập/giao diện — xem đầy đủ ở mục 13.3.

## 9. Khách tự lên đơn bằng file Excel — chi tiết triển khai ở mục 13.7 (Giai đoạn E)

File mẫu 2 cột bắt buộc (Tên/Mã hàng, Số lượng) + Ghi chú tùy chọn; xử lý server-side, khớp mã → tên → gần đúng bằng `pg_trgm` (tối đa 3 gợi ý); tạo đơn qua `customer_create_order`, áp giá theo hạng khách; lưu file gốc vào Storage để đối chiếu tranh chấp.

## 10. Lộ trình 8 tuần — bảng chi tiết theo giai đoạn ở mục 13.10

| Tuần | Nội dung chính | Phụ trách |
|---|---|---|
| 1 | Đăng nhập hợp nhất (Giai đoạn A); bắt đầu đồng bộ catalog thật | IT/dev |
| 1-3 | Kiểm kê tồn kho thực tế, tổng hợp bảng giá theo hạng | Phòng thu mua (IT hỗ trợ) |
| 2-4 | Hàng hóa/tồn kho thật + bảng giá theo hạng (Giai đoạn B) | IT/dev + Thu mua |
| 3-4 | Hoàn thiện Bán hàng B2B: công nợ, 3 phần thanh toán, SoanHangPage, giao hàng (Giai đoạn C) | IT/dev |
| 4-5 | Công nợ & Báo cáo (Giai đoạn D) | IT/dev |
| 5-7 | Khách tự phục vụ + đặt hàng Excel (Giai đoạn E) | IT/dev |
| 7 | Chuyển dần khỏi quanly (Giai đoạn F) | IT/dev |
| 7-8 | Chạy song song, đối chiếu số liệu, đào tạo (Giai đoạn G, chạy xen suốt từ tuần 3) | Sale + Thu mua + IT |

## 11. Rủi ro cần theo dõi

Tiến độ kiểm kê tồn kho (tuần 1-3) là rủi ro lớn nhất, trễ sẽ kéo lùi cả chuỗi B→C→D→E. Khối lượng nhập liệu tăng khi chạy song song 2 hệ thống. Rà soát thủ công tách khách tiềm năng/khách chính thức. Dữ liệu bẩn phát sinh khi đối soát catalog thật (đơn vị tính không đồng nhất, tên trùng). Thói quen chạy SQL tay ngoài migration — đã siết lại quy trình. Rủi ro mới: vừa xây tính năng vừa chuyển dần khỏi quanly có thể gây lệch dữ liệu tạm thời — xử lý bằng nguyên tắc "một nguồn sự thật" ở mục 13.1/13.8.

## 12. Đã vá xong 2 đợt rà soát bảo mật toàn hệ thống (09/09/2026)

### 12.1 Mức độ nghiêm trọng (đợt 1)

Ba lỗ hổng độc lập cho phép **bất kỳ ai có "anon key" công khai** (lấy được từ DevTools trình duyệt), không cần đăng nhập:
1. Đọc/sửa/xóa toàn bộ `vip_accounts` và `orders` qua REST API trực tiếp — do 2 policy RLS thiếu `to <role>`, vô tình áp dụng cho mọi người.
2. Gọi trực tiếp các hàm quản trị nội bộ không cần đăng nhập — nghiêm trọng nhất `admin_reset_customer_password`: biết mã đối tác (VD "VIP001") là đặt lại được mật khẩu khách đó.
3. Đăng nhập giả vào sale-webapp: tự động thành admin khi chưa đăng nhập; `/api/sale-auth` không kiểm tra mật khẩu; token tĩnh `"19871988"` hardcode làm cửa sau ở nhiều nơi backend/frontend.

### 12.2 Đã sửa (đợt 1)

**Supabase** (migration `20260909_fix_critical_rls_holes.sql`, cần xác nhận đã chạy đúng thứ tự — xem 12.6): xóa 2 policy RLS sai; thu hẹp policy đọc `admin_profiles`; thêm policy còn thiếu cho `order_items`/`order_history`; thu hồi quyền `anon` trên các hàm `admin_*`.

**Code** (đã sửa trong source, cần xác nhận đã commit/deploy — xem cảnh báo ở đầu file này): `lib/admin-auth.ts` bỏ token mặc định; `app/api/sale-auth/route.ts` viết lại xác thực thật; `app/api/admin/order-confirmation/route.ts` sửa cùng lỗi; `sale-webapp/src/contexts/AuthContext.tsx` bỏ phiên admin giả; `LoginPage.tsx`/`OrdersPage.tsx`/`OrderDetailPage.tsx`/`PosCreatePage.tsx` thay token tĩnh; `.env.example`/`README.md` bỏ gợi ý giá trị cũ.

### 12.5 Đợt 2 — rà soát mở rộng toàn hệ thống

Phát hiện thêm 4 lớp lỗ hổng độc lập, đã vá cùng trong migration `20260909_fix_critical_rls_holes.sql`:

1. **`products`/`quotes`/`quote_history` mở toang từ gốc** (GRANT bảng cho `anon` + policy `using(true)` trong `supabase-schema.sql`) — đã thu hồi quyền ghi của anon, giữ đọc công khai cho `products`.
2. **`customer_contract_prices` mở toang** — đã giới hạn chỉ admin/sale phụ trách khách đó.
3. **4 hàm RPC lộ cho anon ngoài migration chính thức**: `sale_update_order`, `create_vip_account`, `sale_get_customers`/`sale_get_orders` (lỗi thiết kế tin tham số `p_role` do client tự khai) — đã đổi sang quét theo quyền thực tế + whitelist hàm khách hàng an toàn.
4. **`app/api/webhook/new-order/route.ts` fail-open** — đã sửa fail-closed.

An toàn, không cần sửa: toàn bộ `app/api/customer/**`, `payment/notify`, `create-order-mac`, các route `app/api/admin/**` còn lại.

Chưa sửa (mức thấp hơn): `send-zns-lead`/`send-zns-quote`/`zalo-webhook` thiếu rate-limit — cần hạ tầng Redis/KV.

Cần tự kiểm tra: bucket Storage `order-confirmations` — public hay private, không kiểm tra được từ xa.

### 12.6 Thứ tự áp dụng bắt buộc

1. Nhân viên dùng lại đúng email đã có ở quanly để đăng nhập (không cần tài khoản mới).
2. **Deploy code trước** (git push / Vercel).
3. **Ngay sau đó chạy migration `20260909_fix_critical_rls_holes.sql`** trên Supabase — không đảo thứ tự.
4. Kiểm tra bucket `order-confirmations` trên Dashboard.
5. Định kỳ chạy lại câu lệnh tự-kiểm-tra quyền `anon`.

### 12.7 Chưa làm (nằm ngoài phạm vi vá bảo mật)

Gộp đăng nhập khách hàng, mở rộng role, rate-limit ZNS/webhook, kiểm tra bucket Storage, đồng bộ catalog thật `--apply`, và toàn bộ mục 13 — đây chính là việc cần làm tiếp theo.

## 13. Kế hoạch chi tiết xây dựng hệ thống chuyên nghiệp giống KiotViet (10/09/2026)

### 13.1 Nguyên tắc xuyên suốt

- **sale-webapp là lõi duy nhất.** Mọi vai trò đăng nhập chung một chỗ, phân quyền bằng route guard.
- **quanly không bị khai tử ngay.** Chuyển từng chức năng theo Giai đoạn F, giữ chạy song song tới khi ổn định 1-2 tuần.
- **Mỗi thời điểm, mỗi loại dữ liệu chỉ có một "nguồn sự thật".** Tránh sửa ở hai nơi rồi lệch nhau.
- **Mọi thay đổi schema/RLS/RPC qua file migration**, review trước khi chạy — không chạy tay trên SQL Editor.
- **Không "big bang".** Mỗi giai đoạn phải dùng thử thật trước khi làm giai đoạn kế.
- **Chạy song song với KiotViet tới khi số liệu khớp ổn định.**

### 13.2 Kiến trúc & mô hình dữ liệu mục tiêu

| Nhóm | Hiện có | Cần bổ sung |
|---|---|---|
| Khách hàng | `vip_accounts` (`credit_limit`, `discount_tier`, `sales_rep_id`) | Không cần bảng mới, dùng đúng cột đã có ở Giai đoạn C |
| Nhân viên | `admin_profiles` (role chỉ `admin`/`sale`) | Mở rộng `check` thêm `truong_phong`, `thu_mua` |
| Sản phẩm | `products` (+ `stock_qty`, `min_stock`, `max_stock`, `cost_price`) | Bảng `product_tier_prices` (product_id, tier, price) — ưu tiên thấp hơn `customer_contract_prices`, cao hơn giá gốc |
| Đơn hàng | `orders` (`payment_method`, `payment_status` cấp cả đơn) | Bảng `order_payments` (order_id, method, amount, note, created_by, created_at) + cột tổng hợp `paid_amount`/`debt_amount` trên `orders` |
| Tồn kho | `products.stock_qty` (cột tĩnh, sửa tay) | Bảng `inventory_transactions` (product_id, order_id nullable, type: in/out/adjust, quantity, note, created_by, created_at); `stock_qty` trở thành giá trị tổng hợp qua trigger/RPC |
| Báo cáo | chưa có | SQL view từ `orders`/`order_items`/`order_payments`, chưa cần bảng riêng |

### 13.3 Giai đoạn A — Nền tảng đăng nhập & phân quyền hợp nhất (BẮT ĐẦU TỪ ĐÂY)

**Việc làm:** migration mở rộng `admin_profiles.role` thêm `truong_phong`, `thu_mua`; viết lại `/api/sale-auth` thử nhân viên rồi khách hàng, trả `{userType, role}`; gộp `LoginPage.tsx` thành một màn; `App.tsx` có 2 bộ khung điều hướng + route guard chặn cứng ở router.

**Test tối thiểu:** login đúng/sai cho từng role; khách hàng chỉ thấy 2 mục Đặt hàng/Đơn hàng của tôi; khách gõ thẳng URL nội bộ bị chặn; thử đủ 4 role nhân viên.

**Tiêu chí hoàn thành:** 1 sale thật login lại bằng email quanly cũ, làm được 1 đơn end-to-end; 1 khách VIP thật login vào sale-webapp (không chỉ Zalo Mini App) thấy đơn của mình.

### 13.4 Giai đoạn B — Hàng hóa thật, tồn kho, bảng giá theo hạng

Chạy sync đã có (dry-run → đối soát cùng thu mua → `--apply`); migration `product_tier_prices` + `inventory_transactions`; trang "Hàng hóa" trong sale-webapp (lọc/tìm, sửa giá theo hạng, sửa tồn kho qua `inventory_transactions`, cảnh báo dưới `min_stock`); điểm trừ tồn kho = lúc khách xác nhận đơn (không trừ lúc tạo đơn nháp); hàm tính giá ưu tiên: `customer_contract_prices` → `product_tier_prices` theo `discount_tier` → giá gốc.

**Tiêu chí hoàn thành:** PosCreatePage tìm ra sản phẩm thật; tạo đơn xác nhận xong tồn kho trừ đúng; đổi hạng khách thấy giá tự đổi.

### 13.5 Giai đoạn C — Hoàn thiện Bán hàng B2B chuẩn KiotViet

PosCreatePage hiện công nợ/hạn mức khi chọn khách; migration `order_payments`, tách 3 phần thanh toán (trả ngay/COD/công nợ); chặn vượt hạn mức trừ khi `truong_phong` duyệt (ghi log); `SoanHangPage` đọc từ `orders`/`order_items` (status `confirmed` trở lên) thay vì chỉ `quotes`; hoàn thiện giao hàng (người nhận khác, khối lượng/kích thước, tự giao/đối tác) dùng cột `delivery_*` đã có.

**Tiêu chí hoàn thành:** đơn có công nợ, thanh toán tách đúng 3 phần, số dư công nợ đúng; SoanHangPage thấy đủ đơn từ cả 2 nguồn cũ/mới.

### 13.6 Giai đoạn D — Công nợ & Báo cáo

Trang "Công nợ khách hàng" (lịch sử đơn + `order_payments`, số dư, cảnh báo vượt hạn mức); báo cáo cuối ngày (doanh thu, số đơn, tiền mặt/chuyển khoản/COD/công nợ phát sinh) bằng SQL view + bảng đơn giản; báo cáo theo khách/mặt hàng/sale.

**Tiêu chí hoàn thành:** cuối 1 ngày bán thật, số trên báo cáo khớp sổ sách/KiotViet.

### 13.7 Giai đoạn E — Khách tự phục vụ trong hệ thống chung + đặt hàng bằng Excel

Trang "Đặt hàng" cho khách ngay trong sale-webapp (route guard giai đoạn A); tính năng Excel như mục 9 (upload → khớp mã/tên/gần đúng bằng `pg_trgm` → khách xác nhận → tạo đơn qua `customer_create_order`); Zalo Mini App và trang Đặt hàng cùng đọc/ghi 1 bảng `orders` duy nhất.

**Tiêu chí hoàn thành:** 1 khách VIP lớn đặt bằng Excel thật, đơn đúng số lượng/giá, sale xác nhận ngay được.

### 13.8 Giai đoạn F — Chuyển dần chức năng khỏi quanly

Sản phẩm/giá hợp đồng chuyển hẳn sang sale-webapp từ cuối B/C, quanly chuyển chỉ-đọc; voucher/phân quyền đánh giá riêng khi tới giai đoạn này; Kanban + quote.js giữ nguyên trong quanly lâu dài (ngoài phạm vi "giống KiotViet").

**Tiêu chí hoàn thành:** không ai cần mở quanly để sửa giá/sản phẩm/tồn kho trong vận hành hàng ngày.

### 13.9 Giai đoạn G — Kiểm thử, chạy song song, đào tạo

Chạy xen kẽ B-F, không dồn cuối. Từ Giai đoạn C trở đi, đối chiếu số liệu cuối mỗi ngày giữa webapp và KiotViet, ghi lại chênh lệch. Đào tạo theo từng đợt nhỏ khi tính năng ổn định.

### 13.10 Bảng timeline 8 tuần theo giai đoạn (bảng theo dõi chính)

| Tuần | Giai đoạn chính | Việc cụ thể | Phụ trách |
|---|---|---|---|
| 1 | A | Migration mở rộng role; `/api/sale-auth` hợp nhất; màn đăng nhập chung; route guard; bắt đầu đồng bộ catalog thật | IT/dev |
| 1-3 | (song song) | Kiểm kê tồn kho, tổng hợp bảng giá theo hạng | Phòng thu mua (IT hỗ trợ) |
| 2 | B | Migration `product_tier_prices` + `inventory_transactions`; trang Hàng hóa; hàm tính giá; `--apply` catalog thật | IT/dev + Thu mua |
| 3 | B→C | Cơ chế trừ/cộng tồn theo vòng đời đơn; PosCreatePage hiện công nợ/hạn mức | IT/dev |
| 3-4 | C | Migration `order_payments`; tách 3 phần thanh toán; chặn vượt hạn mức; sửa SoanHangPage; hoàn thiện giao hàng | IT/dev |
| 4-5 | D | Trang công nợ; báo cáo cuối ngày/doanh thu | IT/dev |
| 5-6 | E (bắt đầu) | Trang Đặt hàng tự phục vụ | IT/dev |
| 6-7 | E (hoàn tất) | Đặt hàng bằng Excel | IT/dev |
| 7 | F | Chuyển sản phẩm/giá hợp đồng khỏi quanly | IT/dev |
| 7-8 | G (chốt) | Chạy song song toàn diện, đối chiếu số liệu, đào tạo diện rộng | Sale + Thu mua + IT |

### 13.11 Rủi ro riêng của kế hoạch này

Phụ thuộc dây chuyền B→C→D→E: thu mua trễ (tuần 1-3) kéo lùi cả chuỗi. Điểm trừ tồn kho "lúc khách xác nhận" cần khớp thực tế vận hành (đơn nháp giữ chỗ lâu có thể gây lệch tạm thời) — theo dõi sát 1-2 tuần đầu. Giai đoạn F làm quá sớm trước khi sale-webapp ổn định sẽ gây gián đoạn — không rút ngắn thời gian dùng thử chỉ để chạy kịp lộ trình.

## 14. Đối chiếu trực tiếp với KiotViet thật + file export thật (10/09/2026)

> Nguồn: cào trực tiếp 5 màn hình KiotViet đang chạy thật của TPS1 (`Customers`, `PriceBook`, `Products`, `Orders`, `Sale/POS`) + 4 file Excel mẫu/export thật do sếp gửi (`MauFileBangGia.xlsx`, `MauFileImportSanPham.xlsx`, `BangGia_KV...xlsx` — 5.296 dòng, `BaoCaoDatHangTheoGiaoDich_KV...xlsx` — 8.101 dòng). Mục đích: xác nhận lại mục 13.2 bằng dữ liệu thật, chỉ ra khoảng trống schema/UI cụ thể còn lại sau Giai đoạn A-D, để hoàn thiện nốt Giai đoạn E theo đúng yêu cầu "đặt hàng như trang Sale KiotViet thật".

### 14.1 Những gì đã khớp đúng (không cần sửa)

- Cấu trúc báo cáo `app/api/admin/reports/sales-detail/export` (nhóm hàng → mặt hàng → đơn/khách) đã đúng đúng logic cột trong `BaoCaoDatHangTheoGiaoDich` thật (mã đơn, khách hàng, mã/tên hàng, đơn vị, số lượng, thành tiền theo dòng).
- Mô hình bảng giá theo hạng (`customer_contract_prices` ưu tiên hơn `product_tier_prices` ưu tiên hơn giá gốc) đúng thứ tự KiotViet thật dùng (giá hợp đồng riêng > bảng giá chung theo nhóm khách).
- Đa tab đặt hàng cùng lúc trong `PosCreatePage` đúng cơ chế "Đặt hàng 1/2/3..." của màn Sale thật.
- Quyết định giữ mặt hàng giá 0đ hiển thị với nhãn "Liên hệ báo giá" thay vì ẩn — khớp thực tế: KiotViet thật cũng có rất nhiều mã hàng "Giá bán = 0" (báo giá tại chỗ) lẫn trong danh sách 5.296 mã.

### 14.2 Khoảng trống mới phát hiện — ưu tiên cao (nên làm trước khi coi Giai đoạn E là xong)

1. **Giao hàng tự vận chuyển thiếu dữ liệu vận đơn.** Màn Sale thật ở chế độ "Bán giao hàng" có: người nhận khác khách đứng đơn (đã có `delivery_name/phone/address`), **khối lượng (gram) + kích thước dài×rộng×cao**, **người giao hàng** (chọn tài xế nội bộ, VD "DOIXE"), **thu hộ tiền COD** (số tiền tài xế cần thu, tách khỏi tổng đơn), và với đối tác giao hàng ngoài thì có **mã vận đơn**. `orders` hiện chưa có cột nào cho khối lượng/kích thước/người giao/COD-tại-giao. Cần thêm vào `orders`: `package_weight_g numeric`, `package_dimensions text` (VD "10x10x10"), `assigned_driver text`, `cod_collect_amount numeric default 0`. Đây là phần TPS1 sẽ dùng nhiều nhất vì chủ yếu tự giao bằng xe công ty (đã ghi ở mục 1).
2. **Chưa theo dõi giao thiếu/giao nhiều đợt trên từng dòng hàng.** Đơn thật của KiotViet có cột số lượng dạng "đã đặt/đã giao" (VD "0.5/0") và báo cáo có cặp cột "SL Đã nhận / SL còn lại" — rất quan trọng với hàng tươi sống hay thiếu/dư so với đặt. `order_items` cần thêm `quantity_delivered numeric not null default 0`; cập nhật khi soạn hàng/giao hàng xác nhận số lượng thực giao, không bắt buộc bằng số lượng đặt.
3. **Thiết lập giá (PriceBook) chưa có luồng upload hàng loạt bằng Excel với công thức %.** File `MauFileBangGia.xlsx` thật cho thấy KiotViet cho upload file 5 cột (Mã hàng, Tên hàng, rồi N cột "Tên bảng giá X") để nạp nhiều bảng giá cùng lúc, và trong UI có **tùy chọn nhập theo công thức % từ giá vốn** thay vì gõ tay từng giá — đúng yêu cầu gốc của sếp ở brief ("up bảng giá... có option sử dụng công thức nhập % ra giá bán"). Hiện `ProductsPage`/`ProductDetailPage` chỉ sửa giá từng sản phẩm một hoặc import tồn kho, chưa có import bảng giá hàng loạt. Cần route mới `app/api/admin/products/import-pricebook` (đọc Excel, cột 1-2 là mã/tên để khớp SKU, các cột sau map vào `product_tier_prices` theo hạng khách hoặc số tiền cố định; hỗ trợ chế độ "% từ giá vốn" tính `giá vốn * (1 + %)` khi ô để trống).

### 14.3 Khoảng trống — ưu tiên trung bình (đưa vào Giai đoạn E nốt hoặc đầu Giai đoạn F)

4. **`products.last_import_price` (Giá nhập cuối) chưa tồn tại.** Cột thật trong `BangGia_KV` xuất ra riêng biệt với "Giá vốn" (giá vốn có thể là giá bình quân, giá nhập cuối là lần nhập gần nhất — thu mua dùng để so sánh biến động giá nhà cung cấp). `import-inventory` route đã có sẵn (nhập tồn kho từ Excel) — chỉ cần thêm cột `last_import_price numeric` vào `products` và set giá trị này mỗi lần route đó xử lý một dòng nhập kho có đơn giá.
5. **Khách hàng B2B thật giao hàng tới nhiều địa chỉ/chi nhánh khác nhau của cùng một công ty.** Quan sát trực tiếp trên đơn thật: cùng một mã khách hàng công ty (VD "HIEPPHATFOOD") có nhiều đơn giao tới các địa điểm khác nhau ("XƯỞNG G8", "NHÀ THIẾU NHI THÀNH PHỐ", "ASIA 2"...) — thực chất là nhiều địa chỉ giao con dưới 1 khách hàng lớn, đúng như tab "Địa chỉ nhận hàng" (bảng nhiều dòng) trong Khách hàng thật. `vip_accounts` hiện chỉ có 1 địa chỉ mặc định (`default_shipping_*`). Cần bảng mới `customer_addresses` (customer_id, label, address, contact_name, contact_phone, is_default) để một khách chọn đúng địa chỉ giao khi đặt hàng, thay vì luôn dùng địa chỉ mặc định hoặc gõ tay lại mỗi lần.
6. **3 chế độ bán khác nhau trên màn Sale/POS thật (Bán nhanh / Bán thường / Bán giao hàng) chưa có trong `PosCreatePage`.** Không phải 3 luồng dữ liệu khác nhau — cùng 1 `OrderTab`, chỉ khác mật độ thông tin hiển thị: "Bán nhanh" ẩn bớt phần khách hàng/giao hàng để lên đơn tại quầy cực nhanh, "Bán giao hàng" mới hiện đủ khối lượng/kích thước/người giao ở mục 14.2-1. Nên làm thành 1 thanh chuyển chế độ (giống thanh dưới cùng màn Sale thật) chỉ ẩn/hiện field trong cùng form, không tách route.

### 14.4 Khoảng trống — ưu tiên thấp (ghi nhận, chưa cần làm ngay)

7. **Phân cấp nhóm hàng 3 cấp** (`Nhóm hàng(3 Cấp)` trong báo cáo thật) — hệ thống hiện chỉ có `category` phẳng 1 cấp. Đổi sang cây 3 cấp là việc lớn, chỉ nên làm nếu sau này thu mua thấy báo cáo 1 cấp không đủ phân tích — không chặn Giai đoạn E/F.
8. **Nhập đơn hàng loạt cho nhiều khách trong 1 file** (khác với Excel tự đặt hàng của khách đã có) — cột `Mã khách hàng` trong `MauFileImportSanPham.xlsx` cho thấy KiotViet hỗ trợ nhân viên nhập sẵn đơn cho nhiều khách gọi điện đặt hàng trong cùng 1 file. Có giá trị nhưng không cấp thiết vì sale đã có `PosCreatePage` đa tab + khách đã có Excel tự đặt hàng riêng — để dành cho Giai đoạn F nếu sale thấy cần.
9. **"Thu khác"/"Chênh lệch giá"** trên báo cáo thật — có thể tính ra ngay ở tầng hiển thị report (chênh lệch = giá bán thực - giá niêm yết) mà không cần cột DB mới; chỉ cần khi làm lại báo cáo mới nên thêm 2 cột này vào Excel export nếu sếp thấy cần đối chiếu với thu mua.

### 14.5 Đề xuất thứ tự làm tiếp (khớp vào Giai đoạn E đang dở + đầu Giai đoạn F)

| Việc | Vì sao ưu tiên | Loại thay đổi | Trạng thái |
|---|---|---|---|
| 14.2-1: cột giao hàng tự vận chuyển (khối lượng/kích thước/người giao/COD) | Đang là nhu cầu vận hành thật hằng ngày, TPS1 tự giao là chính | Migration + `PosCreatePage`/`OrderDetailPage` | ✅ Đã code xong 10/09/2026, **chờ chạy migration** `20260910f_delivery_fulfillment_lastprice.sql` |
| 14.2-3: import bảng giá hàng loạt bằng Excel (kèm công thức %) | Sếp yêu cầu trực tiếp trong brief, thu mua cần để nạp giá ban đầu nhanh | Route mới `import-pricebook` + UI trong `ProductsPage` | ✅ Đã code xong 10/09/2026 (không cần migration riêng, dùng lại `product_tier_prices`) |
| 14.2-2: `quantity_delivered` theo dòng | Cần cho báo cáo giao thiếu/dư chính xác | Migration nhỏ + UI trong `OrderDetailPage` (cột "Đã giao") | ✅ Đã code xong 10/09/2026, **chờ chạy migration** ở trên |
| 14.3-4: `last_import_price` | Rẻ, tận dụng route `import-inventory` có sẵn (đã thêm cột "Đơn giá nhập" vào mẫu) | Migration 1 cột | ✅ Đã code xong 10/09/2026, **chờ chạy migration** ở trên |
| 14.3-6: 3 chế độ hiển thị Bán nhanh/thường/giao hàng | Thuần UI, không chặn nghiệp vụ | Chỉ sửa `PosCreatePage` | ✅ Đã code xong 10/09/2026, không cần migration |
| 14.3-5: `customer_addresses` nhiều địa chỉ giao | Khách công ty lớn cần, nhưng có thể tạm dùng địa chỉ gõ tay trong lúc chờ | Bảng mới + UI chọn địa chỉ | ✅ Đã code xong 11/09/2026, **chờ chạy migration mới** `20260911_customer_addresses.sql` |

Mục 14.4 (7,8,9) không đưa vào lộ trình 8 tuần hiện tại, ghi nhận để cân nhắc sau khi chạy song song ổn định (Giai đoạn G).

## 16. Sửa luồng "Xử lý đơn hàng" + hoàn thiện Đơn hàng/Soạn hàng/Khách hàng (10/09/2026, vòng 2)

Sếp chỉ ra luồng "Xử lý đơn hàng" dựng trước đó (bản đầu, điều hướng sang OrderDetailPage) chưa đúng — đã cào lại trực tiếp thanh hành động thật ở cuối bảng chi tiết đơn KiotViet (`/man/#/Orders`, bấm 1 dòng): **Hủy | Sao chép | Xuất file | Xử lý đơn hàng | Lưu | Lưu | Kết thúc**, trong đó "Xử lý đơn hàng" mở đúng màn Sale/POS (`/sale/#/`) với đầy đủ dữ liệu đơn (kèm mã đơn để dễ theo dõi) — không phải màn chi tiết đơn giản.

**Đã sửa lại đúng theo luồng thật:**
- `PosCreatePage` nhận `?processOrderId=` (từ nút "Xử lý đơn hàng" ở OrdersPage/OrderDetailPage): nạp đơn có sẵn vào 1 tab mới (khách, giỏ hàng, giao hàng, kiện hàng), hiện banner + tên tab là mã đơn. Nút submit đổi thành "CẬP NHẬT & CHỐT ĐƠN {mã}" — gọi lại đúng endpoint chốt giá đã có (`admin_finalize_order_v2`/legacy line editor, chế độ `manual_item_price`) để SỬA đơn có sẵn, không tạo đơn mới; không đụng `admin_create_order`.
- `OrdersPage`: đổi từ dạng card sang **bảng + filter** đúng màn Đặt hàng KiotViet (cột Mã đơn/Thời gian/Khách hàng/Sale/SL/Khách cần trả/Đã trả/Trạng thái + dòng tổng ở đầu bảng), thêm bộ lọc theo ngày, nút **Xuất Excel** toàn bộ danh sách (route mới `app/api/admin/orders/export`, có branch `?orderId=` xuất chi tiết 1 đơn đúng cấu trúc file `ChiTietDatHang` thật của KiotViet).
- `OrderDetailPage`: thêm nút "Xử lý đơn hàng" (mở lại PosCreatePage ở chế độ trên) và nút "Xuất file" (Excel chi tiết đơn).
- `SoanHangPage` (Soạn hàng hôm nay): trước đây không xuất được gì — thêm nút Xuất Excel (route mới `app/api/admin/reports/packing-list/export`, 2 sheet: tổng hợp theo sản phẩm + chi tiết theo đơn/khách hàng).
- `CustomersPage`/`CustomerDetailPage` (trang mới): trước đây chỉ xem danh sách, không sửa được gì. Giờ bấm vào 1 khách mở trang sửa đầy đủ — tái dùng đúng các RPC **đã có sẵn và đang chạy thật trong quanly** (`admin_update_customer`, `admin_create_customer`, `admin_toggle_customer_active`, `admin_reset_customer_password`) để không viết trùng logic; thêm quản lý **bảng giá hợp đồng riêng** (`customer_contract_prices` — đã có bảng, chỉ thêm UI), thống kê số đơn/doanh thu/công nợ theo khách, danh sách đơn gần đây, và Xuất Excel toàn bộ khách hàng kèm thống kê (route mới `app/api/admin/customers/export`).
- **Xuất hóa đơn điện tử (VAT) cho khách B2B có mã số thuế: CHƯA làm** — cần tích hợp nhà cung cấp hóa đơn điện tử thật (MISA/VNPT/Viettel...), ngoài phạm vi có thể tự dựng. Đã lưu sẵn `tax_code` trên form khách hàng và cảnh báo rõ trong UI để không gây hiểu nhầm là đã xuất được hóa đơn thật.

Không cần migration mới cho vòng này — toàn bộ dựa trên bảng/cột/RPC đã có sẵn (kể cả các cột giao hàng/`quantity_delivered` thêm ở mục 14, đã có migration `20260910f_delivery_fulfillment_lastprice.sql` từ vòng trước, cần đã chạy).

**Việc cần làm để dùng được các mục đã ✅ ở trên:** chạy migration `tps1-miniapp/supabase/migrations/20260910f_delivery_fulfillment_lastprice.sql` trên Supabase SQL Editor (chỉ thêm cột mới, không đổi dữ liệu cũ, an toàn chạy bất kỳ lúc nào). Import bảng giá (14.2-3) không phụ thuộc migration này, dùng được ngay.

## 17. `customer_addresses` — nhiều địa chỉ giao hàng cho khách B2B (11/09/2026)

Hoàn tất mục 14.3-5 còn lại — bảng mới `customer_addresses` (migration `20260911_customer_addresses.sql`, RLS cùng nguyên tắc với `customer_contract_prices`: chỉ admin hoặc đúng sale phụ trách khách đó). `default_shipping_*` trên `vip_accounts` vẫn là địa chỉ mặc định, bảng này chỉ thêm các địa chỉ PHỤ (xưởng/bếp/chi nhánh khác của cùng 1 khách công ty).

- `CustomerDetailPage`: thêm/sửa/xóa địa chỉ, đánh dấu 1 địa chỉ ưu tiên (sao vàng).
- `PosCreatePage`: khi chọn khách, hiện các nút chip địa chỉ đã lưu ngay trên ô "Địa chỉ giao hàng" — bấm 1 phát điền cả địa chỉ + người nhận + SĐT, không cần gõ tay lại mỗi lần; áp dụng cả khi tạo đơn mới lẫn khi "Xử lý đơn hàng" đơn có sẵn.

**Việc cần làm:** chạy thêm migration `tps1-miniapp/supabase/migrations/20260911_customer_addresses.sql` (bảng hoàn toàn mới, không đụng dữ liệu cũ). Trang khách hàng/POS đã có code chờ sẵn — chưa chạy migration thì phần "Các địa chỉ giao hàng khác" chỉ hiện trống, không lỗi vỡ trang.

**Đến đây, toàn bộ mục 14 (đối chiếu KiotViet thật) đã hoàn tất phần code.** Việc còn lại ngoài phạm vi tự dựng: hóa đơn điện tử VAT (mục 16), và Giai đoạn F (chuyển dần khỏi quanly) + Giai đoạn G (chạy song song đối chiếu) theo lộ trình gốc mục 13.8/13.9 — chưa bắt đầu, nên làm sau khi sếp xác nhận các tính năng ở mục 14-17 chạy ổn định thực tế 1-2 tuần.

## 18. Hóa đơn bán hàng phát hành lúc "Hoàn thành" — tách khỏi phiếu tạm (11/09/2026)

Sếp chỉ ra đúng: chứng từ PDF cũ (`order_confirmation`, sinh ra lúc **chốt giá**) chỉ là **phiếu tạm** — khách có thể còn đổi ý/khiếu nại trước khi nhận hàng xong. Hóa đơn thật sự phải phát hành lúc đơn chuyển sang **"Hoàn thành"** (đã giao xong), và Mini App phải đồng bộ: chỉ cho xem hóa đơn khi đơn đã hoàn thành, không phải ngay khi chốt giá như trước.

**Đã làm — 2 loại chứng từ tách biệt hoàn toàn (khác `document_type` trong `order_documents`, không đè lên nhau):**
- `order_confirmation` (đã có từ trước) — phiếu tạm, sinh lúc chốt giá, không đổi.
- `invoice` (mới) — **Hóa đơn bán hàng**, tự động sinh khi PATCH đổi `status` sang `completed` (route `app/api/admin/orders` PATCH, hàm `createInvoiceDocument`), dùng template PDF mới `lib/sales-invoice-pdf.ts` — tiêu đề "HÓA ĐƠN BÁN HÀNG", có mã số thuế khách (nếu có), số đã thanh toán/còn nợ tại thời điểm hoàn thành. **Ghi rõ ở footer: không phải hóa đơn GTGT** — hệ thống chưa tích hợp nhà cung cấp hóa đơn điện tử thật (mục 16), tránh gây hiểu nhầm là chứng từ thuế hợp lệ.
- Migration mới `20260911b_completion_invoice.sql`: thêm cột `orders.invoice_document_status`.
- Nhân viên: nút "Tải hóa đơn" mới trong `OrderDetailPage` (chỉ hiện khi `status === 'completed'`), route tải mới `app/api/admin/orders/document` (dùng chung cho cả 2 loại chứng từ qua `?type=`). Có thể tạo lại hóa đơn qua PATCH `regenerateInvoice: true` nếu lần đầu lỗi.
- Khách hàng (Mini App): nút "Tải PDF xác nhận đơn hàng" cũ **giữ nguyên** (vẫn xem được ngay khi chốt giá — đúng vai trò phiếu tạm); thêm nút **"Tải hóa đơn"** mới, chỉ hiện khi `status === 'completed'`, gọi route mới `app/api/customer/order-invoice` (tự chặn 404 nếu đơn chưa hoàn thành, không dựa vào ẩn nút phía client). Sửa luôn 1 lỗi tiềm ẩn ở `app/api/customer/orders`: trước đây lấy nhầm chứng từ mới nhất theo `revision` mà không lọc `document_type`, có thể lấy lộn phiếu tạm/hóa đơn khi 2 loại trùng revision — giờ lọc riêng từng loại.

**Việc cần làm:** chạy thêm migration `tps1-miniapp/supabase/migrations/20260911b_completion_invoice.sql` (chỉ thêm 1 cột, an toàn). Không cần bảng mới — dùng lại đúng `order_documents`/bucket `order-confirmations` đã có.

## 19. "Soạn hàng" → "Xử lý đơn hàng" có nhận-soạn-xuất file rõ ràng (11/09/2026)

Trang Soạn hàng cũ chỉ xem tổng hợp thụ động, không ai "nhận" đơn nào nên dễ nhầm lẫn 2 người cùng soạn 1 đơn hoặc không ai soạn. Thiết kế lại theo đúng yêu cầu, chốt qua 2 câu hỏi với sếp:

**Trạng thái soạn hàng mới trên `orders`** (migration `20260911c_order_packing_workflow.sql`): `packing_status` (`not_started`/`in_progress`/`done`) + `packed_by` (ai đang soạn) + mốc thời gian nhận/xong. Mặc định `not_started` cho mọi đơn — an toàn, không đụng dữ liệu cũ.

**Luồng chuẩn:**
1. Nhân viên vào "Xử lý đơn hàng", thấy danh sách đơn đã xác nhận nhưng **chưa soạn xong** (lọc nhanh: Cần xử lý/Chưa soạn/Đang soạn/Đã soạn).
2. Chọn 1 hoặc nhiều đơn "Chưa soạn" → bấm **"Nhận soạn & xuất file"** → hệ thống gán `packed_by` = chính người đó, chuyển `in_progress` (khóa lại — người khác thấy "Đang soạn — Tên X", không chọn trùng được), đồng thời tải ngay 1 file Excel: sheet "Tổng hợp cần soạn" (gộp số lượng theo sản phẩm) + sheet "Danh sách đơn hàng" + **1 sheet riêng cho từng đơn** đã chọn (đúng yêu cầu).
3. Soạn xong ngoài kho, quay lại chọn đúng các đơn đó (đang hiện "Đang soạn — Tên mình") → bấm **"Đánh dấu đã soạn xong"** → chuyển `done`.
4. Cần đổi người soạn: **"Hủy nhận (trả đơn)"** — chỉ chính người đã nhận hoặc **Admin/Trưởng phòng** mới bấm được (đã chốt với sếp: nhân viên thường không giành được đơn của người khác, tránh dẫm chân).
5. "Xuất lại file" nếu lỡ mất bản in mà chưa muốn đổi trạng thái.

API mới: `app/api/admin/orders/packing` (claim/complete/release, tự chặn giành đơn sai người + báo rõ đơn nào bị bỏ qua và lý do); `app/api/admin/reports/packing-list/export` mở rộng thêm `?orderIds=` để xuất đúng các đơn vừa chọn với sheet riêng từng đơn (chế độ cũ theo khoảng ngày vẫn còn, không xóa).

**Việc cần làm:** chạy thêm migration `tps1-miniapp/supabase/migrations/20260911c_order_packing_workflow.sql`.

## 20. Xác thực khách hàng — làm rõ luồng cũ + thêm xác thực thủ công (11/09/2026)

Sếp nhắc đúng: hệ thống **đã có sẵn** cơ chế này từ trước (`register_customer_account`, `admin_finalize_order_v2` trong `20260813_vip0_order_finalization.sql`) — khách tự đăng ký qua web/Mini App luôn tạo ở `verification_status = 'pending'` (VIP0), tự động chuyển `'verified'` khi nhân viên **chốt giá đơn đầu tiên**. Cơ chế backend này vẫn nguyên vẹn, không sửa. Vấn đề là **sale-webapp mới (CustomersPage/CustomerDetailPage/PosCreatePage) chưa hề hiển thị trạng thái này** — nhân viên không biết khách nào mới, chưa xác minh.

**Đã bổ sung:**
- `CustomersPage`: cột "Xác thực" (badge Chờ xác thực/Đã xác thực/Đã từ chối) + nút lọc nhanh "Chờ xác thực (N)".
- `CustomerDetailPage`: thẻ "Xác thực khách hàng" riêng — hiện nguồn đăng ký (web/Mini App/nhân viên tạo), thời điểm đăng ký, ai/khi nào đã xác thực. Thêm nút **"Xác thực khách hàng"** / **"Từ chối"** để nhân viên xác minh thủ công **trước khi khách kịp đặt đơn** (ví dụ gọi điện xác minh) — không cần chờ có đơn hàng mới xác thực được như trước, đúng yêu cầu "tránh khách đặt đơn ảo". RPC mới `admin_verify_customer` (migration `20260911d_admin_verify_customer.sql`) — không sửa `admin_update_customer` đang chạy thật trong quanly.
- `PosCreatePage`: dropdown chọn khách hiện thêm "— chưa xác thực" nếu khách chưa xác minh; khi đã chọn, hiện cảnh báo màu vàng nhắc nhân viên kiểm tra kỹ trước khi lên đơn.

**Việc cần làm:** chạy thêm migration `tps1-miniapp/supabase/migrations/20260911d_admin_verify_customer.sql`.

## 21. Áp giá hàng ngày + xác nhận hàng loạt — bài toán 500 đơn/ngày (11/09/2026)

Vấn đề thật: xác nhận đơn chủ yếu là áp đúng giá cho mặt hàng để 0đ (thịt/hải sản tươi biến động giá mỗi ngày) — không thể mở tay từng đơn khi 1 ngày có hàng trăm đơn từ hàng trăm bếp. Đã chốt 3 quyết định với sếp trước khi làm:
1. Giá hàng ngày **không ghi đè** giá hợp đồng riêng (khách đã có giá riêng thì giữ nguyên).
2. Áp giá xong **chưa tự khóa đơn** — vẫn cần bấm "Xác nhận hàng loạt" riêng để rà soát trước.
3. Phạm vi áp giá **theo ngày cụ thể** (mặc định hôm nay), không gộp lẫn các ngày.

**Trang mới "Áp giá hàng ngày"** (`/ap-gia-hang-ngay`, `BulkPricingPage.tsx`) — luồng 2 bước đúng thứ tự sếp đề xuất ("cập nhật giá → xác nhận đơn hàng → soạn hàng"):
- **Bước 1 — Áp giá:** bảng liệt kê mọi mặt hàng xuất hiện trong đơn "chờ xác nhận" của ngày đã chọn (mặt hàng còn 0đ lên đầu), nhập giá 1 lần → RPC mới `admin_bulk_apply_price` (migration `20260911e_bulk_daily_pricing.sql`) tự lan ra **mọi dòng hàng cùng SKU** trong các đơn pending đúng ngày đó, dùng lại `resolve_product_price()` có sẵn nên khách có giá hợp đồng riêng tự động được giữ nguyên (đúng quyết định #1), khách theo hạng tự tính theo `product_tier_prices` hoặc giá vừa nhập. Chỉ cập nhật `order_items`, chưa đụng `orders.subtotal/grand_total` (đúng quyết định #2 — vẫn tạm tính).
- **Bước 2 — Xác nhận hàng loạt:** bảng đơn của ngày đó, đơn nào hết mặt hàng 0đ mới chọn được, bấm "Xác nhận hàng loạt" → route mới `app/api/admin/orders/bulk-finalize` lặp qua từng đơn, **dùng lại đúng lõi chốt giá đơn lẻ** (`finalizeOrderCore`, tách ra `lib/order-finalize.ts` để dùng chung với chốt giá 1 đơn ở OrderDetailPage/PosCreatePage — tránh viết 2 công thức tính tổng khác nhau, rủi ro sai lệch). Đơn nào lỗi/còn thiếu giá bị bỏ qua kèm lý do rõ ràng, không chặn các đơn còn lại.
- Sau khi xác nhận hàng loạt, đơn chuyển hẳn "Đã xác nhận" — sẵn sàng qua trang "Xử lý đơn hàng" (mục 19) để nhận soạn như bình thường, đúng luồng 3 bước sếp mô tả.

**Việc cần làm:** chạy thêm migration `tps1-miniapp/supabase/migrations/20260911e_bulk_daily_pricing.sql`.

## 22. `order-webapp` — kết quả build & test thật lần đầu (14/09/2026)

Cập nhật mục 14.9 (webapp đặt hàng RIÊNG cho khách hàng, tách khỏi `sale-webapp` nội bộ): bản đầu viết xong lúc môi trường bị chặn npm registry nên chưa từng chạy `npm install`/build. Hôm nay có terminal thật, đã chạy hết checklist bàn giao:

- `npm install` trong `order-webapp/`: sạch, 0 lỗi dependency (`react-router-dom@7.18.3`, `tailwindcss@4.3.3`, `vite@8.2.2`...).
- `npm run build`: phát hiện 1 lỗi — `tsconfig.app.json` dùng `baseUrl` (đã deprecated ở TypeScript 6). Đã sửa: bỏ `baseUrl`, giữ `paths: { "@/*": ["./src/*"] }` (đủ cho `moduleResolution: "bundler"`). Sau khi sửa, build sạch hoàn toàn, không còn type error nào khác — các interface `Product/Order/CustomerSession/ExcelMatchResult` viết từ trước khớp đúng response thật.
- Chạy song song `tps1-next` (cổng 3001, đúng cấu hình máy dev hiện tại — xem `.claude/launch.json` và comment trong `sale-webapp/vite.config.ts`) và `order-webapp` (cổng 5174, proxy `/api` → 3001).
- Test end-to-end bằng 1 tài khoản khách hàng **test tự tạo** qua RPC `admin_create_customer` (dùng `SUPABASE_SERVICE_ROLE_KEY`, không đụng khách thật — mã `TPS1-F17B`, tên "TEST Bàn giao order-webapp", cần dọn/deactivate sau khi hết dùng để test luồng xác nhận đơn phía sale):
  1. Đăng nhập mã/mật khẩu tạm → tự chuyển `/doi-mat-khau`, không vào được trang khác — đúng.
  2. Đổi mật khẩu → về `/`, session cập nhật `mustChangePassword: false` — đúng.
  3. Trang sản phẩm: tìm kiếm, lọc nhóm hàng, phân trang (test thấy 6 trang), hiển thị đúng "Liên hệ báo giá" cho hàng 0đ và "Tạm hết hàng" — đúng như đối chiếu KiotViet thật ở mục 14.1.
  4. Giỏ hàng → đặt hàng: tạo đơn `DH-20260914-000011` thành công; đã đối chiếu trực tiếp trong bảng `orders`/`order_items` thật (không qua UI sale-webapp vì không có tài khoản nhân viên) — dữ liệu lưu đúng, đầy đủ cột (`packing_status`, `debt_amount`, `pricing_mode`...), cùng schema nhân viên đang dùng.
  5. Đặt hàng bằng Excel: tải file mẫu qua `/api/customer/order/import-excel` — 200 OK.
  6. Đơn hàng của tôi + chi tiết đơn: hiển thị đúng, đơn còn "Chờ xác nhận" nên chưa có nút tải PDF — đúng thiết kế mục 18 (phiếu tạm chỉ sinh lúc sale chốt giá, chưa test được vì không có tài khoản sale).
  7. Trường hợp lỗi: sai mật khẩu → thông báo rõ ràng, không crash. Gọi `/api/customer/orders` không kèm cookie/token → 401 `"Vui lòng đăng nhập lại"`, không crash trắng trang.
- Không phát hiện lỗi console/network nào suốt quá trình test.

**Phát hiện thêm 1 lỗi nhỏ chưa có trong bàn giao gốc:** `order-webapp` không có route/catch-all cho path lạ (ví dụ gõ nhầm `/login` thay vì đúng `/dang-nhap`) — hiện ra trang trắng thay vì 404 hoặc tự chuyển về `/dang-nhap`. Chưa sửa (nằm ngoài checklist gốc), nên thêm 1 `<Route path="*">` redirect về `/` hoặc `/dang-nhap` trước khi deploy thật.

**Việc cần làm tiếp theo:** dọn tài khoản test `TPS1-F17B` sau khi không cần dùng nữa; test luồng sale xác nhận/chốt giá/soạn hàng cho đơn `DH-20260914-000011` cần tài khoản nhân viên thật; thêm route catch-all; sau đó mới deploy `order-webapp` lên Vercel domain riêng theo README.

## 23. Thiết kế lại giao diện khách hàng + PWA cài điện thoại + Web Push (14/09/2026, vòng 2)

Sếp yêu cầu: (1) giao diện `order-webapp` phải "có hồn", chuyên nghiệp, không như bản nháp cũ trông chung chung; (2) khách cài được lên điện thoại như app thật; (3) push notification 2 chiều để xử lý đơn nhanh. Đã chốt với sếp: dùng **PWA (Thêm vào màn hình chính)**, không đóng gói app native lên App Store/CH Play (nhanh, rẻ, không cần tài khoản Apple Developer).

**Thiết kế lại (`order-webapp`):**
- Vẽ minh hoạ SVG riêng [ProduceScene.tsx](../order-webapp/src/components/ProduceScene.tsx) (sọt rau củ + lá xanh cách điệu) thay cho các khối gradient mờ chung chung — không dùng ảnh stock ngoài để tránh vấn đề bản quyền.
- [LoginPage](../order-webapp/src/pages/LoginPage.tsx): layout 2 cột trên desktop (panel thương hiệu + minh hoạ bên trái, form kính mờ bên phải), gộp lại 1 cột có minh hoạ nền mờ trên mobile.
- [CustomerLayout](../order-webapp/src/layouts/CustomerLayout.tsx): chuyển hẳn sang app-shell mobile-first — thanh tab dưới cùng (Sản phẩm/Excel/Giỏ hàng/Đơn hàng) đúng cảm giác app cài trên máy, header gradient có lời chào tên khách.
- [ProductsPage](../order-webapp/src/pages/ProductsPage.tsx): đổi dropdown nhóm hàng thành chip cuộn ngang, thêm skeleton loading, hiệu ứng khi thêm giỏ hàng.
- Icon app tự vẽ bằng SVG + `sharp` (chữ "T1" gradient xanh thương hiệu, không cần ảnh ngoài) — sinh đủ bộ `favicon/apple-touch-icon/pwa-192/pwa-512/maskable`.

**PWA (cài lên điện thoại):** thêm `vite-plugin-pwa` (chiến lược `injectManifest`, cùng version `sale-webapp` đang dùng) + `manifest.webmanifest` (tên "Đặt hàng TPS1", theme xanh đậm, icon maskable cho Android) + meta tag `apple-mobile-web-app-*` cho iOS (iOS không đọc manifest tốt như Android, cần khai riêng). Khách bấm "Thêm vào màn hình chính" trên Safari/Chrome là có icon riêng, chạy full-screen như app thật.

**Web Push (thông báo cho khách hàng):**
- Migration mới `tps1-miniapp/supabase/migrations/20260914_push_subscriptions.sql` — bảng `push_subscriptions` + RPC `customer_save_push_subscription`/`customer_remove_push_subscription` (theo đúng khuôn RLS như các RPC `customer_*` khác, không phải `admin_*` nên không bị chặn bởi vòng revoke bảo mật 09/09).
- `lib/push.ts` (web chính) dùng thư viện `web-push` + VAPID key (đã sinh, lưu `.env`/`.env.example`, cần set trên Vercel prod) để gửi push thật.
- Route mới `app/api/customer/push-subscribe` (POST đăng ký/DELETE huỷ) + `app/api/push/vapid-public-key` (public, để order-webapp fetch key lúc đăng ký thay vì bake cứng lúc build).
- `app/api/admin/orders` PATCH: gửi push cho khách mỗi khi đơn chuyển `confirmed/shipping/completed/canceled` — không chặn response nếu gửi lỗi.
- `order-webapp/src/sw.ts` (service worker tự viết, Workbox `injectManifest`): nhận push, hiện notification, bấm vào mở đúng trang chi tiết đơn. Nút bật/tắt thông báo dạng chuông ở header ([NotificationBell.tsx](../order-webapp/src/components/NotificationBell.tsx)) — chủ động để khách bấm, không tự động xin quyền lúc mở app (tỉ lệ đồng ý thấp hơn nếu xin ngay).
- Đã test được: build sạch, `/api/push/vapid-public-key` trả đúng key, request đăng ký subscription đi đúng qua auth + RPC (lỗi 500 hiện tại là do **chưa chạy migration**, không phải lỗi code). Chưa test được luồng cấp quyền thật (`Notification.requestPermission()`) vì môi trường trình duyệt tự động dùng để test mặc định chặn quyền thông báo — cần test tay trên điện thoại/trình duyệt thật.

**Phía sale/admin — KHÔNG xây Web Push riêng:** phát hiện hệ thống **đã có sẵn** kênh Telegram cho đơn mới (`app/api/webhook/new-order/route.ts`, dùng Supabase Database Webhook trigger trên bảng `orders`) — chỉ là đang lỗi vì tham chiếu cột cũ `order.final_amount` (đã đổi tên thành `grand_total` từ trước). **Đã sửa lỗi này.** Telegram push đến điện thoại còn nhanh/ổn định hơn Web Push (không bị giới hạn như Safari/iOS), nên ưu tiên khôi phục kênh này thay vì xây trùng. **Việc cần làm:** vào Supabase Dashboard → Database → Webhooks, xác nhận webhook trỏ tới `/api/webhook/new-order` với header `x-webhook-secret` đúng giá trị `SUPABASE_WEBHOOK_SECRET`, bấm test thử (route có sẵn `GET ?test=1`). Nếu sau này sale vẫn muốn có nút bật thông báo ngay trong `sale-webapp` (không phải qua Telegram), có thể tái dùng đúng bảng/hàm `push_subscriptions` ở trên (`subject_type = 'staff'`), chỉ cần thêm UI + gọi `sendPushToCustomer`-style helper mới cho staff.

**Bug phát hiện ngoài phạm vi yêu cầu, đã sửa luôn vì chặn build thật:** `tsconfig.json` gốc thiếu `order-webapp` trong danh sách `exclude` (đã có `sale-webapp` từ trước) — khiến `next build` type-check nhầm vào cả code Vite của `order-webapp`, **làm hỏng hoàn toàn build production của web chính**. Đã thêm `order-webapp` vào exclude, `next build` chạy lại thành công.

**Việc cần làm để dùng được các mục ở trên:**
1. Chạy migration `tps1-miniapp/supabase/migrations/20260914_push_subscriptions.sql` trên Supabase SQL Editor.
2. Set `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT` trên Vercel (giá trị đã sinh, xem `.env` local — không commit giá trị thật vào git).
3. Xác nhận Supabase Database Webhook cho bảng `orders` đang trỏ đúng route Telegram (mục trên).
4. Test tay trên điện thoại thật: cài PWA (Thêm vào màn hình chính) + bấm nút chuông bật thông báo + đổi trạng thái 1 đơn test từ `sale-webapp` để xem thông báo có hiện không.
5. Nếu vẫn muốn Web Push riêng cho sale-webapp thay vì chỉ dùng Telegram, xác nhận lại — hạ tầng DB đã sẵn sàng mở rộng.

## 24. Hoàn thiện bảng giá hợp đồng riêng theo khách (14/09/2026, vòng 3)

Sếp đặt bài toán: cần chiết khấu % riêng theo hợp đồng (VD FORMUSA: CK 10% toàn bộ) VÀ đồng thời có mặt hàng chốt giá cố định tuyệt đối suốt hợp đồng, không phụ thuộc bảng giá chung (VD FORMUSA: thịt heo 100k/kg cố định 1 năm).

**Phát hiện quan trọng khi rà lại trước khi code:** hệ thống đã có sẵn ~80% hạ tầng nhưng bị đứt kết nối — không phải làm từ đầu:
- Bảng `customer_contract_prices` (customer_id, product_id, price, valid_until) đã tồn tại và đã được `resolve_product_price()` ưu tiên cao nhất — **đây chính là cơ chế đúng cho ca giá cố định (thịt heo FORMUSA), đã chạy đúng từ trước**, chỉ thiếu UI tốt.
- Cột `vip_accounts.contract_discount_percent` + `tier_expiry_date` đã có sẵn trên production và UI `CustomerDetailPage.tsx` (hạng "CUSTOM") đã cho nhập từ trước — nhưng đọc thẳng mã nguồn `resolve_product_price()` thì **hàm này chưa bao giờ đọc 2 cột đó**, chỉ tra theo `discount_tier` để join `product_tier_prices`. Hậu quả: khách gắn hạng CUSTOM + nhập % **không hề được áp giá gì cả**, luôn rớt về giá gốc — đúng là lỗ hổng gây ra bài toán sếp hỏi.
- Cả 2 cột này + RPC `admin_update_customer` đang chạy thật (18 tham số) đều **không nằm trong bất kỳ migration nào được theo dõi** — bị tạo tay ngoài quy trình từ trước (giống pattern rủi ro đã ghi trong sự cố bảo mật 09/09), file migration cũ nhất (`20260825_update_customer_rpc.sql`) chỉ có 16 tham số, thiếu 2 tham số hợp đồng.

**Đã làm — migration mới `tps1-miniapp/supabase/migrations/20260914b_contract_pricing.sql`:**
1. Chính thức hoá 2 cột trên (idempotent, không đổi dữ liệu — đã xác nhận chưa khách nào dùng, toàn bộ đang `null`).
2. Sửa `resolve_product_price()` — thêm bước "chiết khấu % theo hợp đồng" (tính trên giá bán chung, còn hạn theo `tier_expiry_date`) ngay sau giá cố định tuyệt đối, trước khi tra theo hạng VIP0-3. Thứ tự ưu tiên đầy đủ: **giá cố định riêng từng mặt hàng → % chiết khấu hợp đồng → giá theo hạng → giá bán chung**. Vì tính trên giá chung tại thời điểm gọi hàm (không snapshot), khách chiết khấu % tự động theo đúng biến động giá hàng ngày — khớp đúng công thức "% × bảng giá chung" sếp yêu cầu.
3. Viết lại `admin_update_customer` với đúng 18 tham số đang chạy thật (dùng vòng lặp xoá mọi overload cũ theo tên hàm trước khi tạo lại, tránh xung đột chữ ký nếu chạy lại migration từ đầu trên môi trường khác).
4. RPC mới `admin_bulk_set_contract_prices(customer_id, items jsonb)` — nhập hàng loạt giá cố định, mặc định hạn dùng theo `tier_expiry_date` của khách nếu dòng không ghi riêng (đã chốt với sếp: "mặc định theo hạn hợp đồng, cho sửa riêng khi cần").
5. Thêm unique constraint `(customer_id, product_id)` cho `customer_contract_prices` để `on conflict` hoạt động đúng khi nhập hàng loạt.

**Đã làm — route mới `app/api/admin/customers/import-contract-prices` (GET tải mẫu / POST nhập):** cùng khuôn với `import-pricebook` đã có — đọc Excel (Mã hàng, Giá cố định, Hết hạn tuỳ chọn), khớp SKU, gọi RPC ở trên.

**Đã làm — UI `CustomerDetailPage.tsx`:** thêm nút "Nhập Excel" trong card "Bảng giá hợp đồng riêng", lộ cột ngày hết hạn từng dòng ra ngoài giao diện (trước đây có sẵn trong DB nhưng ẩn, chỉ sửa được qua `prompt()` giá, không sửa được hạn).

**Quyết định đã chốt với sếp (14/09/2026):** 1 khách chỉ có 1 mức % chiết khấu chung cho toàn bộ hợp đồng (không chia theo nhóm hàng) — khớp đúng thiết kế cột `contract_discount_percent` hiện có, không cần đổi schema thêm.

**Ca FORMUSA áp dụng cụ thể:** gắn `discount_tier = CUSTOM`, `contract_discount_percent = 10`, `tier_expiry_date = <ngày hết hạn hợp đồng>` → toàn bộ mặt hàng khác tự động CK 10% trên giá chung mỗi ngày; riêng thịt heo thêm 1 dòng vào `customer_contract_prices` với `price = 100000` (không cần nhập `valid_until` nếu muốn dùng chung hạn hợp đồng) → dòng thịt heo này luôn thắng % vì được `resolve_product_price()` kiểm tra trước.

**Việc cần làm:** chạy migration `tps1-miniapp/supabase/migrations/20260914b_contract_pricing.sql` trên Supabase SQL Editor. Chưa test được thật (không có tài khoản sale/admin thật trong phiên làm việc này) — cần test tay: tạo 1 khách CUSTOM với % + 1 mặt hàng giá cố định, tạo đơn thử, xác nhận giá tính đúng theo cả 2 quy tắc.

---

*Bản đầy đủ, có lịch sử cập nhật, được lưu trong Claude Project "TPS1" (`claude/ke-hoach-webapp-ban-hang-thay-kiotviet.md`) — file này là bản export tại thời điểm 10/09/2026 (đã bổ sung mục 22 ngày 14/09/2026) để mang theo khi làm việc trực tiếp trong repo bằng công cụ code.*
