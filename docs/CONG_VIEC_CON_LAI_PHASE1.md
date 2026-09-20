# CÔNG VIỆC CÒN LẠI — PHASE 1 (bàn giao cho người triển khai nốt)

> Lập tối 20/09/2026 bởi Claude. Người nhận: Gemini / dev khác. **Claude sẽ rà soát lại toàn bộ sau khi xong** — nên mỗi việc bên dưới có "Tiêu chí xong" và mục "Báo cáo kèm theo". Đọc trước: `HANDOFF_CLAUDE_20260920.md` (bẫy đã dính + quyết định đã chốt), `KE_HOACH_GOLIVE_PILOT_10_DON.md` (kế hoạch + nhật ký), `docs/PHASE1_KICH_BAN_KIEM_THU.md` (kịch bản ngày thử), `GIAO_VIEC_GEMINI_PHASE1.md` (luật làm việc §8–§16).
>
> **Mục tiêu:** ngày vận hành thử **10 đơn thật lấy từ KiotViet**, chạy hết: nhập đơn → chốt giá → Đơn tổng gửi Thu mua → soạn → giao → xác nhận thực giao → hoàn thành + hóa đơn → thanh toán → khách xem chứng từ. KiotViet vẫn là sổ kế toán chính; TPS1 chạy song song để đối chiếu.

## 0. LUẬT BẮT BUỘC (đã có người vi phạm 1 lần)
1. **Không ghi dữ liệu lên hệ thống thật** (Supabase production) bằng script/curl để "thử". Muốn thử: dùng khách test `TPS1-100002`, ngày giao xa (vd 25/09), đánh dấu "ĐƠN THỬ", rồi hủy; và **báo cáo liệt kê mọi dữ liệu đã ghi**. Không sửa DB tay/không PATCH trực tiếp bảng đơn (đã bị hệ thống chặn; đi qua API).
2. **Không ghi mật khẩu/token/khóa vào file hay commit** (kể cả `.md`). Lần này mật khẩu admin đã lọt vào `docs/TAI_LIEU_BAN_GIAO_PHASE1.md` và `HANDOFF_CLAUDE_20260920.md`, đã bị đẩy lên GitHub (commit `eeb8360`) → **Việc P0-1 bên dưới**.
3. **Không sửa thư mục `quanly/`** (repo cũ, riêng). App mới = `sale-webapp` (dev) → **đồng bộ sang `manage/`** → repo `saigonmotor368/webapptps1` → Vercel `tps1manage` = `quanly.thucphamsomot.vn`. Đặt hàng = `order-webapp` → `dathang.thucphamsomot.vn`. API (Next.js) ở thư mục gốc → repo `dlltraded/thucphamsomot` → `thucphamsomot.vn`.
4. **Migration chạy TRƯỚC khi deploy code** (trừ `20260920d` chạy SAU khi API mới lên). Claude/dev không chạy được DDL (không có chuỗi kết nối DB) — anh chủ dự án chạy trong SQL Editor.
5. **Typecheck bắt buộc:** `sale-webapp`: `npx tsc --noEmit -p tsconfig.app.json` (lệnh `-p tsconfig.json` không kiểm gì). Gốc: `npx tsc --noEmit -p tsconfig.json` (bỏ lỗi cũ `.next/types`). `tps1-miniapp`: `npx tsc --noEmit -p tsconfig.json` (2 lỗi cũ được miễn: `orders/index.tsx:50`, `state.ts:153`). Trước khi đẩy: chạy thêm `npx next build` (gốc) và `npx vite build` (`manage`).
6. **Không dùng `node -e "..."` có backtick/`${}` trong Bash** (shell làm hỏng file). Viết script ra file.
7. Commit từng file (không `git add .`). Không đưa vào commit: `quanly`, `.next`, `tmp/`, file dữ liệu khách/PII (`*.xlsx`), `tsconfig.tsbuildinfo`.

## 1. ĐÃ XONG (đã kiểm chứng bằng chạy thật trừ khi ghi khác)

**Cơ sở dữ liệu** — migration `tps1-miniapp/supabase/migrations/20260920*` a–h **đã chạy** (kiểm bằng `node --env-file=.env scripts/check-migration-status.mjs` → 19/19). Chưa chạy: `d` (đúng kế hoạch, chạy sau deploy) và **`i` (mới)**. Script kiểm chưa phủ `d` và `i`.

**API (đã deploy, `origin/main`)** — ngày giao + giờ chốt 16:30 D-1 (giao CN/T2 → 17:00 Thứ Bảy) + cờ đơn trễ; tạo đơn tại quầy có idempotencyKey/ghi chú dòng/mã KiotViet; Đơn tổng (`procurement/summary|export`, `bulk-confirm`, `bulk-finalize`); xác nhận thực giao (`reconcile-delivery`); hóa đơn theo SL thực giao; hủy đơn hoàn kho; yêu cầu điều chỉnh/hủy của khách + duyệt của sale (kèm văn bản Zalo); khách list/gán phụ trách/đổi mã; tìm kiếm sản phẩm không dấu; giới hạn đăng nhập sai (8 lần/15 phút/mã, 40/IP).

**Giao diện `sale-webapp`→`manage`** — POS, Đơn tổng, Soạn hàng, chi tiết đơn (thực giao, duyệt yêu cầu), Khách hàng, "Đơn hàng của tôi" (hủy/yêu cầu), phân quyền theo vai trò. `manage` đã có `vercel.json` (SPA rewrite + proxy `/api`).

**Dữ liệu** — nhập 269 khách KiotViet (282 tài khoản); ảnh sản phẩm 4334/4337; **276 khách active gán cho sale Nguyễn Thái Hoà** (`30200f80-9182-481a-9611-80da14cdd216`).

**Đã thử đầu-cuối bằng API thật (20/09 tối, Claude)** — khách test `TPS1-100002`, dữ liệu từ file KiotViet `DanhSachChiTietDatHang_KV20092026`: tạo đơn khớp KiotViet từng đồng (213.500 / 2.817.930 / 381.530); Đơn tổng gộp đúng; chốt giá → soạn → giao → **xác nhận thực giao (giao thiếu, 349.500 → 297.350)** → hoàn thành + hóa đơn → thanh toán COD + thu công nợ → hết nợ. Đã xác nhận các chặn đúng: dòng giá 0đ không chốt được; chưa xác nhận thực giao thì không hoàn thành; báo cáo công nợ không tính đơn hủy. **Giao diện chưa ai bấm thật** (mới thử ở tầng API).

**Script** — `scripts/`: `import-kiotviet-customers.mjs`, `backfill-product-images.mjs`, `check-migration-status.mjs`, `create-staff-accounts.mjs` (dry-run mặc định; `--apply` do anh chạy, mật khẩu ngẫu nhiên chỉ hiện 1 lần), `pilot-compare.mjs` (chỉ đọc; đối chiếu file KiotViet ↔ `orders.external_ref`, in mốc thời gian).

**Gemini làm sau cùng, Claude CHƯA RÀ** (coi là chưa tin cậy đến khi rà): Mini App WP7 (`tps1-miniapp/src/**`: checkout ngày giao/điểm giao/ghi chú dòng, hủy/yêu cầu sửa-hủy, đặt lại giữ ghi chú); `docs/HUONG_DAN_*.md` (4 vai trò); `docs/TAI_LIEU_BAN_GIAO_PHASE1.md`; các commit `107590a` ("tăng tốc đặt hàng, hiện ảnh và **bỏ đối chiếu KiotViet**") và `60aeadf` ("tìm sản phẩm tức thì bằng catalog cục bộ"); `ed376c7` (`lib/apiBase.ts`, proxy `/api` trong `manage/vercel.json`). Cần kiểm: "bỏ đối chiếu KiotViet" bỏ cái gì, có phá `external_ref`/`pilot-compare` không; catalog cục bộ có lỗi thời giá/tồn/ảnh không, tìm tiếng Việt không dấu còn đúng không.

## 2. VIỆC CÒN LẠI — theo thứ tự ưu tiên

### P0 — làm ngay, chặn ngày thử
| # | Việc | Ai | Tiêu chí xong |
|---|------|----|---------------|
| P0-1 | **Đổi mật khẩu admin** (đã lộ trong git `eeb8360` và trong chat). Bản đã sửa file (bỏ mật khẩu) nằm trong commit cục bộ sau đó, nhưng lịch sử git vẫn còn — coi như lộ; nếu repo không private thì càng gấp. Cân nhắc dọn lịch sử chỉ khi anh chủ dự án đồng ý (force-push = việc riêng). | Anh chủ dự án | Đăng nhập được bằng mật khẩu mới; mật khẩu cũ vô hiệu |
| P0-2 | Chạy **`20260920i_order_items_allow_zero_qty.sql`** (cho phép dòng thực giao 0; hiện ràng buộc `order_items_quantity_check` (>0) làm "Xác nhận thực giao" lỗi khi giao 0). Sau đó thử lại giao 0 một dòng qua API/giao diện. | Anh chủ dự án (chạy SQL) + dev thử | Giao 0 một dòng thành công, tổng tiền tính lại đúng, dòng đó không lên hóa đơn |
| P0-3 | Chạy **`20260920d_customer_code_generation.sql`** (API mới đã lên). Rồi thử đăng ký khách mới: mã dạng `TPS1-<VIẾTTẮT>`, đăng nhập bằng cả mã ngắn. Bổ sung `d`, `i` vào `scripts/check-migration-status.mjs`. | Anh + dev | Đăng ký/đăng nhập khách mới đúng |
| P0-4 | **Xuất lại "Danh sách hàng hóa" từ KiotViet** và nhập bằng `scripts/sync-kiotviet-products.mjs` (dry-run trước, `--apply` sau, kèm sao lưu). Hiện danh mục thiếu **105 mã** trong các đơn giao 21/09 (file cũ 23/06); chỉ 28/110 đơn đủ hàng. | Anh (xuất file) + dev | Chạy lại phân tích: ≥ 95% đơn giao ngày thử đủ mã |
| P0-5 | Đảm bảo `tps1manage` (`quanly.thucphamsomot.vn`) đang chạy **bản mới** (repo `webapptps1` nhánh `main`; kiểm bằng `vercel ls tps1manage --scope sgm11`, và mở `/dang-nhap` bằng F5 không còn 404). Tài khoản Vercel `saigonmotor368` (team `sgm11`) thấy `tps1manage`, `orderwebapp`; **không** thấy dự án của `thucphamsomot.vn`. | Dev | Đăng nhập admin trên quanly, mở POS/Đơn tổng không lỗi |
| P0-6 | Anh chạy `node --env-file=.env scripts/create-staff-accounts.mjs --apply` tạo 4 tài khoản test (thu mua, kho, kế toán, sale 02) rồi tự lưu mật khẩu (không ghi vào file). Khi live sẽ đổi/vô hiệu. | Anh | 4 tài khoản đăng nhập đúng vai trò |

### P1 — quyết định nghiệp vụ / dữ liệu (anh chủ dự án chốt, dev thực hiện)
1. **Nguồn giá cho khách thử.** Giá sỉ danh mục TPS1 lệch giá KiotViet theo khách (thử: 15/24 dòng lệch; ví dụ tỏi xay KiotViet 43.000 vs TPS1 66.200). KiotViet dùng bảng giá theo khách. Chọn: (a) nhập giá hợp đồng riêng từng khách thử vào TPS1 (`admin/products/import-pricebook` / giá hợp đồng), hay (b) nhân viên nhập tay giá theo KiotViet khi tạo đơn (POS cho sửa giá + ghi lý do). Ghi quyết định vào kế hoạch.
2. **Dòng giá 0đ:** 78 dòng / 33 đơn (trong 110 đơn giao 21/09) có giá 0 trong KiotViet. TPS1 chặn chốt cho đến khi có giá (đúng chủ ý). Cần quy trình rõ: ai điền giá, ở đâu. **Cảnh báo:** `POST /api/admin/orders/bulk-price` ("Áp giá hàng ngày") **ghi đè luôn giá danh mục** (`price_retail/price_wholesale`) và lọc đơn theo **ngày TẠO** chứ không theo ngày giao → dễ áp nhầm/đổi giá danh mục ngoài ý muốn. Cần sửa: lọc theo `delivery_date`, và tách "áp giá cho đơn" khỏi "đổi giá danh mục" (hoặc hỏi xác nhận rõ).
3. **Chọn 3–5 khách thử + 10 đơn thật** (nên chọn trong 28 đơn đủ hàng nếu chưa nhập xong danh mục): có địa chỉ giao (`customer_addresses`), khách đã xác thực; đủ các tình huống T1–T10 trong `docs/PHASE1_KICH_BAN_KIEM_THU.md`. Gợi ý đơn đủ hàng: DH080131 (NTN), DH080120 (SSG, 28 dòng), DH080115 (X51-CT), DH080030 (HANGCHA), DH080029 (STARPRINT).
4. Dọn tài khoản test sau Phase 1 (`TPS1-100001/2/4`, `TPS1-F17B`…): `is_active=false`. Đặt lại người phụ trách theo từng sale thật khi live (hiện 276 khách cùng một sale).

### P2 — sửa lỗi / hoàn thiện (dev; Claude rà lại)
1. **Bấm thử thật trên giao diện** (chưa ai làm): đăng nhập → POS tạo 1 đơn (khách test, ngày 25/09, 1 dòng ghi chú, 1 dòng 2,5 kg, mã KiotViet `TEST-...`) → Đơn tổng → chi tiết đơn → thực giao → hoàn thành → tải hóa đơn → khách xem/hủy/yêu cầu sửa-hủy. Báo lỗi bằng ảnh chụp + thông báo nguyên văn. **Không tự lưu mật khẩu**; đăng nhập trên trình duyệt tích hợp rồi thao tác.
2. `order_items.sku` để **trống** khi đơn tạo qua RPC `admin_create_order` (bảng áp giá và phiếu có thể hiện mã rỗng). Không sửa RPC; điền `sku` bằng UPDATE sau RPC trong `app/api/admin/orders/create/route.ts` (lỗi UPDATE chỉ cảnh báo, không làm mất đơn).
3. **Tồn kho không nhất quán:** xác nhận đơn qua `bulk-confirm`/`finalize` gọi `deduct_inventory_for_order`; `reconcile-delivery` gọi `sync_order_inventory(match_items)`. Cần kiểm: đơn chốt bằng đường nào cũng cho cùng kết quả tồn (chỉ mặt hàng `track_inventory=true`). Thử: tạo → chốt → thực giao thiếu → hủy/hoàn tất, so `inventory_transactions`. (Hiện `k-donut` = -10 do đơn thử hoàn thành — anh chỉnh lại tồn.)
4. `track-adjustment` (`app/api/admin/orders/track-adjustment/route.ts`) nhận `itemChanges` do client gửi. Chấp nhận cho pilot; chuyển sang **so sánh phía server** (đọc dòng trước/sau) trước khi mở rộng.
5. **Ba công thức công nợ khác nhau** (báo cáo `reports/debt`, `CustomerDetailPage`, `customers/export`/`bulk-confirm`). Thống nhất về `orders.debt_amount` (bỏ đơn `canceled`). Nợ đầu kỳ KiotViet (`vip_accounts.kiotviet_opening_debt`: 54 khách dương ≈ 3,35 tỷ; 135 khách âm ≈ -2,8 tỷ) hiện chỉ lưu tham khảo, không cộng vào công nợ TPS1 — cần quyết định hiển thị.
6. Đơn hủy vẫn giữ `debt_amount` = tổng cũ (cột generated). Các báo cáo hiện đã lọc `canceled`; rà mọi nơi khác đọc `debt_amount` thẳng.
7. "Đơn sạch" ở `DonTongPage` chỉ = `pending && !isLate` (yếu hơn đặc tả); an toàn vì `bulk-confirm` tự chặn khách chưa xác thực/giá 0/vượt hạn mức. Kiểm giao diện có hiện **lý do `skipped`** cho từng đơn không.
8. Nếu "Xác nhận thực giao" gặp lỗi, giao diện phải hiện **thông báo thật** (đã sửa route `reconcile-delivery` trả `err.message` cho lỗi từ Supabase; kiểm `OrderDetailPage` hiển thị `error`).
9. 1 ảnh sản phẩm còn lỗi: lỗi trong `tmp/image_errors_20260920.json`; chạy lại: `echo YES | node --env-file=.env scripts/backfill-product-images.mjs --apply --concurrency=2`.
10. Rà mã của Gemini chưa được rà (mục "Gemini làm sau cùng" ở §1) — đặc biệt Mini App: kiểm số thập phân, ghi chú dòng, huỷ đơn `pending`, yêu cầu sửa/hủy, và `types.d.ts`; chạy typecheck miniapp.

### P3 — sau ngày thử
- **WP9:** kéo dữ liệu KiotViet một chiều (cần khóa API do anh cung cấp, không dán vào chat/file): danh mục, giá, tồn, hóa đơn để đối chiếu tự động.
- **Sentry**/giám sát lỗi (cần tài khoản), ghi chú rollback (nếu lùi: tắt POS/portal, dùng KiotViet như cũ — dữ liệu TPS1 không ảnh hưởng sổ KiotViet).
- Chuyển sang mỗi sale phụ trách khách riêng; đổi mật khẩu/khóa tài khoản test; dọn dữ liệu test.

## 3. Cách chạy & kiểm nhanh
- Dev: backend `npm run dev` (cổng 3001, launch `tps1-next`), `sale-webapp` cổng 5173, `tps1-miniapp` cổng 3000. Backend dev **dùng cùng Supabase thật** → mọi thao tác ghi là ghi thật (xem Luật §0.1).
- Kiểm migration: `node --env-file=.env scripts/check-migration-status.mjs`.
- Sau khi có đơn thử: `node --env-file=.env scripts/pilot-compare.mjs --date=YYYY-MM-DD` (liệt kê + mốc thời gian) hoặc thêm `--file=<file KiotViet>` để đối chiếu từng đơn (`--basis=ordered` cho đơn đặt hàng, mặc định `final` cho hóa đơn).
- Phân tích file KiotViet: các cột chính `Mã đặt hàng`, `Mã khách hàng`, `Mã hàng`, `Số lượng`, `Đơn giá`, `Thời gian giao hàng` (số ngày Excel; 46286 = 21/09/2026), `Trạng thái` (`Phiếu tạm` = chưa giao).

## 4. Báo cáo kèm theo khi làm xong (để Claude rà)
Mỗi việc báo cáo: (a) đã làm gì / file nào; (b) đã kiểm chứng bằng cách nào và kết quả thật (kèm thông báo lỗi nguyên văn nếu có); (c) **những gì CHƯA kiểm tra được**; (d) **mọi dữ liệu đã ghi vào hệ thống thật** (đơn, khách, giá, tồn) và đã hoàn tác chưa; (e) lệnh typecheck/build và kết quả. Không tuyên bố "đã pass" nếu chưa chạy đúng lệnh ở Luật §5.
