-- TPS1 Phase 0 security lockdown
-- Date: 2026-09-29
-- Purpose:
--   1. Remove direct anonymous writes to operational/business tables.
--   2. Remove anonymous access to customer, order, CRM and private price data.
--   3. Keep only the intentionally public product catalogue and active general
--      price book readable.
--   4. Remove anonymous EXECUTE from every RPC except the reviewed customer
--      authentication/order RPC allow-list.
--
-- Idempotent: safe to run more than once.

begin;

-- ---------------------------------------------------------------------------
-- 1. Ensure RLS is enabled for every operational table that exists.
-- ---------------------------------------------------------------------------
do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'products',
    'quotes',
    'quote_history',
    'vip_accounts',
    'customer_sessions',
    'customer_addresses',
    'customer_contract_prices',
    'customer_operations_assignments',
    'orders',
    'order_items',
    'order_history',
    'order_documents',
    'order_payments',
    'order_confirmations',
    'order_change_requests',
    'push_subscriptions',
    'admin_profiles',
    'staff_departments',
    'vouchers',
    'voucher_usages',
    'price_books',
    'price_book_items',
    'price_book_customer_assignments',
    'price_book_customer_group_assignments',
    'price_book_import_jobs',
    'price_book_import_rows',
    'price_book_audit_logs'
  ] loop
    if to_regclass(format('public.%I', v_table)) is not null then
      execute format('alter table public.%I enable row level security', v_table);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Remove policies that accidentally apply to PUBLIC/anon.
--    products keeps one explicit read-only public policy.
--    price_books/items keep one explicit read-only active-general policy.
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = any(array[
        'products', 'quotes', 'quote_history', 'vip_accounts',
        'customer_sessions', 'customer_addresses', 'customer_contract_prices',
        'customer_operations_assignments', 'orders', 'order_items',
        'order_history', 'order_documents', 'order_payments',
        'order_confirmations', 'order_change_requests', 'push_subscriptions',
        'admin_profiles', 'staff_departments', 'vouchers', 'voucher_usages',
        'price_books', 'price_book_items', 'price_book_customer_assignments',
        'price_book_customer_group_assignments', 'price_book_import_jobs',
        'price_book_import_rows', 'price_book_audit_logs'
      ])
      and (
        roles && array['public', 'anon']::name[]
        or roles is null
      )
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- Products are public catalogue data, but strictly read-only for anon.
revoke all on table public.products from anon;
grant select on table public.products to anon, authenticated;
create policy "public_read_active_products"
  on public.products
  for select
  to anon, authenticated
  using (coalesce(active, true) = true);

-- Active GENERAL prices may be shown publicly. Customer/group prices stay private.
do $$
begin
  if to_regclass('public.price_books') is not null then
    revoke all on table public.price_books from anon, authenticated;
    grant select on table public.price_books to anon, authenticated;
    execute $policy$
      create policy "public_read_active_general_price_books"
      on public.price_books
      for select
      to anon, authenticated
      using (
        status = 'active'
        and kind = 'general'
        and (valid_from is null or valid_from <= now())
        and (valid_to is null or valid_to >= now())
      )
    $policy$;
  end if;

  if to_regclass('public.price_book_items') is not null then
    revoke all on table public.price_book_items from anon, authenticated;
    grant select on table public.price_book_items to anon, authenticated;
    execute $policy$
      create policy "public_read_active_general_price_book_items"
      on public.price_book_items
      for select
      to anon, authenticated
      using (
        exists (
          select 1
          from public.price_books pb
          where pb.id = price_book_items.price_book_id
            and pb.status = 'active'
            and pb.kind = 'general'
            and (pb.valid_from is null or pb.valid_from <= now())
            and (pb.valid_to is null or pb.valid_to >= now())
        )
        and (effective_from is null or effective_from <= now())
        and (effective_to is null or effective_to >= now())
      )
    $policy$;
  end if;
end $$;

-- Every other sensitive table is inaccessible to anon at table level.
do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'quotes', 'quote_history', 'vip_accounts', 'customer_sessions',
    'customer_addresses', 'customer_contract_prices',
    'customer_operations_assignments', 'orders', 'order_items',
    'order_history', 'order_documents', 'order_payments',
    'order_confirmations', 'order_change_requests', 'push_subscriptions',
    'admin_profiles', 'staff_departments', 'vouchers', 'voucher_usages',
    'price_book_customer_assignments',
    'price_book_customer_group_assignments', 'price_book_import_jobs',
    'price_book_import_rows', 'price_book_audit_logs'
  ] loop
    if to_regclass(format('public.%I', v_table)) is not null then
      execute format('revoke all on table public.%I from anon', v_table);
    end if;
  end loop;
end $$;

-- Global invariant: the public anonymous role never writes directly to a
-- table. Customer mutations must go through one of the reviewed RPCs above or
-- through a Server API. This also covers legacy/supporting tables that may be
-- added by an older manual SQL script (for example app_settings,
-- customer_tiers, inventory_transactions or product_tier_prices).
do $$
declare
  r record;
begin
  for r in
    select tablename
    from pg_tables
    where schemaname = 'public'
  loop
    execute format(
      'revoke insert, update, delete, truncate, references, trigger on table public.%I from anon',
      r.tablename
    );
  end loop;
end $$;

-- Price-book maintenance is server-only. The authenticated browser receives
-- read-only active-general access above; writes must use a checked Server API.
revoke insert, update, delete, truncate, references, trigger
  on table public.price_books, public.price_book_items
  from authenticated;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'price_book_customer_assignments',
    'price_book_customer_group_assignments',
    'customer_operations_assignments',
    'price_book_import_jobs',
    'price_book_import_rows',
    'price_book_audit_logs'
  ] loop
    if to_regclass(format('public.%I', v_table)) is not null then
      execute format('revoke all on table public.%I from authenticated', v_table);
    end if;
  end loop;
end $$;

-- Product writes also go through checked Server APIs. Staff clients retain read.
revoke insert, update, delete, truncate, references, trigger
  on table public.products
  from authenticated;

-- ---------------------------------------------------------------------------
-- 3. RPC lockdown.
--    Revoke anonymous EXECUTE from every public function, then restore only
--    exact reviewed customer-facing signatures that exist in this database.
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and has_function_privilege('anon', p.oid, 'EXECUTE')
  loop
    execute format('revoke execute on function %s from public, anon', r.signature);
  end loop;
end $$;

do $$
declare
  v_signature text;
begin
  foreach v_signature in array array[
    'public.verify_customer_login(text,text)',
    'public.customer_change_password(text,text,text)',
    'public.customer_create_order(uuid,text,jsonb,text,text,text,text,text,text,text)',
    'public.customer_list_orders(uuid)',
    'public.customer_confirm_draft_order(uuid,uuid)',
    'public.register_customer_account(text,text,text,text,text,text)',
    'public.customer_save_push_subscription(uuid,text,text,text,text)',
    'public.customer_remove_push_subscription(text)'
  ] loop
    if to_regprocedure(v_signature) is not null then
      execute format('grant execute on function %s to anon, authenticated', v_signature);
    end if;
  end loop;
end $$;

commit;

-- ---------------------------------------------------------------------------
-- Verification result set. Expected:
--   anon_write_grants = 0
--   unsafe_anon_policies = 0
--   unexpected_anon_functions = 0
-- ---------------------------------------------------------------------------
with
anon_write_grants as (
  select count(*)::int as value
  from information_schema.role_table_grants
  where table_schema = 'public'
    and grantee = 'anon'
    and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER')
),
unsafe_anon_policies as (
  select count(*)::int as value
  from pg_policies
  where schemaname = 'public'
    and (roles && array['public', 'anon']::name[] or roles is null)
    and cmd in ('ALL', 'INSERT', 'UPDATE', 'DELETE')
),
unexpected_anon_functions as (
  select count(*)::int as value
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and has_function_privilege('anon', p.oid, 'EXECUTE')
    and p.oid::regprocedure::text not in (
      'verify_customer_login(text,text)',
      'customer_change_password(text,text,text)',
      'customer_create_order(uuid,text,jsonb,text,text,text,text,text,text,text)',
      'customer_list_orders(uuid)',
      'customer_confirm_draft_order(uuid,uuid)',
      'register_customer_account(text,text,text,text,text,text)',
      'customer_save_push_subscription(uuid,text,text,text,text)',
      'customer_remove_push_subscription(text)'
    )
)
select
  (select value from anon_write_grants) as anon_write_grants,
  (select value from unsafe_anon_policies) as unsafe_anon_policies,
  (select value from unexpected_anon_functions) as unexpected_anon_functions;

