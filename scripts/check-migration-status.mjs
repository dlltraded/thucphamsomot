#!/usr/bin/env node
// Kiểm tra (CHỈ ĐỌC) các migration đã áp dụng lên Supabase hay chưa, qua schema REST (OpenAPI).
// Dùng: node --env-file=.env scripts/check-migration-status.mjs
const url = process.env.SUPABASE_PRODUCTS_URL;
const key = process.env.SUPABASE_PRODUCTS_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Thiếu SUPABASE_PRODUCTS_URL / service-role key trong .env'); process.exit(1); }

const spec = await (await fetch(`${url}/rest/v1/`, { headers: { apikey: key, Authorization: `Bearer ${key}` } })).json();
const defs = spec.definitions || {};
const paths = Object.keys(spec.paths || {});
const col = (t, c) => !!defs[t]?.properties?.[c];
const table = (t) => !!defs[t];
const rpc = (f) => paths.includes(`/rpc/${f}`);

const checks = [
  ['20260911 customer_addresses', table('customer_addresses')],
  ['20260911b hóa đơn (orders.invoice_document_status)', col('orders', 'invoice_document_status')],
  ['20260911c soạn hàng (orders.packing_status)', col('orders', 'packing_status')],
  ['20260911e giá hợp đồng (customer_contract_prices)', table('customer_contract_prices')],
  ['20260920 orders.delivery_date', col('orders', 'delivery_date')],
  ['20260920 orders.is_late_order', col('orders', 'is_late_order')],
  ['20260920 orders.delivery_address_id', col('orders', 'delivery_address_id')],
  ['20260920 order_items.ordered_quantity', col('order_items', 'ordered_quantity')],
  ['20260920 order_items.customer_note', col('order_items', 'customer_note')],
  ['20260920 app_settings', table('app_settings')],
  ['20260920 procurement_exports', table('procurement_exports')],
  ['20260920b products.search_text', col('products', 'search_text')],
  ['20260920b search_products()', rpc('search_products')],
  ['20260920c vip_accounts.kiotviet_code', col('vip_accounts', 'kiotviet_code')],
  ['20260920c generate_partner_code() (chỉ service_role)', rpc('generate_partner_code')],
  ['20260920e order_change_requests', table('order_change_requests')],
  ['20260920f orders.external_ref', col('orders', 'external_ref')],
  ['20260920g orders.delivery_confirmed_at', col('orders', 'delivery_confirmed_at')],
  ['20260920h auth_attempts (giới hạn đăng nhập)', table('auth_attempts')],
];
let missing = 0;
for (const [name, ok] of checks) { console.log(`${ok ? '  ✔' : '  ✘'}  ${name}`); if (!ok) missing++; }
console.log(`\n${checks.length - missing}/${checks.length} mục đã có.`);
