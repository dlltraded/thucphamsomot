import { NextRequest, NextResponse } from 'next/server';
import { getCustomerSupabaseAdmin } from '@/lib/customer-supabase-server';

const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers });
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers }); }
async function customer(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const db = getCustomerSupabaseAdmin();
  const { data } = await db.from('customer_sessions').select('customer_id').eq('token', token).gt('expires_at', new Date().toISOString()).maybeSingle();
  return data?.customer_id ? { db, id: data.customer_id } : null;
}
export async function GET(req: NextRequest) {
  const ctx = await customer(req); if (!ctx) return json({ ok: false, error: 'Phiên đăng nhập đã hết hạn' }, 401);
  const { data, error } = await ctx.db.from('customer_addresses').select('id,label,address,contact_name,contact_phone,is_default,is_active').eq('customer_id', ctx.id).or('is_active.is.null,is_active.eq.true').order('is_default',{ascending:false}).order('created_at');
  if (error) return json({ ok: false, error: 'Không tải được sổ địa chỉ' }, 500);
  return json({ ok: true, addresses: (data || []).map(a => ({ id:a.id,label:a.label,address:a.address,contactName:a.contact_name||'',contactPhone:a.contact_phone||'',isDefault:Boolean(a.is_default) })) });
}
export async function POST(req: NextRequest) {
  const ctx = await customer(req); if (!ctx) return json({ ok: false, error: 'Phiên đăng nhập đã hết hạn' }, 401);
  const b = await req.json().catch(()=>null); if (!b?.label?.trim() || !b?.address?.trim() || !b?.contactName?.trim() || !b?.contactPhone?.trim()) return json({ok:false,error:'Vui lòng điền tên địa chỉ, địa chỉ giao, người nhận và số điện thoại'},400);
  const { count, error: countError } = await ctx.db.from('customer_addresses').select('id',{count:'exact',head:true}).eq('customer_id',ctx.id).or('is_active.is.null,is_active.eq.true');
  if (countError) return json({ok:false,error:'Không kiểm tra được sổ địa chỉ'},500);
  if ((count || 0) >= 20) return json({ok:false,error:'Mỗi tài khoản lưu tối đa 20 địa chỉ'},400);
  const isDefault = Boolean(b.isDefault) || (count || 0) === 0;
  const { data,error }=await ctx.db.from('customer_addresses').insert({customer_id:ctx.id,label:String(b.label).trim().slice(0,80),address:String(b.address).trim().slice(0,500),contact_name:String(b.contactName).trim().slice(0,120),contact_phone:String(b.contactPhone).trim().slice(0,20),is_default:isDefault,is_active:true}).select('id,label,address,contact_name,contact_phone,is_default').single();
  if(error)return json({ok:false,error:'Không lưu được địa chỉ'},500);
  if(isDefault) await ctx.db.from('customer_addresses').update({is_default:false}).eq('customer_id',ctx.id).neq('id',data.id);
  return json({ok:true,address:{id:data.id,label:data.label,address:data.address,contactName:data.contact_name,contactPhone:data.contact_phone,isDefault:Boolean(data.is_default)}});
}
export async function PATCH(req: NextRequest) {
  const ctx=await customer(req); if(!ctx)return json({ok:false,error:'Phiên đăng nhập đã hết hạn'},401);
  const b=await req.json().catch(()=>null); if(!b?.id)return json({ok:false,error:'Thiếu địa chỉ cần cập nhật'},400);
  const { data: target, error: findError } = await ctx.db.from('customer_addresses').select('id').eq('id',b.id).eq('customer_id',ctx.id).maybeSingle();
  if (findError || !target) return json({ok:false,error:'Không tìm thấy địa chỉ'},404);
  if(b.isDefault){
    const {error: clearError}=await ctx.db.from('customer_addresses').update({is_default:false}).eq('customer_id',ctx.id);
    if(clearError)return json({ok:false,error:'Không cập nhật được địa chỉ'},500);
  }
  const {error}=await ctx.db.from('customer_addresses').update({is_default:Boolean(b.isDefault)}).eq('id',b.id).eq('customer_id',ctx.id);
  return error?json({ok:false,error:'Không cập nhật được địa chỉ'},500):json({ok:true});
}
export async function DELETE(req: NextRequest) {
  const ctx=await customer(req); if(!ctx)return json({ok:false,error:'Phiên đăng nhập đã hết hạn'},401);
  const id=req.nextUrl.searchParams.get('id'); if(!id)return json({ok:false,error:'Thiếu địa chỉ cần xóa'},400);
  const {data: existing,error: findError}=await ctx.db.from('customer_addresses').select('id,is_default').eq('id',id).eq('customer_id',ctx.id).maybeSingle();
  if(findError)return json({ok:false,error:'Không xóa được địa chỉ'},500);
  if(!existing)return json({ok:false,error:'Không tìm thấy địa chỉ'},404);
  const {error}=await ctx.db.from('customer_addresses').update({is_active:false,is_default:false}).eq('id',id).eq('customer_id',ctx.id);
  if(error)return json({ok:false,error:'Không xóa được địa chỉ'},500);
  if(existing.is_default){
    const {data: remaining}=await ctx.db.from('customer_addresses').select('id').eq('customer_id',ctx.id).or('is_active.is.null,is_active.eq.true').order('created_at').limit(1).maybeSingle();
    if(remaining)await ctx.db.from('customer_addresses').update({is_default:true}).eq('id',remaining.id).eq('customer_id',ctx.id);
  }
  return json({ok:true});
}
