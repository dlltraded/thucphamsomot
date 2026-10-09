import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { can } from "@/lib/permissions";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";
import { resolvePriceBookPrices } from "@/lib/price-book-resolver";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });

export async function GET(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) return json({ ok: false, error: auth.error }, 401);
  if (!can(auth.profile?.role, "orders.copy")) return json({ ok: false, error: "Không có quyền sao chép đơn hàng" }, 403);
  const orderId = req.nextUrl.searchParams.get("orderId")?.trim();
  if (!orderId) return json({ ok: false, error: "Thiếu hóa đơn nguồn" }, 400);
  const supabase = getCustomerSupabaseAdmin();
  const { data: order, error } = await supabase.from("orders")
    .select("id, order_code, invoice_number, status, customer_id, delivery_type, delivery_alias, delivery_address, delivery_name, delivery_phone, payment_method, note, order_items(id, product_id, sku, name, unit, quantity, unit_price)")
    .eq("id", orderId).maybeSingle();
  if (error) return json({ ok: false, error: error.message }, 500);
  if (!order || order.status !== "completed") return json({ ok: false, error: "Chỉ sao chép từ hóa đơn đã hoàn thành" }, 400);

  const productIds = (order.order_items || []).map((item: any) => item.product_id).filter(Boolean) as string[];
  const [{ data: products }, prices] = await Promise.all([
    productIds.length ? supabase.from("products").select("id, active, sku, name, unit").in("id", productIds) : Promise.resolve({ data: [] as any[] }),
    productIds.length ? resolvePriceBookPrices(supabase, order.customer_id, productIds) : Promise.resolve(new Map()),
  ]);
  const productMap = new Map((products || []).map((product: any) => [product.id, product]));
  const items = (order.order_items || []).map((item: any) => {
    const product: any = item.product_id ? productMap.get(item.product_id) : null;
    const resolved: any = item.product_id ? prices.get(item.product_id) : null;
    const available = Boolean(product?.active && resolved && Number(resolved.price) >= 0);
    return {
      sourceItemId: item.id,
      productId: item.product_id,
      sku: item.sku,
      name: item.name,
      unit: item.unit,
      quantity: Number(item.quantity),
      previousPrice: Number(item.unit_price) || 0,
      currentPrice: available ? Number(resolved.price) : null,
      priceBookName: resolved?.priceBookName || null,
      available,
      warning: !product?.active ? "Sản phẩm đã ngừng kinh doanh hoặc không còn trong danh mục" : !resolved ? "Sản phẩm chưa có giá hiện hành" : null,
    };
  });
  return json({ ok: true, sourceOrderId: order.id, sourceOrderCode: order.order_code, invoiceNumber: order.invoice_number,
    customerId: order.customer_id, deliveryType: order.delivery_type, deliveryAlias: order.delivery_alias,
    deliveryAddress: order.delivery_address, deliveryName: order.delivery_name, deliveryPhone: order.delivery_phone,
    paymentMethod: order.payment_method, note: order.note, items });
}
