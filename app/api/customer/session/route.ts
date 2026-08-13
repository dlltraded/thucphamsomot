import { NextRequest, NextResponse } from "next/server";
import { CUSTOMER_SESSION_COOKIE, createSessionCookieValue, parseSessionCookieValue } from "@/lib/customer-session";
import { loadCustomerSessionByToken } from "@/lib/customer-session-server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function GET(req: NextRequest) {
  const websiteSession = parseSessionCookieValue(req.cookies.get(CUSTOMER_SESSION_COOKIE)?.value);
  const token = websiteSession?.orderSessionToken || req.nextUrl.searchParams.get("sessionToken") || req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ ok: false, error: "Phiên đăng nhập không hợp lệ" }, { status: 401, headers: corsHeaders });
  }
  const session = await loadCustomerSessionByToken(token);
  if (!session) {
    return NextResponse.json({ ok: false, error: "Phiên đăng nhập đã hết hạn" }, { status: 401, headers: corsHeaders });
  }
  const response = NextResponse.json({ ok: true, session }, { headers: corsHeaders });
  if (websiteSession) {
    response.cookies.set(CUSTOMER_SESSION_COOKIE, createSessionCookieValue(session), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return response;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}
