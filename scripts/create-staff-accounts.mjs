#!/usr/bin/env node
// Tạo tài khoản nhân viên THỬ NGHIỆM (thu mua, kho, kế toán, sale 2) cho giai đoạn test.
// Mặc định CHẠY KHÔ (chỉ liệt kê). Thêm --apply để tạo thật (anh tự chạy trên máy anh).
// Mật khẩu ngẫu nhiên chỉ in ra MÀN HÌNH MỘT LẦN — không lưu vào file/log. Khi live sẽ đổi/vô hiệu hóa.
//
//   node --env-file=.env scripts/create-staff-accounts.mjs          (chạy khô)
//   node --env-file=.env scripts/create-staff-accounts.mjs --apply  (tạo thật)
import crypto from 'node:crypto';

const url = process.env.SUPABASE_PRODUCTS_URL;
const key = process.env.SUPABASE_PRODUCTS_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Thiếu SUPABASE_PRODUCTS_URL / khóa service-role trong .env'); process.exit(1); }
const apply = process.argv.includes('--apply');

const ACCOUNTS = [
  { email: 'thumua@thucphamsomot.vn', name: 'Thu mua (test)', role: 'thu_mua' },
  { email: 'kho@thucphamsomot.vn', name: 'Kho / Soạn hàng (test)', role: 'kho' },
  { email: 'ketoan@thucphamsomot.vn', name: 'Kế toán (test)', role: 'ke_toan' },
  { email: 'sale02@thucphamsomot.vn', name: 'NV Vận hành 2 (test)', role: 'sale' },
];

const H = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

function randomPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let out = '';
  for (const b of crypto.randomBytes(14)) out += chars[b % chars.length];
  return out + '#7';
}

const existing = await (await fetch(`${url}/rest/v1/admin_profiles?select=email,role`, { headers: H })).json();
const have = new Set((existing || []).map((p) => String(p.email || '').toLowerCase()));

console.log(apply ? 'CHẾ ĐỘ TẠO THẬT (--apply)\n' : 'CHẠY KHÔ — chưa tạo gì (thêm --apply để tạo)\n');
const created = [];
for (const a of ACCOUNTS) {
  if (have.has(a.email)) { console.log(`- ${a.email}: đã có, bỏ qua`); continue; }
  if (!apply) { console.log(`- ${a.email} (${a.role}) → SẼ TẠO`); continue; }
  const password = randomPassword();
  const res = await fetch(`${url}/auth/v1/admin/users`, {
    method: 'POST', headers: H, body: JSON.stringify({ email: a.email, password, email_confirm: true }),
  });
  const user = await res.json();
  if (!res.ok || !user.id) { console.error(`- ${a.email}: LỖI tạo tài khoản đăng nhập:`, user.msg || user.message || res.status); continue; }
  const prof = await fetch(`${url}/rest/v1/admin_profiles`, {
    method: 'POST', headers: { ...H, Prefer: 'return=minimal' },
    body: JSON.stringify({ id: user.id, email: a.email, name: a.name, role: a.role, is_active: true }),
  });
  if (!prof.ok) { console.error(`- ${a.email}: tạo được đăng nhập nhưng LỖI ghi hồ sơ nhân viên:`, await prof.text()); continue; }
  created.push({ email: a.email, role: a.role, password });
  console.log(`- ${a.email} (${a.role}) → ĐÃ TẠO`);
}

if (created.length) {
  console.log('\n===== THÔNG TIN ĐĂNG NHẬP (chỉ hiện 1 lần — hãy chép lại rồi xóa màn hình) =====');
  for (const c of created) console.log(`${c.role.padEnd(8)} | ${c.email} | ${c.password}`);
  console.log('=====================================================================================');
}
