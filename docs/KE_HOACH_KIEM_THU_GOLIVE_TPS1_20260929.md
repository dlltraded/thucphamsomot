# TPS1 — Kế hoạch kiểm thử và đưa hệ thống vào vận hành

> Ngày rà soát: 29/09/2026  
> Phạm vi: Website đặt hàng, Zalo Mini App, POS/Trang quản lý, bảng giá, đơn hàng, soạn hàng, giao hàng, công nợ và chứng từ.  
> Nguyên tắc: TPS1 chỉ được thay KiotViet theo từng phạm vi đã nghiệm thu; không chuyển toàn bộ hệ thống theo kiểu “big bang”.

## 1. Kết luận điều hành

### 1.1. TPS1 đã đủ để thay KiotViet chưa?

**Chưa.**

- TPS1 **chưa thể thay toàn bộ KiotViet**, vì các phân hệ mua hàng, nhà cung cấp, nhập kho, kiểm kho, sổ quỹ, kế toán và hóa đơn điện tử chưa được hoàn thiện tương đương.
- TPS1 **đã có nền móng tốt cho Phase 1**: tiếp nhận đơn đa kênh, quản lý khách, xử lý đơn, gộp đơn, chốt giá, PDF, đơn tổng, soạn hàng, giao hàng, hóa đơn bán hàng và công nợ.
- TPS1 **chưa được phép go-live độc lập cho Phase 1 ngay hôm nay** vì còn lỗi chặn về bảo mật, bảng giá production, dữ liệu quy cách và tài khoản vận hành.
- Phương án phù hợp là: sửa lỗi chặn → kiểm thử nội bộ → pilot 10 đơn thật chạy song song KiotViet → pilot 50 đơn → pilot một nhóm bếp → mới quyết định cắt KiotViet ở phạm vi đơn hàng.

### 1.2. Mức sẵn sàng hiện tại

| Phạm vi | Đánh giá | Ghi chú |
|---|---|---|
| Nền tảng dữ liệu đơn hàng | Khá | Có đơn trung tâm, lịch sử, thanh toán, chứng từ và RPC gộp đơn nguyên tử |
| Gộp đơn | Đạt nền tảng | Đơn nguồn được snapshot rồi xóa trong cùng transaction; chống double-click |
| Bảng giá dữ liệu | Có nền | 9 bảng giá, 4 bảng active, 31.678 dòng giá |
| Bảng giá production | **Không đạt** | API quản trị bảng giá đang trả 404; luồng tạo đơn vẫn còn dùng VIP/hợp đồng cũ |
| Bảo mật Supabase | **Không đạt** | Còn policy/grant ghi trực tiếp quá rộng trên products và các bảng cũ |
| Quy cách đặt hàng | **Không đạt** | 0 sản phẩm đang bật `enforce_order_step`; production chưa dùng min/step để chặn số lượng |
| Dữ liệu khách hàng | Chưa sẵn sàng | 278 khách active nhưng 238 khách thiếu SĐT; chỉ 34 khách có địa chỉ; 9 khách có mật khẩu |
| Nhân sự và phân quyền | Chưa sẵn sàng | 3 tài khoản active; chưa có đủ Kế toán/Thu mua/Kho/Vận hành; cả 3 chưa gán phòng ban |
| Chứng từ | Có nền | Phiếu xác nhận và hóa đơn cuối đã tách theo trạng thái |
| Kiểm thử thực tế | **Chưa đạt** | Production mới có 3 đơn; chưa chạy pilot 10 đơn và chưa load test 150 đơn/ngày |
| Theo dõi sự cố/khôi phục | Chưa đạt | Chưa có bộ health check, cảnh báo lỗi, diễn tập backup/restore và runbook rõ ràng |

## 2. Số liệu production dùng làm đường cơ sở

### 2.1. Hàng hóa

- 9.492 bản ghi sản phẩm; 5.295 sản phẩm active.
- 0 SKU active bị trùng và 0 sản phẩm thiếu SKU.
- 4.771/5.295 sản phẩm active có ảnh.
- 2.378/5.295 sản phẩm active có giá gốc bằng 0.
- 0 sản phẩm có ghi chú quy cách.
- 0 sản phẩm bật bắt buộc bước đặt hàng.

### 2.2. Khách hàng

- 283 khách tổng; 278 khách active.
- 238/278 khách active thiếu số điện thoại.
- 34 khách có địa chỉ giao hàng.
- 9 khách có mật khẩu để tự đăng nhập.
- Có 129 nhóm khách hàng/bếp trong dữ liệu.

### 2.3. Bảng giá

- 9 bảng giá; 4 bảng đang active.
- 21.180 dòng thuộc các bảng giá active; không có dòng giá active bằng 0.
- Bảng giá chung, HPF, MEKONS và một bảng riêng khách test đều có đủ 5.295 sản phẩm.
- Mới có 2 khách được gán bảng giá trực tiếp và 1 nhóm được gán bảng giá.
- API `/api/admin/price-books*` trên production đang trả 404.

### 2.4. Đơn hàng và nhân viên

- 3 đơn production; 2 đơn đang mở.
- Không có dòng giá 0 trong hai đơn đang mở.
- Không có đơn mở thiếu ngày giao hoặc thiếu địa chỉ giao đối với giao tận nơi.
- Có 3 nhân viên active: 1 Admin, 1 Sale, 1 Trưởng phòng; cả 3 chưa gán phòng ban.
- RPC gộp đơn nguyên tử và khóa chống gộp trùng đã tồn tại.

## 3. Các lỗi chặn phải xử lý trước mọi pilot

### BLOCKER-01 — Khóa lại RLS và quyền bảng

**Cập nhật 29/09/2026:** Đã áp migration `20260929_phase0_security_lockdown.sql`
trên production. Kết quả kiểm tra sau migration: quyền ghi của `anon` = 0,
policy ghi áp dụng cho `anon/public` = 0, RPC ngoài danh sách cho phép = 0.
API danh mục công khai vẫn trả 200; API đơn hàng và quản trị không có phiên
đăng nhập trả 401. Tiếp tục duy trì bài kiểm tra
`supabase/tests/phase0_security.sql` trong mỗi lần phát hành migration.

Hiện production còn các policy/grant rộng, bao gồm quyền ghi trực tiếp cho `anon`/`public` trên `products` và các bảng cũ như `quotes`, `quote_history`, `voucher_usages`, `vouchers`. Đây là lỗi mức nghiêm trọng.

Yêu cầu:

- Thu hồi toàn bộ INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER không cần thiết khỏi `anon` và `authenticated`.
- Xóa policy `using(true)`/`with check(true)` dành cho ghi dữ liệu nhạy cảm.
- Client chỉ đọc danh mục công khai cần thiết; mọi ghi sản phẩm, giá, đơn, khách, voucher phải đi qua Server API/RPC có xác thực.
- Rà lại toàn bộ function `SECURITY DEFINER`; chỉ cấp EXECUTE đúng allowlist.
- Chạy test trực tiếp với anon key để chứng minh thao tác ghi bị trả 401/403.

Điều kiện đạt: không còn đường ghi trực tiếp trái phép và không làm hỏng luồng nhân viên/khách hợp lệ.

### BLOCKER-02 — Đưa API bảng giá lên backend production

Yêu cầu:

- Đưa các route danh sách, chi tiết, grid, tạo draft, sửa dòng giá, import preview/commit, gán và kích hoạt lên `main` backend.
- Đồng bộ phiên bản frontend quản lý với backend; không để UI gọi endpoint 404.
- Mọi thao tác ghi phải xác thực capability và dùng server-side service role.
- Không cho sửa trực tiếp bảng active; phải tạo draft/version mới.

Điều kiện đạt: toàn bộ API bảng giá trả 200/400/403 đúng ngữ cảnh, không có 404 do thiếu route.

### BLOCKER-03 — Bảng giá mới phải là nguồn giá duy nhất

Production hiện vẫn có logic cũ theo `discount_tier`, `customer_contract_prices` và `product_tier_prices`. RPC tạo đơn còn tính từ `price_retail/price_wholesale` và VIP.

Yêu cầu:

- Dùng đúng thứ tự: giá riêng khách → giá nhóm bếp → bảng giá chung.
- Giá do server resolve lại lúc tạo đơn; không tin giá client gửi lên.
- Lưu snapshot `price_book_id`, phiên bản, nguồn giá, đơn giá và quy cách vào `order_items`.
- Nếu thiếu giá riêng thì fallback bảng chung; nếu bảng chung cũng thiếu/0 thì chỉ tạo đơn “chờ bổ sung giá”, tuyệt đối không xác nhận.
- Loại bỏ toàn bộ chữ và thao tác “VIP/hạng khách” khỏi luồng giá chính thức.

Điều kiện đạt: cùng một khách và SKU trả đúng một giá trên Website, Mini App, POS và chi tiết đơn.

### BLOCKER-04 — Bắt buộc quy cách đặt hàng

Yêu cầu:

- Chuẩn hóa `min_order_qty`, `order_step`, `quantity_precision`, `packaging_note` cho nhóm hàng áp dụng.
- Server kiểm tra min/step ở cả Website, Mini App, POS và API import Excel.
- Client chỉ cảnh báo hỗ trợ; server là lớp quyết định cuối.
- Lưu snapshot quy cách vào đơn.

Điều kiện đạt: rau bước 0,5 kg không nhận 0,2/0,7 kg; trứng bước 1 không nhận 0,25 quả; không thể vượt qua bằng gọi API trực tiếp.

### BLOCKER-05 — Làm sạch nhánh triển khai

Yêu cầu:

- Hợp nhất code bảng giá/hàng hóa còn nằm local vào commit được review.
- Backend `main` và frontend `main` phải tương thích cùng một contract API.
- Không để file dữ liệu khách, file KiotViet, báo cáo lợi nhuận hoặc file chứa PII trong Git.
- Tạo staging tách production; migration có số thứ tự, có kiểm tra trước/sau và phương án rollback.

Điều kiện đạt: checkout mới từ `main` có thể build và chạy mà không cần file local ngoài Git hoặc sửa DB tay.

## 4. Chiến lược kiểm thử theo phase

Không được bỏ qua phase. Mỗi phase chỉ bắt đầu khi phase trước đã ký đạt.

### Phase 0 — An toàn, backup và đồng bộ release

Mục tiêu: tạo nền kiểm thử không làm hỏng production.

Tasklist:

- [ ] Tạo bản sao lưu schema + dữ liệu trước thay đổi.
- [ ] Chụp số lượng bản ghi và checksum các bảng quan trọng.
- [ ] Lập danh sách migration đã áp dụng thật, đối chiếu với Git.
- [x] Vá BLOCKER-01: khóa RLS/grant/RPC production và kiểm tra hồi quy công khai.
- [ ] Vá BLOCKER-02 đến BLOCKER-05.
- [ ] Kiểm tra secret không nằm trong Git/client bundle.
- [ ] Cấu hình health endpoint và log lỗi có request ID.
- [ ] Viết runbook rollback frontend, backend và database.
- [ ] Thử khôi phục một bản backup vào staging.

Test bắt buộc:

| ID | Kịch bản | Kết quả bắt buộc |
|---|---|---|
| SEC-01 | Anon gọi INSERT/UPDATE/DELETE products | Bị chặn 401/403 |
| SEC-02 | Anon đọc/sửa đơn, khách, giá riêng | Không đọc/ghi được |
| SEC-03 | Sale gọi API Admin-only | 403 |
| SEC-04 | Token hết hạn/giả mạo | 401, không rò dữ liệu |
| REL-01 | Checkout sạch + build hai repo | 0 lỗi |
| REL-02 | Rollback deployment | Hoàn tất trong 30 phút |
| BAK-01 | Restore staging từ backup | Dữ liệu kiểm tra khớp checksum |

Cổng đạt: 100% test bảo mật quan trọng đạt, backup phục hồi được, không còn endpoint frontend gọi 404.

### Phase 1 — Dữ liệu gốc và bảng giá

Mục tiêu: giá và quy cách đủ tin cậy để tạo đơn thật.

Tasklist:

- [ ] Chốt 5.295 SKU active và danh sách sản phẩm thực sự kinh doanh.
- [ ] Xử lý 2.378 sản phẩm giá 0: có giá, “liên hệ”, hoặc ngừng kinh doanh.
- [ ] Gán quy cách cho các sản phẩm cần bước đặt hàng.
- [ ] Tạo file mẫu import chuẩn cho Kế toán.
- [ ] Import bảng giá chung tháng mới thành draft.
- [ ] Import bảng giá nhóm/khách thành draft.
- [ ] Hiển thị so sánh giá hiện tại và giá draft.
- [ ] CEO duyệt/kích hoạt; bảng cũ archived.
- [ ] Gán thử 3 khách riêng, 3 nhóm bếp và 3 khách fallback chung.

Test bắt buộc:

| ID | Kịch bản | Kết quả bắt buộc |
|---|---|---|
| PB-01 | Khách có giá riêng | Lấy giá riêng |
| PB-02 | Thiếu giá riêng, có giá nhóm | Lấy giá nhóm |
| PB-03 | Thiếu giá riêng/nhóm | Lấy giá chung |
| PB-04 | Draft chưa duyệt | Không áp vào đơn |
| PB-05 | Bảng hết hạn | Không áp vào đơn |
| PB-06 | Import blank và số 0 | Phân biệt đúng; không biến blank thành 0 |
| PB-07 | SKU sai/trùng/mơ hồ | Preview báo lỗi; không commit |
| PB-08 | Kích hoạt phiên bản mới | Đơn mới dùng giá mới; đơn cũ giữ snapshot |
| QTY-01 | Bước 0,5 kg | Chỉ nhận bội số 0,5 |
| QTY-02 | Đơn vị nguyên cái | Không nhận số lẻ |

Cổng đạt: 100% SKU thử có giá/nguồn giá đúng; sai lệch giữa các kênh bằng 0; CEO ký bảng giá pilot.

### Phase 2 — Khách hàng, tài khoản và phân quyền

Mục tiêu: đúng người, đúng khách, đúng phòng ban, đúng dữ liệu giao hàng.

Tasklist:

- [ ] Tạo đủ phòng Vận hành 1, Vận hành 2, Thu mua, Kế toán, Kho/Giao nhận.
- [ ] Tạo tài khoản theo vai trò thật; không dùng chung tài khoản.
- [ ] Gán sale/phòng phụ trách khách pilot.
- [ ] Bổ sung SĐT, địa chỉ mặc định và người nhận cho khách pilot.
- [ ] Reset mật khẩu có nút sao chép cả username + password; bắt đổi lần đầu.
- [ ] Gán bảng giá riêng/nhóm cho khách pilot.

Test bắt buộc:

| ID | Kịch bản | Kết quả bắt buộc |
|---|---|---|
| RBAC-01 | Admin | Toàn quyền đúng thiết kế |
| RBAC-02 | Sale/Vận hành | Chỉ khách/đơn thuộc phạm vi |
| RBAC-03 | Thu mua | Xem/xử lý chuyên môn, không kích hoạt giá |
| RBAC-04 | Kế toán | Tạo/import draft, quản lý công nợ |
| RBAC-05 | CEO/người được ủy quyền | Duyệt/kích hoạt giá |
| ACC-01 | Reset mật khẩu | Sao chép đúng chữ hoa/thường; bắt đổi lần đầu |
| ACC-02 | Khách có địa chỉ | Form tự điền đúng |
| ACC-03 | Khách chưa có địa chỉ | Form để trống và bắt nhập |

Cổng đạt: không có quyền thừa; 100% khách pilot có thông tin liên hệ, địa chỉ, bảng giá và người phụ trách.

### Phase 3 — Đặt hàng đa kênh

Mục tiêu: Website, Mini App và POS tạo cùng một loại đơn với cùng giá và quy tắc.

Ma trận test tối thiểu:

| ID | Kênh | Kịch bản |
|---|---|---|
| ORD-W01 | Website | Khách đăng nhập, tìm hàng, thêm giỏ, chọn ngày/ca/địa chỉ, đặt đơn |
| ORD-Z01 | Mini App | Luồng tương tự Website; giữ bước Zalo COD để đáp ứng xét duyệt |
| ORD-P01 | POS | Sale tìm khách, tìm hàng, áp đúng bảng giá, tạo đơn hộ |
| ORD-X01 | Excel | Upload đơn, preview lỗi, commit đúng SKU/số lượng |
| ORD-01 | Tất cả | Giá hiển thị = giá lưu order item |
| ORD-02 | Tất cả | Ghi chú dòng hàng được giữ nguyên |
| ORD-03 | Tất cả | Nhấn đặt hai lần không tạo đơn trùng |
| ORD-04 | Tất cả | Sau 17:00 chọn ngày không hợp lệ bị chặn/cảnh báo đúng |
| ORD-05 | Tất cả | Mất mạng/timeout có thể thử lại an toàn |
| ORD-06 | Tất cả | Sản phẩm không có giá không thể xác nhận |

Mục tiêu hiệu năng:

- Danh mục/trang đầu p95 ≤ 2 giây trên mạng 4G thực tế.
- Tìm kiếm p95 ≤ 500 ms sau debounce.
- Thêm vào giỏ phản hồi giao diện ≤ 100 ms.
- Tạo đơn p95 ≤ 3 giây; tỷ lệ lỗi < 1%.

Cổng đạt: mỗi kênh hoàn tất ít nhất 10 đơn test; không lệch giá, không trùng đơn, không mất giỏ/ghi chú.

### Phase 4 — Xử lý đơn từ đặt đến xác nhận

Luồng chuẩn Phase 1:

`Đã đặt hàng → Vận hành kiểm tra/xử lý → phối hợp Thu mua bổ sung/đổi/giá → người có quyền xác nhận → Đã xác nhận + PDF`

Test bắt buộc:

| ID | Kịch bản | Kết quả bắt buộc |
|---|---|---|
| FLOW-01 | Đơn đủ giá | Chốt và tạo PDF R1 |
| FLOW-02 | Một dòng thiếu giá | Không được xác nhận |
| FLOW-03 | Sale thêm sản phẩm mới | Tạo sản phẩm đầy đủ + audit; đơn cập nhật đúng |
| FLOW-04 | Khách yêu cầu sửa trước xác nhận | Sale xử lý, lưu lý do |
| FLOW-05 | Sửa sau xác nhận | Yêu cầu đúng quyền, tạo revision mới |
| FLOW-06 | Hủy đơn | Lưu người/lý do/thời gian; không tính vào đơn tổng |
| FLOW-07 | In phiếu tạm | Chỉ trước xác nhận |
| FLOW-08 | Phiếu xác nhận | Đúng giá, SL, địa chỉ, logo, revision, checksum |

Cổng đạt: không thể bỏ qua bước kiểm giá; mọi điều chỉnh có audit; PDF tái tạo đúng snapshot.

### Phase 5 — Gộp đơn, đơn tổng và soạn hàng

Test bắt buộc:

| ID | Kịch bản | Kết quả bắt buộc |
|---|---|---|
| MERGE-01 | Cùng khách/ngày/địa chỉ/bảng giá | Gộp thành công |
| MERGE-02 | Khác khách/ngày/địa chỉ | Bị chặn và nêu lý do |
| MERGE-03 | Cùng SKU, cùng giá/quy cách/note | Cộng số lượng |
| MERGE-04 | Cùng SKU nhưng khác note/giá/quy cách | Giữ dòng riêng |
| MERGE-05 | Double-click/retry | Chỉ tạo một đơn mới |
| MERGE-06 | Lỗi giữa transaction | Rollback toàn bộ |
| MERGE-07 | Sau gộp | Đơn nguồn bị xóa, audit snapshot còn đủ, số liệu không trùng |
| PROC-01 | Xuất đơn tổng | Tổng SKU = tổng chi tiết đơn hợp lệ |
| PROC-02 | Lọc ngày/ca/tuyến | Không lẫn đơn khác phạm vi |
| PROC-03 | Thay đổi sau xuất | Hiện rõ phần chênh, không sửa ngầm |
| PACK-01 | Hai nhân viên cùng nhận soạn | Chỉ một người claim thành công |

Cổng đạt: tổng nhu cầu hàng và tổng tiền khớp 100%; không có đơn hoặc SKU bị tính hai lần.

### Phase 6 — Giao hàng, hóa đơn và công nợ

Test bắt buộc:

| ID | Kịch bản | Kết quả bắt buộc |
|---|---|---|
| DEL-01 | Giao đủ | Thực giao = đặt; hoàn thành được |
| DEL-02 | Giao thiếu | Tiền/hóa đơn/công nợ giảm đúng; có lý do |
| DEL-03 | Đổi hàng | Giữ liên kết hàng cũ/mới và audit |
| DEL-04 | Chưa xác nhận thực giao | Không được hoàn thành |
| DOC-01 | Phiếu giao hàng | Chỉ xuất sau xác nhận/chuẩn bị giao |
| DOC-02 | Hóa đơn bán hàng | Chỉ xuất khi hoàn thành |
| PAY-01 | COD | Thu và ghi nhận đúng |
| PAY-02 | Công nợ | Tăng công nợ đúng khách |
| PAY-03 | Thu một phần/nhiều lần | Tổng đã trả và dư nợ chính xác |
| PAY-04 | Vượt hạn mức | Chặn hoặc yêu cầu người có quyền duyệt + lý do |

Cổng đạt: đối chiếu `tổng hóa đơn = thực giao + phí - giảm`; công nợ khách khớp tuyệt đối.

### Phase 7 — Thông báo và tích hợp

Tasklist:

- [ ] Thông báo khi đặt đơn, xác nhận, điều chỉnh, đang giao và hoàn thành.
- [ ] Nếu ZNS chưa được phê duyệt, dùng push/web + mẫu Zalo thủ công có audit trong pilot.
- [ ] Mọi gửi thất bại phải retry có giới hạn và không làm rollback đơn hàng.
- [ ] Không gửi trùng khi API retry.
- [ ] Nội dung thông báo dùng mã đơn, trạng thái, tổng tiền/chứng từ phù hợp; không lộ dữ liệu khách khác.

Cổng đạt: ≥ 98% thông báo test được gửi một lần; lỗi gửi có log và cơ chế xử lý lại.

### Phase 8 — Pilot 10 đơn thật chạy song song KiotViet

Chọn ít nhất:

- 3 khách khác nhau.
- 1 khách giá riêng, 1 khách giá nhóm, 1 khách giá chung.
- 1 dòng kg thập phân hợp lệ.
- 1 dòng có ghi chú quy cách.
- 1 mặt hàng cần bổ sung giá.
- 1 đơn gộp.
- 1 đơn điều chỉnh.
- 1 đơn giao thiếu.
- 1 đơn công nợ và 1 đơn COD.
- Đủ cả Website, Mini App và POS.

Đối chiếu từng đơn với KiotViet:

- Mã khách, SKU, đơn vị, số lượng đặt, số lượng giao.
- Đơn giá và nguồn giá.
- Tổng tiền, đã trả, công nợ.
- File đơn tổng.
- Phiếu xác nhận, phiếu giao, hóa đơn.
- Thời gian thao tác và lỗi phát sinh.

Cổng đạt:

- 10/10 đơn hoàn tất mà không sửa DB tay.
- 100% số tiền/SKU/số lượng khớp hoặc chênh có lý do được duyệt.
- Không có lỗi Sev-1/Sev-2.
- Thời gian thao tác trung bình không chậm hơn KiotViet quá 10%.

### Phase 9 — Kiểm thử tải và diễn tập sự cố

Kịch bản tải:

- 100 người dùng đồng thời xem/tìm sản phẩm.
- 30 người đồng thời tạo/chỉnh đơn quanh 16:30–17:00.
- 150 đơn/ngày, trung bình 20 dòng/đơn.
- Xuất 500 đơn và đơn tổng 10.000 dòng.
- Import bảng giá 5.295 SKU × nhiều bảng giá.

Kịch bản sự cố:

- Vercel lỗi deployment: rollback bản trước.
- Supabase chậm/timeout: retry idempotent, không tạo trùng.
- Lỗi tạo PDF: đơn vẫn giữ trạng thái hợp lệ và có nút tạo lại.
- Lỗi gửi thông báo: đưa vào hàng chờ retry.
- Mất dữ liệu giả lập: restore staging và đo RTO/RPO.

Cổng đạt:

- API quan trọng p95 < 3 giây, lỗi < 1%.
- Không sai số hoặc trùng đơn dưới tải.
- Pilot đặt mục tiêu RPO ≤ 24 giờ và RTO ≤ 4 giờ; muốn vận hành độc lập phải cải thiện thêm theo gói hạ tầng.

### Phase 10 — Go-live theo đợt

1. Tuần 1: 10 đơn/ngày, chạy song song KiotViet.
2. Tuần 2: 30–50 đơn/ngày cho một nhóm bếp.
3. Tuần 3: 50% đơn Phase 1; KiotViet vẫn là đối chiếu dự phòng.
4. Tuần 4: 100% đơn đặt hàng trên TPS1 nếu ba tuần trước đạt.
5. Chỉ ngừng nhập đơn ở KiotViet sau khi Kế toán, Vận hành, Thu mua và Ban Giám đốc ký biên bản đối soát.

Điều kiện go-live cuối:

- 0 lỗi Sev-1/Sev-2 đang mở.
- 100% test critical đạt; ≥ 95% test còn lại đạt và có kế hoạch cho phần chưa đạt.
- Hai chu kỳ bảng giá được import/kích hoạt thành công.
- Ít nhất 100 đơn thật chạy hoàn chỉnh và đối soát đúng.
- Backup/restore, rollback, tài liệu hướng dẫn và người trực hỗ trợ đã sẵn sàng.

## 5. Phân loại lỗi và quyền quyết định

| Mức | Ví dụ | Hành động |
|---|---|---|
| Sev-1 | Lộ dữ liệu, sai giá hàng loạt, mất đơn, sai công nợ | Dừng pilot ngay, rollback |
| Sev-2 | Không đặt/chốt/xuất đơn tổng được; tạo đơn trùng | Dừng nhánh nghiệp vụ, sửa trước khi tiếp tục |
| Sev-3 | Một vai trò hoặc một chứng từ lỗi có workaround an toàn | Sửa trong ngày/pilot kế tiếp |
| Sev-4 | Câu chữ, căn chỉnh, thẩm mỹ nhỏ | Ghi backlog, không chặn pilot |

Quyền ký đạt:

- Bảo mật/hạ tầng: Admin hệ thống + người phụ trách kỹ thuật.
- Bảng giá/công nợ: Kế toán + CEO/người được ủy quyền.
- Đơn hàng/soạn/giao: Trưởng phòng Vận hành + Thu mua.
- Go-live cuối: Ban Giám đốc.

## 6. Thứ tự công việc đề xuất ngay từ phiên tiếp theo

1. Vá RLS/grants production và viết test chống truy cập trái phép.
2. Hoàn tất, review và deploy API bảng giá còn thiếu.
3. Thay toàn bộ price resolver cũ bằng price book mới ở Website/Mini App/POS/RPC tạo đơn.
4. Hoàn thiện min/step/quy cách và áp dữ liệu thử cho nhóm rau/trứng/thịt.
5. Tạo đủ tài khoản phòng ban và bộ khách pilot.
6. Chạy Phase 1–3 bằng dữ liệu test.
7. Chạy một đơn E2E đầy đủ, sau đó bộ 10 đơn thật song song KiotViet.

Không nên tiếp tục mở rộng kho, mua hàng hoặc kế toán trước khi sáu bước trên đạt, vì mọi phân hệ sau đều phụ thuộc độ đúng của sản phẩm, giá, khách hàng và đơn hàng.
