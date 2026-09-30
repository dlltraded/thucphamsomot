# Giao việc Gemini — Hoàn thiện dữ liệu và UI trước pilot TPS1

## 1. Bối cảnh đã nghiệm thu

Backend production đã đạt 31/31 bài UAT cho các luồng: tạo đơn Admin, Website, Zalo Mini App, áp bảng giá phía server, chống tạo trùng, chốt đơn, PDF, soạn hàng, giao hàng, hóa đơn, gộp đơn xóa đơn nguồn và xuất Excel.

Không xây lại các luồng trên. Công việc này chỉ hoàn thiện giao diện và dữ liệu nền còn thiếu trước khi chạy pilot.

Số liệu hiện tại:

- 5.295 sản phẩm đang hoạt động.
- 0 sản phẩm thật đang bật kiểm tra quy cách đặt hàng.
- 278 khách hàng đang hoạt động; 40 khách có số điện thoại, 34 khách có địa chỉ.
- 3 tài khoản nhân viên đang hoạt động; cả 3 chưa gán phòng ban.

## 2. Nguyên tắc bắt buộc

1. Không sửa các file lõi đã nghiệm thu:
   - `lib/order-price-book.ts`
   - `app/api/admin/orders/**`
   - `app/api/customer/order/route.ts`
   - `app/api/admin/orders/merge/**`
   - migration bảo mật, RLS và RPC gộp đơn
   - các script `scratch/uat_*_production.mjs`
2. Không ghi trực tiếp Supabase từ trình duyệt. Mọi thay đổi dữ liệu phải qua Next.js Server API và kiểm tra quyền.
3. Không chạy SQL hoặc migration trên production. Nếu phát hiện cần đổi schema/constraint, ghi rõ trong báo cáo để Codex xử lý.
4. Không tự đoán quy cách cho 5.295 sản phẩm và không ghi hàng loạt dữ liệu giả vào production.
5. Không push/merge/deploy. Chỉ hoàn thiện code, build, test và bàn giao để Codex review.
6. Giữ tương thích ngược với client cũ. Nếu mở rộng tuple catalog, chỉ được nối thêm phần tử ở cuối.
7. Câu chữ phải là tiếng Việt nghiệp vụ tự nhiên; không dùng các cụm như “ma trận”, “đa tầng”, “an toàn tuyệt đối”, “chuẩn KiotViet” trong giao diện live.

## 3. G1 — Quản lý quy cách hàng hóa

### 3.1 Danh sách hàng hóa

Trong `manage/src/pages/ProductsPage.tsx` bổ sung các cột:

- Quy cách đóng gói (`packaging_note`)
- Số lượng tối thiểu (`min_order_qty`)
- Bước đặt hàng (`order_step`)
- Kiểm tra quy cách (`enforce_order_step`)

Yêu cầu:

- Có bộ lọc: tất cả / đã thiết lập / chưa thiết lập / đang bật kiểm tra.
- Có chỉ báo tổng số sản phẩm đã và chưa hoàn thiện quy cách.
- Danh sách vẫn phân trang phía server; không render toàn bộ 5.295 dòng cùng lúc.
- Có thao tác sửa nhanh từng dòng và sửa nhiều dòng đã chọn.
- Không dùng `alert()`/`confirm()` mặc định; dùng modal/toast của ứng dụng.

### 3.2 Chi tiết sản phẩm

Trong `manage/src/pages/ProductDetailPage.tsx` thêm nhóm “Quy cách đặt hàng”:

- Mô tả quy cách, ví dụ `Bịch 0,5kg`, `Khay 30 quả`.
- Số lượng tối thiểu.
- Bước tăng số lượng.
- Bật/tắt kiểm tra quy cách.
- Hiển thị ví dụ hợp lệ sinh tự động từ dữ liệu, ví dụ `0,5 · 1 · 1,5 kg`.

Validation:

- Khi bật kiểm tra: `min_order_qty > 0`, `order_step > 0`.
- Không nhận `NaN`, số âm hoặc quá 3 chữ số thập phân.
- `packaging_note` tối đa 120 ký tự.
- Thông báo lỗi đặt ngay cạnh trường nhập.

### 3.3 API hàng hóa

Chỉ được sửa `app/api/admin/products/route.ts` cho phạm vi này:

- GET danh sách/chi tiết trả thêm bốn trường quy cách.
- PATCH cho phép cập nhật đúng bốn trường trên.
- Kiểm tra dữ liệu và phân quyền `products.edit` ở server.
- Sau khi cập nhật phải xóa cache catalog liên quan trong cùng instance.
- Không cho sửa SKU, tồn kho hoặc nguồn dữ liệu thông qua payload quy cách.

### 3.4 Nhập quy cách hàng loạt

Tạo luồng import có hai bước:

1. Tải và xem trước.
2. Người dùng xác nhận mới lưu.

File mẫu gồm:

```text
Mã hàng | Tên hàng (đối chiếu) | Quy cách đóng gói | Số lượng tối thiểu | Bước đặt hàng | Bật kiểm tra
```

Quy tắc:

- Ghép theo mã hàng chính xác, không ghép mơ hồ theo tên.
- Preview tách rõ: hợp lệ, SKU không tìm thấy, trùng SKU, dữ liệu sai.
- Không lưu một phần nếu người dùng chưa xác nhận.
- Có file mẫu tải xuống ngay trên màn hình.
- API import phải có giới hạn kích thước và số dòng.

## 4. G2 — Cảnh báo quy cách trên ba kênh đặt hàng

Server đã chặn số lượng sai. Gemini bổ sung phản hồi sớm trên giao diện để khách không phải đợi đến lúc bấm đặt hàng.

### 4.1 API catalog

Mở rộng dữ liệu đọc tại:

- `app/api/customer/products/route.ts`
- nhánh catalog của `app/api/admin/products/route.ts`

Trả thêm:

- `packagingNote`
- `minOrderQty`
- `orderStep`
- `enforceOrderStep`

Đối với tuple catalog hiện có, nối bốn giá trị vào cuối tuple. Không thay đổi thứ tự tám phần tử cũ.

### 4.2 Website đặt hàng

Trong `order-webapp`:

- Cập nhật type/decoder catalog.
- Nút cộng/trừ dùng đúng `orderStep`, không cố định là 1.
- Khi thêm lần đầu dùng `minOrderQty` nếu có bật kiểm tra.
- Ô nhập tay báo lỗi ngay với số lượng không hợp lệ.
- Không cho qua trang xác nhận nếu giỏ còn dòng sai.
- Hiển thị quy cách ngắn dưới tên sản phẩm và trong giỏ hàng.

### 4.3 Zalo Mini App

Trong `tps1-miniapp`:

- Cập nhật type/mapper sản phẩm.
- Đồng bộ cùng một hàm kiểm tra số lượng với website về công thức và sai số thập phân.
- Nút cộng/trừ, trang chi tiết và giỏ hàng tuân thủ quy cách.
- Thông báo ngắn, ví dụ: `Sản phẩm này đặt theo bước 0,5 kg`.

### 4.4 POS/nhân viên

Trong `manage/src/pages/PosCreatePage.tsx`:

- Cập nhật decoder catalog Admin.
- Áp dụng min/bước khi nhập số lượng.
- Cho nhân viên thấy quy cách nhưng không được bỏ qua kiểm tra phía server.

Tạo một utility thuần dùng chung trong từng ứng dụng với kiểm thử cho các trường hợp:

- min 0,5 / step 0,5: nhận 0,5; 1; 1,5; từ chối 0,2 và 0,7.
- min 1 / step 1: nhận 1; 2; từ chối 0,25.
- không bật kiểm tra: nhận mọi số dương hợp lệ.

## 5. G3 — Hoàn thiện dữ liệu khách hàng

Trong `manage/src/pages/CustomersPage.tsx` và trang chi tiết khách hàng:

- Thẻ thống kê: tổng khách, thiếu SĐT, thiếu địa chỉ, thiếu cả hai.
- Bộ lọc tương ứng.
- Hiển thị rõ trạng thái hoàn thiện hồ sơ.
- Có modal sửa nhanh SĐT, email, địa chỉ, người nhận mặc định và SĐT người nhận.
- Dùng API khách hàng hiện có; nếu thiếu field thì mở rộng đúng route Admin đang quản lý khách hàng, không gọi Supabase trực tiếp.
- Chuẩn hóa SĐT Việt Nam ở mức hiển thị/validation nhưng không tự ý thay đổi dữ liệu cũ hàng loạt.
- Không làm mất phân trang, tìm kiếm và tốc độ hiện tại.

## 6. G4 — Quản lý nhân viên và phòng ban

Tạo màn hình Admin “Nhân viên & phân quyền” trong `manage`:

- Chỉ tài khoản `admin` thấy và truy cập được.
- Dùng `GET/POST/PATCH /api/admin/users` hiện có.
- Danh sách: họ tên, email, vai trò nghiệp vụ, chức vụ, phòng ban, trạng thái.
- Tạo tài khoản mới bắt buộc chọn phòng ban nếu không phải Admin hệ thống.
- Sửa vai trò, chức vụ, phòng ban, bật/tắt tài khoản.
- Có bộ lọc phòng ban, vai trò và trạng thái.
- Cảnh báo rõ nếu tài khoản chưa gán phòng ban.
- Không tự tạo vai trò hoặc chức vụ mới ngoài danh sách API cho phép.
- Không hiển thị hoặc ghi log mật khẩu.

## 7. Yêu cầu tốc độ và UX

- Không tải lại toàn bộ 5.295 sản phẩm sau mỗi lần sửa một dòng.
- Search có debounce 250–350 ms và hủy request cũ bằng `AbortController`.
- Pagination/filter nằm trên server.
- Modal dùng được trên desktop và mobile; không tràn ngang màn hình.
- Có skeleton/loading cục bộ, không khóa toàn trang.
- Mọi mutation có trạng thái đang lưu, chống bấm lặp và toast thành công/thất bại.
- Giữ nhận diện TPS1 hiện tại; không thiết kế lại toàn bộ sidebar hoặc layout ngoài phạm vi.

## 8. Kiểm thử bắt buộc

1. Admin thấy và sửa được quy cách; Sale chỉ xem nếu quyền hiện tại không cho sửa hàng hóa.
2. Lưu `0,5/0,5`, reload vẫn đúng.
3. Dữ liệu sai bị API trả 400, không chỉ chặn ở giao diện.
4. Import preview không ghi DB; chỉ commit sau khi xác nhận.
5. Website, Mini App và POS cùng chặn `0,7kg` cho sản phẩm bước `0,5kg`.
6. Client cũ đọc được tuple catalog sau khi nối thêm trường.
7. Lọc khách thiếu SĐT/địa chỉ trả đúng số liệu.
8. Admin gán phòng ban cho nhân viên và reload vẫn giữ đúng.
9. Sale không gọi được API cập nhật nhân viên.
10. Không xuất hiện request ghi trực tiếp Supabase từ client.

Chạy tối thiểu:

```text
npm run build                         (repo gốc/API)
npm run build                         (manage)
npm run build                         (order-webapp)
npm run build hoặc lệnh build hiện có (tps1-miniapp)
```

## 9. Bàn giao

Gemini phải cập nhật `walkthrough.md` gồm:

- Danh sách file đã sửa.
- Ảnh desktop/mobile của bốn màn hình chính.
- Kết quả build và test.
- Những việc chưa làm hoặc cần migration.
- Xác nhận không sửa các file lõi bị cấm.
- Xác nhận chưa push, chưa merge và chưa deploy.

Khi hoàn tất, dừng lại để Codex review. Không tự tuyên bố “sẵn sàng go-live” nếu chưa qua UAT lại.
