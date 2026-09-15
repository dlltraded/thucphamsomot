import { NextRequest, NextResponse } from "next/server";
import { getCustomerSupabase, getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";
import {
  CUSTOMER_SESSION_COOKIE,
  createSessionCookieValue,
  parseSessionCookieValue,
  type CustomerSession,
} from "@/lib/customer-session";
import { loadCustomerSessionByToken } from "@/lib/customer-session-server";

// 2026-09-14 (mục 14 kế hoạch webapp bán hàng TPS1): route này trước đây CHỈ
// đọc được phiên qua cookie CUSTOMER_SESSION_COOKIE — không dùng được từ
// webapp đặt hàng riêng (app khác domain, không có cookie này). Thêm nhánh
// resolve qua Authorization: Bearer <orderSessionToken> (cùng cơ chế các
// route customer/** khác đã dùng cho Zalo Mini App), giữ nguyên đường cookie
// cũ cho /portal. Đây là route BẮT BUỘC phải hỗ trợ token vì khách bị ép đổi
// mật khẩu ngay sau khi đăng nhập lần đầu — lúc đó app khác domain chưa có
// cách nào khác để gọi route này.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  const cookieSession = parseSessionCookieValue(req.cookies.get(CUSTOMER_SESSION_COOKIE)?.value);
  const bearerToken = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  let session: CustomerSession | null = cookieSession;
  let fromToken = false;
  if (!session && bearerToken) {
    session = await loadCustomerSessionByToken(bearerToken);
    fromToken = true;
  }
  if (!session) {
    return NextResponse.json({ ok: false, error: "Vui lòng đăng nhập lại" }, { status: 401, headers: corsHeaders });
  }

  let body: { oldPassword?: string; newPassword?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Dữ liệu không hợp lệ" }, { status: 400, headers: corsHeaders });
  }

  const oldPassword = body.oldPassword || "";
  const newPassword = body.newPassword || "";
  if (!oldPassword) {
    return NextResponse.json(
      { ok: false, error: "Vui lòng nhập mật khẩu hiện tại" },
      { status: 400, headers: corsHeaders }
    );
  }
  if (newPassword.length < 6) {
    return NextResponse.json(
      { ok: false, error: "Mật khẩu mới phải từ 6 ký tự trở lên" },
      { status: 400, headers: corsHeaders }
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
      { status: 400, headers: corsHeaders }
    );
  }

  if (changed !== true) {
    return NextResponse.json(
      { ok: false, error: "Supabase chưa xác nhận việc đổi mật khẩu, vui lòng thử lại" },
      { status: 500, headers: corsHeaders }
    );
  }
  if (newPassword !== newPassword.trim()) {
    return NextResponse.json(
      { ok: false, error: "Mật khẩu mới không được có khoảng trắng ở đầu hoặc cuối" },
      { status: 400, headers: corsHeaders }
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
      { status: 500, headers: corsHeaders }
    );
  }

  const nextSession = {
    ...session,
    mustChangePassword: false,
    orderSessionToken: verified.order_session_token || session.orderSessionToken || "",
  };
  const response = NextResponse.json({ ok: true, session: nextSession }, { headers: corsHeaders });
  // Chỉ set cookie khi phiên gốc được đọc từ cookie (/portal). Với caller dùng
  // Bearer token (app đặt hàng riêng), set cookie ở đây vô nghĩa vì đó là
  // request cross-origin — app đó chỉ cần orderSessionToken mới trong body JSON.
  if (!fromToken) {
    response.cookies.set(CUSTOMER_SESSION_COOKIE, createSessionCookieValue(nextSession), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return response;
}
