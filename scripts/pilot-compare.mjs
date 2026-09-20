#!/usr/bin/env node
/**
 * scripts/pilot-compare.mjs — CHỈ ĐỌC, không ghi gì vào Supabase.
 *
 * Đối chiếu các đơn thử (nhập từ KiotViet) giữa KiotViet và TPS1 qua `orders.external_ref`
 * (nhân viên nhập mã đơn/hóa đơn KiotViet vào ô "Mã KiotViet" khi tạo đơn).
 *
 * Cách dùng:
 *   node --env-file=.env scripts/pilot-compare.mjs --date=2026-09-22
 *       → chỉ liệt kê đơn TPS1 của ngày giao đó + bảng mốc thời gian (không cần file KiotViet)
 *   node --env-file=.env scripts/pilot-compare.mjs --file=tmp/kiotviet_10_don.xlsx --date=2026-09-22
 *       → đối chiếu từng đơn với file xuất từ KiotViet (xlsx/csv, mỗi dòng = 1 mặt hàng của 1 đơn/hóa đơn)
 *
 * Tùy chọn:
 *   --basis=final|ordered   final (mặc định): so với số lượng/tiền THỰC GIAO của TPS1 (đối chiếu hóa đơn KiotViet)
 *                           ordered: so với số lượng KHÁCH ĐẶT (đối chiếu đơn đặt hàng KiotViet)
 *   --tol=500               dung sai tổng tiền (đồng), mặc định 500
 *   --out=tmp/pilot_compare.json   ghi kết quả chi tiết (nhớ: chứa tên khách, KHÔNG commit)
 *
 * File KiotViet cần các cột (tên tiếng Việt như xuất mặc định của KiotViet; script tự nhận diện gần đúng):
 *   Mã đơn/hóa đơn | Mã khách hàng | Mã hàng | Tên hàng | Số lượng | Đơn giá | Thành tiền
 *   (tùy chọn) Tổng tiền hàng / Khách cần trả — nếu có sẽ dùng làm tổng của đơn, nếu không sẽ cộng Thành tiền.
 */
import fs from 'node:fs';
import path from 'node:path';
import XLSX from 'xlsx';

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/);
  return m ? [m[1], m[2] ?? true] : [a, true];
}));
const url = process.env.SUPABASE_PRODUCTS_URL;
const key = process.env.SUPABASE_PRODUCTS_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Thiếu SUPABASE_PRODUCTS_URL / khóa service-role trong .env'); process.exit(1); }
const H = { apikey: key, Authorization: `Bearer ${key}` };
const basis = args.basis === 'ordered' ? 'ordered' : 'final';
const tol = Number(args.tol ?? 500);

// ---------- tiện ích ----------
const strip = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const num = (v) => {
  if (typeof v === 'number') return v;
  const s = String(v ?? '').trim().replace(/\s/g, '');
  if (!s) return 0;
  // KiotViet xuất "1,234.5" hoặc "1.234,5" tùy máy: bỏ ký tự phân nhóm dựa vào vị trí cuối
  const lastComma = s.lastIndexOf(','); const lastDot = s.lastIndexOf('.');
  let t = s;
  if (lastComma > -1 && lastDot > -1) t = lastComma > lastDot ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else if (lastComma > -1) t = /,\d{1,2}$/.test(s) ? s.replace(',', '.') : s.replace(/,/g, '');
  else if (/\.\d{3}(\.|$)/.test(s) && (s.match(/\./g) || []).length > 1) t = s.replace(/\./g, '');
  const n = Number(t);
  return Number.isFinite(n) ? n : 0;
};
const vnd = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n || 0));
const fmtT = (iso) => iso ? new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

async function rest(p) {
  const r = await fetch(`${url}/rest/v1/${p}`, { headers: H });
  if (!r.ok) throw new Error(`REST ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return r.json();
}

const ALIASES = {
  ref: ['ma hoa don', 'ma dat hang', 'ma don hang', 'ma chung tu', 'ma don', 'ma hd'],
  customer: ['ma khach hang', 'ma kh'],
  customerName: ['ten khach hang'],
  sku: ['ma hang', 'ma sp', 'ma san pham'],
  name: ['ten hang', 'ten san pham'],
  qty: ['so luong'],
  price: ['don gia', 'gia ban'],
  lineTotal: ['thanh tien'],
  total: ['tong tien hang', 'khach can tra', 'tong cong'],
};
function pickCol(headers, keys) {
  const norm = headers.map(strip);
  for (const k of keys) { const i = norm.indexOf(k); if (i > -1) return headers[i]; }
  for (const k of keys) { const i = norm.findIndex((h) => h.includes(k)); if (i > -1) return headers[i]; }
  return null;
}

function loadKiotViet(file) {
  const wb = XLSX.readFile(file);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  if (!rows.length) throw new Error('File KiotViet rỗng');
  const headers = Object.keys(rows[0]);
  const col = Object.fromEntries(Object.keys(ALIASES).map((k) => [k, pickCol(headers, ALIASES[k])]));
  const missing = ['ref', 'qty'].filter((k) => !col[k]);
  if (missing.length || (!col.sku && !col.name)) {
    throw new Error(`Không nhận diện được cột (${missing.join(', ') || 'mã hàng/tên hàng'}). Các cột có trong file: ${headers.join(' | ')}`);
  }
  console.log('Cột nhận diện:', Object.entries(col).map(([k, v]) => `${k}=${v ?? '∅'}`).join('; '), '\n');
  const orders = new Map();
  let lastRef = '';
  for (const r of rows) {
    // KiotViet đôi khi chỉ ghi mã ở dòng đầu của mỗi chứng từ → nhớ mã gần nhất
    const ref = String(r[col.ref] ?? '').trim() || lastRef;
    if (!ref) continue;
    lastRef = ref;
    const o = orders.get(ref) || { ref, customer: '', customerName: '', total: 0, sumLines: 0, lines: [] };
    if (col.customer && String(r[col.customer]).trim()) o.customer = String(r[col.customer]).trim();
    if (col.customerName && String(r[col.customerName]).trim()) o.customerName = String(r[col.customerName]).trim();
    if (col.total && num(r[col.total])) o.total = num(r[col.total]);
    const qty = num(r[col.qty]);
    if (!qty && !String(r[col.sku ?? col.name] ?? '').trim()) continue;
    const price = col.price ? num(r[col.price]) : 0;
    const lt = col.lineTotal ? num(r[col.lineTotal]) : qty * price;
    o.lines.push({ sku: col.sku ? String(r[col.sku]).trim() : '', name: col.name ? String(r[col.name]).trim() : '', qty, price, lineTotal: lt });
    o.sumLines += lt;
    orders.set(ref, o);
  }
  for (const o of orders.values()) if (!o.total) o.total = o.sumLines;
  return orders;
}

async function loadTps1(date, refs) {
  const sel = 'id,order_code,external_ref,status,customer_code,customer_name,delivery_date,is_late_order,grand_total,pre_delivery_grand_total,subtotal,discount_amount,pricing_status,created_at,confirmed_at,shipping_at,delivery_confirmed_at,completed_at,canceled_at,paid_amount,payment_status,invoice_document_status,order_items(sku,name,quantity,ordered_quantity,confirmed_quantity,quantity_delivered,unit_price,final_unit_price,line_total,final_line_total,customer_note)';
  const byDate = date ? await rest(`orders?select=${sel}&delivery_date=eq.${date}&order=created_at.asc&limit=500`) : [];
  let byRef = [];
  if (refs?.length) {
    const list = refs.map((r) => `"${String(r).replace(/"/g, '')}"`).join(',');
    byRef = await rest(`orders?select=${sel}&external_ref=in.(${encodeURIComponent(list)})&limit=500`);
  }
  const seen = new Map();
  for (const o of [...byDate, ...byRef]) seen.set(o.id, o);
  return [...seen.values()];
}

// ---------- chạy ----------
const date = typeof args.date === 'string' ? args.date : null;
const kv = args.file ? loadKiotViet(String(args.file)) : null;
if (!kv && !date) { console.error('Cần --date=YYYY-MM-DD và/hoặc --file=<file KiotViet>. Xem hướng dẫn đầu file.'); process.exit(1); }

const tps = await loadTps1(date, kv ? [...kv.keys()] : []);
const live = tps.filter((o) => o.status !== 'canceled' || o.external_ref);
const byRef = new Map(live.filter((o) => o.external_ref).map((o) => [String(o.external_ref).trim(), o]));

const report = { generatedAt: new Date().toISOString(), basis, date, compared: [], onlyKiotViet: [], onlyTps1: [], timing: [] };

if (kv) {
  console.log(`=== ĐỐI CHIẾU ${kv.size} chứng từ KiotViet ↔ TPS1 (so theo: ${basis === 'final' ? 'THỰC GIAO' : 'KHÁCH ĐẶT'}, dung sai ${tol}đ) ===\n`);
  let pass = 0;
  for (const [ref, k] of kv) {
    const t = byRef.get(ref);
    if (!t) { report.onlyKiotViet.push(ref); console.log(`✗ ${ref}: KHÔNG có đơn TPS1 nào gắn mã này (khách ${k.customer || k.customerName})`); continue; }
    const problems = [];
    if (t.status === 'canceled') problems.push('đơn TPS1 đã HỦY');
    const items = t.order_items || [];
    const qtyOf = (i) => (basis === 'ordered' ? Number(i.ordered_quantity ?? i.quantity) : Number(i.quantity_delivered ?? i.quantity));
    const tpsLines = items.filter((i) => qtyOf(i) > 0 || basis === 'ordered');
    const tpsTotal = basis === 'ordered' ? Number(t.pre_delivery_grand_total ?? t.grand_total) : Number(t.grand_total);
    if (Math.abs(tpsTotal - k.total) > tol) problems.push(`tổng tiền lệch: KiotViet ${vnd(k.total)} vs TPS1 ${vnd(tpsTotal)} (${tpsTotal - k.total > 0 ? '+' : ''}${vnd(tpsTotal - k.total)})`);
    if (tpsLines.length !== k.lines.length) problems.push(`số dòng hàng lệch: KiotViet ${k.lines.length} vs TPS1 ${tpsLines.length}`);
    const used = new Set();
    for (const kl of k.lines) {
      const idx = tpsLines.findIndex((i, n) => !used.has(n) && ((kl.sku && i.sku && strip(kl.sku) === strip(i.sku)) || (!kl.sku && strip(kl.name) === strip(i.name))));
      if (idx < 0) { problems.push(`thiếu mặt hàng ở TPS1: ${kl.sku || ''} ${kl.name}`.trim()); continue; }
      used.add(idx);
      const ti = tpsLines[idx];
      const tq = qtyOf(ti);
      if (Math.abs(tq - kl.qty) > 0.0005) problems.push(`${kl.name || kl.sku}: SL KiotViet ${kl.qty} vs TPS1 ${tq}`);
      const tp = Number(ti.final_unit_price ?? ti.unit_price);
      if (kl.price && Math.abs(tp - kl.price) > 1) problems.push(`${kl.name || kl.sku}: đơn giá KiotViet ${vnd(kl.price)} vs TPS1 ${vnd(tp)}`);
    }
    tpsLines.forEach((i, n) => { if (!used.has(n)) problems.push(`TPS1 dư mặt hàng: ${i.sku || ''} ${i.name}`.trim()); });
    if (String(k.customer).trim() && t.customer_code && strip(k.customer) !== strip(t.customer_code) && !strip(t.customer_code).endsWith(strip(k.customer))) {
      problems.push(`mã khách khác: KiotViet ${k.customer} vs TPS1 ${t.customer_code} (có thể đúng nếu TPS1 dùng mã TPS1-…)`);
    }
    const ok = problems.length === 0;
    if (ok) pass++;
    report.compared.push({ ref, order_code: t.order_code, ok, problems });
    console.log(`${ok ? '✓' : '✗'} ${ref} ↔ ${t.order_code} [${t.status}] ${t.customer_name}: ${ok ? 'KHỚP' : ''}`);
    problems.forEach((p) => console.log(`    - ${p}`));
  }
  console.log(`\nKết quả: ${pass}/${kv.size} khớp hoàn toàn.`);
  for (const t of live) {
    if (t.external_ref && !kv.has(String(t.external_ref).trim())) report.onlyTps1.push(t.order_code);
  }
  if (report.onlyTps1.length) console.log(`Đơn TPS1 có mã KiotViet nhưng không có trong file: ${report.onlyTps1.join(', ')}`);
  console.log('');
}

// đơn ngày giao không có mã KiotViet
const noRef = live.filter((o) => !o.external_ref && o.delivery_date === date);
if (date) {
  if (noRef.length) console.log(`⚠ ${noRef.length} đơn TPS1 ngày giao ${date} CHƯA có Mã KiotViet: ${noRef.map((o) => o.order_code).join(', ')}\n`);
  console.log(`=== MỐC THỜI GIAN các đơn giao ngày ${date} (${tps.filter((o) => o.delivery_date === date).length} đơn) ===`);
  console.log('Mã đơn | Khách | Trạng thái | Tạo | Xác nhận | Đang giao | Thực giao | Hoàn thành | Trễ giờ chốt | Tổng | Đã thu');
  for (const o of tps.filter((x) => x.delivery_date === date)) {
    const row = [o.order_code, o.customer_name, o.status, fmtT(o.created_at), fmtT(o.confirmed_at), fmtT(o.shipping_at), fmtT(o.delivery_confirmed_at), fmtT(o.completed_at), o.is_late_order ? 'CÓ' : '—', vnd(o.grand_total), vnd(o.paid_amount)];
    report.timing.push(row);
    console.log(row.join(' | '));
  }
}

if (args.out) {
  fs.mkdirSync(path.dirname(String(args.out)), { recursive: true });
  fs.writeFileSync(String(args.out), JSON.stringify(report, null, 2));
  console.log(`\nĐã ghi ${args.out} (chứa tên khách — không commit).`);
}
