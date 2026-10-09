import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { canForProfile } from '@/lib/permissions';
import { getCustomerSupabaseAdmin } from '@/lib/customer-supabase-server';
import { resolveOrderPriceBook } from '@/lib/order-price-book';
import { validateOrderQuantity } from '@/lib/order-quantity';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' };
function json(body: unknown, status = 200) { return NextResponse.json(body, { status, headers: cors }); }
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: cors }); }

export async function POST(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) return json({ ok: false, error: auth.error }, 401);
  if (!canForProfile(auth.profile, 'orders.create')) return json({ ok: false, error: 'Bạn không có quyền tạo đơn hàng' }, 403);
  let body: any;
  try { body = await req.json(); } catch { return json({ ok: false, error: 'Dữ liệu không hợp lệ' }, 400); }
  const customerId = String(body?.customerId || '').trim();
  const items = Array.isArray(body?.items) ? body.items.slice(0, 300) : [];
  if (!customerId || !items.length) return json({ ok: false, error: 'Thiếu khách hàng hoặc sản phẩm cần tính giá' }, 400);

  const productIds = [...new Set(items.map((item: any) => String(item.productId || '').trim()).filter(Boolean))] as string[];
  const supabase = getCustomerSupabaseAdmin();
  const { data: products, error } = await supabase.from('products')
    .select('id, name, unit, active, min_order_qty, order_step, enforce_order_step, packaging_note, quantity_precision')
    .in('id', productIds).eq('active', true);
  if (error) return json({ ok: false, error: 'Không tải được quy cách sản phẩm' }, 500);
  const productMap = new Map((products || []).map((product: any) => [product.id, product]));
  let pricing: Awaited<ReturnType<typeof resolveOrderPriceBook>>;
  try {
    pricing = await resolveOrderPriceBook(supabase, customerId, items.map((item: any) => ({
      productId: String(item.productId || ''), quantity: Number(item.quantity),
    })));
  } catch (pricingError: any) {
    return json({ ok: false, error: pricingError?.message || 'Không giải được bảng giá áp dụng' }, 400);
  }
  const priceMap = new Map(pricing.resolved.map((row) => [row.productId, row]));
  const resolved = items.map((item: any) => {
    const product: any = productMap.get(String(item.productId || ''));
    if (!product) return { productId: item.productId, ok: false, error: 'Sản phẩm không tồn tại hoặc đã ngừng kinh doanh' };
    const quantity = validateOrderQuantity(product, Number(item.quantity), product.unit, []);
    if (!quantity.ok) return { productId: product.id, ok: false, error: quantity.message };
    const price = priceMap.get(product.id);
    if (!price || price.price <= 0) return { productId: product.id, ok: false, error: 'Chưa có giá trong bảng giá áp dụng' };
    return { productId: product.id, ok: true, price: Number(price.price), priceSource: price.priceSource, priceBookId: price.priceBookId };
  });
  return json({ ok: true, items: resolved });
}
