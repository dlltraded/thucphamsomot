-- Hoàn thiện "bảng giá hợp đồng riêng theo khách" (yêu cầu sếp 14/09/2026,
-- vd FORMUSA: chiết khấu 10% toàn bộ + riêng thịt heo cố định 100k/kg suốt
-- hợp đồng, không phụ thuộc bảng giá chung).
--
-- Phát hiện khi rà lại: cột vip_accounts.contract_discount_percent/
-- tier_expiry_date và UI nhập 2 cột này (CustomerDetailPage.tsx, hạng
-- "CUSTOM") đã có sẵn từ trước — nhưng được tạo tay ngoài migration (giống
-- pattern rủi ro đã ghi trong 20260909_fix_critical_rls_holes.sql), VÀ
-- resolve_product_price() chưa bao giờ đọc 2 cột này. Kết quả: khách gắn
-- hạng CUSTOM + nhập % không hề được áp giá gì cả, luôn rớt về giá gốc.
-- Migration này chính thức hoá 2 cột + nối đúng vào resolve_product_price,
-- không đổi hành vi của khách đang dùng hạng VIP0-3 thường.

-- ----------------------------------------------------------------------------
-- 1. Chính thức hoá cột (idempotent — cột đã tồn tại thật trên production,
--    add if not exists chỉ để môi trường khác/khôi phục từ đầu không thiếu).
-- ----------------------------------------------------------------------------
alter table public.vip_accounts add column if not exists contract_discount_percent numeric;
alter table public.vip_accounts add column if not exists tier_expiry_date date;

-- ----------------------------------------------------------------------------
-- 2. resolve_product_price — thêm bước "chiết khấu % theo hợp đồng" ngay sau
--    giá cố định tuyệt đối (customer_contract_prices), trước khi tra theo
--    hạng chung. Thứ tự ưu tiên đầy đủ sau khi sửa:
--      a. customer_contract_prices (giá cố định riêng từng mặt hàng, còn hạn)
--      b. vip_accounts.contract_discount_percent (còn hạn theo tier_expiry_date)
--         → giá = giá_bán_chung × (1 − %/100)
--      c. product_tier_prices theo hạng VIP0-3
--      d. giá bán chung (price_retail/price_wholesale)
--    Nhờ (b) tính trên giá bán chung tại thời điểm gọi hàm, khách chiết khấu %
--    tự động theo đúng biến động giá chung mỗi ngày — không cần snapshot lại.
-- ----------------------------------------------------------------------------
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
  v_discount_percent numeric;
  v_discount_expiry date;
  v_base numeric;
begin
  select coalesce(nullif(price_retail, 0), price_wholesale, 0) into v_base
  from public.products where id = p_product_id;
  v_base := coalesce(v_base, 0);

  if p_customer_id is not null then
    select price into v_contract
    from public.customer_contract_prices
    where customer_id = p_customer_id and product_id = p_product_id
      and (valid_until is null or valid_until > now());
    if v_contract is not null then
      return v_contract;
    end if;

    select discount_tier, contract_discount_percent, tier_expiry_date
      into v_tier, v_discount_percent, v_discount_expiry
      from public.vip_accounts where id = p_customer_id;

    if v_discount_percent is not null and (v_discount_expiry is null or v_discount_expiry >= current_date) then
      return round(v_base * (1 - v_discount_percent / 100), 2);
    end if;

    if v_tier is not null then
      select price into v_tier_price
      from public.product_tier_prices
      where product_id = p_product_id and tier = v_tier;
      if v_tier_price is not null then
        return v_tier_price;
      end if;
    end if;
  end if;

  return v_base;
end;
$$;
revoke all on function public.resolve_product_price(uuid, uuid) from public;
grant execute on function public.resolve_product_price(uuid, uuid) to service_role;

-- ----------------------------------------------------------------------------
-- 3. admin_update_customer — chính thức hoá 2 tham số p_contract_discount_percent/
--    p_tier_expiry_date mà UI đã gọi từ trước (CustomerDetailPage.tsx dòng
--    ~210, ~222) nhưng KHÔNG có trong bất kỳ file migration nào — nghĩa là
--    chữ ký thật đang chạy trên production được tạo tay, khác bản
--    20260825_update_customer_rpc.sql trong repo. Dùng vòng lặp xoá MỌI
--    overload hiện có theo tên hàm (bất kể chữ ký thật là gì) rồi tạo lại
--    đúng 1 bản duy nhất, tránh trùng lặp/xung đột chữ ký khi chạy lại từ đầu
--    trên môi trường khác.
-- ----------------------------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select oid::regprocedure::text as sig
    from pg_proc
    where proname = 'admin_update_customer' and pronamespace = 'public'::regnamespace
  loop
    execute format('drop function if exists %s', r.sig);
  end loop;
end $$;

create function public.admin_update_customer(
  p_id uuid,
  p_name text,
  p_phone text,
  p_company text,
  p_email text,
  p_tax_code text,
  p_address text,
  p_shipping_alias text,
  p_shipping_address text,
  p_shipping_name text,
  p_shipping_phone text,
  p_tier text,
  p_credit_limit numeric,
  p_notes text,
  p_verification_status text default null,
  p_sales_rep_id uuid default null,
  p_contract_discount_percent numeric default null,
  p_tier_expiry_date date default null
)
returns void
language sql
security definer
set search_path = public, extensions
as $$
  update public.vip_accounts
  set name = trim(p_name),
      phone = trim(p_phone),
      company = nullif(trim(p_company), ''),
      email = nullif(trim(p_email), ''),
      tax_code = nullif(trim(p_tax_code), ''),
      address = nullif(trim(p_address), ''),
      default_shipping_alias = coalesce(nullif(trim(p_shipping_alias), ''), 'Địa chỉ mặc định'),
      default_shipping_address = coalesce(nullif(trim(p_shipping_address), ''), nullif(trim(p_address), '')),
      default_shipping_name = coalesce(nullif(trim(p_shipping_name), ''), trim(p_name)),
      default_shipping_phone = coalesce(nullif(trim(p_shipping_phone), ''), trim(p_phone)),
      discount_tier = coalesce(p_tier, discount_tier),
      credit_limit = coalesce(p_credit_limit, credit_limit),
      notes = nullif(trim(p_notes), ''),
      verification_status = coalesce(p_verification_status, verification_status),
      sales_rep_id = p_sales_rep_id,
      -- CUSTOM tier mới có 2 giá trị này; đổi khỏi CUSTOM sang hạng khác thì
      -- xoá luôn để tránh sót % chiết khấu cũ ảnh hưởng nếu sau này đổi lại
      -- CUSTOM mà quên nhập lại (an toàn hơn là giữ giá trị cũ âm thầm).
      contract_discount_percent = case when p_tier = 'CUSTOM' then p_contract_discount_percent else null end,
      tier_expiry_date = case when p_tier = 'CUSTOM' then p_tier_expiry_date else null end,
      updated_at = now()
  where id = p_id;
$$;
grant execute on function public.admin_update_customer to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 4. Nhập hàng loạt giá cố định riêng theo khách bằng Excel (thay vì thêm
--    tay từng dòng qua prompt()) — dùng cho ca FORMUSA có nhiều mặt hàng chốt
--    giá cố định cùng lúc. Mặc định hạn dùng theo hạn hợp đồng
--    (tier_expiry_date) nếu dòng Excel không ghi riêng — chốt với sếp
--    14/09/2026: "mặc định theo hạn hợp đồng, cho sửa riêng khi cần".
-- ----------------------------------------------------------------------------
create or replace function public.admin_bulk_set_contract_prices(
  p_customer_id uuid,
  p_items jsonb -- [{ "product_id": uuid, "price": numeric, "valid_until": date|null }]
)
returns table(product_id uuid, status text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_item jsonb;
  v_default_expiry date;
begin
  select tier_expiry_date into v_default_expiry from public.vip_accounts where id = p_customer_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into public.customer_contract_prices (customer_id, product_id, price, valid_until)
    values (
      p_customer_id,
      (v_item->>'product_id')::uuid,
      (v_item->>'price')::numeric,
      coalesce((v_item->>'valid_until')::date, v_default_expiry)
    )
    on conflict (customer_id, product_id) do update
      set price = excluded.price,
          valid_until = excluded.valid_until;

    product_id := (v_item->>'product_id')::uuid;
    status := 'ok';
    return next;
  end loop;
end;
$$;
revoke all on function public.admin_bulk_set_contract_prices(uuid, jsonb) from public;
grant execute on function public.admin_bulk_set_contract_prices(uuid, jsonb) to authenticated;

-- Cần unique (customer_id, product_id) để on conflict ở trên hoạt động —
-- bảng gốc (tạo tay ngoài migration) nhiều khả năng đã có PK/unique tương
-- đương do UI hiện tại chặn thêm trùng ở tầng client, nhưng thêm constraint
-- rõ ràng ở đây để chắc chắn đúng mọi trường hợp (idempotent).
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'customer_contract_prices_customer_product_key'
  ) then
    alter table public.customer_contract_prices
      add constraint customer_contract_prices_customer_product_key unique (customer_id, product_id);
  end if;
end $$;
