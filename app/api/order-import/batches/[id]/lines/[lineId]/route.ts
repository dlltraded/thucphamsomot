import { NextRequest, NextResponse } from 'next/server';
import { authorizeImportBatch } from '@/lib/order-import/auth';
import { reevaluateImportLine } from '@/lib/order-import/matcher';
import { normalizeProductText } from '@/lib/order-import/product-match';

export const runtime = 'nodejs';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'PATCH, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' };
function json(body: unknown, status = 200) { return NextResponse.json(body, { status, headers: cors }); }
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: cors }); }

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string; lineId: string }> }) {
  const { id, lineId } = await context.params;
  const auth = await authorizeImportBatch(req, id);
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status);
  if (auth.batch.status !== 'review') return json({ ok: false, error: 'Phiên nhập đơn không còn ở trạng thái chỉnh sửa' }, 409);
  let body: any;
  try { body = await req.json(); } catch { return json({ ok: false, error: 'Dữ liệu không hợp lệ' }, 400); }
  const { data: line } = await auth.supabase.from('order_import_lines').select('*').eq('id', lineId).eq('batch_id', id).maybeSingle();
  if (!line) return json({ ok: false, error: 'Không tìm thấy dòng hàng' }, 404);
  if (body.selected === false || body.skip === true) {
    const { data, error } = await auth.supabase.from('order_import_lines').update({ selected: false, updated_at: new Date().toISOString() }).eq('id', lineId).select('*').single();
    return error ? json({ ok: false, error: error.message }, 400) : json({ ok: true, line: data });
  }
  const productId = String(body.productId || line.selected_product_id || '');
  const quantity = Number(body.quantity ?? line.raw_quantity);
  const inputUnit = String(body.inputUnit ?? line.raw_unit ?? '');
  if (!productId || !Number.isFinite(quantity) || quantity <= 0) return json({ ok: false, error: 'Vui lòng chọn sản phẩm và nhập số lượng hợp lệ' }, 400);
  try {
    const evaluation = await reevaluateImportLine(auth.supabase, auth.actor.customerId, line, productId, quantity, inputUnit);
    const update = { ...evaluation, selected: body.selected === false ? false : evaluation.selected, raw_note: body.note != null ? String(body.note).slice(0, 500) : line.raw_note, updated_at: new Date().toISOString() };
    const { data, error } = await auth.supabase.from('order_import_lines').update(update).eq('id', lineId).select('*').single();
    if (error) throw error;
    // Khi người dùng tự chọn lại đúng sản phẩm, lưu cách gọi riêng của khách
    // để lần sau hệ thống nhận ra ngay. Không tạo alias toàn hệ thống.
    if (body.productId && line.raw_name && productId !== line.selected_product_id) {
      const aliasNormalized = normalizeProductText(line.raw_name);
      if (aliasNormalized) {
        const { error: aliasError } = await auth.supabase.from('product_aliases').upsert({
          product_id: productId,
          customer_id: auth.actor.customerId,
          alias: String(line.raw_name).slice(0, 200),
          alias_normalized: aliasNormalized,
          source: 'confirmed_order_import',
          verified_by: auth.actor.actorId,
        }, { onConflict: 'product_id,customer_id,alias_normalized', ignoreDuplicates: true });
        if (aliasError && !/duplicate/i.test(aliasError.message || '')) console.warn('Không lưu được tên gọi thay thế:', aliasError.message);
      }
    }
    return json({ ok: true, line: data });
  } catch (error: any) { return json({ ok: false, error: error?.message || 'Không cập nhật được dòng hàng' }, 400); }
}
