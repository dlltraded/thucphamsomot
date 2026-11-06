import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
await db.exec(`create role service_role; create table public.vip_accounts (
  id uuid primary key, partner_code text not null unique, phone text, is_active boolean not null default true
);
create function public.register_customer_account(text,text,text,text,text,text)
returns table(id uuid, code text, name text, phone text, tier text, verification_status text)
language sql as $$ select null::uuid, ''::text, ''::text, ''::text, ''::text, ''::text $$;`);
await db.exec(readFileSync(new URL('../tps1-miniapp/supabase/migrations/20261106_customer_username_login.sql', import.meta.url), 'utf8'));
await db.exec(`insert into vip_accounts (id,partner_code,phone) values
('00000000-0000-0000-0000-000000000001','TPS1-ONE','0901234567'),
('00000000-0000-0000-0000-000000000002','TPS1-TWO','0912345678');`);
const resolve = async value => (await db.query('select * from tps1_resolve_customer_identifier($1)', [value])).rows[0];
assert.deepEqual(await resolve('+84901234567'), { status: 'found', partner_code: 'TPS1-ONE' });
assert.deepEqual(await resolve('0901234567'), { status: 'found', partner_code: 'TPS1-ONE' });
await db.query('select tps1_set_customer_username($1,$2)', ['00000000-0000-0000-0000-000000000001', 'BepOne']);
assert.deepEqual(await resolve('bepone'), { status: 'found', partner_code: 'TPS1-ONE' });
await assert.rejects(db.query('select tps1_set_customer_username($1,$2)', ['00000000-0000-0000-0000-000000000002', 'bepone']), /USERNAME|duplicate/);
await assert.rejects(db.query('select tps1_set_customer_username($1,$2)', ['00000000-0000-0000-0000-000000000002', 'TPS1-ONE']), /USERNAME_CONFLICT/);
await assert.rejects(db.query('select tps1_set_customer_username($1,$2)', ['00000000-0000-0000-0000-000000000001', 'bepnew']), /USERNAME_COOLDOWN/);
await db.exec(`insert into vip_accounts (id,partner_code,phone) values ('00000000-0000-0000-0000-000000000003','TPS1-THREE','+84901234567');`);
assert.deepEqual(await resolve('0901234567'), { status: 'ambiguous', partner_code: null });
assert.deepEqual(await resolve('TPS1-ONE'), { status: 'found', partner_code: 'TPS1-ONE' });
await db.exec(`update vip_accounts set is_active = false where partner_code = 'TPS1-TWO';`);
assert.deepEqual(await resolve('0912345678'), { status: 'missing', partner_code: null });
await db.close();
console.log('customer username migration: ok');
