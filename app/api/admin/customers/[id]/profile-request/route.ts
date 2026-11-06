import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { getCustomerSupabaseAdmin } from '@/lib/customer-supabase-server';

const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers });
type Ctx = { params: Promise<{ id: string }> };
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers }); }
async function guard(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  return auth.ok && ['admin', 'truong_phong'].includes(auth.profile?.role || '') ? auth : null;
}
export async function GET(req: NextRequest, ctx: Ctx) {
  if (!await guard(req)) return json({ ok: false, error: 'Không có quyền' }, 403);
  const { id } = await ctx.params;
  const { data, error } = await getCustomerSupabaseAdmin().from('customer_profile_requests').select('id,company,tax_code,status,requested_at,note').eq('customer_id', id).order('requested_at', { ascending: false }).limit(1).maybeSingle();
  return error ? json({ ok: false, error: 'Không tải được yêu cầu' }, 500) : json({ ok: true, request: data });
}
export async function POST(req: NextRequest, ctx: Ctx) {
  const auth = await guard(req);
  if (!auth) return json({ ok: false, error: 'Không có quyền' }, 403);
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (!body?.requestId || !['approved', 'rejected'].includes(body?.status)) return json({ ok: false, error: 'Thao tác không hợp lệ' }, 400);
  const db = getCustomerSupabaseAdmin();
  const { data: pending } = await db.from('customer_profile_requests').select('id,company,tax_code').eq('id', body.requestId).eq('customer_id', id).eq('status', 'pending').maybeSingle();
  if (!pending) return json({ ok: false, error: 'Yêu cầu đã được xử lý' }, 409);
  if (body.status === 'approved') {
    const { error } = await db.from('vip_accounts').update({ company: pending.company, tax_code: pending.tax_code, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) return json({ ok: false, error: 'Không cập nhật được khách hàng' }, 500);
  }
  const { error } = await db.from('customer_profile_requests').update({ status: body.status, note: String(body.note || '').slice(0, 500), resolved_at: new Date().toISOString(), resolved_by: auth.profile?.id }).eq('id', pending.id).eq('status', 'pending');
  return error ? json({ ok: false, error: 'Không xử lý được yêu cầu' }, 500) : json({ ok: true });
}
