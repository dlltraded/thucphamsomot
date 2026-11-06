alter table public.vip_accounts
  add column if not exists username text,
  add column if not exists username_changed_at timestamptz;

create unique index if not exists vip_accounts_username_unique
  on public.vip_accounts (lower(username)) where username is not null;

create or replace function public.tps1_normalize_phone(p_phone text)
returns text language sql immutable as $$
  select case when digits like '84%' and length(digits) = 11
    then '0' || substr(digits, 3) else digits end
  from (select regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g') as digits) x;
$$;

create index if not exists vip_accounts_login_phone_idx
  on public.vip_accounts (public.tps1_normalize_phone(phone)) where is_active = true;

create or replace function public.tps1_validate_username()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.username is not null then
    new.username := lower(trim(new.username));
    if new.username !~ '^[a-z][a-z0-9._-]{3,29}$' then
      raise exception 'USERNAME_INVALID';
    end if;
    if exists (select 1 from public.vip_accounts a where lower(a.partner_code) = new.username) then
      raise exception 'USERNAME_CONFLICT';
    end if;
  end if;
  if exists (select 1 from public.vip_accounts a where lower(a.username) = lower(new.partner_code)) then
    raise exception 'USERNAME_CONFLICT';
  end if;
  return new;
end;
$$;
drop trigger if exists tps1_validate_username_trigger on public.vip_accounts;
create trigger tps1_validate_username_trigger before insert or update of username, partner_code
  on public.vip_accounts for each row execute function public.tps1_validate_username();

create or replace function public.tps1_resolve_customer_identifier(p_identifier text)
returns table(status text, partner_code text)
language plpgsql security definer set search_path = public as $$
declare v_input text := trim(coalesce(p_identifier, ''));
declare v_phone text;
declare v_count integer;
begin
  if v_input = '' then return query select 'invalid'::text, null::text; return; end if;
  if v_input ~ '^[+]?[0-9 ()-]{9,20}$' then
    v_phone := public.tps1_normalize_phone(v_input);
    select count(*), min(a.partner_code) into v_count, partner_code
      from public.vip_accounts a
      where a.is_active = true and public.tps1_normalize_phone(a.phone) = v_phone;
    if v_count > 1 then return query select 'ambiguous'::text, null::text; return; end if;
    if v_count = 1 then return query select 'found'::text, partner_code; return; end if;
  end if;
  select a.partner_code into partner_code from public.vip_accounts a
    where a.is_active = true and (lower(a.username) = lower(v_input) or lower(a.partner_code) = lower(v_input))
    order by case when lower(a.username) = lower(v_input) then 0 else 1 end limit 1;
  if partner_code is null then return query select 'missing'::text, null::text;
  else return query select 'found'::text, partner_code; end if;
end;
$$;
revoke all on function public.tps1_resolve_customer_identifier(text) from public;
grant execute on function public.tps1_resolve_customer_identifier(text) to service_role;

create or replace function public.tps1_register_customer_with_username(
  p_name text, p_phone text, p_password text, p_company text, p_email text,
  p_source text, p_username text
) returns table(id uuid, code text, name text, phone text, tier text, verification_status text)
language plpgsql security definer set search_path = public, extensions as $$
declare v_row record;
begin
  if nullif(trim(p_username), '') is null then raise exception 'USERNAME_REQUIRED'; end if;
  select * into v_row from public.register_customer_account(p_name, p_phone, p_password, p_company, p_email, p_source);
  update public.vip_accounts a set username = lower(trim(p_username)), username_changed_at = now() where a.id = v_row.id;
  return query select v_row.id, v_row.code, v_row.name, v_row.phone, v_row.tier, v_row.verification_status;
end;
$$;
revoke all on function public.tps1_register_customer_with_username(text,text,text,text,text,text,text) from public;
grant execute on function public.tps1_register_customer_with_username(text,text,text,text,text,text,text) to service_role;

create or replace function public.tps1_set_customer_username(p_customer_id uuid, p_username text)
returns text language plpgsql security definer set search_path = public as $$
declare v_account public.vip_accounts%rowtype;
declare v_username text := lower(trim(coalesce(p_username, '')));
begin
  if v_username !~ '^[a-z][a-z0-9._-]{3,29}$' then raise exception 'USERNAME_INVALID'; end if;
  select * into v_account from public.vip_accounts where id = p_customer_id and is_active = true for update;
  if not found then raise exception 'ACCOUNT_NOT_FOUND'; end if;
  if v_account.username = v_username then return v_username; end if;
  if v_account.username_changed_at is not null and v_account.username_changed_at > now() - interval '30 days' then
    raise exception 'USERNAME_COOLDOWN';
  end if;
  update public.vip_accounts set username = v_username, username_changed_at = now() where id = p_customer_id;
  return v_username;
end;
$$;
revoke all on function public.tps1_set_customer_username(uuid,text) from public;
grant execute on function public.tps1_set_customer_username(uuid,text) to service_role;
