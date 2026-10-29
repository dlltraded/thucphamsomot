-- Additive only. No customer/order data is modified.
CREATE OR REPLACE FUNCTION public.admin_order_status_counts(p_from timestamptz DEFAULT NULL, p_to timestamptz DEFAULT NULL)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
 SELECT jsonb_build_object(
   'pending', count(*) FILTER (WHERE status = 'pending'),
   'preparing', count(*) FILTER (WHERE status = 'preparing'),
   'shipping', count(*) FILTER (WHERE status = 'shipping'),
   'completed', count(*) FILTER (WHERE status = 'completed'))
 FROM public.orders
 WHERE (p_from IS NULL OR created_at >= p_from)
   AND (p_to IS NULL OR created_at <= p_to);
$$;
REVOKE ALL ON FUNCTION public.admin_order_status_counts(timestamptz,timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_order_status_counts(timestamptz,timestamptz) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_latest_order_claims(p_ids uuid[])
RETURNS TABLE(order_id uuid, actor text, payload jsonb, created_at timestamptz)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
 SELECT DISTINCT ON (h.order_id) h.order_id, h.actor::text, h.payload::jsonb, h.created_at
 FROM public.order_history h
 WHERE h.order_id = ANY(p_ids) AND h.action = 'processing_claimed'
 ORDER BY h.order_id, h.created_at DESC, h.id DESC;
$$;
REVOKE ALL ON FUNCTION public.admin_latest_order_claims(uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_latest_order_claims(uuid[]) TO service_role;
