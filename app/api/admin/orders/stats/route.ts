import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { canForProfile } from '@/lib/permissions';
import { getCustomerSupabaseAdmin } from '@/lib/customer-supabase-server';

export async function GET(req: NextRequest) {
  const start = performance.now();
  const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Expose-Headers': 'Server-Timing', 'Cache-Control': 'private, no-store' };
  const auth = await verifyAdminAuth(req);
  const authMs = performance.now() - start;
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: 401, headers });
  if (!canForProfile(auth.profile, 'orders.view')) return NextResponse.json({ ok: false, error: 'Không có quyền xem đơn hàng' }, { status: 403, headers });
  const from = req.nextUrl.searchParams.get('dateFrom');
  const to = req.nextUrl.searchParams.get('dateTo');
  const { data, error } = await getCustomerSupabaseAdmin().rpc('admin_order_status_counts', { p_from: from || null, p_to: to || null });
  if (error) return NextResponse.json({ ok: false, error: 'Không tải được thống kê đơn hàng' }, { status: 503, headers });
  return NextResponse.json({ ok: true, stats: data }, { headers: { ...headers, 'Server-Timing': `auth;dur=${authMs.toFixed(1)},query;dur=${(performance.now() - start - authMs).toFixed(1)}` } });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Admin-Token' } });
}
