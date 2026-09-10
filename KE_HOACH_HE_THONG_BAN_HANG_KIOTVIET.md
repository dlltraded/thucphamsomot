# Kế hoạch & bối cảnh kỹ thuật — Hệ thống bán hàng TPS1 (thay thế KiotViet)

> File này là bản đầy đủ của kế hoạch, xuất từ Claude Project "TPS1" ngày 10/09/2026, để dùng làm bối cảnh khi mở một công cụ code (Claude Code, Cursor, Codex...) trực tiếp trên repo này. Đọc mục "BẮT ĐẦU TỪ ĐÂY" trước, phần còn lại là toàn bộ lịch sử phân tích/quyết định/bảo mật để tra cứu khi cần.

## BẮT ĐẦU TỪ ĐÂY (cho AI coding assistant / dev tiếp theo)

**Việc cần làm ngay: Giai đoạn A ở mục 13.3** — nền tảng đăng nhập & phân quyền hợp nhất. Chi tiết đầy đủ nằm ở mục 13.3 bên dưới, tóm tắt nhanh:

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

---

*Bản đầy đủ, có lịch sử cập nhật, được lưu trong Claude Project "TPS1" (`claude/ke-hoach-webapp-ban-hang-thay-kiotviet.md`) — file này là bản export tại thời điểm 10/09/2026 để mang theo khi làm việc trực tiếp trong repo bằng công cụ code.*
