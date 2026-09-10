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

// Giai đoạn D — trang "Công nợ khách hàng" (mục 13.6). Không có sẵn cột tổng
// hợp công nợ theo khách nên gom từ orders.debt_amount (cột generated, xem
// migration 20260910d) theo customer_id ngay tại đây — dữ liệu hiện còn nhỏ
// nên gom trong Node đủ nhanh, không cần thêm view/RPC riêng.
export async function GET(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) return json({ ok: false, error: auth.error }, 401);

  try {
    const supabase = getCustomerSupabaseAdmin();
    const isSale = auth.profile?.role === "sale" && auth.profile?.id !== "legacy-admin";

    const customerId = req.nextUrl.searchParams.get("customerId")?.trim();
    if (customerId) {
      const { data: orders, error } = await supabase
        .from("orders")
        .select("id, order_code, status, grand_total, paid_amount, debt_amount, created_at, confirmed_at")
        .eq("customer_id", customerId)
        .neq("status", "canceled")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return json({ ok: true, orders: orders || [] });
    }

    let customerQuery = supabase
      .from("vip_accounts")
      .select("id, partner_code, name, company, phone, discount_tier, credit_limit, sales_rep_id, is_active")
      .eq("is_active", true);
    if (isSale) customerQuery = customerQuery.eq("sales_rep_id", auth.profile!.id);
    const { data: customers, error: customerError } = await customerQuery;
    if (customerError) throw customerError;

    const { data: orders, error: orderError } = await supabase
      .from("orders")
      .select("customer_id, debt_amount, grand_total, paid_amount")
      .neq("status", "canceled")
      .gt("debt_amount", 0);
    if (orderError) throw orderError;

    const debtByCustomer = new Map<string, { debt: number; orderCount: number }>();
    for (const o of orders || []) {
      if (!o.customer_id) continue;
      const entry = debtByCustomer.get(o.customer_id) || { debt: 0, orderCount: 0 };
      entry.debt += Number(o.debt_amount) || 0;
      entry.orderCount += 1;
      debtByCustomer.set(o.customer_id, entry);
    }

    const rows = (customers || [])
      .map((c) => {
        const d = debtByCustomer.get(c.id) || { debt: 0, orderCount: 0 };
        const creditLimit = Number(c.credit_limit) || 0;
        return {
          ...c,
          currentDebt: d.debt,
          openOrders: d.orderCount,
          overLimit: creditLimit > 0 && d.debt > creditLimit,
          usagePercent: creditLimit > 0 ? Math.round((d.debt / creditLimit) * 100) : null,
        };
      })
      .filter((c) => c.currentDebt > 0)
      .sort((a, b) => b.currentDebt - a.currentDebt);

    const totalDebt = rows.reduce((s, r) => s + r.currentDebt, 0);

    return json({ ok: true, customers: rows, totalDebt, totalCustomersWithDebt: rows.length });
  } catch (error) {
    console.error("GET /api/admin/reports/debt lỗi:", error);
    return json({ ok: false, error: "Không tải được báo cáo công nợ" }, 500);
  }
}
