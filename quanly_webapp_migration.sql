-- 1. Thêm cột assigned_to vào vip_accounts (tham chiếu đến admin_profiles)
ALTER TABLE public.vip_accounts
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.admin_profiles(id) ON DELETE SET NULL;

-- 2. Cập nhật hàm tạo tài khoản khách hàng để nhận thêm tham số p_assigned_to
CREATE OR REPLACE FUNCTION public.create_vip_account(
  p_code text,
  p_name text,
  p_phone text,
  p_password text,
  p_company text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_tax_code text DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_default_shipping_alias text DEFAULT NULL,
  p_default_shipping_address text DEFAULT NULL,
  p_default_shipping_name text DEFAULT NULL,
  p_default_shipping_phone text DEFAULT NULL,
  p_tier text DEFAULT 'VIP0',
  p_discount_percent numeric DEFAULT 0,
  p_verification_status text DEFAULT 'verified',
  p_assigned_to uuid DEFAULT NULL -- [Mới]
)
RETURNS public.vip_accounts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_account public.vip_accounts%rowtype;
BEGIN
  INSERT INTO public.vip_accounts (
    code, name, phone, password_hash, company, email, tax_code, address,
    default_shipping_alias, default_shipping_address, default_shipping_name, default_shipping_phone,
    tier, discount_percent, verification_status, assigned_to
  ) VALUES (
    p_code, p_name, p_phone,
    crypt(p_password, gen_salt('bf', 8)),
    p_company, p_email, p_tax_code, p_address,
    p_default_shipping_alias, p_default_shipping_address, p_default_shipping_name, p_default_shipping_phone,
    p_tier, p_discount_percent, p_verification_status, p_assigned_to
  )
  RETURNING * INTO v_account;
  RETURN v_account;
END;
$$;

-- 3. Tạo RPC để cập nhật đơn hàng (Chỉnh sửa số lượng / Chốt đơn)
CREATE OR REPLACE FUNCTION public.sale_update_order(
  p_admin_id text, -- Có thể là ID hoặc role identifier
  p_order_id uuid,
  p_items jsonb,
  p_pricing_status text DEFAULT 'provisional',
  p_shipping_fee numeric DEFAULT 0,
  p_other_discount numeric DEFAULT 0,
  p_note text DEFAULT NULL
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_order public.orders%rowtype;
  v_customer public.vip_accounts%rowtype;
  v_item jsonb;
  v_product public.products%rowtype;
  v_identifier text;
  v_quantity numeric;
  v_base_price numeric;
  v_unit_price numeric;
  v_line_total numeric;
  v_subtotal numeric := 0;
  v_grand_total numeric := 0;
  v_item_count integer := 0;
  v_custom_price public.customer_contract_prices%rowtype;
  v_revision integer;
BEGIN
  -- Lấy thông tin đơn hàng
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Đơn hàng không tồn tại';
  END IF;

  -- Lấy thông tin khách hàng
  SELECT * INTO v_customer FROM public.vip_accounts WHERE id = v_order.customer_id;

  -- Xóa order_items cũ
  DELETE FROM public.order_items WHERE order_id = p_order_id;

  -- Tính toán lại items
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_identifier := coalesce(nullif(v_item->>'productId', ''), nullif(v_item->>'id', ''));
    v_quantity := greatest(coalesce((v_item->>'quantity')::numeric, 0), 0);
    IF v_identifier IS NULL OR v_quantity <= 0 THEN CONTINUE; END IF;

    SELECT p.* INTO v_product FROM public.products p WHERE (p.id::text = v_identifier OR p.local_product_id = v_identifier) LIMIT 1;
    IF NOT FOUND THEN CONTINUE; END IF;

    v_base_price := greatest(0, coalesce((v_item->>'base_unit_price')::numeric, coalesce(nullif(v_product.price_retail, 0), v_product.price_wholesale, 0)));
    v_unit_price := greatest(0, coalesce((v_item->>'unit_price')::numeric, round(v_base_price * (1 - v_order.discount_percent / 100))));
    
    v_line_total := round(v_unit_price * v_quantity);

    INSERT INTO public.order_items(
      order_id, product_id, product_local_id, sku, name, unit, quantity,
      base_unit_price, discount_percent, unit_price, line_total
    ) VALUES (
      p_order_id, v_product.id, v_product.local_product_id, v_product.sku,
      v_product.name, v_product.unit, v_quantity, v_base_price,
      v_order.discount_percent, v_unit_price, v_line_total
    );

    v_subtotal := v_subtotal + round(v_base_price * v_quantity);
    v_grand_total := v_grand_total + v_line_total;
    v_item_count := v_item_count + 1;
  END LOOP;

  IF v_item_count = 0 THEN
    RAISE EXCEPTION 'Đơn hàng phải có ít nhất 1 sản phẩm hợp lệ';
  END IF;

  v_grand_total := greatest(0, v_grand_total - v_order.voucher_discount - coalesce(p_other_discount, 0)) + coalesce(p_shipping_fee, 0);

  -- Tăng price_revision nếu chốt đơn
  v_revision := coalesce(v_order.price_revision, 0);
  IF p_pricing_status = 'finalized' THEN
    v_revision := v_revision + 1;
  END IF;

  -- Cập nhật order
  UPDATE public.orders
  SET subtotal = v_subtotal,
      discount_amount = (v_subtotal - (v_grand_total - coalesce(p_shipping_fee, 0))) + v_order.voucher_discount + coalesce(p_other_discount, 0),
      grand_total = v_grand_total,
      item_count = v_item_count,
      pricing_status = p_pricing_status,
      price_revision = v_revision,
      note = coalesce(p_note, note),
      updated_at = now()
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  -- Ghi log
  INSERT INTO public.order_history(order_id, action, to_status, actor, payload)
  VALUES (p_order_id, 'updated', v_order.status, p_admin_id, jsonb_build_object('pricing_status', p_pricing_status, 'price_revision', v_revision));

  RETURN v_order;
END;
$$;
