import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { canForProfile } from "@/lib/permissions";
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

export async function GET(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) return json({ ok: false, error: auth.error }, 401);

  if (!canForProfile(auth.profile, "finance.view")) {
    return json({ ok: false, error: "Bạn không có quyền xem sổ công nợ" }, 403);
  }

  try {
    const supabase = getCustomerSupabaseAdmin();
    const isSale = auth.profile?.role === "sale";

    // 1. Lấy danh sách nhân viên Sale để map tên
    const { data: salesReps } = await supabase
      .from("admin_profiles")
      .select("id, name");
    const repNameMap = new Map<string, string>();
    for (const r of salesReps || []) {
      repNameMap.set(r.id, r.name);
    }

    // 2. Query khách hàng (vip_accounts)
    // Tuyệt đối không query hay trả về VIP / discount_tier
    let custQueryWithTerms = supabase
      .from("vip_accounts")
      .select("id, partner_code, name, company, phone, tax_code, address, credit_limit, sales_rep_id, is_active, kiotviet_opening_debt, payment_terms_days")
      .eq("is_active", true);

    if (isSale) {
      if (!auth.profile?.id) {
        return json({
          ok: true,
          summary: calculateReceivablesSummary({ customers: [], orders: [] }),
          scope: "assigned_only",
        });
      }
      custQueryWithTerms = custQueryWithTerms.eq("sales_rep_id", auth.profile.id);
    }

    let customersRaw: any[] = [];
    const { data: cData, error: custError } = await custQueryWithTerms;
    if (custError && /payment_terms_days|schema cache/i.test(custError.message)) {
      let fallbackQuery = supabase
        .from("vip_accounts")
        .select("id, partner_code, name, company, phone, tax_code, address, credit_limit, sales_rep_id, is_active, kiotviet_opening_debt")
        .eq("is_active", true);
      if (isSale && auth.profile?.id) {
        fallbackQuery = fallbackQuery.eq("sales_rep_id", auth.profile.id);
      }
      const { data: fData, error: fErr } = await fallbackQuery;
      if (fErr) throw fErr;
      customersRaw = fData || [];
    } else if (custError) {
      throw custError;
    } else {
      customersRaw = cData || [];
    }

    const customers: CustomerDebtInfo[] = (customersRaw || []).map((c: any) => ({
      id: c.id,
      partner_code: c.partner_code || "CHƯA_CÓ_MÃ",
      name: c.name || "Khách hàng",
      company: c.company || null,
      phone: c.phone || null,
      tax_code: c.tax_code || null,
      address: c.address || null,
      sales_rep_id: c.sales_rep_id || null,
      sales_rep_name: c.sales_rep_id ? repNameMap.get(c.sales_rep_id) || null : null,
      credit_limit: Math.round(Number(c.credit_limit) || 0),
      payment_terms_days: Math.round(Number(c.payment_terms_days) || 30),
      kiotviet_opening_debt: c.kiotviet_opening_debt != null ? Math.round(Number(c.kiotviet_opening_debt)) : 0,
    }));

    // 3. Query toàn bộ đơn completed chưa bị canceled/merged
    let ordersRaw: any[] = [];
    if (customers.length > 0 || !isSale) {
      let orderQueryWithDue = supabase
        .from("orders")
        .select("id, order_code, customer_id, customer_name, customer_company, status, payment_method, payment_status, grand_total, paid_amount, debt_amount, return_credit_amount, created_at, completed_at, delivery_date, due_date")
        .eq("status", "completed");

      if (isSale) {
        const allowedCustomerIds = customers.map((c) => c.id);
        orderQueryWithDue = orderQueryWithDue.in("customer_id", allowedCustomerIds);
      }

      const { data: oData, error: oErr } = await orderQueryWithDue;
      if (oErr && /due_date|schema cache/i.test(oErr.message)) {
        let fallbackOrderQuery = supabase
          .from("orders")
          .select("id, order_code, customer_id, customer_name, customer_company, status, payment_method, payment_status, grand_total, paid_amount, debt_amount, return_credit_amount, created_at, completed_at, delivery_date")
          .eq("status", "completed");
        if (isSale) {
          const allowedCustomerIds = customers.map((c) => c.id);
          fallbackOrderQuery = fallbackOrderQuery.in("customer_id", allowedCustomerIds);
        }
        const { data: foData, error: foErr } = await fallbackOrderQuery;
        if (foErr) throw foErr;
        ordersRaw = foData || [];
      } else if (oErr) {
        throw oErr;
      } else {
        ordersRaw = oData || [];
      }
    }

    // 4. Lấy phiếu thu và điều chỉnh
    const receipts = await getCustomerReceipts();
    const adjustments = await getCustomerAdjustments();

    // 5. Tính toán theo engine chuẩn hóa dùng chung
    const summary = calculateReceivablesSummary({
      customers,
      orders: ordersRaw || [],
      adjustments,
      receipts,
    });

    return json({
      ok: true,
      summary,
      scope: isSale ? "assigned_only" : "all",
    });
  } catch (error: any) {
    console.error("GET /api/admin/receivables/summary lỗi:", error);
    return json({ ok: false, error: error?.message || "Không tải được tổng quan công nợ" }, 500);
  }
}
