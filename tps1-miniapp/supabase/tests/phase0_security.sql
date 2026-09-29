-- Phase 0 security acceptance test.
-- All three values must be zero.

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
select 'anon_write_grants' as metric, value from anon_write_grants
union all
select 'unsafe_anon_policies', value from unsafe_anon_policies
union all
select 'unexpected_anon_functions', value from unexpected_anon_functions;

-- Public catalogue must remain readable.
select count(*) > 0 as public_active_products_available
from public.products
where coalesce(active, true) = true;

-- Only active general price books may be exposed to anon by policy.
select policyname, cmd, roles
from pg_policies
where schemaname = 'public'
  and tablename in ('products', 'price_books', 'price_book_items')
  and roles && array['public', 'anon']::name[]
order by tablename, policyname;
