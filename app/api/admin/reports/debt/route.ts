import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";
import { calculateReceivablesSummary, CustomerDebtInfo } from "@/lib/receivables";
import { getCustomerReceipts, getCustomerAdjustments } from "@/lib/receivables-db";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Idempotency-Key, X-Admin-Token",
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: corsHeaders });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// Báo cáo công nợ (Tương thích ngược & dùng chung hàm tính số dư với /cong-no)
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
        .select("id, order_code, status, grand_total, paid_amount, debt_amount, return_credit_amount, created_at, completed_at, payment_method")
        .eq("customer_id", customerId)
        .eq("status", "completed")
        .order("created_at", { ascending: false });
      if (error) throw error;

      return json({
        ok: true,
        orders: (orders || []).map((order) => ({
          ...order,
          effective_debt_amount: Math.max(0, Number(order.debt_amount) - Number(order.return_credit_amount || 0)),
        })),
      });
    }

    let customerQuery = supabase
      .from("vip_accounts")
      .select("id, partner_code, name, company, phone, credit_limit, sales_rep_id, is_active, payment_terms_days, kiotviet_opening_debt")
      .eq("is_active", true);
    if (isSale && auth.profile?.id) customerQuery = customerQuery.eq("sales_rep_id", auth.profile.id);
    const { data: customersRaw, error: customerError } = await customerQuery;
    if (customerError) throw customerError;

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

    let orderQuery = supabase
      .from("orders")
      .select("id, order_code, customer_id, customer_name, customer_company, status, payment_method, payment_status, grand_total, paid_amount, debt_amount, return_credit_amount, created_at, completed_at, delivery_date")
      .eq("status", "completed");

    if (isSale && auth.profile?.id) {
      const allowedIds = customers.map((c) => c.id);
      if (allowedIds.length > 0) orderQuery = orderQuery.in("customer_id", allowedIds);
      else orderQuery = orderQuery.in("customer_id", ["00000000-0000-0000-0000-000000000000"]);
    }

    const { data: ordersRaw, error: orderError } = await orderQuery;
    if (orderError) throw orderError;

    const receipts = await getCustomerReceipts();
    const adjustments = await getCustomerAdjustments();

    // Dùng chung hàm calculateReceivablesSummary
    const globalSummary = calculateReceivablesSummary({
      customers,
      orders: ordersRaw || [],
      adjustments,
      receipts,
    });

    const rows = globalSummary.customers
      .filter((c) => c.totalReceivables > 0)
      .map((c) => ({
        id: c.customer.id,
        partner_code: c.customer.partner_code,
        name: c.customer.name,
        company: c.customer.company,
        phone: c.customer.phone,
        credit_limit: c.creditLimit,
        currentDebt: c.totalReceivables,
        openOrders: c.openInvoiceCount,
        overLimit: c.isOverLimit,
        usagePercent: c.creditUsagePercent,
      }));

    return json({
      ok: true,
      customers: rows,
      totalDebt: globalSummary.totalReceivables,
      totalCustomersWithDebt: rows.length,
    });
  } catch (error) {
    console.error("GET /api/admin/reports/debt lỗi:", error);
    return json({ ok: false, error: "Không tải được báo cáo công nợ" }, 500);
  }
}
