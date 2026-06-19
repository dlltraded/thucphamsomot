-- Tạo bảng lưu thông tin namecard
CREATE TABLE IF NOT EXISTS namecards (
  id TEXT PRIMARY KEY DEFAULT 'default',
  name TEXT NOT NULL DEFAULT 'NGUYỄN TIẾN BÁCH',
  title_vi TEXT DEFAULT 'Giám Đốc Điều Hành',
  title_en TEXT DEFAULT 'Executive Director',
  phone TEXT DEFAULT '0908583999',
  email TEXT DEFAULT 'ceo@thucphamsomot.vn',
  photo_url TEXT DEFAULT '',
  zalo TEXT DEFAULT '0908583999',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Thêm row mặc định cho CEO nếu chưa có
INSERT INTO namecards (id, name, title_vi, title_en, phone, email, zalo)
VALUES (
  'bach-nguyen',
  'NGUYỄN TIẾN BÁCH',
  'Giám Đốc Điều Hành',
  'Executive Director',
  '0908583999',
  'ceo@thucphamsomot.vn',
  '0908583999'
)
ON CONFLICT (id) DO NOTHING;

-- Cho phép đọc công khai (không cần auth)
ALTER TABLE namecards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read" ON namecards
  FOR SELECT USING (true);

CREATE POLICY "Service role write" ON namecards
  FOR ALL USING (true);

-- Tạo bucket storage để upload ảnh
INSERT INTO storage.buckets (id, name, public)
VALUES ('namecard-photos', 'namecard-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Cho phép upload ảnh công khai (không cần auth)
CREATE POLICY "Public upload namecard photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'namecard-photos');

CREATE POLICY "Public read namecard photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'namecard-photos');

CREATE POLICY "Public update namecard photos" ON storage.objects
  FOR UPDATE USING (bucket_id = 'namecard-photos');
