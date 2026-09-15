import { NextResponse } from "next/server";

// Public key Web Push — an toàn để lộ công khai theo đúng thiết kế VAPID (chỉ
// private key mới cần giữ bí mật phía server). order-webapp fetch route này
// lúc đăng ký thông báo thay vì bake cứng lúc build, để đổi key không cần
// build lại app khách hàng.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY || "";
  return NextResponse.json({ ok: true, publicKey }, { headers: corsHeaders });
}
