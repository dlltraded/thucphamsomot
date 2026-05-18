# Content Map: thucphamsomot -> WordPress

## 1. Pages tĩnh

| Source route | WordPress type | Title |
|---|---|---|
| `/` | Page | Trang chủ |
| `/gioi-thieu` | Page | Giới thiệu |
| `/lien-he` | Page | Liên hệ |
| `/bao-gia` | Page + form block | Báo giá / Đặt hàng |

## 2. Custom post types

| Source route | WordPress type | Ghi chú |
|---|---|---|
| `/san-pham` | `product` | Catalog sản phẩm |
| `/tin-tuc` | `news` | Bài tin tức |
| `/kien-thuc` | `knowledge` | Bài kiến thức / tư vấn |
| `/nganh-hang` | `industry` | Nhóm theo ngành phục vụ |
| `/dich-vu` | `service` | Dịch vụ tư vấn / setup |
| `/chinh-sach` | `policy` | Chính sách |

## 3. Taxonomy đề xuất

| Taxonomy | Dùng cho | Ví dụ |
|---|---|---|
| `product_category` | product | Rau củ, thịt cá, đông lạnh, gia vị |
| `news_category` | news | Tin công ty, thị trường, hoạt động |
| `knowledge_category` | knowledge | Menu, nhà máy, trường học, bệnh viện |
| `industry_category` | industry | Bếp ăn tập thể, suất ăn công nghiệp |
| `service_category` | service | Tư vấn menu, setup bếp, cung cấp định kỳ |

## 4. Field map

| Field hiện tại | WordPress field |
|---|---|
| `slug` | post_name |
| `title` | post_title |
| `description` / `summary` | excerpt hoặc ACF summary |
| `sections` | repeater field hoặc block group |
| `faqs` | repeater field hoặc accordion block |
| `coverImage` / `image` | featured image |
| `publishedAt` | post_date |
| `featured` | custom meta / sticky flag |

## 5. Nội dung ưu tiên migrate trước

1. Trang chủ
2. Sản phẩm
3. Báo giá
4. Tin tức
5. Kiến thức
6. Ngành hàng
7. Dịch vụ
8. Chính sách

## 6. Redirect rule

Giữ nguyên slug cũ nếu có thể:

- `/san-pham/{slug}`
- `/tin-tuc/{slug}`
- `/kien-thuc/{slug}`
- `/nganh-hang/{slug}`
- `/dich-vu/{slug}`
- `/chinh-sach/{slug}`

Nếu đổi slug, cần map 301 theo từng URL.

