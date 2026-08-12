import { NextRequest, NextResponse } from "next/server";
import { CUSTOMER_SESSION_COOKIE, parseSessionCookieValue } from "@/lib/customer-session";
import { getCustomerSupabase } from "@/lib/customer-supabase-server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function GET(req: NextRequest) {
  const websiteSession = parseSessionCookieValue(
    req.cookies.get(CUSTOMER_SESSION_COOKIE)?.value
  );
  const token =
    websiteSession?.orderSessionToken ||
    req.nextUrl.searchParams.get("sessionToken") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Vui lòng đăng nhập lại" },
      { status: 401, headers: corsHeaders }
    );
  }

  const supabase = getCustomerSupabase();
  const { data, error } = await supabase.rpc("customer_list_orders", {
    p_session_token: token,
  });

  if (error) {
    console.error("customer_list_orders error:", error);
    return NextResponse.json(
      { ok: false, error: "Không tải được danh sách đơn hàng" },
      { status: 500, headers: corsHeaders }
    );
  }

  return NextResponse.json(
    { ok: true, orders: data || [] },
    { headers: corsHeaders }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}
