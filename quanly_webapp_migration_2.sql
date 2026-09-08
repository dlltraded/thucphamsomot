-- 1. Hàm lấy danh sách khách hàng (Admin thấy hết, Sale thấy của mình)
CREATE OR REPLACE FUNCTION public.sale_get_customers(
  p_admin_id uuid, -- ID của Sale/Admin
  p_role text      -- 'admin' hoặc 'sale'
)
RETURNS SETOF public.vip_accounts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF p_role = 'admin' THEN
    RETURN QUERY SELECT * FROM public.vip_accounts ORDER BY created_at DESC;
  ELSE
    RETURN QUERY SELECT * FROM public.vip_accounts WHERE assigned_to = p_admin_id ORDER BY created_at DESC;
  END IF;
END;
$$;

-- 2. Hàm lấy danh sách đơn hàng (Admin thấy hết, Sale thấy đơn của khách mình phụ trách)
CREATE OR REPLACE FUNCTION public.sale_get_orders(
  p_admin_id uuid,
  p_role text
)
RETURNS SETOF public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF p_role = 'admin' THEN
    RETURN QUERY SELECT * FROM public.orders ORDER BY created_at DESC;
  ELSE
    RETURN QUERY SELECT o.* 
    FROM public.orders o
    JOIN public.vip_accounts v ON o.customer_id = v.id
    WHERE v.assigned_to = p_admin_id
    ORDER BY o.created_at DESC;
  END IF;
END;
$$;
