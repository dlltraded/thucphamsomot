import { NextRequest, NextResponse } from "next/server";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";
import { CUSTOMER_SESSION_COOKIE, parseSessionCookieValue, type CustomerSession } from "@/lib/customer-session";
import { loadCustomerSessionByToken } from "@/lib/customer-session-server";

// Đăng ký/hủy Web Push cho order-webapp (2026-09-14, mục 14 kế hoạch) — cùng
// cơ chế Authorization: Bearer <orderSessionToken> như change-password, vì
// app khách hàng chạy khác domain, không dùng được cookie /portal.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

async function resolveSession(req: NextRequest): Promise<CustomerSession | null> {
  const cookieSession = parseSessionCookieValue(req.cookies.get(CUSTOMER_SESSION_COOKIE)?.value);
  if (cookieSession) return cookieSession;
  const bearerToken = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (bearerToken) return loadCustomerSessionByToken(bearerToken);
  return null;
}

export async function POST(req: NextRequest) {
  const session = await resolveSession(req);
  if (!session) {
    return NextResponse.json({ ok: false, error: "Vui lòng đăng nhập lại" }, { status: 401, headers: corsHeaders });
  }

  let body: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Dữ liệu không hợp lệ" }, { status: 400, headers: corsHeaders });
  }

  const endpoint = String(body.endpoint || "").trim();
  const p256dh = String(body.keys?.p256dh || "").trim();
  const auth = String(body.keys?.auth || "").trim();
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ ok: false, error: "Thiếu thông tin subscription" }, { status: 400, headers: corsHeaders });
  }

  const supabase = getCustomerSupabaseAdmin();
  const { error } = await supabase.rpc("customer_save_push_subscription", {
    p_customer_id: session.id,
    p_endpoint: endpoint,
    p_p256dh: p256dh,
    p_auth: auth,
    p_user_agent: req.headers.get("user-agent") || null,
  });
  if (error) {
    console.error("customer_save_push_subscription lỗi:", error.message);
    return NextResponse.json({ ok: false, error: "Không bật được thông báo, thử lại sau" }, { status: 500, headers: corsHeaders });
  }

  return NextResponse.json({ ok: true }, { headers: corsHeaders });
}

export async function DELETE(req: NextRequest) {
  const session = await resolveSession(req);
  if (!session) {
    return NextResponse.json({ ok: false, error: "Vui lòng đăng nhập lại" }, { status: 401, headers: corsHeaders });
  }

  let body: { endpoint?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Dữ liệu không hợp lệ" }, { status: 400, headers: corsHeaders });
  }
  const endpoint = String(body.endpoint || "").trim();
  if (!endpoint) {
    return NextResponse.json({ ok: false, error: "Thiếu endpoint" }, { status: 400, headers: corsHeaders });
  }

  const supabase = getCustomerSupabaseAdmin();
  const { error } = await supabase.rpc("customer_remove_push_subscription", { p_endpoint: endpoint });
  if (error) {
    console.error("customer_remove_push_subscription lỗi:", error.message);
    return NextResponse.json({ ok: false, error: "Không tắt được thông báo" }, { status: 500, headers: corsHeaders });
  }

  return NextResponse.json({ ok: true }, { headers: corsHeaders });
}
