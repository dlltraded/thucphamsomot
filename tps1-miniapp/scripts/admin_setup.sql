-- ============================================================
-- TPS1 Admin Setup - Run này trong Supabase SQL Editor
-- https://supabase.com/dashboard/project/yntgxollwjemyidizhnn/sql/new
-- ============================================================

-- 1. Thêm cột image_url vào bảng products (nếu chưa có)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2. Tạo Storage bucket cho hình sản phẩm (nếu chưa có)
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Cho phép xem hình (public read)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects'
    AND policyname = 'Public read product images'
  ) THEN
    CREATE POLICY "Public read product images"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'product-images');
  END IF;
END $$;

-- 4. Cho phép upload hình (anon - admin dùng)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects'
    AND policyname = 'Anon upload product images'
  ) THEN
    CREATE POLICY "Anon upload product images"
      ON storage.objects FOR INSERT
      TO anon
      WITH CHECK (bucket_id = 'product-images');
  END IF;
END $$;

-- 5. Cho phép update/xóa hình (anon)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects'
    AND policyname = 'Anon update product images'
  ) THEN
    CREATE POLICY "Anon update product images"
      ON storage.objects FOR UPDATE
      TO anon
      USING (bucket_id = 'product-images');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects'
    AND policyname = 'Anon delete product images'
  ) THEN
    CREATE POLICY "Anon delete product images"
      ON storage.objects FOR DELETE
      TO anon
      USING (bucket_id = 'product-images');
  END IF;
END $$;

-- 6. Cho phép admin cập nhật sản phẩm qua anon key
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'products'
    AND policyname = 'Anon can update products'
  ) THEN
    CREATE POLICY "Anon can update products"
      ON products FOR UPDATE
      TO anon
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

SELECT 'Admin setup complete!' AS status;
