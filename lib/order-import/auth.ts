import { NextRequest } from 'next/server';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { canForProfile } from '@/lib/permissions';
import { getCustomerSupabaseAdmin } from '@/lib/customer-supabase-server';
import type { ImportActor, ImportChannel } from './types';

export async function resolveOrderImportActor(
  req: NextRequest,
  requestedCustomerId?: string | null,
  requestedChannel?: ImportChannel,
): Promise<{ ok: true; actor: ImportActor } | { ok: false; status: number; error: string }> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (!token) return { ok: false, status: 401, error: 'Vui lòng đăng nhập lại' };
  const supabase = getCustomerSupabaseAdmin();

  const { data: customerSession } = await supabase
    .from('customer_sessions')
    .select('customer_id, expires_at')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  if (customerSession?.customer_id) {
    if (requestedCustomerId && requestedCustomerId !== customerSession.customer_id) {
      return { ok: false, status: 403, error: 'Không được nhập đơn cho khách hàng khác' };
    }
    return {
      ok: true,
      actor: { type: 'customer', actorId: customerSession.customer_id, customerId: customerSession.customer_id, channel: 'website' },
    };
  }

  const admin = await verifyAdminAuth(req);
  if (!admin.ok) return { ok: false, status: 401, error: admin.error || 'Phiên đăng nhập không hợp lệ' };
  if (!canForProfile(admin.profile, 'orders.create')) {
    return { ok: false, status: 403, error: 'Bạn không có quyền tạo đơn hàng' };
  }
  if (!requestedCustomerId) {
    return { ok: false, status: 400, error: 'Vui lòng chọn khách hàng trước khi đọc đơn' };
  }
  return {
    ok: true,
    actor: {
      type: 'staff', actorId: admin.user?.id || admin.profile?.id || null,
      customerId: requestedCustomerId, channel: requestedChannel === 'website' ? 'website' : 'pos', role: admin.profile?.role || null,
    },
  };
}

export async function authorizeImportBatch(req: NextRequest, batchId: string) {
  const supabase = getCustomerSupabaseAdmin();
  const { data: batch, error } = await supabase.from('order_import_batches').select('*').eq('id', batchId).maybeSingle();
  if (error || !batch) return { ok: false as const, status: 404, error: 'Không tìm thấy phiên nhập đơn' };
  const resolved = await resolveOrderImportActor(req, batch.customer_id, batch.channel);
  if (!resolved.ok) return resolved;
  if (batch.actor_type === 'customer' && resolved.actor.type !== 'customer') {
    return { ok: false as const, status: 403, error: 'Không có quyền truy cập phiên nhập này' };
  }
  if (batch.actor_type !== resolved.actor.type || batch.actor_id !== resolved.actor.actorId) {
    return { ok: false as const, status: 403, error: 'Không có quyền truy cập phiên nhập này' };
  }
  return { ok: true as const, actor: resolved.actor, batch, supabase };
}
