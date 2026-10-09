import { NextRequest, NextResponse } from 'next/server';
import { authorizeImportBatch } from '@/lib/order-import/auth';
import { reevaluateImportLine } from '@/lib/order-import/matcher';

export const runtime = 'nodejs';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' };
function json(body: unknown, status = 200) { return NextResponse.json(body, { status, headers: cors }); }
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: cors }); }

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const auth = await authorizeImportBatch(req, id);
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status);
  if (auth.batch.status !== 'review') return json({ ok: false, error: 'Phiên nhập đơn không còn ở trạng thái xác nhận' }, 409);
  const { data: lines, error } = await auth.supabase.from('order_import_lines').select('*').eq('batch_id', id).eq('selected', true).order('created_at');
  if (error) return json({ ok: false, error: 'Không kiểm tra được danh sách hàng' }, 500);
  if (!lines?.length) return json({ ok: false, error: 'Chưa có dòng hàng hợp lệ được chọn' }, 400);

  const refreshed: any[] = [];
  const invalid: any[] = [];
  for (const line of lines) {
    if (!line.selected_product_id) { invalid.push(line); continue; }
    const evaluation = await reevaluateImportLine(auth.supabase, auth.actor.customerId, line, line.selected_product_id, Number(line.raw_quantity), String(line.raw_unit || ''));
    const next = { ...line, ...evaluation };
    refreshed.push(next);
    await auth.supabase.from('order_import_lines').update({ ...evaluation, updated_at: new Date().toISOString() }).eq('id', line.id);
    if (evaluation.status !== 'matched') invalid.push(next);
  }
  if (invalid.length) return json({ ok: false, code: 'IMPORT_LINES_INVALID', error: `Có ${invalid.length} dòng cần điều chỉnh trước khi thêm vào giỏ`, lines: refreshed }, 409);

  const productIds = [...new Set(refreshed.map((line) => line.selected_product_id))];
  const { data: products, error: productError } = await auth.supabase.from('products')
    .select('id, sku, name, category, unit, image_url, thumb_url, active, min_order_qty, order_step, enforce_order_step, packaging_note, quantity_precision')
    .in('id', productIds).eq('active', true);
  if (productError) return json({ ok: false, error: 'Không tải được sản phẩm đã chọn' }, 500);
  const productMap = new Map((products || []).map((product: any) => [product.id, product]));
  const items = refreshed.map((line) => {
    const product: any = productMap.get(line.selected_product_id);
    return {
      importLineId: line.id, productId: product.id, sku: product.sku, name: product.name, category: product.category,
      unit: product.unit || '', imageUrl: product.thumb_url || product.image_url || null,
      quantity: Number(line.converted_quantity), inputQuantity: Number(line.raw_quantity), inputUnit: line.raw_unit,
      conversionFactor: line.conversion_factor, note: line.raw_note || '', price: Number(line.resolved_price), priceSource: line.price_source,
      minOrderQty: product.min_order_qty, orderStep: product.order_step, enforceOrderStep: product.enforce_order_step,
      packagingNote: product.packaging_note, quantityPrecision: product.quantity_precision,
    };
  });

  const bucket = process.env.ORDER_IMPORT_BUCKET?.trim() || 'order-imports-private';
  const paths = (Array.isArray(auth.batch.files) ? auth.batch.files : []).map((file: any) => file.path).filter(Boolean);
  if (paths.length) await auth.supabase.storage.from(bucket).remove(paths);
  const retainedFileMetadata = (Array.isArray(auth.batch.files) ? auth.batch.files : []).map((file: any) => ({
    name: file.name, mimeType: file.mimeType, size: file.size, sha256: file.sha256,
  }));
  await auth.supabase.from('order_import_batches').update({ status: 'confirmed', confirmed_at: new Date().toISOString(), files: retainedFileMetadata, updated_at: new Date().toISOString() }).eq('id', id);
  return json({ ok: true, batchId: id, items });
}
