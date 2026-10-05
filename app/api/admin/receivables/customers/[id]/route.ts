import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { canForProfile } from "@/lib/permissions";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";
import { calculateReceivablesSummary, CustomerDebtInfo, proposeFifoAllocation } from "@/lib/receivables";
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

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) return json({ ok: false, error: auth.error }, 401);

  if (!canForProfile(auth.profile, "finance.view")) {
    return json({ ok: false, error: "Bạn không có quyền xem sổ công nợ" }, 403);
  }

  const { id: customerId } = await params;
  if (!customerId) return json({ ok: false, error: "Thiếu ID khách hàng" }, 400);

  try {
    const supabase = getCustomerSupabaseAdmin();
    const isSale = auth.profile?.role === "sale";

    // 1. Lấy thông tin khách hàng (kèm payment_terms_days an toàn)
    let custRaw: any = null;
    const { data: cData, error: custErr } = await supabase
      .from("vip_accounts")
      .select("id, partner_code, name, company, phone, tax_code, address, credit_limit, sales_rep_id, is_active, kiotviet_opening_debt, payment_terms_days")
      .eq("id", customerId)
      .maybeSingle();

    if (custErr && /payment_terms_days|schema cache/i.test(custErr.message)) {
      const { data: fData, error: fErr } = await supabase
        .from("vip_accounts")
        .select("id, partner_code, name, company, phone, tax_code, address, credit_limit, sales_rep_id, is_active, kiotviet_opening_debt")
        .eq("id", customerId)
        .single();
      if (fErr || !fData) return json({ ok: false, error: "Không tìm thấy khách hàng" }, 404);
      custRaw = fData;
    } else if (custErr || !cData) {
      return json({ ok: false, error: "Không tìm thấy khách hàng" }, 404);
    } else {
      custRaw = cData;
    }

    // Sale chỉ được xem khách mình phụ trách
    if (isSale && (!custRaw.sales_rep_id || custRaw.sales_rep_id !== auth.profile?.id)) {
      return json({ ok: false, error: "Bạn không được phân công phụ trách khách hàng này" }, 403);
    }

    // Lấy tên Sale phụ trách
    let salesRepName = null;
    if (custRaw.sales_rep_id) {
      const { data: rep } = await supabase
        .from("admin_profiles")
        .select("name")
        .eq("id", custRaw.sales_rep_id)
        .maybeSingle();
      salesRepName = rep?.name || null;
    }

    const customer: CustomerDebtInfo = {
      id: custRaw.id,
      partner_code: custRaw.partner_code || "CHƯA_CÓ_MÃ",
      name: custRaw.name || "Khách hàng",
      company: custRaw.company || null,
      phone: custRaw.phone || null,
      tax_code: custRaw.tax_code || null,
      address: custRaw.address || null,
      sales_rep_id: custRaw.sales_rep_id || null,
      sales_rep_name: salesRepName,
      credit_limit: Math.round(Number(custRaw.credit_limit) || 0),
      payment_terms_days: Math.round(Number(custRaw.payment_terms_days) || 30),
      kiotviet_opening_debt: custRaw.kiotviet_opening_debt != null ? Math.round(Number(custRaw.kiotviet_opening_debt)) : 0,
    };

    // 2. Lấy toàn bộ đơn hàng completed của khách (kèm due_date an toàn)
    let ordersRaw: any[] = [];
    const { data: oData, error: orderErr } = await supabase
      .from("orders")
      .select("id, order_code, invoice_number, customer_id, customer_name, customer_company, status, payment_method, payment_status, grand_total, paid_amount, debt_amount, return_credit_amount, created_at, completed_at, delivery_date, due_date")
      .eq("customer_id", customerId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false });

    if (orderErr && /due_date|schema cache/i.test(orderErr.message)) {
      const { data: foData, error: foErr } = await supabase
        .from("orders")
        .select("id, order_code, invoice_number, customer_id, customer_name, customer_company, status, payment_method, payment_status, grand_total, paid_amount, debt_amount, return_credit_amount, created_at, completed_at, delivery_date")
        .eq("customer_id", customerId)
        .eq("status", "completed")
        .order("completed_at", { ascending: false });
      if (foErr) throw foErr;
      ordersRaw = foData || [];
    } else if (orderErr) {
      throw orderErr;
    } else {
      ordersRaw = oData || [];
    }

    // 3. Lấy phiếu thu và điều chỉnh
    const receipts = await getCustomerReceipts(customerId);
    const adjustments = await getCustomerAdjustments(customerId);

    // 4. Tính toán chi tiết
    const globalSummary = calculateReceivablesSummary({
      customers: [customer],
      orders: ordersRaw || [],
      adjustments,
      receipts,
    });

    const customerSummary = globalSummary.customers[0];

    // 5. Tính gợi ý phân bổ FIFO cho toàn bộ nợ còn lại
    const proposed = proposeFifoAllocation({
      amount: customerSummary.totalReceivables,
      openingDebt: customerSummary.openingDebt,
      invoices: customerSummary.invoices,
    });

    return json({
      ok: true,
      customerSummary,
      receipts,
      adjustments,
      proposedAllocation: proposed,
    });
  } catch (error: any) {
    console.error("GET /api/admin/receivables/customers/[id] lỗi:", error);
    return json({ ok: false, error: error?.message || "Không tải được sổ chi tiết khách hàng" }, 500);
  }
}
