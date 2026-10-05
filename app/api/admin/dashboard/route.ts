import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";
import { calculateReceivablesSummary, CustomerDebtInfo } from "@/lib/receivables";
import { getCustomerReceipts, getCustomerAdjustments } from "@/lib/receivables-db";

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

export async function GET(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) return json({ ok: false, error: auth.error }, 401);

  try {
    const supabase = getCustomerSupabaseAdmin();
    const isSale = auth.profile?.role === "sale" && auth.profile?.id !== "legacy-admin";

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    // 1. Query khách hàng
    let custQuery = supabase
      .from("vip_accounts")
      .select("id, partner_code, name, company, phone, credit_limit, sales_rep_id, is_active, payment_terms_days, kiotviet_opening_debt")
      .eq("is_active", true);
    if (isSale && auth.profile?.id) custQuery = custQuery.eq("sales_rep_id", auth.profile.id);
    const { data: customersRaw } = await custQuery;

    const customers: CustomerDebtInfo[] = (customersRaw || []).map((c: any) => ({
      id: c.id,
      partner_code: c.partner_code || "CHƯA_CÓ_MÃ",
      name: c.name || "Khách hàng",
      company: c.company || null,
      phone: c.phone || null,
      credit_limit: Math.round(Number(c.credit_limit) || 0),
      payment_terms_days: Math.round(Number(c.payment_terms_days) || 30),
      kiotviet_opening_debt: c.kiotviet_opening_debt != null ? Math.round(Number(c.kiotviet_opening_debt)) : 0,
      sales_rep_id: c.sales_rep_id || null,
    }));

    // 2. Query đơn hàng
    let orderQuery = supabase
      .from("orders")
      .select("id, order_code, customer_id, customer_name, customer_company, status, payment_method, payment_status, grand_total, paid_amount, debt_amount, return_credit_amount, created_at, completed_at, delivery_date")
      .not("status", "in", "(canceled,merged)");

    if (isSale && auth.profile?.id) {
      const allowedIds = customers.map((c) => c.id);
      if (allowedIds.length > 0) orderQuery = orderQuery.in("customer_id", allowedIds);
      else orderQuery = orderQuery.in("customer_id", ["00000000-0000-0000-0000-000000000000"]);
    }

    const { data: allOrders } = await orderQuery;
    const ordersList = allOrders || [];

    // 3. Tính toán công nợ dùng CHUNG canonical function với /cong-no
    const receipts = await getCustomerReceipts();
    const adjustments = await getCustomerAdjustments();

    const receivables = calculateReceivablesSummary({
      customers,
      orders: ordersList,
      adjustments,
      receipts,
    });

    // 4. Thống kê đơn hàng và doanh thu
    const monthOrders = ordersList.filter((o) => o.created_at >= startOfMonth);
    const monthRevenue = monthOrders
      .filter((o) => ["confirmed", "preparing", "shipping", "completed"].includes(o.status))
      .reduce((s, o) => s + (Number(o.grand_total) || 0), 0);

    const todayOrders = ordersList.filter((o) => o.created_at >= startOfToday).length;
    const pendingOrders = ordersList.filter((o) => ["draft", "pending"].includes(o.status)).length;
    const inProgressOrders = ordersList.filter((o) => ["confirmed", "preparing", "shipping"].includes(o.status)).length;

    // Đếm theo status
    const byStatus: Record<string, number> = {};
    for (const o of ordersList) {
      byStatus[o.status] = (byStatus[o.status] || 0) + 1;
    }

    // Top khách hàng doanh thu
    const custRevMap = new Map<string, { name: string; revenue: number }>();
    for (const o of monthOrders) {
      if (o.customer_name) {
        const cur = custRevMap.get(o.customer_name) || { name: o.customer_name, revenue: 0 };
        cur.revenue += Number(o.grand_total) || 0;
        custRevMap.set(o.customer_name, cur);
      }
    }
    const topCustomers = [...custRevMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    // Recent orders
    const recentOrders = ordersList
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 8);

    return json({
      ok: true,
      scope: isSale ? "sale" : "all",
      generatedAt: now.toISOString(),
      summary: {
        monthRevenue,
        revenueGrowth: null,
        monthOrders: monthOrders.length,
        todayOrders,
        pendingOrders,
        inProgressOrders,
        // ĐÂY LÀ ĐIỂM CHỐT: Dashboard và Công nợ dùng chung một hàm tính số dư!
        debtOutstanding: receivables.totalReceivables,
        activeCustomers: customers.length,
      },
      byStatus,
      topCustomers,
      recentOrders,
    });
  } catch (error: any) {
    console.error("GET /api/admin/dashboard lỗi:", error);
    return json({ ok: false, error: error?.message || "Không tải được dữ liệu Dashboard" }, 500);
  }
}
