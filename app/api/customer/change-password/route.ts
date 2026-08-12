import { NextRequest, NextResponse } from "next/server";
import { getCustomerSupabase } from "@/lib/customer-supabase-server";
import {
  CUSTOMER_SESSION_COOKIE,
  createSessionCookieValue,
  parseSessionCookieValue,
} from "@/lib/customer-session";

export async function POST(req: NextRequest) {
  const session = parseSessionCookieValue(req.cookies.get(CUSTOMER_SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ ok: false, error: "Vui lòng đăng nhập lại" }, { status: 401 });
  }

  let body: { oldPassword?: string; newPassword?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const oldPassword = body.oldPassword || "";
  const newPassword = body.newPassword || "";
  if (!oldPassword) {
    return NextResponse.json({ ok: false, error: "Vui lòng nhập mật khẩu hiện tại" }, { status: 400 });
  }
  if (newPassword.length < 6) {
    return NextResponse.json(
      { ok: false, error: "Mật khẩu mới phải từ 6 ký tự trở lên" },
      { status: 400 }
    );
  }

  const supabase = getCustomerSupabase();
  const { data: changed, error } = await supabase.rpc("customer_change_password", {
    p_code: session.code,
    p_old_password: oldPassword,
    p_new_password: newPassword,
  });

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message || "Không đổi được mật khẩu" },
      { status: 400 }
    );
  }

  if (changed !== true) {
    return NextResponse.json(
      { ok: false, error: "Supabase chưa xác nhận việc đổi mật khẩu, vui lòng thử lại" },
      { status: 500 }
    );
  }
  if (newPassword !== newPassword.trim()) {
    return NextResponse.json(
      { ok: false, error: "Mật khẩu mới không được có khoảng trắng ở đầu hoặc cuối" },
      { status: 400 }
    );
  }

  // Không báo thành công chỉ dựa trên RPC update: đăng nhập thử bằng mật khẩu mới
  // để bảo đảm hash vừa lưu có thể dùng cho lần đăng nhập tiếp theo.
  const { data: verifiedData, error: verifyError } = await supabase.rpc(
    "verify_customer_login",
    {
      p_code: session.code,
      p_password: newPassword,
    }
  );
  const verified = Array.isArray(verifiedData) ? verifiedData[0] : verifiedData;
  if (verifyError || !verified || verified.id !== session.id) {
    console.error("verify changed customer password error:", verifyError);
    return NextResponse.json(
      { ok: false, error: "Mật khẩu mới chưa được xác nhận, vui lòng thử đổi lại" },
      { status: 500 }
    );
  }

  const nextSession = {
    ...session,
    mustChangePassword: false,
    orderSessionToken: verified.order_session_token || session.orderSessionToken || "",
  };
  const response = NextResponse.json({ ok: true, session: nextSession });
  response.cookies.set(CUSTOMER_SESSION_COOKIE, createSessionCookieValue(nextSession), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
