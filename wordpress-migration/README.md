# WordPress Migration Kit

Bộ khởi tạo local để anh em mình dựng WordPress trước, rồi mới migrate nội dung từ `thuc_pham_so_1`.

## Mục tiêu

- Dùng WordPress tự host
- Theme nhẹ, tối ưu mobile trước
- Quản trị nội dung dễ
- Có custom post type cho `Sản phẩm`, `Tin tức`, `Kiến thức`, `Ngành hàng`, `Dịch vụ`, `Chính sách`

## Chạy local

1. Cài Docker Desktop.
2. Vào thư mục `wordpress-migration`.
3. Chạy:

```bash
docker compose up -d
```

4. Mở:

```text
http://localhost:8080
```

5. Hoàn tất cài WordPress lần đầu.

## Gợi ý cấu trúc

- `Page`
  - Trang chủ
  - Giới thiệu
  - Liên hệ
  - Báo giá
- `Custom Post Type`
  - `product`
  - `news`
  - `knowledge`
  - `industry`
  - `service`
  - `policy`
- `Taxonomy`
  - `product_category`
  - `news_category`
  - `knowledge_category`
  - `industry_category`
  - `service_category`

## Migrate nội dung

1. Tạo CPT trong theme hoặc bằng plugin nhẹ như CPT UI.
2. Dùng ACF hoặc block editor để lưu field:
   - `slug`
   - `summary`
   - `excerpt`
   - `sections`
   - `faqs`
   - `cover_image`
3. Import ảnh vào Media Library trước, rồi map theo slug.
4. Giữ URL cũ nếu có thể. Nếu đổi URL thì làm 301 redirect.

## Theme khuyến nghị

- `GeneratePress`
- `Blocksy`
- `Astra` bản tối giản

## Nguyên tắc không lặp lỗi cũ

- Không dùng page builder nặng nếu không thật cần
- Không nhồi animation
- Kiểm mobile trước desktop polish
- Ưu tiên readability và form báo giá

