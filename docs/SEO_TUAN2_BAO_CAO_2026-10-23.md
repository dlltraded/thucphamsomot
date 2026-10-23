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

### Đợt 2: bớt font, hình hero riêng cho điện thoại (commit 1810d30)

**Đã làm:**
- Font Be Vietnam Pro chỉ còn bộ chữ tiếng Việt + Latin (`app/fonts.css`), bỏ latin-ext. Số file font mỗi trang: trang chủ 18 → 12, trang con 14–15 → 10. Đo lại kích thước chữ trên trang thật: cùng số dòng, cùng chiều cao trang, lệch tối đa 2 px trên đoạn nhiều dòng. `next/font/google` đã thử nhưng vẫn tải latin-ext nên không dùng.
- Điện thoại (≤ 768 px) dùng bản cắt giữa 480×960 của ảnh kho hàng. Khung hình giữ nguyên; điện thoại màn hình nét cao (DPR 3) giảm từ ~120 KB xuống ~52 KB.
- Dung lượng trang chủ khi đo: 763 KB → 663 KB.

**Lưu ý về cách đo:** máy đo cho chỉ số CPU (`benchmarkIndex`) dao động từ 260 đến 2.500 giữa các lần chạy, tức tốc độ máy chênh tới 10 lần. Lần đo trên web thật ngay sau deploy cho điểm 83–97 nhưng lúc đó máy chạy nhanh gấp 3–4 lần các lần trước, nên **không dùng con số đó để so**.

**So sánh công bằng:** build bản trước (08f9a9c) và bản sau (1810d30), chạy xen kẽ cũ/mới/cũ/mới trên cùng máy, rồi chỉ so các lần có tốc độ máy tương đương:

| Trang | Nhóm máy | FCP cũ → mới | LCP cũ → mới |
|---|---|---|---|
| `/` | nhanh | 3,47 → 2,80 s | 5,75 → 5,06 s |
| `/` | chậm | 3,71 → 3,00 s | 6,25 → 5,61 s |
| `/danh-muc/thit-heo` | nhanh | 3,09 → 2,59 s | 5,15 → 4,53 s |
| `/danh-muc/thit-heo` | chậm | 3,45 → 2,83 s | 6,22 → 5,80 s |
| `/gioi-thieu` | nhanh | 2,90 → 2,62 s | 5,28 → 5,16 s |
| `/gioi-thieu` | chậm | 3,06 → 2,03 s | 5,64 → 4,63 s |

(Chạy trên máy chủ local nên số tuyệt đối cao hơn web thật; chỉ dùng để so cũ/mới.)

**Kết luận:** cả 6 cặp đều nhanh hơn: chữ hiện sớm hơn 0,3–1,0 s, nội dung chính (LCP) sớm hơn 0,1–1,0 s. TBT không đổi có ý nghĩa (lên xuống theo tốc độ máy, font không ảnh hưởng TBT).

**Còn lại để hạ LCP xuống dưới 2,5 s:** số liệu thật từ người dùng (Core Web Vitals trong Search Console) sẽ chính xác hơn đo trên máy; chờ Search Console có đủ dữ liệu (thường 28 ngày) rồi quyết định bước tiếp.

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

Property `thucphamsomot.vn` (loại Miền) đã được xác minh. Đã làm ngày 23/10/2026 (Claude thao tác trên trình duyệt, chủ web đăng nhập):

- **Sitemap:** gửi `https://thucphamsomot.vn/sitemap.xml` → **Thành công, 75 URL được phát hiện**. Còn một mục cũ `sitemap_index.xml` (gửi 7/1/2026, của website WordPress trước) báo "Không thể tìm nạp"; có thể xóa cho gọn, không ảnh hưởng.
- **Yêu cầu lập chỉ mục:** đã gửi cho cả 10 URL, Google báo "Đã yêu cầu lập chỉ mục" cho từng URL.

| # | URL | Trạng thái lúc gửi (23/10) | Sau 3–7 ngày |
|---|---|---|---|
| 1 | https://thucphamsomot.vn/ | Đã có trên Google | |
| 2 | https://thucphamsomot.vn/san-pham | Đã có trên Google | |
| 3 | https://thucphamsomot.vn/danh-muc/rau-cu-qua | Đã phát hiện – chưa lập chỉ mục | |
| 4 | https://thucphamsomot.vn/danh-muc/thit-heo | Đã phát hiện – chưa lập chỉ mục | |
| 5 | https://thucphamsomot.vn/danh-muc/thit-bo | Đã phát hiện – chưa lập chỉ mục | |
| 6 | https://thucphamsomot.vn/danh-muc/gia-cam | Đã phát hiện – chưa lập chỉ mục | |
| 7 | https://thucphamsomot.vn/danh-muc/hai-san | Đã phát hiện – chưa lập chỉ mục | |
| 8 | https://thucphamsomot.vn/danh-muc/hang-dong-lanh | Đã phát hiện – chưa lập chỉ mục | |
| 9 | https://thucphamsomot.vn/danh-muc/do-kho | Đã phát hiện – chưa lập chỉ mục | |
| 10 | https://thucphamsomot.vn/danh-muc/gia-vi | Đã phát hiện – chưa lập chỉ mục | |

Trang `/danh-muc/thuc-pham-chay`, các trang ngành hàng, khu vực và blog sẽ được Google tự tìm qua sitemap.

### Báo cáo "Trang" (Google cập nhật lần cuối 16/10/2026)

**13 trang đã lập chỉ mục, 57 trang chưa.** Lý do:

| Lý do | Số trang | Ghi chú |
|---|---|---|
| Không tìm thấy (404) | 45 | Đường dẫn của website WordPress cũ, ví dụ `/thit-trung/thit-bo/`, `/rau-cu-trai-cay/rau-cu-tuoi/`, `/do-hop-do-kho/bot-cac-loai`, `/the-san-pham/...`, `/tin-tuc` |
| Đã thu thập – chưa lập chỉ mục | 5 | `/en/products`, `/nam/nam-rom-tuoi`, `/sua-cac-loai`, `/danh-muc-san-pham/thit-trung/thit-ga-vit`, `/thit-trung/thit-ga-vit` (đa số cũng là URL cũ) |
| Trang có lệnh chuyển hướng | 5 | Bình thường (URL cũ đã 308 sang URL mới) |
| Bị chặn 403 | 1 | Chưa xem chi tiết |
| Trang thay thế có thẻ chính tắc | 1 | Bình thường |

**Đã xử lý (commit 08dfe1a, 23/10):** 47 URL WordPress cũ được chuyển hướng 301 sang trang hiện có gần nhất (quy tắc trong `next.config.js`). Kiểm tra trên web thật: cả 47 về trang 200; `/blog` và `/en/products` vốn đã 200; `/gio-hang` giữ 404 có chủ đích.

| URL cũ | Chuyển về |
|---|---|
| `/rau-cu-tuoi/*`, `/rau-cu-trai-cay/*`, `/the-san-pham/*`, `/nam/*`, `/chua-phan-loai/bap-my` | `/danh-muc/rau-cu-qua` |
| `/the-san-pham/cach-bao-quan-bong-cai-xanh` | `/blog/bi-quyet-bao-quan-rau-cu-trong-kho-lanh` |
| `/thit-trung/thit-bo` | `/danh-muc/thit-bo` |
| `/thit-trung/thit-ga-vit`, `/danh-muc-san-pham/thit-trung/thit-ga-vit` | `/danh-muc/gia-cam` |
| `/hai-san/*` | `/danh-muc/hai-san` |
| `/dau-an-gia-vi/*` | `/danh-muc/gia-vi` |
| `/do-hop-do-kho/*`, `/do-uong-cac-loai/*`, `/sua-cac-loai` | `/danh-muc/do-kho` |
| `/ve-sinh-nha-cua/*`, `/chua-phan-loai` | `/san-pham` |
| `/tin-tuc`, `/blog/meo-vat-cuoc-song`, `/blog/song-khoe` | `/blog` |
| `/hop-tac` | `/lien-he` |

Đã bấm "Xác thực kết quả khắc phục" ở mục 404 ngày 23/10/2026; Search Console báo "Kết quả xác thực: đã bắt đầu". Google thường mất khoảng 2 tuần (có thể đến 28 ngày) để xác thực xong; kết quả và email thông báo gửi về tài khoản quản lý Search Console.

Core Web Vitals trong Search Console hiện "Không có dữ liệu" (chưa đủ lượt truy cập thật từ Chrome).

---

## 4. Việc cần chủ web quyết

**Hiệu ứng 3D trang chủ.** Ba lựa chọn:

| Phương án | Giao diện | Tốc độ |
|---|---|---|
| A. Tắt 3D trên điện thoại, giữ trên máy tính | Điện thoại mất các chấm xanh chuyển động; máy tính giữ nguyên | Cải thiện lớn nhất trên mobile (Google chấm điểm theo mobile) |
| B. Chỉ bỏ file ảnh môi trường 1,5 MB | Quả cầu xanh bớt phản chiếu ánh sáng, còn lại giữ nguyên | Bớt 1,5 MB tải về; TBT giảm ít |
| C. Giữ nguyên | Không đổi | Không cải thiện |
