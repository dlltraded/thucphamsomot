import { NextRequest, NextResponse } from "next/server";
import { CUSTOMER_SESSION_COOKIE, parseSessionCookieValue } from "@/lib/customer-session";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";
import { fetchProductsByIds } from "@/lib/products-fetcher";
import { resolvePricesForProducts } from "@/lib/customer-pricing";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(req: NextRequest) {
  const websiteSession = parseSessionCookieValue(
    req.cookies.get(CUSTOMER_SESSION_COOKIE)?.value
  );
  const token =
    websiteSession?.orderSessionToken ||
    req.nextUrl.searchParams.get("sessionToken") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Vui lòng đăng nhập lại" },
      { status: 401, headers: corsHeaders }
    );
  }

  try {
    const supabase = getCustomerSupabaseAdmin();
    const { data: customerSession, error: sessionErr } = await supabase
      .from("customer_sessions")
      .select("customer_id, expires_at")
      .eq("token", token)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (sessionErr || !customerSession) {
      return NextResponse.json(
        { ok: false, error: "Phiên đăng nhập đã hết hạn" },
        { status: 401, headers: corsHeaders }
      );
    }

    const customerId = customerSession.customer_id;
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

    // Query các đơn không bị hủy của khách trong 60 ngày
    const { data: orders, error: ordersErr } = await supabase
      .from("orders")
      .select("id, status, created_at, order_items(product_id, sku, name, unit, quantity)")
      .eq("customer_id", customerId)
      .neq("status", "canceled")
      .gte("created_at", sixtyDaysAgo)
      .order("created_at", { ascending: false });

    if (ordersErr) throw ordersErr;

    // Tổng hợp số lượng đặt theo từng product_id
    interface AggItem {
      productId: string;
      sku: string;
      name: string;
      unit: string;
      totalQuantity: number;
      orderCount: number;
    }

    const itemMap = new Map<string, AggItem>();

    for (const o of orders || []) {
      for (const it of (o as any).order_items || []) {
        const pid = it.product_id;
        if (!pid) continue;

        const existing = itemMap.get(pid) || {
          productId: pid,
          sku: it.sku || "",
          name: it.name,
          unit: it.unit || "Kg",
          totalQuantity: 0,
          orderCount: 0,
        };

        existing.totalQuantity += Number(it.quantity) || 0;
        existing.orderCount += 1;
        itemMap.set(pid, existing);
      }
    }

    const topItems = Array.from(itemMap.values())
      .sort((a, b) => b.totalQuantity - a.totalQuantity || b.orderCount - a.orderCount)
      .slice(0, 20);

    // Lấy thông tin sản phẩm qua fetchProductsByIds (chia lô ≤ 100 id, F4)
    const productIds = topItems.map((it) => it.productId);
    const products = await fetchProductsByIds(
      supabase,
      productIds,
      "id, sku, name, category, unit, price_retail, price_wholesale, image_url, thumb_url, active, track_inventory, stock_qty"
    );

    const productDetails = new Map<string, any>(products.map((p) => [p.id, p]));

    // Giải quyết đơn giá theo hợp đồng/hạng riêng của khách qua resolvePricesForProducts (F5)
    const priceMap = await resolvePricesForProducts(supabase, customerId, products);

    const result = topItems.map((it) => {
      const prod = productDetails.get(it.productId);
      const priceInfo = priceMap.get(it.productId);
      const price = priceInfo?.price ?? (Number(prod?.price_retail) || Number(prod?.price_wholesale) || 0);

      return {
        productId: it.productId,
        sku: prod?.sku || it.sku,
        name: prod?.name || it.name,
        category: prod?.category || "Khác",
        unit: prod?.unit || it.unit,
        price,
        priceOnRequest: price <= 0,
        imageUrl: prod?.thumb_url || prod?.image_url || null,
        active: prod ? Boolean(prod.active) : true,
        totalQuantity: Math.round(it.totalQuantity * 1000) / 1000,
        orderCount: it.orderCount,
      };
    });

    return NextResponse.json({ ok: true, items: result }, { headers: corsHeaders });
  } catch (error) {
    console.error("GET /api/customer/frequent-items lỗi:", error);
    return NextResponse.json(
      { ok: false, error: "Không tải được danh sách mặt hàng hay đặt" },
      { status: 500, headers: corsHeaders }
    );
  }
}
