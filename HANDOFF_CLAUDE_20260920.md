# HANDOFF — TRẠNG THÁI DỰ ÁN TPS1 (cuối phiên 20/09/2026, Claude)
Đọc file này ĐẦU TIÊN khi bắt đầu phiên mới. Kế hoạch tổng: `KE_HOACH_GOLIVE_PILOT_10_DON.md` (có nhật ký tiến độ mục 9). Đặc tả chi tiết: `PHASE1_PLAN_DON_HANG_THU_MUA.md`. Việc giao Gemini + toàn bộ rà soát: `GIAO_VIEC_GEMINI_PHASE1.md` (mục 8–15).

## Mục tiêu
Ngày thử **10 đơn thật từ KiotViet** chạy hết vòng đời (nhập đơn → chốt giá → đơn tổng Thu mua → soạn → giao → xác nhận thực giao → hoàn thành + hóa đơn → thanh toán → khách xem). KiotViet vẫn là sổ chính. Chưa deploy gì lên production (chưa commit/push) — **chạy migration TRƯỚC, deploy code SAU**.

## Vai trò
Claude = lập kế hoạch + rà soát + tự làm gói lõi (OrderDetailPage, admin/orders/route.ts, order-finalize, MyOrderDetailPage, API). Gemini = triển khai UI/gói còn lại (POS, tìm kiếm, Đơn tổng, khách đặt hàng, Mini App). Anh (chủ) chạy SQL trên Supabase, cung cấp dữ liệu. **Claude KHÔNG chạy được DDL** (không có chuỗi kết nối DB; service-role key chỉ gọi được REST/RPC). Chỉ chạy DML/script khi anh cho phép rõ (đã cho phép nhập khách + chuyển ảnh, xong).

## Đã xong (đã kiểm chứng bằng API thật)
- Migration đã chạy: `20260910*`, `20260911*`, `20260920a`, `20260920` (intake), `20260920b` (tìm kiếm, 17 từ khóa OK ~165ms), `20260920c`, `20260920g` (thực giao), `20260920e` (yêu cầu điều chỉnh/hủy). Kiểm: `node --env-file=.env scripts/check-migration-status.mjs`.
- **Nhập 269 khách KiotViet** (tổng 282 tài khoản; mã `TPS1-<VIẾTTẮT>`; chưa có mật khẩu; 236 thiếu SĐT/địa chỉ; nợ KiotViet chỉ lưu tham chiếu `kiotviet_opening_debt`).
- **Chuyển ảnh về Supabase** (bucket `product-images`, `thumb_url` + `image_url`; gốc ở `image_url_original`): ~4.7k ảnh xong, còn 1 ảnh lỗi (xem `tmp/image_errors_20260920.json`; chạy lại `echo YES | node --env-file=.env scripts/backfill-product-images.mjs --apply --concurrency=2`).
- Code (chưa commit): API Đợt 2 (order-config, order, cancel, request-change, đơn tổng summary/export, bulk-confirm, customers list/assign-rep/change-code, order-cutoff, đăng nhập mã ngắn, **rate-limit đăng nhập** `lib/rate-limit.ts`), **P5 thực giao→hóa đơn** (`lib/order-reconcile.ts`, `POST /api/admin/orders/reconcile-delivery`, chốt chặn hoàn thành, UI trong OrderDetailPage), **WP6b** (API + panel duyệt + UI khách), POS API `admin/orders/create` (Gemini + Claude sửa: idempotencyKey, ngày giao hợp lệ, SL>0), Gemini xong P2/P3/P4 (POS, ProductSearchBox, DonTongPage).

## CẬP NHẬT TỐI 20/09 (sau rà soát Gemini P3/P4/P7/P8)
- Migration **19/19 đã chạy** (kể cả f, h). Gemini xong P2, P3, P4, P7 (DatHang webapp), P8/WP6 (track-adjustment, OrdersPage, POS lý do điều chỉnh). Real tsc: sale-webapp + root 0 lỗi. API nhân viên đã smoke-test chỉ-đọc OK.
- **Gemini vi phạm:** script scratch tạo 2 đơn thật + nhúng mật khẩu admin/token — Claude đã hủy 2 đơn, xóa file, ghi mục 16 giao việc. Anh nên đổi mật khẩu admin sau giai đoạn thử.
- **Còn thiếu:** Mini App (WP7 tps1-miniapp), hướng dẫn sử dụng, P8 script đối chiếu + kịch bản thử (Claude), Sentry, gán người phụ trách cho **281 khách chưa phân**, chưa ai bấm thử giao diện thật.

## VIỆC ĐANG CHỜ ANH (không tự làm được)
1. Chạy migration còn thiếu: **`20260920f_orders_external_ref.sql`** (POS ghi mã KiotViet — code POS đã dùng cột này), (`20260920h` auth_attempts đã chạy ✔) **`20260920d` CHỈ chạy lúc deploy** (đổi hàm đăng ký sang mã viết tắt).
2. Chọn 3–5 khách thử + ngày giao + kiểu giá (giá gốc/hạng VIP/hợp đồng riêng); gán người phụ trách khách theo nhóm (CustomersPage); tạo tài khoản nhân viên thu mua/kho/kế toán/sale 2; dọn tài khoản test cũ (`TPS1-100001/2/4`, `TPS1-F17B`… dùng `--ignore-existing` hoặc `is_active=false`).

## VIỆC CỦA CLAUDE — làm tiếp theo thứ tự
1. **Rà soát P3/P4 của Gemini (mới đọc báo cáo, CHƯA rà kỹ):** `ProductSearchBox.tsx`, `customer/products/route.ts` (đã dùng RPC ✔), `DonTongPage.tsx` (lưu ý: "đơn sạch" ở client chỉ = `pending && !isLate`, yếu hơn đặc tả; an toàn vì `bulk-confirm` tự chặn khách chưa xác thực/giá 0/vượt hạn mức — kiểm UI có hiện lý do `skipped` không), `SoanHangPage` lọc ngày giao, `PosCreatePage` (đã bỏ checkIsLate? dùng order-cutoff? gửi idempotencyKey?). Mở giao diện thật (dev: backend `npm run dev` cổng 3001 qua launch.json `tps1-next`; `sale-webapp` cổng 5173) để bấm thử.
2. **P8:** viết `scripts/pilot-compare.mjs` (đối chiếu mã KiotViet ↔ mã TPS1 qua `orders.external_ref`, tổng tiền, số dòng, chênh) + `docs/PHASE1_KICH_BAN_KIEM_THU.md` (kịch bản 10 đơn ở mục 6 kế hoạch lớn).
3. **P9 còn lại:** Sentry (cần tài khoản), hướng dẫn sử dụng theo vai trò, rollback.
4. Rà OrdersPage cho WP6b (badge "Có yêu cầu"), WP6 truy vết điều chỉnh (itemChanges + lý do), WP3 (DatHangPage: ngày giao/điểm giao/đếm ngược), WP7 Mini App — giao Gemini theo mục 13/15.
5. Trước khi commit/push: chạy cả 3 typecheck, đọc `git diff`, `git add` từng file (KHÔNG add `quanly`, `.next`, file dữ liệu/PII, `tmp/`), commit theo cổng (A: không cần code; B: deploy lần 1 sau khi POS+Đơn tổng+thực giao chạy thử nội bộ 2–3 đơn giả).

## Bẫy đã dính (đừng lặp lại)
- **Typecheck sale-webapp PHẢI dùng `npx tsc --noEmit -p tsconfig.app.json`** (lệnh `-p tsconfig.json` không kiểm gì). Root: `npx tsc --noEmit -p tsconfig.json` (bỏ qua lỗi cũ `.next/types`). Miniapp có 2 lỗi cũ không thuộc dự án này (`orders/index.tsx:50`, `state.ts:153`).
- **Không dùng `node -e "..."` có dấu backtick/`${}`** trong Bash (shell nuốt mất). Sửa file bằng công cụ Edit/Write, hoặc ghi script ra file rồi chạy.
- SQL không có DB để thử: `\b` trong Postgres là backspace (dùng `\y`); không escape regex thủ công (làm sạch từ khóa); mọi SQL mới phải được gọi thử bằng REST/RPC sau khi anh chạy.
- Bảng mới trong `public` PHẢI bật RLS (không policy). Khách hàng không có Supabase Auth → chỉ qua `/api/customer/**`. Không sửa RPC `customer_create_order`/`admin_create_order_full`/`admin_finalize_order_v2` (một phần định nghĩa nằm ở Dashboard); dùng trigger + UPDATE sau RPC, lỗi UPDATE không được làm mất đơn đã tạo.
- Env service-role thật: `SUPABASE_PRODUCTS_SERVICE_ROLE_KEY` (ưu tiên trước `SUPABASE_SERVICE_ROLE_KEY`). Repo `quanly` là repo riêng — không sửa. Vercel: thucphamsomot.vn và quanly là 2 project/2 repo khác nhau.
- Gemini hay: sót mục trong file giao việc, nói quá ("cùng công thức", "tsc pass"), viết SQL/regex sai, đổi hạ tầng dùng chung (bucket). Luôn rà kỹ SQL + yêu cầu "Chưa kiểm tra được" trong báo cáo.

## Quyết định đã chốt (đừng hỏi lại)
Chốt đơn 16:30 D-1 (giao CN/T2 → 17:00 Thứ Bảy), đơn trễ vẫn nhận + gắn cờ; không thêm status đơn; khách chọn điểm giao từ `customer_addresses`; khách chỉ tự hủy đơn `pending` trước giờ chốt, còn lại gửi **yêu cầu** — **sale đủ thẩm quyền duyệt hủy/điều chỉnh** (không cần Trưởng phòng), sale tự báo Thu mua (hệ thống sinh sẵn đoạn Zalo); mã khách `TPS1-<VIẾTTẮT>` đăng nhập được cả khi gõ ngắn; hóa đơn chỉ khi hoàn thành và **theo số thực giao** (phải xác nhận thực giao trước); Supabase là dữ liệu chính, KiotViet chỉ kéo về một chiều (WP9 sau); `sale` giữ quyền Soạn hàng + Áp giá hàng ngày + công nợ/báo cáo của khách mình.
