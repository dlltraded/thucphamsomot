-- Giai đoạn B — Hàng hóa thật, tồn kho, bảng giá theo hạng khách
-- (xem KE_HOACH_HE_THONG_BAN_HANG_KIOTVIET.md mục 13.4 / 13.2)

-- ============================================================================
-- 1. track_inventory: phân biệt hàng có theo dõi tồn kho (bảo quản qua ngày:
--    đồ khô, gia vị, đông lạnh...) với hàng KHÔNG theo dõi (tươi sống, soạn
--    hàng theo ngày, không lưu kho — xác nhận với phòng thu mua 2026-09-10).
--    Mặc định true (coi là có theo dõi) để an toàn cho sản phẩm nhập tay thủ
--    công; script scripts/sync-kiotviet-products.mjs sẽ set đúng giá trị cho
--    từng nhóm hàng KiotViet thật khi đồng bộ (nhóm "...TS" trừ "Đông Lạnh"
--    -> false, còn lại -> true).
-- ============================================================================
alter table public.products add column if not exists track_inventory boolean not null default true;
comment on column public.products.track_inventory is 'true = có theo dõi tồn kho qua inventory_transactions (đồ khô/gia vị/đông lạnh...); false = hàng tươi sống soạn theo ngày, không trừ/cảnh báo tồn kho.';

-- ============================================================================
-- 2. Bảng giá theo hạng khách (VIP1/VIP2/VIP3...). Độ ưu tiên khi tính giá:
--    customer_contract_prices (giá riêng theo khách) > product_tier_prices
--    (giá theo hạng) > products.price_retail/price_wholesale (giá gốc).
-- ============================================================================
create table if not exists public.product_tier_prices (
  product_id uuid not null references public.products(id) on delete cascade,
  tier text not null,
  price numeric(14,2) not null check (price >= 0),
  updated_at timestamptz not null default now(),
  primary key (product_id, tier)
);
alter table public.product_tier_prices enable row level security;
-- Không tạo policy cho anon/authenticated -> mặc định từ chối hết, chỉ
-- service_role (API phía server, tự động bypass RLS) đọc/ghi được — cùng mẫu
-- với customer_sessions, tránh lặp lại lỗ hổng RLS đã vá ở migration 20260909.

-- ============================================================================
-- 3. Lịch sử nhập/xuất/điều chỉnh tồn kho — nguồn sự thật duy nhất. Không bao
--    giờ sửa tay products.stock_qty; luôn insert 1 dòng ở đây, trigger bên
--    dưới tự cập nhật stock_qty.
--    - type 'in': quantity dương, cộng vào tồn kho (nhập hàng).
--    - type 'out': quantity dương, trừ khỏi tồn kho (bán hàng/hao hụt).
--    - type 'adjust': quantity có thể âm/dương, cộng thẳng vào tồn kho (chỉnh
--      tay khi kiểm kê lệch thực tế).
-- ============================================================================
create table if not exists public.inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  type text not null check (type in ('in', 'out', 'adjust')),
  quantity numeric(14,3) not null,
  note text,
  created_by uuid references public.admin_profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists inventory_transactions_product_idx on public.inventory_transactions(product_id);
create index if not exists inventory_transactions_order_idx on public.inventory_transactions(order_id);
alter table public.inventory_transactions enable row level security;
-- Cùng nguyên tắc: không có policy cho anon/authenticated, chỉ service_role.

create or replace function public.apply_inventory_transaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_delta numeric;
begin
  v_delta := case
    when new.type = 'in' then new.quantity
    when new.type = 'out' then -new.quantity
    else new.quantity -- 'adjust': quantity tự mang dấu
  end;
  update public.products set stock_qty = stock_qty + v_delta where id = new.product_id;
  return new;
end;
$$;

drop trigger if exists trg_apply_inventory_transaction on public.inventory_transactions;
create trigger trg_apply_inventory_transaction
  after insert on public.inventory_transactions
  for each row execute function public.apply_inventory_transaction();

-- ============================================================================
-- 4. Trừ kho khi đơn hàng được XÁC NHẬN (không trừ lúc tạo đơn nháp) — chỉ áp
--    dụng cho sản phẩm track_inventory = true. Idempotent: gọi lại nhiều lần
--    cho cùng 1 đơn không trừ kho thêm lần nữa (kiểm tra đã có giao dịch 'out'
--    cho order_id đó chưa). Được gọi từ tầng Next.js (không sửa trực tiếp
--    admin_finalize_order/_v2 hay customer_confirm_draft_order vì các hàm đó
--    không nằm trong migration nào — tạo trực tiếp qua Dashboard trước đây,
--    không rõ định nghĩa đầy đủ, sửa nhầm rủi ro cao hơn lợi ích).
-- ============================================================================
create or replace function public.deduct_inventory_for_order(p_order_id uuid, p_actor text default 'system')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
  v_already_deducted boolean;
begin
  select exists(
    select 1 from public.inventory_transactions
    where order_id = p_order_id and type = 'out'
  ) into v_already_deducted;
  if v_already_deducted then
    return;
  end if;

  for v_item in
    select oi.product_id, oi.quantity
    from public.order_items oi
    join public.products p on p.id = oi.product_id
    where oi.order_id = p_order_id
      and oi.product_id is not null
      and p.track_inventory = true
  loop
    insert into public.inventory_transactions (product_id, order_id, type, quantity, note)
    values (v_item.product_id, p_order_id, 'out', v_item.quantity, 'Tự động trừ khi đơn hàng xác nhận (' || coalesce(p_actor, 'system') || ')');
  end loop;
end;
$$;
revoke all on function public.deduct_inventory_for_order(uuid, text) from public;
grant execute on function public.deduct_inventory_for_order(uuid, text) to service_role;

-- ============================================================================
-- 5. Hàm tính giá bán cho 1 sản phẩm + 1 khách hàng, đúng thứ tự ưu tiên.
--    p_customer_id = null -> luôn trả giá gốc (dùng khi chưa chọn khách).
-- ============================================================================
create or replace function public.resolve_product_price(p_product_id uuid, p_customer_id uuid default null)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contract numeric;
  v_tier text;
  v_tier_price numeric;
  v_base numeric;
begin
  if p_customer_id is not null then
    select price into v_contract
    from public.customer_contract_prices
    where customer_id = p_customer_id and product_id = p_product_id
      and (valid_until is null or valid_until > now());
    if v_contract is not null then
      return v_contract;
    end if;

    select discount_tier into v_tier from public.vip_accounts where id = p_customer_id;
    if v_tier is not null then
      select price into v_tier_price
      from public.product_tier_prices
      where product_id = p_product_id and tier = v_tier;
      if v_tier_price is not null then
        return v_tier_price;
      end if;
    end if;
  end if;

  select coalesce(nullif(price_retail, 0), price_wholesale, 0) into v_base
  from public.products where id = p_product_id;
  return coalesce(v_base, 0);
end;
$$;
revoke all on function public.resolve_product_price(uuid, uuid) from public;
grant execute on function public.resolve_product_price(uuid, uuid) to service_role;
