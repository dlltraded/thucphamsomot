import { NextRequest, NextResponse } from 'next/server';
import { authorizeImportBatch } from '@/lib/order-import/auth';

export const runtime = 'nodejs';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' };
function json(body: unknown, status = 200) { return NextResponse.json(body, { status, headers: cors }); }
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: cors }); }

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const auth = await authorizeImportBatch(req, id);
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status);
  const { data: lines, error } = await auth.supabase.from('order_import_lines').select('*').eq('batch_id', id).order('created_at');
  if (error) return json({ ok: false, error: 'Không tải được kết quả đọc đơn' }, 500);
  const products = await loadProducts(auth.supabase, lines || []);
  return json({ ok: true, batch: auth.batch, lines: attachProducts(lines || [], products), summary: summarize(lines || []) });
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const auth = await authorizeImportBatch(req, id);
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status);
  const bucket = process.env.ORDER_IMPORT_BUCKET?.trim() || 'order-imports-private';
  const paths = (Array.isArray(auth.batch.files) ? auth.batch.files : []).map((file: any) => file.path).filter(Boolean);
  if (paths.length) await auth.supabase.storage.from(bucket).remove(paths);
  await auth.supabase.from('order_import_batches').update({ status: 'cancelled', files: [], updated_at: new Date().toISOString() }).eq('id', id);
  return json({ ok: true });
}

async function loadProducts(supabase: any, lines: any[]) {
  const ids = [...new Set(lines.map((line) => line.selected_product_id).filter(Boolean))];
  if (!ids.length) return new Map();
  const { data } = await supabase.from('products').select('id, sku, name, unit, packaging_note, min_order_qty, order_step, quantity_precision').in('id', ids);
  return new Map((data || []).map((product: any) => [product.id, product]));
}
function attachProducts(lines: any[], products: Map<any, any>) { return lines.map((line) => ({ ...line, product: line.selected_product_id ? products.get(line.selected_product_id) || null : null })); }
function summarize(lines: any[]) { return lines.reduce((sum, line) => { sum.total++; sum[line.status] = (sum[line.status] || 0) + 1; return sum; }, { total: 0 } as Record<string, number>); }
