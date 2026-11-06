import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCustomerSupabaseAdmin } from '@/lib/customer-supabase-server';
import { CUSTOMER_SESSION_COOKIE, parseSessionCookieValue } from '@/lib/customer-session';
import sharp from 'sharp';

const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, PATCH, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers });
const schema = z.object({ name: z.string().trim().min(2).max(120), company: z.string().trim().min(2).max(180), taxCode: z.string().trim().max(30) }).strict();
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers }); }

async function context(req: NextRequest) {
  const cookie = parseSessionCookieValue(req.cookies.get(CUSTOMER_SESSION_COOKIE)?.value);
  const token = cookie?.orderSessionToken || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const db = getCustomerSupabaseAdmin();
  const { data } = await db.from('customer_sessions').select('customer_id').eq('token', token).gt('expires_at', new Date().toISOString()).maybeSingle();
  return data?.customer_id ? { db, customerId: data.customer_id } : null;
}

async function readAccount(ctx: NonNullable<Awaited<ReturnType<typeof context>>>) {
  const [{ data: account, error }, { data: request }] = await Promise.all([
    ctx.db.from('vip_accounts').select('id,name,company,tax_code,avatar_path,username,username_changed_at').eq('id', ctx.customerId).eq('is_active', true).maybeSingle(),
    ctx.db.from('customer_profile_requests').select('id,company,tax_code,status,requested_at,note').eq('customer_id', ctx.customerId).order('requested_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (error || !account) return null;
  const avatarUrl = account.avatar_path ? (await ctx.db.storage.from('customer-avatars').createSignedUrl(account.avatar_path, 3600)).data?.signedUrl || null : null;
  return { name: account.name, company: account.company || '', taxCode: account.tax_code || '', username: account.username || '', usernameChangedAt: account.username_changed_at || null, avatarUrl, request: request || null };
}

export async function GET(req: NextRequest) {
  const ctx = await context(req); if (!ctx) return json({ ok: false, error: 'Phiên đăng nhập đã hết hạn' }, 401);
  const account = await readAccount(ctx); return account ? json({ ok: true, account }) : json({ ok: false, error: 'Không tải được tài khoản' }, 500);
}

export async function PATCH(req: NextRequest) {
  const ctx = await context(req); if (!ctx) return json({ ok: false, error: 'Phiên đăng nhập đã hết hạn' }, 401);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ ok: false, error: 'Thông tin chưa hợp lệ' }, 400);
  const { name, company, taxCode } = parsed.data;
  const { data: current, error: findError } = await ctx.db.from('vip_accounts').select('name,company,tax_code').eq('id', ctx.customerId).eq('is_active', true).single();
  if (findError || !current) return json({ ok: false, error: 'Không tải được tài khoản' }, 500);
  const { error: nameError } = await ctx.db.from('vip_accounts').update({ name }).eq('id', ctx.customerId);
  if (nameError) return json({ ok: false, error: 'Không lưu được tên liên hệ' }, 500);
  if (company !== (current.company || '') || taxCode !== (current.tax_code || '')) {
    const { data: pending } = await ctx.db.from('customer_profile_requests').select('id').eq('customer_id', ctx.customerId).eq('status', 'pending').maybeSingle();
    const result = pending
      ? await ctx.db.from('customer_profile_requests').update({ company, tax_code: taxCode, requested_at: new Date().toISOString() }).eq('id', pending.id)
      : await ctx.db.from('customer_profile_requests').insert({ customer_id: ctx.customerId, company, tax_code: taxCode });
    if (result.error) return json({ ok: false, error: 'Không gửi được yêu cầu cập nhật' }, 500);
  }
  const account = await readAccount(ctx); return json({ ok: true, account });
}

export async function POST(req: NextRequest) {
  const ctx = await context(req); if (!ctx) return json({ ok: false, error: 'Phiên đăng nhập đã hết hạn' }, 401);
  const file = (await req.formData().catch(() => null))?.get('avatar');
  if (!(file instanceof File) || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2_097_152 || file.size === 0) return json({ ok: false, error: 'Chọn ảnh JPG, PNG hoặc WebP dưới 2 MB' }, 400);
  let image: Buffer;
  try { image = await sharp(Buffer.from(await file.arrayBuffer())).rotate().resize(512, 512, { fit: 'cover' }).webp({ quality: 82 }).toBuffer(); }
  catch { return json({ ok: false, error: 'Ảnh không hợp lệ' }, 400); }
  const path = `${ctx.customerId}/avatar-${Date.now()}.webp`;
  const { error: uploadError } = await ctx.db.storage.from('customer-avatars').upload(path, image, { contentType: 'image/webp', upsert: false });
  if (uploadError) return json({ ok: false, error: 'Không lưu được ảnh đại diện' }, 500);
  const { data: previous } = await ctx.db.from('vip_accounts').select('avatar_path').eq('id', ctx.customerId).maybeSingle();
  const { error: updateError } = await ctx.db.from('vip_accounts').update({ avatar_path: path }).eq('id', ctx.customerId);
  if (updateError) { await ctx.db.storage.from('customer-avatars').remove([path]); return json({ ok: false, error: 'Không lưu được ảnh đại diện' }, 500); }
  if (previous?.avatar_path) await ctx.db.storage.from('customer-avatars').remove([previous.avatar_path]);
  const account = await readAccount(ctx); return json({ ok: true, account });
}
