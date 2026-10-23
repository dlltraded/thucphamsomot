# SEO Tuần 2 — đo tốc độ, kiểm tra schema, chuẩn bị Search Console (23/10/2026)

Thuộc plan `docs/SEO_PLAN_CAI_THIEN_WEBSITE_2026-10-22.md`, mục 3 "Tuần 2" (việc 7, 8, 9).

---

## 1. Tốc độ trên điện thoại (SEO-04)

**Cách đo:** Lighthouse 12.6 cấu hình mobile mặc định (giống PageSpeed Insights), chạy từ máy văn phòng ở Việt Nam, mỗi trang 3 lần, lấy lần ở giữa. API PageSpeed Insights hết lượt miễn phí trong ngày nên chưa dùng được; khi có số PSI chính thức thì ghi thêm vào bảng.

**Không có số "trước WEB-01":** phần catalog render phía server đã lên web trước khi đo, nên bảng dưới là số **sau WEB-01**.

| Trang | Điểm | LCP | FCP | TBT | CLS |
|---|---|---|---|---|---|
| `/` | 44 | 4,6 s | 3,0 s | 4.214 ms | 0,017 |
| `/san-pham` | 51 | 4,5 s | 2,7 s | 1.411 ms | 0,000 |
| `/danh-muc/rau-cu-qua` | 53 | 4,5 s | 2,8 s | 1.059 ms | 0,024 |
| `/danh-muc/thit-heo` | 49 | 4,9 s | 2,9 s | 1.169 ms | 0,003 |
| `/gioi-thieu` | 63 | 4,0 s | 2,5 s | 871 ms | 0,010 |

Ngưỡng "tốt" của Google: LCP ≤ 2,5 s, CLS ≤ 0,1, TBT càng thấp càng tốt (INP thực tế chỉ có khi đủ dữ liệu người dùng thật trong Search Console).

**Kết luận:** CLS đã tốt ở mọi trang. LCP đều trên 4 s (mức "kém"). Trang chủ nặng nhất.

### Nguyên nhân tìm được

1. **Hình lớn đầu các trang con bị tải chậm (lazy).** Đây chính là phần tử LCP của 21 trang dùng `PageShell` (danh mục, dịch vụ, chính sách...). Trên `/danh-muc/thit-heo`, trình duyệt chờ 1,4 s mới bắt đầu tải hình. → **Đã sửa** (`priority` trong `components/page-shell.tsx`), cần đo lại sau khi deploy.
2. **Hiệu ứng 3D ở trang chủ** (`components/b2b/three-background.tsx`, thư viện Three.js):
   - `<Environment preset="city" />` tải một file ảnh môi trường **1,5 MB từ raw.githubusercontent.com** mỗi lần mở trang chủ.
   - Script 3D chiếm khoảng 3,2 s xử lý trên điện thoại giả lập, là lý do chính khiến TBT trang chủ lên 4,2 s.
   - → **Chưa sửa, chờ chủ web quyết** vì sẽ thay đổi giao diện (xem mục 4).
3. TTFB khoảng 0,9–1 s ở mọi trang (máy chủ Vercel trả HTML). Theo dõi thêm, chưa phải ưu tiên.

---

### Sau khi sửa (đo lại trên web thật, commit cb4d66b)

Đã làm: hình đầu trang con tải ngay (`priority`), tắt hiệu ứng 3D trên điện thoại (phương án A, chủ web chọn). Cùng cách đo như trên.

| Trang | Điểm trước → sau | LCP trước → sau | TBT trước → sau |
|---|---|---|---|
| `/` | 44 → **53** | 4,6 → 4,7 s | 4.214 → **995 ms** |
| `/san-pham` | 51 → 54 | 4,5 → 4,5 s | 1.411 → 1.056 ms |
| `/danh-muc/rau-cu-qua` | 53 → 53 | 4,5 → 4,5 s | 1.059 → 1.022 ms |
| `/danh-muc/thit-heo` | 49 → 54 | 4,9 → 4,6 s | 1.169 → 973 ms |
| `/gioi-thieu` | 63 → 58 | 4,0 → 4,1 s | 871 → 1.128 ms |

Lighthouse dao động vài điểm giữa các lần đo (trang chủ lần 3 đạt 77), nên chênh lệch nhỏ ở `/gioi-thieu` và `/danh-muc/rau-cu-qua` nằm trong sai số.

**Kết quả:** TBT trang chủ giảm hơn 4 lần. LCP chưa đổi đáng kể, vẫn khoảng 4,5 s.

**Việc tiếp theo để hạ LCP** (chưa làm):
- Mỗi trang tải **15–18 file font** Be Vietnam Pro (gói `@fontsource`, đủ mọi bảng chữ), cộng một file CSS 51 KB chặn hiển thị khoảng 0,3 s. Chuyển sang `next/font` chỉ lấy bộ chữ tiếng Việt + Latin sẽ bớt phần lớn số file này.
- Hình hero trang chủ (ảnh kho hàng) nên có bản nhỏ riêng cho điện thoại.

---

## 2. Dữ liệu có cấu trúc (việc 9)

Kiểm tra bằng script đọc toàn bộ JSON-LD trên trang thật và đối chiếu các trường bắt buộc theo tài liệu Google. Công cụ Rich Results Test của Google không chạy xong trong trình duyệt tự động; có thể bấm thử trực tiếp:
<https://search.google.com/test/rich-results?url=https%3A%2F%2Fthucphamsomot.vn%2Fdanh-muc%2Fthit-heo>

| Trang | Schema có trên trang | Kết quả |
|---|---|---|
| `/` | LocalBusiness, WebSite | Đủ trường |
| `/san-pham` | LocalBusiness, WebSite | Đủ trường |
| `/danh-muc/rau-cu-qua`, `/danh-muc/thit-heo` | + BreadcrumbList, FAQPage | Đủ trường, breadcrumb đúng thứ tự |
| `/nganh-hang/truong-hoc` | + BreadcrumbList | Đủ trường |
| `/cung-cap-thuc-pham-cho-truong-hoc` | + FAQPage, Service, BreadcrumbList | Đủ trường |
| `/blog/du-bao-gia-thit-heo-cuoi-nam-2026` | + BreadcrumbList, BlogPosting | Đủ trường (headline, datePublished, author, image) |
| `/gioi-thieu`, `/lien-he`, `/blog` | LocalBusiness, WebSite | Đủ trường |

Không có lỗi JSON, không thiếu trường bắt buộc.

---

## 3. Search Console (việc 8)

- DNS của `thucphamsomot.vn` **đã có bản ghi `google-site-verification`**, nên property dạng Domain nhiều khả năng đã được xác minh.
- Claude không đăng nhập được Search Console, các bước dưới do chủ web làm (khoảng 15 phút).

**Bước làm:**
1. Search Console → chọn property `thucphamsomot.vn` → **Sơ đồ trang web (Sitemaps)** → nhập `sitemap.xml` → Gửi.
2. **Kiểm tra URL (URL Inspection)** lần lượt 10 URL dưới đây → bấm **Yêu cầu lập chỉ mục**.
3. Sau 3–7 ngày, ghi trạng thái vào cột cuối và gửi lại để cập nhật bảng.

| # | URL | Trạng thái index |
|---|---|---|
| 1 | https://thucphamsomot.vn/ | |
| 2 | https://thucphamsomot.vn/san-pham | |
| 3 | https://thucphamsomot.vn/danh-muc/rau-cu-qua | |
| 4 | https://thucphamsomot.vn/danh-muc/thit-heo | |
| 5 | https://thucphamsomot.vn/danh-muc/thit-bo | |
| 6 | https://thucphamsomot.vn/danh-muc/gia-cam | |
| 7 | https://thucphamsomot.vn/danh-muc/hai-san | |
| 8 | https://thucphamsomot.vn/danh-muc/hang-dong-lanh | |
| 9 | https://thucphamsomot.vn/danh-muc/do-kho | |
| 10 | https://thucphamsomot.vn/danh-muc/gia-vi | |

Trang `/danh-muc/thuc-pham-chay`, các trang ngành hàng, khu vực và blog sẽ được Google tự tìm qua sitemap.

---

## 4. Việc cần chủ web quyết

**Hiệu ứng 3D trang chủ.** Ba lựa chọn:

| Phương án | Giao diện | Tốc độ |
|---|---|---|
| A. Tắt 3D trên điện thoại, giữ trên máy tính | Điện thoại mất các chấm xanh chuyển động; máy tính giữ nguyên | Cải thiện lớn nhất trên mobile (Google chấm điểm theo mobile) |
| B. Chỉ bỏ file ảnh môi trường 1,5 MB | Quả cầu xanh bớt phản chiếu ánh sáng, còn lại giữ nguyên | Bớt 1,5 MB tải về; TBT giảm ít |
| C. Giữ nguyên | Không đổi | Không cải thiện |
