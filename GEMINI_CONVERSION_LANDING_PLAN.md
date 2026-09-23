# TPS1 — Kế hoạch tối ưu chuyển đổi Google Ads

## Mục tiêu

Tối ưu trang chủ và tạo landing page báo giá để khách truy cập từ Google Ads có thể để lại thông tin trong vài giây, không cần đọc toàn bộ website hoặc đi qua nhiều bước.

Mục tiêu kinh doanh chính là **lead báo giá B2B hợp lệ**, không phải page view hay số lượt bấm CTA.

## Bối cảnh hiện tại

- Trang chủ đã có tốc độ tốt và nội dung B2B rõ.
- CTA hero hiện tại đưa khách xuống `#rfq-form`, nhưng form nằm khá xa và có nhiều bước trước khi nhập thông tin.
- Form hiện tại hỗ trợ upload file và nhiều trường dữ liệu, phù hợp lead đã sẵn sàng nhưng chưa tối ưu cho khách mới từ quảng cáo.
- Không được làm chậm homepage bằng thư viện form, popup nặng hoặc script tracking mới không cần thiết.

## Quyết định UX

### 1. Form báo giá nhanh trong hero

Thêm một card hiển thị ngay trong màn hình đầu tiên, cạnh nội dung hero.

Tiêu đề card:

> Nhận báo giá thực phẩm trong 24h

Trường bắt buộc ở bước 1:

1. Tên công ty / bếp
2. Số điện thoại
3. Nhóm hàng cần mua hoặc nhu cầu ngắn

Nút submit:

> Nhận báo giá trong 24h

Trường bổ sung như email, khu vực giao, sản lượng, tần suất giao và file Excel/PDF chỉ là bước 2, không được chặn việc tạo lead nhanh.

### 2. Sticky CTA trên mobile

Trên màn hình nhỏ, thêm thanh CTA cố định phía dưới:

- `Nhận báo giá 24h`
- `Gọi ngay`

Thanh này không được che nội dung, không dùng popup toàn màn hình và không xuất hiện trên desktop.

### 3. Landing page riêng cho quảng cáo

Tạo route:

```text
/nhan-bao-gia
```

Trang phải có:

- Hero + form nhanh ngay đầu trang.
- Nội dung khớp với thông điệp quảng cáo.
- 3 lợi ích ngắn.
- Bằng chứng tin cậy: ISO/HACCP, khu vực giao, khách B2B.
- Quy trình 3 bước.
- Form chi tiết tùy chọn phía dưới.
- CTA gọi điện/Zalo.

Không cần đưa toàn bộ menu SEO, danh sách khu vực và bài viết lên landing page quảng cáo. Không được dùng redirect sang domain khác.

### 4. Thống nhất thông điệp CTA

Dùng thống nhất:

```text
Nhận báo giá thực phẩm trong 24h
```

CTA phụ:

```text
Xem danh mục sản phẩm
```

`Cổng Đối Tác VIP` vẫn giữ ở header cho khách hiện hữu nhưng không được cạnh tranh thị giác với CTA báo giá chính trong hero.

## Luồng dữ liệu

```text
Google Ads
  -> /nhan-bao-gia?utm_source=google&utm_medium=cpc...
  -> Form nhanh 3 trường
  -> POST /api/quote
  -> lead được lưu như luồng hiện tại
  -> màn hình xác nhận + gọi/Zalo tùy chọn
  -> khách có thể bổ sung file/thông tin chi tiết
```

Không tạo API lưu lead mới nếu `/api/quote` hiện tại đã đáp ứng. Tái sử dụng schema, cookie notice, Meta Lead và Google Ads conversion đang có.

## Tracking bắt buộc

Thêm hoặc chuẩn hóa các event:

- `view_quote_form`
- `start_quote_form`
- `phone_click`
- `zalo_click`
- `quote_submit_success`
- `quote_submit_error`

Mỗi lead phải giữ lại:

- `utm_source`
- `utm_medium`
- `utm_campaign`
- `utm_content`
- `utm_term`
- `gclid` nếu có
- `fbclid` nếu có
- `pagePath`

Không gửi số điện thoại hoặc nội dung lead vào console log, analytics URL hoặc third-party script không được phê duyệt.

## Tasklist triển khai

### G0 — Khảo sát và khóa phạm vi

- [ ] Đọc `components/b2b/hero-section.tsx`, `components/b2b/lead-capture.tsx`, `components/quote-portal.tsx`, `app/api/quote/route.ts`.
- [ ] Xác định schema payload hiện tại và trường nào bắt buộc ở backend.
- [ ] Kiểm tra conversion Google Ads hiện tại: `AW-18295927026/QigLCM2X-8kcEPLhlpRE`.
- [ ] Không sửa luồng Cổng Đối Tác VIP, `dathang`, `sale-webapp` trong phase này.

### G1 — Form nhanh dùng chung

- [ ] Tạo client component riêng, ví dụ `components/b2b/quick-quote-form.tsx`.
- [ ] Tái sử dụng POST `/api/quote`.
- [ ] Bắt buộc validate công ty, số điện thoại và nhu cầu.
- [ ] Validate số điện thoại Việt Nam ở mức thân thiện; không chặn số hợp lệ chỉ vì format.
- [ ] Hiển thị trạng thái loading, lỗi và thành công rõ ràng.
- [ ] Giữ UTM/GCLID/FBCLID từ URL.
- [ ] Không bắt upload file ở bước nhanh.
- [ ] Sau submit thành công cho phép gọi điện hoặc mở Zalo.

### G2 — Hero homepage

- [ ] Đưa form nhanh vào hero desktop ở cột phải.
- [ ] Trên mobile đặt form ngay sau headline và trước các section dài.
- [ ] Giữ hero nhẹ: không thêm ảnh lớn, video nền, carousel hoặc thư viện UI mới.
- [ ] Chỉ còn một CTA chính nổi bật.
- [ ] CTA phụ dẫn tới `/san-pham`.
- [ ] Giữ headline và nội dung phù hợp với quảng cáo B2B.

### G3 — Landing page Google Ads

- [ ] Tạo `app/nhan-bao-gia/page.tsx`.
- [ ] Tạo metadata riêng, title và description có cụm “báo giá thực phẩm B2B trong 24h”.
- [ ] Dùng form nhanh ở hero.
- [ ] Thêm trust proof, quy trình 3 bước và form chi tiết tùy chọn.
- [ ] Header rút gọn nhưng vẫn có logo, hotline và CTA.
- [ ] Không dùng interstitial hoặc popup bắt buộc.
- [ ] Trang cùng domain `thucphamsomot.vn`.

### G4 — Sticky mobile CTA

- [ ] Tạo component chỉ hiển thị dưới breakpoint mobile.
- [ ] Có safe-area padding cho iPhone.
- [ ] Không che input hoặc nút submit khi bàn phím mở.
- [ ] Có aria-label đầy đủ.
- [ ] Ghi event `phone_click` và `view_quote_form`/`start_quote_form` đúng thời điểm.

### G5 — Tracking và chống trùng lead

- [ ] Không gọi Meta/Google conversion hai lần cho một submit.
- [ ] Không phát conversion nếu API trả lỗi.
- [ ] Ghi event success sau khi server trả HTTP 2xx.
- [ ] Kiểm tra cookie notice success/error hiện tại không bị phá.
- [ ] Không lưu PII vào localStorage.

### G6 — QA hiệu năng và responsive

- [ ] `npm run build` pass.
- [ ] `npx tsc --noEmit` pass nếu script độc lập có sẵn.
- [ ] `git diff --check` pass.
- [ ] Kiểm tra 360px, 390px, 768px, 1280px và 1440px.
- [ ] Kiểm tra bàn phím mobile không che form.
- [ ] Lighthouse mobile: Performance tối thiểu 85, Accessibility 100, SEO 100.
- [ ] LCP homepage không tăng quá 0,3 giây so với baseline hiện tại.
- [ ] Không có third-party request mới trong initial load ngoài các script đã được phê duyệt.
- [ ] Test submit thành công, lỗi validation, lỗi API, reload sau success.

### G7 — Bàn giao

- [ ] Cập nhật `walkthrough.md` bằng số commit, route mới, payload và event tracking.
- [ ] Ghi rõ biến môi trường cần có, nếu có.
- [ ] Đính kèm ảnh desktop/mobile và kết quả Lighthouse.
- [ ] Không tự merge vào `main` nếu chưa có báo cáo nghiệm thu.

## Tiêu chí nghiệm thu

Chỉ được xem là hoàn tất khi:

1. Khách từ quảng cáo nhìn thấy form nhanh ngay trong màn hình đầu tiên.
2. Khách có thể gửi lead chỉ với 3 trường bắt buộc.
3. Lead vẫn đi qua `/api/quote` và xuất hiện trong hệ thống hiện tại.
4. UTM và click phone/Zalo được ghi nhận.
5. Mobile có CTA cố định nhưng không che nội dung.
6. Không làm hỏng form báo giá chi tiết hiện tại.
7. Không làm thay đổi luồng `dathang` hoặc `sale-webapp`.
8. Build, type check, responsive QA và Lighthouse đạt ngưỡng G6.

## Không được làm

- Không xóa form báo giá chi tiết hiện tại.
- Không đổi tên hoặc thay đổi schema `/api/quote` nếu chưa có migration.
- Không đưa API key, service role key hoặc dữ liệu khách hàng vào client.
- Không gửi PII vào Google Analytics/Meta dưới dạng raw text.
- Không thêm autoplay video, background animation nặng hoặc thư viện form lớn.
- Không thay đổi bảng giá, đơn hàng, customer login, mini app hoặc Manage App trong phase này.

