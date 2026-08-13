import { NextRequest, NextResponse } from "next/server";
import { CUSTOMER_SESSION_COOKIE, parseSessionCookieValue } from "@/lib/customer-session";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

export async function GET(req: NextRequest) {
  const websiteSession = parseSessionCookieValue(req.cookies.get(CUSTOMER_SESSION_COOKIE)?.value);
  const token = websiteSession?.orderSessionToken || req.nextUrl.searchParams.get("sessionToken") || req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const orderId = req.nextUrl.searchParams.get("orderId");
  if (!token || !orderId) {
    return NextResponse.json({ ok: false, error: "Thiếu phiên đăng nhập hoặc mã đơn hàng" }, { status: 401, headers: corsHeaders });
  }

  const supabase = getCustomerSupabaseAdmin();
  const { data: session } = await supabase
    .from("customer_sessions")
    .select("customer_id")
    .eq("token", token)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Phiên đăng nhập đã hết hạn" }, { status: 401, headers: corsHeaders });
  }

  const { data: order } = await supabase
    .from("orders")
    .select("id, order_code, customer_id, pricing_status")
    .eq("id", orderId)
    .eq("customer_id", session.customer_id)
    .maybeSingle();
  if (!order || order.pricing_status !== "finalized") {
    return NextResponse.json({ ok: false, error: "Đơn chưa có chứng từ xác nhận" }, { status: 404, headers: corsHeaders });
  }

  const { data: document } = await supabase
    .from("order_documents")
    .select("storage_path, revision")
    .eq("order_id", order.id)
    .eq("status", "generated")
    .order("revision", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!document) {
    return NextResponse.json({ ok: false, error: "Chứng từ đang được tạo, vui lòng thử lại" }, { status: 404, headers: corsHeaders });
  }

  const { data: file, error } = await supabase.storage
    .from("order-confirmations")
    .download(document.storage_path);
  if (error || !file) {
    return NextResponse.json({ ok: false, error: "Không tải được chứng từ" }, { status: 500, headers: corsHeaders });
  }

  return new NextResponse(await file.arrayBuffer(), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="XAC-NHAN-DON-HANG_${order.order_code}_R${document.revision}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}
