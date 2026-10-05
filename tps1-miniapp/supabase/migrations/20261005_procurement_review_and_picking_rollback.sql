-- Rollback: 20261005_procurement_review_and_picking_rollback.sql
-- Hoàn tác phân hệ Thu mua kiểm tra hàng và Soạn hàng TPS1 (G1)

-- 1. Xóa RPCs
drop function if exists public.create_picking_task_on_confirm(uuid, uuid, integer);
drop function if exists public.claim_picking_task(uuid, uuid, uuid);
drop function if exists public.claim_picking_task(uuid, uuid);
drop function if exists public.claim_procurement_review(uuid, uuid);

-- 2. Xóa các bảng theo thứ tự phụ thuộc ngược
drop table if exists public.picking_task_retry_queue cascade;
drop table if exists public.internal_notifications cascade;
drop table if exists public.picking_audit_logs cascade;
drop table if exists public.picking_exceptions cascade;
drop table if exists public.picking_task_items cascade;
drop table if exists public.picking_tasks cascade;
drop table if exists public.procurement_review_audit_logs cascade;
drop table if exists public.procurement_review_items cascade;
drop table if exists public.procurement_review_requests cascade;
