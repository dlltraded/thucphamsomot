# Kế hoạch SEO: cung cấp thực phẩm cho trường học, nhà máy, cơ quan (10/2026)

Mục tiêu: khi tìm "cung cấp thực phẩm cho trường học / nhà máy / xí nghiệp / cơ quan" (kèm hoặc không kèm "Đồng Nai", "Biên Hòa"), thucphamsomot.vn lên trang 1 Google.

## 1. Hiện trạng (kiểm tra ngày 19/10/2026)

Thứ hạng Google (tra từ trình duyệt đã đăng nhập, có thể lệch vài bậc do cá nhân hóa):

| Từ khóa | TPS1 | Trang đứng đầu |
|---|---|---|
| cung cấp thực phẩm cho nhà máy đồng nai | #1 (trang chủ) | |
| cung cấp thực phẩm cho bếp ăn công nghiệp đồng nai | #1 (trang chủ) | |
| cung cấp thực phẩm khu công nghiệp đồng nai | #1 (trang chủ) | |
| cung cấp thực phẩm biên hòa | #1 (trang chủ) | |
| nhà cung cấp thực phẩm đồng nai | #4 | |
| cung cấp thực phẩm cho trường học đồng nai | ngoài top 20 | suatancongnghiepdongnai.com, com365.vn, thucphamtuoisongdongnai.com |
| cung cấp thực phẩm cho trường học | ngoài top 20 | thucphammamnon.com |
| cung cấp thực phẩm cho cơ quan | ngoài top 20 | kamereo.vn, zinfood.com |
| cung cấp thực phẩm cho xí nghiệp | ngoài top 20 | occ.vn, suatancongnghiepdongnai.com |

Nguyên nhân chính: chưa có trang riêng nhắm đúng các từ khóa trường học / cơ quan / xí nghiệp. Đối thủ đứng top đều có URL và tiêu đề trùng từ khóa.

Lỗi kỹ thuật phát hiện trên web thật:

- 13 trang khu vực hiển thị FAQ nội bộ cho khách ("Trang này dành cho ai?", "Sau khi đọc xong nên làm gì?"); trang Đồng Nai, Biên Hòa, Bình Dương, Bà Rịa - Vũng Tàu còn lộ ghi chú SEO ("Keyword nào phù hợp nhất?", "Nên đo hiệu quả trang này bằng gì?", "CTA rõ", "bài vệ tinh"...).
- 4 link nội bộ trỏ vào `/kien-thuc/...` không tồn tại (404).
- Trang `/nganh-hang/truong-hoc` có title Google chỉ là "Trường học | Thực Phẩm Số Một"; các trang ngành hàng khác tương tự.

## 2. Giai đoạn 1: đã làm trong đợt này

Trang mới (có Service, FAQPage, BreadcrumbList schema; nằm trong sitemap; nối link từ footer toàn site):

| URL | Từ khóa chính | Từ khóa phụ |
|---|---|---|
| `/cung-cap-thuc-pham-cho-truong-hoc` | cung cấp thực phẩm cho trường học | ... đồng nai, ... biên hòa, thực phẩm bếp bán trú, trường mầm non |
| `/cung-cap-thuc-pham-cho-nha-may` | cung cấp thực phẩm cho nhà máy | ... xí nghiệp, ... khu công nghiệp, bếp ăn công nhân |
| `/cung-cap-thuc-pham-cho-co-quan` | cung cấp thực phẩm cho cơ quan | bếp ăn văn phòng, bếp ăn doanh nghiệp |

Sửa lỗi:

- Viết lại toàn bộ FAQ và đoạn nội dung bị lộ ghi chú ở các trang khu vực thành nội dung cho khách đọc.
- Thay 4 link `/kien-thuc/...` chết bằng link tới các trang mới.
- Đặt lại title cho 5 trang ngành hàng (ví dụ "Thực phẩm cho bếp ăn trường học, bán trú") và thêm link từ trang ngành hàng sang trang landing tương ứng, tránh hai trang tranh cùng một từ khóa.

Nguyên tắc nội dung đã áp dụng:

- Xưng hô theo đối tượng: TPS1 ↔ "nhà trường", "quý doanh nghiệp", "quý cơ quan". Không dùng "anh chị" trên website.
- Chỉ dùng số liệu đã xác minh: ISO 22000 & HACCP, bảo hiểm trách nhiệm sản phẩm 5 tỷ, 109+ khách hàng, 99,8% giao đúng hẹn, báo giá 24 giờ, xác nhận 30 phút. Không bịa tên trường, câu chuyện khách hàng.

## 3. Giai đoạn 2: việc cần làm ngay sau khi deploy (tuần 1)

Phải do người có tài khoản thực hiện:

1. **Google Search Console**: gửi lại `https://thucphamsomot.vn/sitemap.xml`, dùng "Kiểm tra URL" → "Yêu cầu lập chỉ mục" cho 3 trang mới và trang `/cung-cap-thuc-pham-dong-nai`.
2. **Google Business Profile** (Google Maps):
   - Danh mục chính: "Nhà cung cấp thực phẩm" (Food products supplier); thêm danh mục phụ "Nhà bán buôn thực phẩm".
   - Mục Dịch vụ: thêm "Cung cấp thực phẩm cho trường học", "... cho nhà máy, xí nghiệp", "... cho cơ quan", mỗi dịch vụ gắn link tới trang tương ứng.
   - Đăng ảnh thật: kho, xe giao, hàng đang soạn; đăng 1 bài cập nhật mỗi tuần.
   - Xin đánh giá từ khách đang lấy hàng (mục tiêu 10 đánh giá thật trong tháng đầu). Không mua đánh giá.
3. Kiểm tra form báo giá ghi nhận được nguồn trang (để đo trang nào ra khách).

## 4. Giai đoạn 3: nội dung hỗ trợ (tháng 1–2)

Mỗi tuần 1 bài blog, mỗi bài link về trang landing tương ứng. Đề xuất chủ đề (cần người am hiểu nghiệp vụ duyệt số liệu trước khi đăng):

Trường học:
- Hồ sơ nhà cung cấp thực phẩm mà bếp ăn bán trú cần lưu
- Kiểm thực ba bước và lưu mẫu 24 giờ: bếp trường cần chuẩn bị gì từ khâu nhận hàng
- Gợi ý thực đơn bán trú mầm non theo mùa và nguyên liệu dễ mua ổn định

Nhà máy, xí nghiệp:
- Cách tính định mức nguyên liệu cho bếp ăn công nhân theo số suất
- Chọn nhà cung cấp thực phẩm cho nhà máy: danh sách hồ sơ cần xin
- Xử lý thiếu hàng khi nhà máy tăng ca đột xuất

Cơ quan:
- Thủ tục chọn nhà cung cấp thực phẩm cho bếp ăn cơ quan
- Báo giá thực phẩm theo danh mục: mẫu và cách đối chiếu

## 5. Giai đoạn 4: uy tín bên ngoài (tháng 2–3)

- Đăng thông tin doanh nghiệp lên các danh bạ doanh nghiệp Việt Nam uy tín, thống nhất tên, địa chỉ, số điện thoại (NAP) giống hệt website và Google Business Profile.
- Xin link từ đối tác, hiệp hội doanh nghiệp Đồng Nai, nhà cung cấp đầu nguồn (HTX, nông trại) đang hợp tác.
- Viết case study thật với khách đồng ý công khai tên (ví dụ một trường, một nhà máy), có ảnh giao hàng thật.

## 6. Đo kết quả

Theo dõi hằng tháng trong Search Console: số lần hiển thị và vị trí trung bình của các từ khóa ở mục 1; số yêu cầu báo giá đến từ 3 trang mới. Đánh giá lại sau 8–12 tuần: trang mới thường cần vài tuần để Google lập chỉ mục và xếp hạng ổn định.

## 7. Rủi ro còn tồn tại

- Trang `/cung-cap-thuc-pham-bien-hoa` và trang chủ cùng nhắm "cung cấp thực phẩm Biên Hòa"; hiện trang chủ đang đứng #1 nên chưa xử lý, theo dõi thêm.
- Phần nội dung các trang khu vực còn mỏng và na ná nhau (13 trang). Nên viết lại dần mỗi trang với chi tiết riêng của khu vực (khu công nghiệp, tuyến giao) thay vì nhân bản.
