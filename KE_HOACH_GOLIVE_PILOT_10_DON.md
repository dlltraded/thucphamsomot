# KẾ HOẠCH LỚN — SẴN SÀNG VẬN HÀNH THỬ: 10 ĐƠN THẬT/NGÀY, TỪ NHẬP ĐƠN ĐẾN HÓA ĐƠN
> Lập 20/09/2026 · Claude (lập kế hoạch, rà soát, tự làm một số gói lõi) · Gemini (triển khai các gói còn lại) · Anh (chủ dự án: chạy migration, cung cấp dữ liệu, chốt quyết định, chạy thử)
> Nguyên tắc: **làm theo lát cắt đầu-cuối**, không làm rời rạc từng màn. Mỗi gói phải đứng được trong luồng "đơn thật đi từ đầu tới cuối". Bản này **thay thế thứ tự đợt** trong `GIAO_VIEC_GEMINI_PHASE1.md` (đặc tả chi tiết từng WP vẫn nằm ở `PHASE1_PLAN_DON_HANG_THU_MUA.md`).

## 1. Định nghĩa "sẵn sàng" (pass/fail)
Một ngày vận hành thử: **10 đơn thật lấy từ KiotViet**, do nhân viên nhập vào hệ thống, chạy hết vòng đời:
`nhập đơn → kiểm/chốt giá (phiếu xác nhận) → đơn tổng gửi Thu mua → soạn hàng (phiếu tạm) → giao → xác nhận thực giao → hoàn thành + hóa đơn → ghi nhận thanh toán/công nợ → khách xem & tải chứng từ`.
Đạt khi: (a) 10/10 đơn đi hết vòng đời không phải sửa DB tay; (b) **tổng tiền hóa đơn khớp KiotViet từng đơn** (hoặc chênh có lý do ghi rõ); (c) file tổng gộp đúng (đối chiếu tay); (d) ≥ 1 đơn có điều chỉnh và ≥ 1 đơn có yêu cầu hủy đi đúng luồng; (e) không lỗi chặn; (f) thời gian nhập 1 đơn ≤ thời gian nhập ở KiotViet (đo).

## 2. Hiện trạng (đã kiểm tra bằng API thật 20/09)
| Hạng mục | Trạng thái |
|---|---|
| Migration `20260910*`, `20260911*` (địa chỉ, hóa đơn, soạn hàng, xác thực khách, giá hàng ngày, đăng ký) | ✔ đã chạy |
| `20260920b` tìm kiếm sản phẩm | ✔ **đã chạy & kiểm chứng**: 17 từ khóa OK (~165 ms), "bò" không kéo "bột/bơ", 17 nhóm danh mục |
| `20260920a` vai trò kho/kế toán/tài xế · `20260920` (ngày giao, ghi chú dòng, giờ chốt, nhật ký xuất file) · `20260920c` (mã KiotViet, sinh mã) · `20260920d` (đăng ký dùng mã viết tắt) | ✘ **chưa chạy** |
| API Đợt 2 (order-config, order, cancel, đơn tổng, xuất Excel, xác nhận hàng loạt, khách hàng list/assign/đổi mã), đăng nhập mã ngắn | có code, **chưa chạy thật, chưa deploy** (phụ thuộc migration) |
| Nhập 269 khách KiotViet | dry-run OK, **chưa `--apply`** |
| Chuyển ảnh về Supabase (4.771 ảnh) | dry-run OK, **chưa `--apply`** |
| Giao diện: Đơn tổng, tìm kiếm mới, khách đặt hàng mới, yêu cầu điều chỉnh/hủy, Mini App | **chưa có** |

**Phát hiện quan trọng khi rà luồng (lỗ hổng lớn hơn kế hoạch cũ):**
1. **Màn Tạo đơn (POS) của nhân viên chưa có ngày giao / điểm giao / ghi chú dòng / SL thập phân**; gọi RPC `admin_create_order` thẳng từ trình duyệt (`PosCreatePage.tsx:501`). Mà 269 khách KiotViet **chưa có mật khẩu, 237 chưa có địa chỉ** → **10 đơn thử sẽ do nhân viên nhập qua POS**, không phải khách tự đặt. ⇒ **POS là đường vào chính của cả đợt thử.**
2. **Hóa đơn đang lấy số lượng ĐẶT, không phải số lượng THỰC GIAO**: `createInvoiceDocument` (`app/api/admin/orders/route.ts:194`) chỉ đọc `quantity, line_total`; số "Đã giao" (`quantity_delivered`) chỉ được lưu, không dùng để tính tiền/hóa đơn. Quy trình của anh: "giao xong xác nhận thực tế rồi mới in hóa đơn" ⇒ **thiếu bước đối chiếu thực giao**.
3. Không có chỗ ghi **mã đơn/hóa đơn KiotViet tương ứng** → không đối chiếu được 10 đơn thử với KiotViet.
4. Chưa có Sentry/log tập trung, chưa giới hạn số lần đăng nhập sai (mã khách giờ dễ đoán hơn).

## 3. Vòng đời đầu-cuối & gói việc
| # | Bước | Ai | Màn/API | Hiện trạng → Gói |
|---|---|---|---|---|
| 1 | Nhập đơn từ KiotViet (chọn khách, ngày giao, điểm giao, hàng, SL, ghi chú, **mã đơn KiotViet**) | NV Vận hành | POS `/tao-don-hang` | ✘ thiếu → **P2** |
| 2 | Tìm hàng nhanh có ảnh | mọi | POS + DatHang | API ✔, UI ✘ → **P3** |
| 3 | Kiểm & chốt giá → phiếu xác nhận | Vận hành | Xử lý đơn hàng | ✔ (có) |
| 4 | Xác nhận hàng loạt "đơn sạch" + hàng đợi Cần xử lý | Vận hành | `/don-tong` | API ✔, UI ✘ → **P4** |
| 5 | Đơn tổng + file Excel gửi Thu mua; cảnh báo thay đổi sau xuất | Vận hành→Thu mua | `/don-tong` | API ✔, UI ✘ → **P4** |
| 6 | Soạn hàng, phiếu tạm | Sale/Kho | `/soan-hang` | ✔ (thêm lọc ngày giao → P4) |
| 7 | Giao hàng | Tài xế/Vận hành | Order detail | ✔ trạng thái, ✘ phiếu giao → **P5** |
| 8 | **Xác nhận thực giao → tính lại tiền** | Vận hành | Order detail | ✘ → **P5** |
| 9 | Hoàn thành → **hóa đơn theo số thực giao** | hệ thống | PATCH đơn | ✘ (dùng SL đặt) → **P5** |
| 10 | Ghi nhận thanh toán/công nợ | Kế toán/Vận hành | Order detail, Công nợ | ✔ |
| 11 | Khách xem đơn, tải phiếu/hóa đơn | Khách | webapp/miniapp/portal | ✔ (cần mật khẩu) → **P7** |
| 12 | Khách yêu cầu điều chỉnh/hủy → sale duyệt → báo Thu mua | Khách/Vận hành | Order detail | ✘ → **P6** |
| 13 | Đối chiếu 10 đơn với KiotViet, đo thời gian | Anh/Claude | báo cáo | ✘ → **P8** |

## 4. Các gói (thứ tự = thứ tự làm; cột "Ai" tránh trùng file)
| Gói | Nội dung | Ai | Cỡ | Chặn bởi |
|---|---|---|---|---|
| **P0 Nền tảng** | Chạy 4 migration còn lại theo thứ tự `a → intake → c → d`; backup/ghi lại bản trước khi chạy; kiểm chứng bằng script `scripts/check-migration-status.mjs` (Claude viết); tạo tài khoản nhân viên đủ vai (admin, trưởng phòng, 2 sale, thu mua, kho, kế toán) | Anh chạy SQL · Claude kiểm | S | — |
| **P1 Dữ liệu** | `--apply` nhập 269 khách (sau khi anh chốt: `--ignore-existing=TPS1-100002`); gán người phụ trách theo nhóm; **`--apply` chuyển ảnh**; chọn **3–5 khách thử** rồi bổ sung SĐT/địa chỉ/mật khẩu; kiểm bảng giá cho các khách đó (hợp đồng/hạng) | Anh + Claude | M | P0 |
| **P2 POS = đường nhập đơn chính** | Trong `PosCreatePage` + `POST /api/admin/orders/create` (chuyển khỏi RPC-từ-trình-duyệt): **ngày giao** (mặc định `earliestDate`), **điểm giao** chọn từ địa chỉ khách (cho thêm địa chỉ mới nhanh), **ghi chú từng dòng**, **SL thập phân**, **mã đơn KiotViet** (cột mới `orders.external_ref`, tìm/hiện ở danh sách + file Excel), cờ trễ giờ chốt; sau RPC: UPDATE các cột mới như luồng khách (không sửa RPC). Nhập nhanh bàn phím (Enter thêm dòng, Tab đổi ô). | **Gemini** | L | P0 |
| **P3 Tìm kiếm + ảnh (UI)** | WP4-3B: route sản phẩm dùng RPC, ô tìm kiếm to có ảnh thumbnail 64 px, tô đậm từ khớp, debounce+hủy request; dùng chung cho **POS** và **DatHangPage**; thay `?meta=1` bằng `get_distinct_categories` | **Gemini** | M | P0, P1(ảnh) |
| **P4 Đơn tổng & Cần xử lý** | WP5: `DonTongPage` (nhóm hàng, tổng SL cuối, tồn kho, cần bù, đối chiếu, đơn trễ, tải Excel), tab **Cần xử lý** (đơn sạch → xác nhận hàng loạt; đơn cần xem kèm nhãn lý do), khối đỏ "thay đổi sau lần xuất" + nút **Sao chép thông báo Zalo**; `SoanHangPage` thêm lọc ngày giao | **Gemini** | L | P2 |
| **P5 Thực giao → Hóa đơn** | (a) `orders.delivery_confirmed_at/by`; API `POST /api/admin/orders/reconcile-delivery`: nhập SL thực giao từng dòng (mặc định = SL chốt), ghi chú lệch (thiếu/dư/trả), **tính lại `line_total`, tổng đơn, công nợ** (giữ nguyên `unit_price`, chiết khấu cố định; lưu số tiền trước đối chiếu); (b) **hóa đơn PDF dùng số thực giao** khi đã đối chiếu; chặn `completed` nếu chưa đối chiếu (có nút "giao đủ 100%" 1 chạm); (c) **Phiếu giao hàng** in được (theo mẫu KiotViet: SL, đơn giá, chỗ khách ký nhận); (d) lịch sử ghi rõ ai/khi nào | **Claude** (đụng `OrderDetailPage` + `admin/orders/route.ts` nên không giao song song) | L | P2 |
| **P6 Yêu cầu điều chỉnh/hủy + truy vết** | WP6 + WP6b (migration `20260920e`, hoàn kho khi hủy, hàng đợi, push, khối đỏ) — phần **API + panel trong `OrderDetailPage`** do Claude, phần **UI khách (`MyOrderDetailPage`) + `OrdersPage`** do Gemini | Claude + Gemini | L | P4, P5 |
| **P7 Khách đặt hàng & Mini App** | WP3 (DatHangPage: ngày giao, điểm giao, đếm ngược 16:30, ghi chú dòng, đặt lại, hay đặt), WP7 Mini App | **Gemini** | L | P3 |
| **P8 Kịch bản thử & đối chiếu** | Script đối chiếu `scripts/pilot-compare.mjs` (xuất bảng: mã KiotViet ↔ mã TPS1, tổng tiền, số dòng, chênh); mẫu ghi thời gian từng bước; kịch bản ngày thử (mục 6); `docs/PHASE1_KICH_BAN_KIEM_THU.md` | Claude | M | P2, P5 |
| **P9 An toàn vận hành** | Giới hạn số lần đăng nhập sai; Sentry (gói free) cho API + webapp; ghi log lỗi vào bảng; hướng dẫn sử dụng 1–2 trang/vai trò; cách quay lại (rollback) | Claude + Gemini | M | song song |

**Quy tắc phối hợp (tránh giẫm chân):** Gemini **không** sửa `OrderDetailPage.tsx`, `app/api/admin/orders/route.ts`, `lib/order-finalize.ts`, `MyOrderDetailPage.tsx` (trừ P6 phần khách theo chỉ dẫn) — các file này thuộc Claude. Claude **không** sửa `PosCreatePage.tsx`, `DatHangPage.tsx`, `DonTongPage.tsx`, `CustomersPage.tsx`. Mỗi bên nộp/duyệt theo gói; Claude rà soát mọi gói Gemini **trước khi** anh chạy migration/deploy.

## 5. Thứ tự & cổng (gate)
```
P0 ─► P1 ─┬─► P2 ─► P4 ─► P6 ─┐
          ├─► P3 ─► P7        ├─► P8 ─► NGÀY THỬ
          └─► P5 (Claude) ────┘   P9 chạy song song
```
- **Gate A (xong P0+P1):** migration chạy đủ, khách+ảnh đã nhập, 3–5 khách thử sẵn sàng → mở P2/P3/P5.
- **Gate B (xong P2+P4+P5):** nhập được đơn thật, có file tổng, thực giao ra hóa đơn đúng → **thử nội bộ 2–3 đơn giả** (anh tự nhập, không phải khách thật).
- **Gate C (xong P6+P8+P9):** kịch bản đầy đủ → **Ngày thử 10 đơn thật**.
- Deploy: **chạy migration trước, deploy code sau**; deploy theo cổng (A: không cần code; B: deploy lần 1; C: deploy lần 2). Trước mỗi deploy: Claude chạy `tsc`, quét kiểm tra, đọc diff. KiotViet vẫn là **sổ chính** trong suốt thời gian thử (chạy song song, không tắt).

## 6. Ngày thử 10 đơn (kịch bản)
- **Chọn 10 đơn** từ KiotViet của 1 ngày giao: ≥ 3 khách khác nhau (1 trường/bếp nhỏ, 1 công ty, 1 điểm Hiệp Phát); có đủ: 1 đơn có SL lẻ (kg thập phân), 1 đơn có ghi chú quy cách, 1 đơn có hàng chưa có giá, 1 đơn nhập **sau 16:30** (trễ giờ chốt), 1 đơn **giao thiếu** 1 mặt hàng, 1 đơn **khách xin điều chỉnh** sau khi có phiếu xác nhận, 1 đơn **khách xin hủy** sau giờ chốt, 1 khách mới chưa xác thực.
- **Dòng thời gian:** sáng nhập 10 đơn (bấm giờ từng đơn) → chốt giá/xác nhận → 16:30 xuất **file tổng** → Thu mua đối chiếu tay với KiotViet → soạn → giao → xác nhận thực giao → hoàn thành → hóa đơn → ghi thanh toán → **đối chiếu với KiotViet bằng `pilot-compare`**.
- **Người thật ở từng vai:** 1 sale nhập/xử lý, 1 thu mua nhận file, 1 người giao (hoặc mô phỏng), 1 kế toán ghi thanh toán, anh quan sát; Claude trực để sửa lỗi nóng.
- **Đạt/không đạt:** mục 1. Mỗi lỗi ghi vào bảng (mức: chặn / phải sửa / để sau), sửa xong mới sang ngày thử kế.

## 7. Rủi ro chính & cách chặn
| Rủi ro | Chặn |
|---|---|
| Migration lỗi trên dữ liệu thật | Chạy từng file, ghi kết quả; toàn bộ đều **additive** (chỉ thêm cột/bảng/hàm); có `check-migration-status` sau mỗi lần |
| Lệch tiền so với KiotViet (giá hợp đồng/hạng chưa nhập) | P1 kiểm bảng giá khách thử trước; POS cho sale sửa giá tay + ghi lý do; `pilot-compare` chỉ rõ đơn/dòng lệch |
| Đơn thử chạm khách thật (push, email) | Thông báo đẩy chỉ gửi cho khách **đã đăng ký push**; khách thử là số ít, báo trước |
| Hủy đơn lệch tồn kho | `restore_inventory_for_order` (P6) + kiểm tồn trước/sau trong kịch bản |
| Nhân viên quen KiotViet, nhập chậm | Nhập nhanh bàn phím + tìm kiếm chuẩn (P2/P3); đo thời gian, cải thiện sau ngày 1 |
| Mã khách dễ đoán bị dò mật khẩu | P9 giới hạn số lần thử; khách thử dùng mật khẩu mạnh |
| Gemini sót/sai (đã xảy ra: regex, bucket, quyền) | Mọi SQL do Claude đọc + **gọi thử bằng API thật** trước khi anh chạy; báo cáo có mục "Chưa kiểm tra được" |

## 8. Việc anh cần làm/chốt ngay
1. **Chạy migration còn lại** (Claude sẽ đưa từng file + lệnh kiểm; thứ tự `20260920a` → `20260920` → `20260920c` → `20260920d`) — em rà thêm `20260920` và `20260920c` trước khi anh chạy.
2. Chọn **3–5 khách thử** và **ngày giao** của đợt thử; cung cấp SĐT/địa chỉ giao (hoặc để nhân viên nhập).
3. Bảng giá: khách thử đang mua theo **giá gốc / hạng VIP / giá hợp đồng riêng** trên KiotViet? (để em kiểm dữ liệu giá).
4. Các tài khoản nhân viên: hiện có 3 (admin, sale01, trưởng phòng); cần thêm **thu mua, kho, kế toán, sale thứ 2** — anh tạo (Supabase Auth + `admin_profiles`) hoặc nhờ em soạn hướng dẫn.
5. Duyệt: **KiotViet vẫn là sổ chính** trong suốt thời gian thử; hóa đơn thật vẫn xuất từ KiotViet cho tới khi anh quyết định chuyển.

## 9. NHẬT KÝ TIẾN ĐỘ (cập nhật liên tục)
| Giờ/ngày | Việc | Kết quả |
|---|---|---|
| 20/09 | **P0** migration `20260920a`, `20260920`, `20260920c` | ✔ đã chạy, kiểm chứng bằng `scripts/check-migration-status.mjs` (15/18; `e/f/g` chưa tới lượt) |
| 20/09 | **P1** nhập khách KiotViet `--apply` | ✔ **269 khách tạo mới, 0 lỗi** (tổng 282 tài khoản; 260 verified / 9 pending; 33 địa chỉ). Mã dạng `TPS1-ZERMAT`, `TPS1-FGLU2`, `TPS1-NGO`… Chưa có mật khẩu, 236 khách chưa có SĐT/địa chỉ |
| 20/09 | **P1** chuyển ảnh về Supabase | thử 10/10 ảnh OK (thumb 4–12 KB, ảnh vừa 12–58 KB, webp). **Đang chạy toàn bộ 4.761 ảnh nền** (96 lô, log `tmp/backfill-images-full.log`; ~2 phút/lô); ảnh gốc giữ ở `image_url_original` |
| 20/09 | **P5** thực giao → hóa đơn (Claude) | code xong, `tsc` sạch: migration `20260920g` (cột + hàm `sync_order_inventory` idempotent, dùng chung cho hoàn kho hủy đơn), `lib/order-reconcile.ts`, `POST /api/admin/orders/reconcile-delivery`, chốt chặn "Hoàn thành phải xác nhận thực giao" (có nút Giao đủ 100%), hóa đơn bỏ dòng SL=0, UI trong `OrderDetailPage`. **Chưa chạy `20260920g`** (chờ anh) |
| 20/09 | **P2** POS (Gemini) | đang làm (đã thấy `PosCreatePage` có ngày giao/điểm giao/mã KiotViet/ghi chú dòng). **Cần rà:** đang tự tính giờ chốt ở trình duyệt (`checkIsLate`) thay vì gọi `/api/customer/order-config` → nguy cơ lệch quy tắc server; sẽ yêu cầu dùng một nguồn |
| 20/09 | `20260920g` (thực giao) | ✔ **anh đã chạy, Claude kiểm chứng**: 4 cột mới + hàm `sync_order_inventory` chạy được (gọi thử trên đơn thật trả 0, không ghi gì) |
| 20/09 | **P6/WP6b** yêu cầu điều chỉnh/hủy (Claude) | code xong: migration `20260920e`, `POST /api/customer/orders/request-change`, `GET /api/admin/order-change-requests`, `POST …/resolve` (duyệt hủy → hoàn kho + push + sinh sẵn đoạn Zalo báo Thu mua), khối duyệt trong `OrderDetailPage`, nút/khung yêu cầu trong `MyOrderDetailPage`, `GET /api/customer/orders` trả `change_request`, hủy tay ở PATCH cũng hoàn kho, `procurement/summary` cảnh báo cả đơn **đã hủy sau lần xuất**. **Chưa chạy `20260920e`** |
| 20/09 | **P9** giới hạn đăng nhập sai (Claude) | code xong: `lib/rate-limit.ts` + migration `20260920h`; áp cho `sale-auth` và `customer/login` (8 lần sai/15 phút theo mã, 40 theo IP; trả 429; bảng chưa có thì không chặn). **Chưa chạy `20260920h`** |
| 20/09 | ⚠️ **Phát hiện kiểm tra kiểu vô hiệu** | `tsc -p tsconfig.json` ở `sale-webapp` không kiểm gì (`files: []`). Đã chạy lại bằng `tsconfig.app.json`: **0 lỗi** sau khi sửa 2 lỗi thật (1 của Claude, 1 của Gemini). Đã ghi vào mục 14 của giao việc |
| 20/09 | Chuyển ảnh | chạy lại **song song 8 luồng** (~9–20 giây/lô), tiến độ xem `tmp/backfill-images-full2.log` |

- **20/09 (tối, Claude):** gán 276 khách active cho sale Nguyễn Thái Hoà (5 tài khoản test inactive chưa gán). Đã viết `scripts/create-staff-accounts.mjs` (chạy khô OK; anh tự chạy `--apply`, mật khẩu chỉ hiện 1 lần), `scripts/pilot-compare.mjs` (chỉ đọc, đối chiếu file KiotViet ↔ `orders.external_ref`, in mốc thời gian) và `docs/PHASE1_KICH_BAN_KIEM_THU.md` (kịch bản ngày thử, bảng bấm giờ, sổ lỗi). Còn: Gemini làm Mini App WP7 + hướng dẫn theo vai trò.

- **20/09 (tối, Claude) — THỬ ĐẦU-CUỐI qua API thật** (khách test TPS1-100002, ngày giao 25/09, dữ liệu từ file KiotViet `DanhSachChiTietDatHang_KV20092026`): tạo đơn → chốt giá/xác nhận → soạn → đang giao → xác nhận thực giao (giao thiếu) → hoàn thành + hóa đơn → ghi thanh toán (COD + thu công nợ) → hết nợ. Tổng tiền tạo đơn khớp KiotViet từng đồng (213.500 / 2.817.930 / 381.530); giao thiếu tính lại 349.500 → 297.350. Đơn tổng gộp đúng (3 đơn/24 dòng, checksum khớp). Chặn đúng: chưa áp giá 0đ, chưa xác nhận thực giao thì không hoàn thành.
  **Phát hiện:** (1) `order_items_quantity_check` không cho giao 0 → migration `20260920i_order_items_allow_zero_qty.sql` (anh chạy). (2) Danh mục TPS1 thiếu 105 mã hàng của đơn giao 21/09 (file sản phẩm cũ 23/06) → cần xuất lại danh sách hàng hóa KiotViet; chỉ 28/110 đơn đủ hàng. (3) 78 dòng/33 đơn có giá 0 trong KiotViet → phải "Áp giá" trước khi chốt; lưu ý bulk-price cập nhật cả giá danh mục và lọc theo ngày TẠO đơn, không theo ngày giao. (4) Giá sỉ danh mục TPS1 khác giá KiotViet theo khách (15/24 dòng lệch ở 2 đơn) → cần chốt nguồn giá cho khách thử. (5) `order_items.sku` để trống khi tạo qua RPC (pilot-compare đã bù theo product_id). (6) Tồn `k-donut` = -10 do đơn thử hoàn thành.
