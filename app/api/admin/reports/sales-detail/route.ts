import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: corsHeaders });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

const REVENUE_STATUSES = ["confirmed", "preparing", "shipping", "completed"];

// Trang "Soạn hàng" — khối báo cáo bán hàng chi tiết theo khoảng ngày/tháng/
// năm (yêu cầu 2026-09-10): nhóm hàng -> mặt hàng -> bán cho ai/đơn nào.
// order_items không có sẵn cột category nên phải tra thêm từ products theo
// sku. Lồng 3 cấp trả về 1 lần, FE tự render cây, không cần gọi nhiều API.
export async function GET(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) return json({ ok: false, error: auth.error }, 401);

  const fromStr = req.nextUrl.searchParams.get("from");
  const toStr = req.nextUrl.searchParams.get("to");
  if (!fromStr || !toStr) return json({ ok: false, error: "Thiếu from/to" }, 400);

  try {
    const supabase = getCustomerSupabaseAdmin();
    const isSale = auth.profile?.role === "sale" && auth.profile?.id !== "legacy-admin";

    let query = supabase
      .from("orders")
      .select(
        "id, order_code, customer_name, customer_company, sales_rep_id, confirmed_at, order_items(sku, name, unit, quantity, final_line_total, line_total)"
      )
      .in("status", REVENUE_STATUSES)
      .gte("confirmed_at", fromStr)
      .lt("confirmed_at", toStr);
    if (isSale) query = query.eq("sales_rep_id", auth.profile!.id);

    const { data: orders, error } = await query;
    if (error) throw error;

    const skus = [...new Set((orders || []).flatMap((o: any) => (o.order_items || []).map((i: any) => i.sku).filter(Boolean)))];
    const { data: products } = skus.length
      ? await supabase.from("products").select("sku, category").in("sku", skus)
      : { data: [] as { sku: string; category: string | null }[] };
    const categoryBySku = new Map((products || []).map((p) => [p.sku, p.category || "Chưa phân loại"]));

    // category -> product key -> { info, orders[] }
    const categoryMap = new Map<
      string,
      Map<string, { name: string; unit: string; quantity: number; revenue: number; orders: any[] }>
    >();

    let totalRevenue = 0;
    let totalQuantity = 0;

    for (const o of orders || []) {
      for (const item of (o as any).order_items || []) {
        const category = item.sku ? categoryBySku.get(item.sku) || "Chưa phân loại" : "Hàng ngoài hệ thống";
        const productKey = `${item.name}__${item.unit || "Kg"}`;
        const revenue = Number(item.final_line_total ?? item.line_total) || 0;
        const quantity = Number(item.quantity) || 0;

        totalRevenue += revenue;
        totalQuantity += quantity;

        if (!categoryMap.has(category)) categoryMap.set(category, new Map());
        const productMap = categoryMap.get(category)!;
        if (!productMap.has(productKey)) {
          productMap.set(productKey, { name: item.name, unit: item.unit || "Kg", quantity: 0, revenue: 0, orders: [] });
        }
        const p = productMap.get(productKey)!;
        p.quantity += quantity;
        p.revenue += revenue;
        p.orders.push({
          orderCode: o.order_code,
          customerName: o.customer_name,
          customerCompany: o.customer_company,
          quantity,
          revenue,
        });
      }
    }

    const categories = [...categoryMap.entries()]
      .map(([category, productMap]) => {
        const products = [...productMap.values()].sort((a, b) => b.revenue - a.revenue);
        return {
          category,
          quantity: products.reduce((s, p) => s + p.quantity, 0),
          revenue: products.reduce((s, p) => s + p.revenue, 0),
          products,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);

    return json({
      ok: true,
      totalRevenue,
      totalQuantity,
      orderCount: (orders || []).length,
      categories,
    });
  } catch (error) {
    console.error("GET /api/admin/reports/sales-detail lỗi:", error);
    return json({ ok: false, error: "Không tải được báo cáo bán hàng" }, 500);
  }
}
