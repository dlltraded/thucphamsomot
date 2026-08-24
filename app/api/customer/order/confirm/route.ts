import { NextRequest, NextResponse } from "next/server";
import { CUSTOMER_SESSION_COOKIE, parseSessionCookieValue } from "@/lib/customer-session";
import { getCustomerSupabase } from "@/lib/customer-supabase-server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  const websiteSession = parseSessionCookieValue(
    req.cookies.get(CUSTOMER_SESSION_COOKIE)?.value
  );

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Dữ liệu không hợp lệ" }, { status: 400, headers: corsHeaders });
  }

  const orderSessionToken = body.orderSessionToken || websiteSession?.orderSessionToken;
  if (!orderSessionToken) {
    return NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401, headers: corsHeaders });
  }

  const { orderId } = body;
  if (!orderId) {
    return NextResponse.json({ ok: false, error: "Thiếu orderId" }, { status: 400, headers: corsHeaders });
  }

  const supabase = getCustomerSupabase();
  const { error } = await supabase.rpc("customer_confirm_draft_order", {
    p_session_token: orderSessionToken,
    p_order_id: orderId,
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400, headers: corsHeaders });
  }

  return NextResponse.json({ ok: true }, { headers: corsHeaders });
}
