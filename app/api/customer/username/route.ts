import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCustomerSupabaseAdmin } from '@/lib/customer-supabase-server';
import { CUSTOMER_SESSION_COOKIE, parseSessionCookieValue } from '@/lib/customer-session';

const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'PATCH, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers });
const schema = z.object({ username: z.string().trim().toLowerCase().regex(/^[a-z][a-z0-9._-]{3,29}$/) }).strict();

export async function OPTIONS() { return new NextResponse(null, { status: 204, headers }); }

export async function PATCH(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ ok: false, code: 'USERNAME_INVALID', error: 'Tên đăng nhập gồm 4–30 ký tự, bắt đầu bằng chữ cái' }, 400);
  const cookie = parseSessionCookieValue(req.cookies.get(CUSTOMER_SESSION_COOKIE)?.value);
  const token = cookie?.orderSessionToken || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return json({ ok: false, code: 'SESSION_EXPIRED', error: 'Phiên đăng nhập đã hết hạn' }, 401);
  const db = getCustomerSupabaseAdmin();
  const { data: session } = await db.from('customer_sessions').select('customer_id').eq('token', token).gt('expires_at', new Date().toISOString()).maybeSingle();
  if (!session?.customer_id) return json({ ok: false, code: 'SESSION_EXPIRED', error: 'Phiên đăng nhập đã hết hạn' }, 401);
  const { data, error } = await db.rpc('tps1_set_customer_username', { p_customer_id: session.customer_id, p_username: parsed.data.username });
  if (error) {
    const message = error.message || '';
    if (/USERNAME_COOLDOWN/.test(message)) return json({ ok: false, code: 'USERNAME_COOLDOWN', error: 'Chỉ đổi tên đăng nhập sau 30 ngày' }, 409);
    if (/USERNAME_CONFLICT|vip_accounts_username_unique|duplicate key/.test(message)) return json({ ok: false, code: 'USERNAME_TAKEN', error: 'Tên đăng nhập đã được sử dụng' }, 409);
    if (/USERNAME_INVALID/.test(message)) return json({ ok: false, code: 'USERNAME_INVALID', error: 'Tên đăng nhập chưa hợp lệ' }, 400);
    return json({ ok: false, error: 'Không lưu được tên đăng nhập' }, 500);
  }
  return json({ ok: true, username: data });
}
