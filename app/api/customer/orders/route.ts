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
      .select("*, order_items(*), order_documents(id, revision, status)")
      .eq("customer_id", customerSession.customer_id)
      .order("created_at", { ascending: false });
    if (error) throw error;

    const orders = (data || []).map((order) => {
      const document = (order.order_documents || [])
        .filter((item: { status?: string }) => item.status === "generated")
        .sort((a: { revision?: number }, b: { revision?: number }) => Number(b.revision || 0) - Number(a.revision || 0))[0];
      return {
        ...order,
        confirmation_document_id: document?.id || null,
        items: (order.order_items || []).map((item: Record<string, unknown>) => ({
          id: item.id,
          productId: item.product_id,
          localProductId: item.product_local_id,
          sku: item.sku,
          name: item.name,
          unit: item.unit,
          quantity: item.quantity,
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
