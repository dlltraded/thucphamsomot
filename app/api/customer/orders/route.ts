import { NextRequest, NextResponse } from "next/server";
import { CUSTOMER_SESSION_COOKIE, parseSessionCookieValue } from "@/lib/customer-session";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function GET(req: NextRequest) {
  const websiteSession = parseSessionCookieValue(req.cookies.get(CUSTOMER_SESSION_COOKIE)?.value);
  const token =
    websiteSession?.orderSessionToken ||
    req.nextUrl.searchParams.get("sessionToken") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ ok: false, error: "Vui lòng đăng nhập lại" }, { status: 401, headers: corsHeaders });

  try {
    const supabase = getCustomerSupabaseAdmin();
    const { data: customerSession, error: sessionError } = await supabase
      .from("customer_sessions")
      .select("customer_id, expires_at")
      .eq("token", token)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (sessionError || !customerSession) {
      return NextResponse.json({ ok: false, error: "Phiên đăng nhập đã hết hạn" }, { status: 401, headers: corsHeaders });
    }

    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*), order_documents(id, document_type, revision, status)")
      .eq("customer_id", customerSession.customer_id)
      .order("created_at", { ascending: false });
    if (error) throw error;

    // Phiếu xác nhận (order_confirmation, xem được ngay khi chốt giá) và hóa
    // đơn bán hàng (invoice, chỉ có khi đơn "completed") là 2 loại chứng từ
    // KHÁC NHAU — phải lọc riêng theo document_type, không gộp chung rồi lấy
    // theo revision cao nhất (2 loại đều có thể revision=1, dễ lấy nhầm).
    const latestDoc = (order: any, type: string) =>
      (order.order_documents || [])
        .filter((item: { status?: string; document_type?: string }) => item.status === "generated" && item.document_type === type)
        .sort((a: { revision?: number }, b: { revision?: number }) => Number(b.revision || 0) - Number(a.revision || 0))[0];

    // Yêu cầu điều chỉnh/hủy mới nhất của từng đơn (WP6b) — bảng chưa có (migration chưa chạy) thì bỏ qua
    const latestRequestByOrder = new Map<string, Record<string, unknown>>();
    try {
      const ids = (data || []).map((o) => o.id).slice(0, 300);
      if (ids.length) {
        const { data: reqs, error: reqErr } = await supabase
          .from("order_change_requests")
          .select("id, order_id, type, status, message, requested_at, handled_at, handled_note")
          .in("order_id", ids)
          .order("requested_at", { ascending: false });
        if (!reqErr) for (const r of reqs || []) if (!latestRequestByOrder.has(r.order_id)) latestRequestByOrder.set(r.order_id, r);
      }
    } catch {
      /* bảng chưa tạo */
    }

    const orders = (data || []).map((order) => {
      const confirmationDoc = latestDoc(order, "order_confirmation");
      const invoiceDoc = latestDoc(order, "invoice");
      return {
        ...order,
        change_request: latestRequestByOrder.get(order.id) || null,
        delivery_date: order.delivery_date || null,
        delivery_address_id: order.delivery_address_id || null,
        is_late_order: Boolean(order.is_late_order),
        cancel_reason: order.cancel_reason || null,
        canceled_by: order.canceled_by || null,
        confirmation_document_id: confirmationDoc?.id || null,
        // Chỉ trả invoice_document_id khi đơn đã completed — Mini App chỉ nên
        // hiện nút tải hóa đơn lúc đó (mục brief 2026-09-11).
        invoice_document_id: order.status === "completed" ? invoiceDoc?.id || null : null,
        items: (order.order_items || []).map((item: Record<string, unknown>) => ({
          id: item.id,
          productId: item.product_id,
          localProductId: item.product_local_id,
          sku: item.sku,
          name: item.name,
          unit: item.unit,
          quantity: Number(item.quantity) || 0,
          orderedQuantity: item.ordered_quantity != null ? Number(item.ordered_quantity) : Number(item.quantity) || 0,
          orderedProductName: (item.ordered_product_name as string) || (item.name as string) || "",
          customerNote: (item.customer_note as string) || "",
          baseUnitPrice: item.base_unit_price,
          discountPercent: item.discount_percent,
          price: item.unit_price,
          lineTotal: item.line_total,
          pricingMode: item.pricing_mode,
          finalUnitPrice: item.final_unit_price,
          finalLineTotal: item.final_line_total,
          itemNote: item.pricing_note,
        })),
        order_items: undefined,
        order_documents: undefined,
      };
    });
    return NextResponse.json({ ok: true, orders }, { headers: corsHeaders });
  } catch (error) {
    console.error("Customer orders GET error:", error);
    return NextResponse.json({ ok: false, error: "Không tải được danh sách đơn hàng" }, { status: 500, headers: corsHeaders });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}
