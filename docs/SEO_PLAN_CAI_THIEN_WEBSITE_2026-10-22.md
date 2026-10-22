# Plan cải thiện SEO thucphamsomot.vn — 22/10/2026

Nguồn: brief "Kế hoạch cải thiện website — Bản giao kỹ thuật, phiên bản 2" (22/10/2026) và kết quả kiểm tra trực tiếp code `origin/main` (commit 1557b58) cùng site thật ngày 22/10/2026.

Brief gốc giữ nguyên mã việc (SEO-xx, WEB-xx, DATA-xx...). Plan này ghi rõ việc nào đã có sẵn, việc nào còn thiếu, và thêm các lỗi tìm được khi kiểm tra mà brief chưa nêu.

---

## 1. Hiện trạng đã kiểm tra

| Mã | Yêu cầu trong brief | Thực tế trên site / code | Còn phải làm |
|---|---|---|---|
| SEO-01 | Search Console + xử lý Coverage | Trang chủ không có thẻ `google-site-verification`. Chưa biết đã xác minh bằng DNS hay chưa | Chủ web xác minh qua DNS (xem mục 4), rồi xuất bảng index |
| SEO-02 | robots.txt + sitemap tự động | **Đã đạt phần lớn.** `app/robots.ts` hợp lệ, không chặn nhầm. `app/sitemap.ts` sinh tự động 76 URL, tất cả trả 200 | Sitemap đang ghi `lastModified = now` cho mọi URL, nên Google không tin ngày này → dùng ngày sửa thật. Thêm URL danh mục mới sau WEB-02 |
| SEO-03 | noindex / canonical / trùng lặp | Không trang nào bị noindex. Canonical đúng trên 76/76 URL | `www` → apex đang **307 (tạm thời)**, cần 301/308. **Trùng nội dung**: `/san-pham/hang-dong-lanh` và `/danh-muc/hang-dong-lanh` cùng title; tương tự `thuc-pham-chay` (chi tiết ở mục 2) |
| SEO-04 | Core Web Vitals mobile | Chưa có số đo | Đo PageSpeed 3 trang mẫu trước khi làm WEB-01, đo lại sau |
| SEO-05 | Schema Organization/LocalBusiness, FAQPage, Breadcrumb | Có `LocalBusiness` + `WebSite` toàn site; `FAQPage` trên trang có FAQ. **Thiếu**: tên pháp lý, mã số thuế, `streetAddress` thiếu "phường Tam Hiệp", không có `BreadcrumbList` ở trang nào | Bổ sung thông tin pháp lý, gắn breadcrumb cho danh mục/ngành hàng/blog |
| WEB-01 | `/san-pham` render phía server | **Lỗi xác nhận.** HTML `/san-pham` có 0 sản phẩm, chỉ có chữ "Đang tải sản phẩm...". `products-grid.tsx` là client component gọi `/api/sku-products` | Việc quan trọng nhất (mục 3, tuần 1) |
| WEB-02 | URL riêng cho từng nhóm hàng | Có 5 trang `/danh-muc/*` (bài giới thiệu tĩnh) nhưng **không liệt kê sản phẩm nào**. Bộ lọc trên `/san-pham` dùng slug khác (`rau-cu`, `thit-heo`...) và chỉ là state JS; nút phân trang là `<button>`, Google không đi theo được | Gộp 2 hệ slug, mỗi nhóm có trang danh mục kèm danh sách sản phẩm và phân trang bằng link thật |
| WEB-03 | Giới thiệu + FAQ tĩnh cho danh mục | 5 danh mục hiện có đã có FAQ tĩnh + schema | Viết thêm cho các nhóm mới (thịt heo, thịt bò, gia cầm, hải sản, đồ khô) |
| WEB-04 | Title / description / H1 / alt | **20 trang có 2 thẻ H1** (`PageShell` và `ContentPage` cùng in H1): toàn bộ `/danh-muc/*`, `/san-pham/[slug]`, `/dich-vu/*`, `/chinh-sach/*`, 4 trang `/en/*`. **3 trang không có H1**: `/bao-gia`, `/en/bao-gia`, `/ho-so-nang-luc`. Title danh mục quá ngắn ("Gia vị \| Thực Phẩm Số Một"). `/san-pham/[slug]` có eyebrow và title fallback "San pham" không dấu | Sửa component dùng chung → hết lỗi H1 hàng loạt; viết lại title theo mẫu B2B |
| DATA-01 | Thay số liệu cũ | Còn **"2.000+ SKU / 2,000+"** ở `components/b2b/trust-pillars.tsx` (2 chỗ), `app/gioi-thieu/page.tsx:211`, `app/blog/[slug]/page.tsx:177` | Đổi thành "5.000+ sản phẩm"; thêm câu "chính thức hoạt động từ năm 2017" ở trang giới thiệu |
| DATA-02 | Footer + liên hệ | Hotline, email đã thống nhất. **Footer không hiện địa chỉ kho** (`site-footer.tsx` dùng `siteConfig.address = "Đồng Nai, Việt Nam"`); `addressFull` cũng thiếu "TP. Biên Hòa" | Sửa `lib/site.ts` một chỗ, footer + liên hệ + schema cùng ăn theo |
| DATA-03 | Hồ sơ năng lực PDF tự tải | Đang trỏ tới Google Drive | Đưa PDF về `/ho-so-nang-luc/TPS1-ho-so-nang-luc.pdf` trên domain, đo sự kiện tải |
| TRACK-01 | GA4 + 4 sự kiện | Chỉ có thẻ **Google Ads** (lazy-load), **không có GA4** | Cần mã đo GA4 `G-...` từ chủ web |

**Lưu ý dễ nhầm số:** trang `/nganh-hang` và `/nganh-hang/[slug]` đang ghi "5.000+ suất ăn phục vụ mỗi ngày". Khi trang chủ đổi sang "5.000+ sản phẩm", hai con số 5.000+ khác nghĩa sẽ đứng cạnh nhau. Bảng số liệu chuẩn (mục 3 của brief) không có con số suất/ngày → đề nghị Marketing xác nhận hoặc bỏ.

---

## 2. Quyết định cấu trúc URL (cần chốt trước khi code WEB-01/02)

Google gần như chưa index site nên đổi cấu trúc lúc này gần như không mất gì.

**Đề xuất:** trang danh mục `/danh-muc/[nhom]` là trang đích SEO duy nhất cho mỗi nhóm hàng, gồm nội dung giới thiệu + FAQ + danh sách sản phẩm render sẵn. `/san-pham` là trang tổng, liệt kê nhóm hàng và sản phẩm tiêu biểu.

| Nhóm (KiotViet) | URL chuẩn | Ghi chú |
|---|---|---|
| RAU CỦ QUẢ | `/danh-muc/rau-cu-qua` | giữ nguyên |
| THỊT HEO | `/danh-muc/thit-heo` | mới |
| THỊT BÒ | `/danh-muc/thit-bo` | mới |
| GIA CẦM | `/danh-muc/gia-cam` | mới |
| HẢI SẢN | `/danh-muc/hai-san` | mới; `/danh-muc/thit-ca-hai-san` → 301 về đây |
| ĐÔNG LẠNH | `/danh-muc/hang-dong-lanh` | giữ nguyên |
| GIA VỊ | `/danh-muc/gia-vi` | giữ nguyên |
| ĐỒ KHÔ | `/danh-muc/do-kho` | mới |
| (chay) | `/danh-muc/thuc-pham-chay` | giữ nếu Marketing còn bán mảng này |

- 5 trang `/san-pham/{rau-cu-qua-tuoi-song, thit-ca-hai-san-tuoi-song, hang-dong-lanh, gia-vi-nha-bep, thuc-pham-chay}` trùng nội dung với danh mục → **301 về danh mục tương ứng**, bỏ khỏi sitemap.
- **Không** sinh 5.000 trang chi tiết sản phẩm lúc này: không giá, không mô tả riêng → trang mỏng, dễ bị Google đánh giá thấp cả site. Khi nào OPS-01 làm sạch dữ liệu xong thì mở trang chi tiết cho khoảng 100 mặt hàng chủ lực có mô tả, quy cách, ảnh thật.
- Phân trang: `/danh-muc/thit-heo?trang=2` render bằng `<Link>` thật, canonical tự trỏ về chính trang đó (không gộp về trang 1).

---

## 3. Lộ trình thực hiện

### Tuần 1 — sửa lỗi chặn index (P0, toàn bộ là code)

1. **WEB-01 + WEB-02: catalog render phía server**
   - Tách truy vấn Supabase trong `app/api/sku-products/route.ts` ra `lib/sku-catalog.ts` (một hàm `getSkuPage({category, q, page})`), API route và trang server dùng chung.
   - `/san-pham`: server component đọc trang 1 + danh sách nhóm, ISR `revalidate = 3600`; `ProductsGrid` nhận `initialData` làm dữ liệu ban đầu, tìm kiếm/lọc vẫn chạy bằng JS như hiện tại.
   - `/danh-muc/[slug]`: thêm khối danh sách sản phẩm của nhóm (24/trang) dưới phần giới thiệu, phân trang bằng link `?trang=n`.
   - Tab nhóm hàng trên `/san-pham` đổi từ `<button>` sang `<Link href="/danh-muc/...">`.
   - Ảnh sản phẩm: giữ `next/image` + `sizes`; ảnh đầu danh sách không lazy để cải thiện LCP.
   - Nghiệm thu: `curl /san-pham` và `curl /danh-muc/thit-heo` thấy tên sản phẩm trong HTML; tắt JS vẫn xem và bấm phân trang được.
2. **SEO-03:** đổi redirect `www` → apex sang 308 (Vercel Domains: đặt `www` là redirect permanent); 301 cho 5 URL `/san-pham/*` trùng và `/danh-muc/thit-ca-hai-san` trong `next.config.js`.
3. **WEB-04 (phần lỗi kỹ thuật):** `ContentPage` đổi H1 thành H2 khi nằm trong `PageShell` → hết 20 trang 2 H1. Thêm H1 cho `/bao-gia`, `/en/bao-gia`, `/ho-so-nang-luc`. Sửa "San pham" → "Sản phẩm".
4. **DATA-01, DATA-02:** sửa 4 chỗ "2.000+" (danh sách ở mục 1); `lib/site.ts`: `addressFull = "B19 Khu phố 15, phường Tam Hiệp, TP. Biên Hòa, Đồng Nai"`, footer dùng `addressFull`; ghi "cập nhật tháng 10/2026" cạnh khối số liệu như brief yêu cầu.
5. **SEO-05:** `seo-json-ld.tsx` thêm `legalName: "CÔNG TY TNHH THỰC PHẨM SỐ MỘT"`, `taxID: "3602885156"`, `foundingDate: "2017"`, `streetAddress` đầy đủ; bỏ `priceRange: "$$"` (TPS1 không niêm yết giá). Thêm `BreadcrumbList` cho danh mục, ngành hàng, dịch vụ, blog.
6. **SEO-02:** `app/sitemap.ts` thêm 4 danh mục mới, bỏ 5 URL đã 301, `lastModified` lấy ngày sửa thật (blog: ngày đăng; trang tĩnh: hằng số cập nhật tay khi sửa nội dung).

### Tuần 2 — đo và nộp cho Google

7. **SEO-04:** chạy PageSpeed Insights mobile cho `/`, `/san-pham`, `/danh-muc/rau-cu-qua`, ghi LCP/CLS/INP trước và sau WEB-01.
8. **SEO-01:** khi chủ web xác minh xong Search Console → gửi sitemap, URL Inspection 10 URL chính (trang chủ, `/san-pham`, 8 danh mục), yêu cầu index. Lập bảng trạng thái index.
9. Rich Results Test cho trang chủ, 1 danh mục, 1 bài blog: 0 lỗi.

### Tuần 3–6 — nội dung danh mục, đo lường (P1)

10. **WEB-03:** Marketing viết nội dung cho 4 danh mục mới theo khung có sẵn của `/danh-muc/rau-cu-qua` (giới thiệu nhóm hàng, cam kết chất lượng, vùng giao, FAQ). Kỹ thuật chỉ thêm dữ liệu vào `lib/content.ts`.
11. **WEB-04 (nội dung):** viết lại title/description theo mẫu "Cung cấp [nhóm hàng] cho bếp ăn công nghiệp, trường học tại Đồng Nai | TPS1"; làm bảng checklist 100% URL trong sitemap.
12. **TRACK-01:** thêm GA4 (dùng chung `gtag` với thẻ Ads đang có), 4 sự kiện: `generate_lead` (gửi form báo giá), `file_upload` (tải file danh sách hàng), `click_hotline` (link `tel:`), `download_profile` (tải hồ sơ năng lực).
13. **DATA-03:** PDF hồ sơ năng lực tự host trên domain, nút tải gắn sự kiện.
14. **CONV-01:** nút gọi/Zalo nổi trên mobile (kiểm tra không che nút gửi form), thông báo sau khi gửi form: "Đã nhận yêu cầu, TPS1 sẽ báo giá trong 24 giờ làm việc."
15. **DATA-04:** mục khách hàng tiêu biểu (xem mục 5).

### Tuần 6–8 — báo cáo (P1)

16. **TRACK-02:** mẫu báo cáo tháng từ Search Console + GA4 (Looker Studio): số trang index, hiển thị/click, từ khóa top 10/20, số yêu cầu báo giá.

### Quý sau (P2) — không thuộc đợt này

- **OPS-01:** làm sạch KiotViet (thương hiệu trống 100%, 976 mã tồn âm, 61% mã chưa có giá) → sau đó mới mở trang chi tiết cho khoảng 100 sản phẩm chủ lực.
- **CONT-01:** chuỗi bài chuyên sâu theo 5 nhóm khách. Đã có nền: 10 bài blog + 3 landing trường học/nhà máy/cơ quan + 13 landing khu vực.

---

## 4. Việc chủ web phải tự làm (không làm được bằng code)

| Việc | Ai | Ghi chú |
|---|---|---|
| Xác minh Search Console bằng bản ghi DNS TXT | Chủ domain | Cần quyền vào nơi quản lý DNS của thucphamsomot.vn |
| Tạo property GA4, gửi mã `G-XXXXXXX` cho kỹ thuật | Marketing | Liên kết GA4 ↔ Search Console ↔ Google Ads |
| Google Business Profile (SEO-06) | Marketing | Tên, địa chỉ, hotline khớp tuyệt đối với website. Đã có tài liệu `SEO/Ho-so-NAP-va-Google-Business-Profile-TPS1.docx` |
| File PDF hồ sơ năng lực bản đã chuẩn hóa số liệu | Marketing | Số liệu đúng bảng chuẩn: 5.000+ sản phẩm, từ năm 2017 |
| Chốt số "5.000+ suất ăn/ngày" ở trang ngành hàng | Marketing | Giữ, sửa, hay bỏ |

---

## 5. Mục "Khách hàng tiêu biểu" (DATA-04) — bản viết chung chung

Brief có 5 câu chuyện ghi tên khách, nhưng mỗi câu còn 2 chỗ `[cần TPS1 xác nhận]` và cần Marketing duyệt. Để không phải chờ, đề xuất làm **bản chung theo loại bếp, không nêu tên khách, không có số liệu**. Logo đối tác vẫn để nguyên ở dải logo hiện tại. Khi khách nào đồng ý cho nêu tên thì thay thẻ tương ứng bằng câu chuyện có tên.

Xưng hô theo quy ước website: TPS1 tự gọi là "TPS1", không dùng "anh chị".

**1. Bếp ăn nhà máy sản xuất lớn tại KCN Nhơn Trạch**
Bếp phục vụ công nhân nhiều ca mỗi ngày, cần nguồn hàng ổn định với khối lượng lớn, giao đúng giờ và có hóa đơn VAT đầy đủ. TPS1 làm đầu mối duy nhất cho thịt, hải sản, rau củ, đồ khô và gia vị, giao theo tuyến cố định từ kho Tam Hiệp bằng xe lạnh. Bếp bớt được việc làm với nhiều nhà cung cấp lẻ.

**2. Bếp ăn khu công nghiệp tại Bà Rịa – Vũng Tàu**
Điểm giao nằm xa kho, nên mỗi chuyến đều phải giữ đúng giờ và đúng nhiệt độ. TPS1 chạy lịch giao liên tỉnh cố định, kiểm hàng trước khi xuất kho và vận chuyển bằng xe lạnh để nguyên liệu tới bếp vẫn đạt chất lượng.

**3. Bếp ăn nhà máy vốn đầu tư nước ngoài tại Long Thành**
Bếp làm theo tiêu chuẩn của công ty mẹ: chất lượng đồng đều, giao đúng giờ, truy được nguồn gốc nguyên liệu khi cần. TPS1 cung cấp theo danh mục thống nhất, kiểm tra và phân loại ngay khi nhập kho, bảo quản đúng điều kiện từng nhóm hàng trước khi giao.

**4. Bếp ăn bệnh viện tại TP. Hồ Chí Minh**
Bếp phải đáp ứng yêu cầu dinh dưỡng riêng cho người bệnh và kiểm soát an toàn thực phẩm nghiêm ngặt. TPS1 kiểm tra hàng trước khi xuất kho, cung cấp giấy tờ nguồn gốc cho các nhóm nguyên liệu và giao định kỳ theo lịch của bếp.

**5. Bếp ăn doanh nghiệp sản xuất tại Đồng Nai**
Bếp cần bữa ăn đều chất lượng nhưng phải giữ chi phí suất ăn trong mức đã duyệt. TPS1 cấp đa nhóm hàng từ một đầu mối và hỗ trợ cân đối thực đơn theo ngân sách, giúp bếp chủ động hơn khi lên kế hoạch mua hàng.

Quy tắc khi đăng: không thêm số suất ăn, số năm hợp tác, tỷ lệ phần trăm hay trích dẫn lời khách. Đặt mục này ở trang chủ (sau dải logo) và trang `/gioi-thieu`. Mỗi thẻ có link về landing tương ứng (`/cung-cap-thuc-pham-cho-nha-may`, `/cung-cap-thuc-pham-ba-ria-vung-tau`, `/cung-cap-thuc-pham-long-thanh`, `/cung-cap-thuc-pham-tp-hcm`, `/cung-cap-thuc-pham-dong-nai`) để tăng liên kết nội bộ.

> Nếu Marketing thấy bản chung vẫn dễ đoán ra tên khách và không muốn đăng, bỏ mục này. Dải logo hiện tại vẫn đủ làm bằng chứng tin cậy, không ảnh hưởng tới các việc SEO khác.

---

## 6. KPI sau 90 ngày (giữ theo brief)

- 100% trang công khai chính được index (đo trên Search Console).
- Trang danh mục xuất hiện khi tìm `site:thucphamsomot.vn`.
- Core Web Vitals mobile đạt "Good" cho trang chủ và danh mục.
- Có số liệu gốc về yêu cầu báo giá qua website (GA4 đối chiếu với số form thực nhận).
