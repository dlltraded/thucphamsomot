-- ============================================================
-- TPS1 Mini App - Products Table Migration
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id          TEXT PRIMARY KEY,           -- e.g. "p001"
  name        TEXT NOT NULL,              -- Vietnamese name
  name_en     TEXT,                       -- English name
  category    TEXT NOT NULL,              -- "rau-cu", "thit", etc.
  unit        TEXT NOT NULL DEFAULT 'kg', -- "kg", "con", "bó", etc.
  price       INTEGER NOT NULL DEFAULT 0, -- Price in VND
  image_url   TEXT,                       -- CDN URL or local path
  views       INTEGER DEFAULT 0,
  sold        INTEGER DEFAULT 0,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Public read access (anyone can read active products)
CREATE POLICY "Public can read active products"
  ON products FOR SELECT
  USING (is_active = true);

-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access for storage
CREATE POLICY "Public can view product images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

-- Allow authenticated upload (for admin)
CREATE POLICY "Authenticated can upload product images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'product-images');

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Confirm
SELECT 'Migration complete! Run the import script next.' AS status;
