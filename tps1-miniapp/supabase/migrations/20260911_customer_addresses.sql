-- Nhiều địa chỉ giao hàng theo khách hàng B2B (mục 14.3-5 KE_HOACH) — khách
-- công ty lớn giao tới nhiều địa điểm khác nhau (VD "HIEPPHATFOOD" giao tới
-- nhiều xưởng/bếp khác nhau, quan sát trực tiếp trên đơn thật KiotViet).
-- vip_accounts vẫn giữ 1 địa chỉ mặc định (default_shipping_*) như trước —
-- bảng này chỉ bổ sung các địa chỉ PHỤ, không thay thế.
create table if not exists public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.vip_accounts(id) on delete cascade,
  label text not null,
  address text not null,
  contact_name text,
  contact_phone text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists customer_addresses_customer_idx on public.customer_addresses(customer_id);

alter table public.customer_addresses enable row level security;
-- Cùng nguyên tắc với customer_contract_prices (migration 20260909_fix_critical_rls_holes.sql):
-- chỉ admin hoặc đúng sale phụ trách khách đó được đọc/sửa qua Supabase Auth
-- thật; khách hàng tự đặt hàng đi qua SECURITY DEFINER RPC riêng (service-role,
-- không bị ràng buộc bởi RLS ở đây) nên không cần thêm policy cho anon.
drop policy if exists "staff_all_customer_addresses" on public.customer_addresses;
create policy "staff_all_customer_addresses" on public.customer_addresses
  for all to authenticated
  using (
    exists (select 1 from public.admin_profiles ap where ap.id = auth.uid() and ap.role = 'admin' and ap.is_active)
    or exists (
      select 1 from public.vip_accounts v
      where v.id = customer_addresses.customer_id
        and v.sales_rep_id = auth.uid()
    )
  )
  with check (
    exists (select 1 from public.admin_profiles ap where ap.id = auth.uid() and ap.role = 'admin' and ap.is_active)
    or exists (
      select 1 from public.vip_accounts v
      where v.id = customer_addresses.customer_id
        and v.sales_rep_id = auth.uid()
    )
  );
