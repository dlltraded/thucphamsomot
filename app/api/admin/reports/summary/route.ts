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

// Đơn được tính vào doanh thu khi đã XÁC NHẬN trở lên (không tính draft/
// pending còn có thể đổi/hủy, không tính canceled).
const REVENUE_STATUSES = ["confirmed", "preparing", "shipping", "completed"];

// Giai đoạn D — báo cáo cuối ngày + theo khách/sản phẩm/sale (mục 13.6).
// Lọc theo orders.confirmed_at (ngày đơn được xác nhận, không phải ngày tạo
// nháp) trong khoảng [from, to). Gom 1 lần trong Node từ 1 câu query có join
// order_items — dữ liệu hiện còn nhỏ nên đủ nhanh, không cần view/RPC riêng.
export async function GET(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) return json({ ok: false, error: auth.error }, 401);

  const fromStr = req.nextUrl.searchParams.get("from");
  const toStr = req.nextUrl.searchParams.get("to");
  const groupBy = req.nextUrl.searchParams.get("groupBy") || "";

  if (!fromStr || !toStr) return json({ ok: false, error: "Thiếu from/to" }, 400);

  try {
    const supabase = getCustomerSupabaseAdmin();
    const isSale = auth.profile?.role === "sale" && auth.profile?.id !== "legacy-admin";

    let query = supabase
      .from("orders")
      .select(
        "id, order_code, status, grand_total, paid_amount, debt_amount, customer_id, customer_name, customer_company, sales_rep_id, confirmed_at, order_items(name, sku, quantity, unit, line_total, final_line_total)"
      )
      .in("status", REVENUE_STATUSES)
      .gte("confirmed_at", fromStr)
      .lt("confirmed_at", toStr);
    if (isSale) query = query.eq("sales_rep_id", auth.profile!.id);

    const { data: orders, error } = await query;
    if (error) throw error;

    const { data: codPayments, error: codError } = await supabase
      .from("order_payments")
      .select("amount, order_id")
      .eq("method", "cod")
      .gte("created_at", fromStr)
      .lt("created_at", toStr);
    if (codError) throw codError;

    const totalRevenue = (orders || []).reduce((s, o) => s + (Number(o.grand_total) || 0), 0);
    const totalDebtOutstanding = (orders || []).reduce((s, o) => s + (Number(o.debt_amount) || 0), 0);
    const codCollected = (codPayments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);

    const summary = {
      orderCount: (orders || []).length,
      totalRevenue,
      codCollected,
      debtOutstanding: totalDebtOutstanding,
      byStatus: REVENUE_STATUSES.reduce((acc, s) => {
        acc[s] = (orders || []).filter((o) => o.status === s).length;
        return acc;
      }, {} as Record<string, number>),
    };

    if (!groupBy) {
      return json({ ok: true, summary });
    }

    if (groupBy === "customer") {
      const byCustomer = new Map<string, { name: string; company: string | null; revenue: number; orderCount: number }>();
      for (const o of orders || []) {
        const key = o.customer_id || o.customer_name;
        const entry = byCustomer.get(key) || { name: o.customer_name, company: o.customer_company, revenue: 0, orderCount: 0 };
        entry.revenue += Number(o.grand_total) || 0;
        entry.orderCount += 1;
        byCustomer.set(key, entry);
      }
      const rows = [...byCustomer.values()].sort((a, b) => b.revenue - a.revenue);
      return json({ ok: true, summary, rows });
    }

    if (groupBy === "product") {
      const byProduct = new Map<string, { name: string; unit: string; quantity: number; revenue: number }>();
      for (const o of orders || []) {
        for (const item of (o as any).order_items || []) {
          const key = `${item.name}__${item.unit || "Kg"}`;
          const entry = byProduct.get(key) || { name: item.name, unit: item.unit || "Kg", quantity: 0, revenue: 0 };
          entry.quantity += Number(item.quantity) || 0;
          entry.revenue += Number(item.final_line_total ?? item.line_total) || 0;
          byProduct.set(key, entry);
        }
      }
      const rows = [...byProduct.values()].sort((a, b) => b.revenue - a.revenue);
      return json({ ok: true, summary, rows });
    }

    if (groupBy === "sale") {
      const salesRepIds = [...new Set((orders || []).map((o) => o.sales_rep_id).filter(Boolean))];
      const { data: reps } = salesRepIds.length
        ? await supabase.from("admin_profiles").select("id, name").in("id", salesRepIds)
        : { data: [] as { id: string; name: string }[] };
      const repNameById = new Map((reps || []).map((r) => [r.id, r.name]));

      const bySale = new Map<string, { name: string; revenue: number; orderCount: number }>();
      for (const o of orders || []) {
        const key = o.sales_rep_id || "khac";
        const entry = bySale.get(key) || { name: o.sales_rep_id ? repNameById.get(o.sales_rep_id) || "—" : "Không có sale phụ trách", revenue: 0, orderCount: 0 };
        entry.revenue += Number(o.grand_total) || 0;
        entry.orderCount += 1;
        bySale.set(key, entry);
      }
      const rows = [...bySale.values()].sort((a, b) => b.revenue - a.revenue);
      return json({ ok: true, summary, rows });
    }

    return json({ ok: false, error: "groupBy không hợp lệ" }, 400);
  } catch (error) {
    console.error("GET /api/admin/reports/summary lỗi:", error);
    return json({ ok: false, error: "Không tải được báo cáo" }, 500);
  }
}
