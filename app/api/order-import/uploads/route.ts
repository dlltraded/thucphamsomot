import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getCustomerSupabaseAdmin } from '@/lib/customer-supabase-server';
import { resolveOrderImportActor } from '@/lib/order-import/auth';

export const runtime = 'nodejs';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' };
const allowed = new Map([
  ['image/jpeg', ['jpg', 'jpeg']], ['image/png', ['png']], ['image/webp', ['webp']], ['application/pdf', ['pdf']],
  ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ['xlsx']], ['application/vnd.ms-excel', ['xls']],
]);

function json(body: unknown, status = 200) { return NextResponse.json(body, { status, headers: cors }); }
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: cors }); }

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch { return json({ ok: false, error: 'Dữ liệu không hợp lệ' }, 400); }
  const resolved = await resolveOrderImportActor(req, body?.customerId || null, body?.channel);
  if (!resolved.ok) return json({ ok: false, error: resolved.error }, resolved.status);
  const files = Array.isArray(body?.files) ? body.files : [];
  const maxFiles = Math.max(1, Number(process.env.GEMINI_ORDER_MAX_FILES) || 10);
  const maxBytes = Math.max(1024, Number(process.env.GEMINI_ORDER_MAX_FILE_BYTES) || 10 * 1024 * 1024);
  if (!files.length || files.length > maxFiles) return json({ ok: false, error: `Chọn từ 1 đến ${maxFiles} tệp mỗi lần` }, 400);

  const normalizedFiles: Array<{ name: string; mimeType: string; size: number }> = [];
  for (const file of files) {
    let mime = String(file?.mimeType || '').toLowerCase();
    const name = String(file?.name || '').trim();
    const ext = name.split('.').pop()?.toLowerCase() || '';
    if ((!mime || mime === 'application/octet-stream') && ext === 'xlsx') mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    if ((!mime || mime === 'application/octet-stream') && ext === 'xls') mime = 'application/vnd.ms-excel';
    if (!allowed.has(mime) || !allowed.get(mime)!.includes(ext)) return json({ ok: false, error: `Không hỗ trợ tệp ${name || 'không rõ tên'}` }, 400);
    if (!Number.isFinite(Number(file.size)) || Number(file.size) <= 0 || Number(file.size) > maxBytes) return json({ ok: false, error: `${name} vượt quá giới hạn ${Math.round(maxBytes / 1024 / 1024)} MB` }, 400);
    normalizedFiles.push({ name, mimeType: mime, size: Number(file.size) });
  }

  const supabase = getCustomerSupabaseAdmin();
  // Dọn các phiên bị bỏ dở quá 24 giờ theo từng đợt nhỏ. Đây là lớp bảo vệ
  // bổ sung cho lịch dọn dữ liệu định kỳ, tránh giữ tài liệu khách hàng lâu hơn cần thiết.
  const { data: expiredBatches } = await supabase.from('order_import_batches')
    .select('id, files')
    .lt('expires_at', new Date().toISOString())
    .not('status', 'in', '(confirmed,cancelled)')
    .limit(20);
  const bucket = process.env.ORDER_IMPORT_BUCKET?.trim() || 'order-imports-private';
  for (const expired of expiredBatches || []) {
    const paths = (Array.isArray(expired.files) ? expired.files : []).map((file: any) => file?.path).filter(Boolean);
    if (paths.length) await supabase.storage.from(bucket).remove(paths);
    await supabase.from('order_import_batches').update({ status: 'cancelled', files: [], updated_at: new Date().toISOString() }).eq('id', expired.id);
  }
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const actorQuery = supabase.from('order_import_batches').select('id', { count: 'exact', head: true }).gte('created_at', hourAgo);
  const { count } = resolved.actor.type === 'customer'
    ? await actorQuery.eq('actor_type', 'customer').eq('actor_id', resolved.actor.actorId)
    : await actorQuery.eq('actor_type', 'staff').eq('actor_id', resolved.actor.actorId);
  const hourlyLimit = resolved.actor.type === 'customer' ? 10 : 50;
  if ((count || 0) >= hourlyLimit) return json({ ok: false, error: 'Bạn đã sử dụng quá nhiều lượt đọc đơn trong một giờ. Vui lòng thử lại sau.' }, 429);

  const dailyBudget = Number(process.env.GEMINI_ORDER_DAILY_BUDGET || 0);
  const usesGemini = normalizedFiles.some((file) => !file.mimeType.includes('spreadsheet') && file.mimeType !== 'application/vnd.ms-excel');
  if (dailyBudget > 0 && usesGemini) {
    const now = new Date();
    const vn = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const vnStartUtc = new Date(Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), vn.getUTCDate()) - 7 * 60 * 60 * 1000).toISOString();
    const { data: todayBatches } = await supabase.from('order_import_batches')
      .select('usage_metadata').gte('created_at', vnStartUtc).limit(10000);
    const spent = (todayBatches || []).reduce((sum: number, batch: any) => sum + Number(batch.usage_metadata?.estimated_cost_usd || 0), 0);
    if (spent >= dailyBudget) {
      return json({ ok: false, code: 'AI_DAILY_BUDGET_REACHED', error: 'Hạn mức đọc ảnh/PDF hôm nay đã hết. Bạn vẫn có thể nhập Excel hoặc đặt hàng thủ công.' }, 429);
    }
  }

  const batchId = crypto.randomUUID();
  const descriptors = normalizedFiles.map((file) => {
    const id = crypto.randomUUID();
    const safeExt = String(file.name).split('.').pop()?.toLowerCase() || 'bin';
    return { id, name: String(file.name).slice(0, 240), mimeType: String(file.mimeType), size: Number(file.size), path: `${resolved.actor.customerId}/${batchId}/${id}.${safeExt}` };
  });
  const { error: batchError } = await supabase.from('order_import_batches').insert({
    id: batchId, actor_type: resolved.actor.type, actor_id: resolved.actor.actorId,
    customer_id: resolved.actor.customerId, channel: resolved.actor.channel, status: 'uploading',
    model: process.env.GEMINI_ORDER_MODEL?.trim() || 'gemini-2.5-flash', files: descriptors, file_count: descriptors.length,
  });
  if (batchError) return json({ ok: false, error: `Chưa khởi tạo được phiên nhập đơn: ${batchError.message}` }, 500);

  const uploads = [];
  for (const file of descriptors) {
    const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(file.path);
    if (error || !data?.signedUrl) {
      await supabase.from('order_import_batches').update({ status: 'failed', error_message: error?.message || 'Không tạo được liên kết tải lên' }).eq('id', batchId);
      return json({ ok: false, error: 'Không tạo được liên kết tải tệp' }, 500);
    }
    uploads.push({ ...file, signedUrl: data.signedUrl, token: data.token });
  }
  return json({ ok: true, batchId, uploads, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() });
}
