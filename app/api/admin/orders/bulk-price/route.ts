import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};
function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: corsHeaders });
}
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// "Áp giá hàng ngày" (mục brief 2026-09-11) — GET: liệt kê các mặt hàng xuất
// hiện trong đơn "pending" (chưa chốt giá) của 1 ngày, ưu tiên hiện mặt hàng
// còn giá 0đ lên đầu (thịt/hải sản tươi cần nhập giá thị trường hôm đó).
export async function GET(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) return json({ ok: false, error: auth.error }, 401);

  const date = req.nextUrl.searchParams.get("date");
  if (!date) return json({ ok: false, error: "Thiếu ngày" }, 400);

  try {
    const supabase = getCustomerSupabaseAdmin();
    const from = `${date}T00:00:00`;
    const to = `${date}T23:59:59.999`;
    const { data: orders, error } = await supabase
      .from("orders")
      .select("id, order_code, customer_name, customer_company, order_items(id, product_id, sku, name, unit, quantity, unit_price)")
      .eq("status", "pending")
      .neq("pricing_status", "finalized")
      .gte("created_at", from)
      .lte("created_at", to);
    if (error) throw error;

    interface ProductAgg {
      productId: string;
      sku: string;
      name: string;
      unit: string;
      lineCount: number;
      orderCodes: Set<string>;
      hasZeroPrice: boolean;
      currentPrice: number | null;
    }
    const byProduct = new Map<string, ProductAgg>();
    for (const o of orders || []) {
      for (const item of (o as any).order_items || []) {
        if (!item.product_id) continue; // hàng ngoài hệ thống, không áp giá hàng loạt được
        const key = item.product_id;
        const e = byProduct.get(key) || {
          productId: item.product_id, sku: item.sku || "", name: item.name, unit: item.unit || "Kg",
          lineCount: 0, orderCodes: new Set<string>(), hasZeroPrice: false, currentPrice: null,
        };
        e.lineCount += 1;
        e.orderCodes.add(o.order_code);
        if (Number(item.unit_price) <= 0) e.hasZeroPrice = true;
        byProduct.set(key, e);
      }
    }

    const productIds = [...byProduct.keys()];
    const { data: products } = productIds.length
      ? await supabase.from("products").select("id, price_retail").in("id", productIds)
      : { data: [] as { id: string; price_retail: number }[] };
    const priceMap = new Map((products || []).map((p) => [p.id, Number(p.price_retail) || 0]));

    const items = [...byProduct.values()]
      .map((p) => ({
        productId: p.productId, sku: p.sku, name: p.name, unit: p.unit,
        orderCount: p.orderCodes.size, lineCount: p.lineCount,
        hasZeroPrice: p.hasZeroPrice, currentPrice: priceMap.get(p.productId) ?? 0,
      }))
      .sort((a, b) => (b.hasZeroPrice ? 1 : 0) - (a.hasZeroPrice ? 1 : 0) || b.orderCount - a.orderCount);

    // Đơn để hiển thị bảng "sẵn sàng xác nhận hàng loạt" — không còn dòng nào giá 0đ.
    const orderSummaries = (orders || []).map((o: any) => ({
      id: o.id,
      orderCode: o.order_code,
      customerName: o.customer_company ? `${o.customer_name} (${o.customer_company})` : o.customer_name,
      itemCount: (o.order_items || []).length,
      hasZeroPrice: (o.order_items || []).some((i: any) => Number(i.unit_price) <= 0),
      total: (o.order_items || []).reduce((s: number, i: any) => s + Number(i.unit_price) * Number(i.quantity), 0),
    }));

    return json({ ok: true, products: items, orders: orderSummaries });
  } catch (error) {
    console.error("GET /api/admin/orders/bulk-price lỗi:", error);
    return json({ ok: false, error: "Không tải được danh sách cần áp giá" }, 500);
  }
}

// POST: áp 1 giá cho 1 mặt hàng, lan ra mọi dòng hàng trùng SKU trong đơn
// "pending" của đúng ngày được chọn. Có fallback trực tiếp bằng JS nếu RPC
// admin_bulk_apply_price chưa được tạo trong DB.
export async function POST(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) return json({ ok: false, error: auth.error }, 401);

  const body = await req.json().catch(() => null);
  const productId = String(body?.productId || "").trim();
  const price = Number(body?.price);
  const date = String(body?.date || "").trim();
  if (!productId || !date || !Number.isFinite(price) || price < 0) {
    return json({ ok: false, error: "Thiếu hoặc sai dữ liệu (mặt hàng/giá/ngày)" }, 400);
  }

  const supabase = getCustomerSupabaseAdmin();
  const actor = auth.profile?.name || "admin";

  // Thử gọi RPC trước nếu đã có
  try {
    const { data, error } = await supabase.rpc("admin_bulk_apply_price", {
      p_product_id: productId,
      p_price: price,
      p_date: date,
      p_actor: actor,
    });
    if (!error && data) {
      const result = Array.isArray(data) ? data[0] : data;
      return json({ ok: true, affectedOrders: result?.affected_orders || 0, affectedLines: result?.affected_lines || 0 });
    }
  } catch (rpcErr) {
    console.warn("RPC admin_bulk_apply_price không khả dụng, dùng fallback JS:", rpcErr);
  }

  // Fallback JS: trực tiếp thực thi qua Supabase Service Role Admin
  try {
    // 1. Cập nhật giá sản phẩm
    await supabase.from("products").update({ price_retail: price, price_wholesale: price }).eq("id", productId);

    // 2. Tìm các đơn pending trong ngày có sản phẩm này
    const from = `${date}T00:00:00`;
    const to = `${date}T23:59:59.999`;
    const { data: orders, error: ordersErr } = await supabase
      .from("orders")
      .select("id, customer_id, order_items(id, product_id, quantity)")
      .eq("status", "pending")
      .neq("pricing_status", "finalized")
      .gte("created_at", from)
      .lte("created_at", to);

    if (ordersErr) throw ordersErr;

    const affectedOrders = new Set<string>();
    let affectedLines = 0;

    for (const order of orders || []) {
      const matchingItems = (order.order_items || []).filter((i: any) => i.product_id === productId);
      if (!matchingItems.length) continue;

      // Kiểm tra hợp đồng riêng và tier của khách hàng
      const [{ data: contractPrice }, { data: customer }] = await Promise.all([
        supabase
          .from("customer_contract_prices")
          .select("price")
          .eq("customer_id", order.customer_id)
          .eq("product_id", productId)
          .maybeSingle(),
        supabase
          .from("vip_accounts")
          .select("discount_tier")
          .eq("id", order.customer_id)
          .maybeSingle(),
      ]);

      let finalUnitPrice = price;
      if (contractPrice?.price && Number(contractPrice.price) > 0) {
        finalUnitPrice = Number(contractPrice.price);
      } else if (customer?.discount_tier) {
        const { data: tierPrice } = await supabase
          .from("product_tier_prices")
          .select("price")
          .eq("tier", customer.discount_tier)
          .eq("product_id", productId)
          .maybeSingle();
        if (tierPrice?.price && Number(tierPrice.price) > 0) {
          finalUnitPrice = Number(tierPrice.price);
        }
      }

      for (const item of matchingItems) {
        const qty = Number(item.quantity) || 1;
        await supabase
          .from("order_items")
          .update({
            base_unit_price: price,
            unit_price: finalUnitPrice,
            line_total: Math.round(finalUnitPrice * qty),
          })
          .eq("id", item.id);
        affectedLines++;
      }

      affectedOrders.add(order.id);

      // Ghi log lịch sử đơn hàng
      try {
        await supabase.from("order_history").insert({
          order_id: order.id,
          action: "bulk_price_applied",
          note: `Áp giá hàng loạt: ${price.toLocaleString("vi-VN")}đ (ngày ${date})`,
          actor,
          payload: { productId, price, date, finalUnitPrice },
        });
      } catch {
        // bỏ qua lỗi ghi log — không ảnh hưởng kết quả áp giá
      }
    }

    return json({ ok: true, affectedOrders: affectedOrders.size, affectedLines });
  } catch (error) {
    console.error("POST /api/admin/orders/bulk-price fallback lỗi:", error);
    return json({ ok: false, error: error instanceof Error ? error.message : "Không áp giá được" }, 500);
  }
}

