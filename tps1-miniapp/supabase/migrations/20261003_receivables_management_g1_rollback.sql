-- ============================================================================
-- Rollback Migration: Phân hệ Quản lý Công nợ TPS1 (Giai đoạn G1)
-- File: 20261003_receivables_management_g1_rollback.sql
-- An toàn: Không làm mất bất kỳ dữ liệu legacy nào của orders hay vip_accounts.
-- ============================================================================

-- 1. Xóa các hàm RPC mới
drop function if exists public.record_customer_receipt(uuid, numeric, text, text, text, date, jsonb, text, text);
drop function if exists public.record_customer_receipt(uuid, numeric, text, text, text, date, jsonb, text);
drop function if exists public.reverse_customer_receipt(uuid, text, text);
drop function if exists public.update_invoice_due_date(uuid, timestamptz, text);

-- 2. Xóa các bảng mới theo thứ tự phụ thuộc khóa ngoại
drop table if exists public.receipt_allocations cascade;
drop table if exists public.customer_receipts cascade;
drop table if exists public.receivable_adjustments cascade;

-- 3. Xóa sequences mới
drop sequence if exists public.customer_receipt_number_seq;
drop sequence if exists public.receivable_adjustment_number_seq;

-- 4. Xóa view alias customers nếu được tạo trong G1
drop view if exists public.customers;

-- 5. Xóa các cột mới thêm vào orders và vip_accounts
-- CHÚ Ý: Tuyệt đối giữ nguyên các cột legacy như paid_amount, debt_amount,
-- grand_total, kiotviet_opening_debt, payment_method...
alter table public.orders
  drop column if exists due_date;

alter table public.vip_accounts
  drop column if exists payment_terms_days;
