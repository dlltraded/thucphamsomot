-- Phase 1 — G2: Complex Price Book Import Enhancements
-- Hỗ trợ import bảng giá phức tạp, lưu metadata file, checksum, cấu hình mapping và phân loại chi tiết trạng thái kiểm tra.

-- 1. Bổ sung các cột thông tin file và mapping cho price_book_import_jobs
alter table public.price_book_import_jobs
  add column if not exists file_name text,
  add column if not exists file_checksum text,
  add column if not exists sheet_name text,
  add column if not exists header_row integer default 1,
  add column if not exists sub_header_row integer,
  add column if not exists data_start_row integer default 2,
  add column if not exists mapping_config jsonb,
  add column if not exists committed_at timestamptz,
  add column if not exists committed_by text;

-- Mở rộng status của job nếu cần
alter table public.price_book_import_jobs drop constraint if exists price_book_import_jobs_status_check;
alter table public.price_book_import_jobs add constraint price_book_import_jobs_status_check
  check (status in ('processing', 'completed', 'failed', 'preview', 'committed'));

-- Index kiểm tra tính idempotent dựa trên checksum file
create index if not exists idx_pb_import_checksum
  on public.price_book_import_jobs (file_checksum, price_book_id);

-- 2. Mở rộng validation_status cho từng dòng trong price_book_import_rows
alter table public.price_book_import_rows drop constraint if exists price_book_import_rows_validation_status_check;
alter table public.price_book_import_rows add constraint price_book_import_rows_validation_status_check
  check (validation_status in (
    'valid',
    'invalid',
    'ambiguous',
    'blank-vs-zero',
    'unmatched',
    'blank_price',
    'zero_price',
    'invalid_price',
    'skipped_category'
  ));

-- RLS: Đảm bảo bảng import_jobs và import_rows không cho phép client công khai truy cập
alter table public.price_book_import_jobs enable row level security;
alter table public.price_book_import_rows enable row level security;
revoke all on public.price_book_import_jobs from anon, authenticated;
revoke all on public.price_book_import_rows from anon, authenticated;
