-- Restore table privileges for staff using Supabase Auth.
-- RLS policies remain the source of truth for which staff member can see/edit rows.
-- anon stays blocked by 20260921_security_lockdown.sql.

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
      execute format('grant select, insert, update, delete on table public.%I to authenticated', table_name);
    end if;
  end loop;
end $$;
