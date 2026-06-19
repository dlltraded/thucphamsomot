# Hướng dẫn Setup Supabase cho E-Namecard App

## Bước 1 — Chạy SQL trong Supabase Dashboard

1. Vào https://supabase.com/dashboard
2. Chọn project **yntgxollwjemyidizhnn**
3. Click **SQL Editor** ở sidebar trái
4. Paste và chạy nội dung file `supabase-setup.sql`

## Bước 2 — Tạo Storage Bucket (nếu SQL không tự tạo)

1. Vào **Storage** ở sidebar trái
2. Click **New bucket**
3. Tên: `namecard-photos`
4. Tick **Public bucket** ✅
5. Click **Save**

## Bước 3 — Test local

- **Namecard:** http://localhost:3001
- **Admin:** http://localhost:3001/admin
- Mật khẩu admin: `19871988`

## Cấu trúc bảng `namecards`

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | text | Primary key (mặc định: 'bach-nguyen') |
| `name` | text | Họ tên IN HOA |
| `title_vi` | text | Chức danh tiếng Việt |
| `title_en` | text | Chức danh tiếng Anh |
| `phone` | text | Số điện thoại |
| `email` | text | Email |
| `photo_url` | text | URL ảnh đại diện |
| `zalo` | text | SĐT Zalo (nếu khác phone) |
| `updated_at` | timestamptz | Thời gian cập nhật |

## Deploy lên Vercel (khi anh sẵn sàng)

```bash
# Từ thư mục namecard-app
npx vercel --prod
```

Hoặc kết nối GitHub repo `namecard-app` riêng với Vercel.
