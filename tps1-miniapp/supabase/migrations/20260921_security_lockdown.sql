-- TPS1 SECURITY LOCKDOWN (2026-09-21)
-- Next.js APIs use service_role; customer-facing RPCs are whitelisted below.

-- Prevent direct reads/writes of sensitive tables through the public API.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'vip_accounts',
    'orders',
    'order_items',
    'order_history',
    'admin_profiles',
    'customer_addresses',
    'customer_contract_prices',
    'order_payments',
    'order_confirmations'
  ] loop
    if to_regclass('public.' || table_name) is not null then
      execute format('alter table public.%I enable row level security', table_name);
      execute format('revoke all on table public.%I from public, anon, authenticated', table_name);
    end if;
  end loop;
end $$;

-- Remove public execution of RPCs, then restore only the customer-facing allowlist.
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and (
        has_function_privilege('anon', p.oid, 'EXECUTE')
        or has_function_privilege('authenticated', p.oid, 'EXECUTE')
      )
      and p.proname not in (
        'verify_customer_login',
        'customer_change_password',
        'customer_create_order',
        'customer_list_orders',
        'customer_confirm_draft_order',
        'register_customer_account',
        'customer_save_push_subscription',
        'customer_remove_push_subscription'
      )
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.signature);
  end loop;
end $$;

-- Grant only functions that exist in this environment (safe across migration history).
do $$
declare
  signature text;
  signatures text[] := array[
    'public.verify_customer_login(text,text)',
    'public.customer_change_password(text,text,text)',
    'public.customer_create_order(uuid,text,jsonb,text,text,text,text,text,text,text)',
    'public.customer_list_orders(uuid)',
    'public.customer_confirm_draft_order(uuid,uuid)',
    'public.register_customer_account(text,text,text,text,text,text)',
    'public.customer_save_push_subscription(uuid,text,text,text,text)',
    'public.customer_remove_push_subscription(text)'
  ];
begin
  foreach signature in array signatures loop
    if to_regprocedure(signature) is not null then
      execute format('grant execute on function %s to anon, authenticated', signature);
    end if;
  end loop;
end $$;
