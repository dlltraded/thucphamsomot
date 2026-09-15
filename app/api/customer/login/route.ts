import { NextRequest, NextResponse } from "next/server";
import { getCustomerSupabase } from "@/lib/customer-supabase-server";
import {
  CUSTOMER_SESSION_COOKIE,
  createSessionCookieValue,
  type CustomerSession,
} from "@/lib/customer-session";

// 2026-09-14 (mục 14 kế hoạch webapp bán hàng TPS1): thêm CORS để webapp đặt
// hàng RIÊNG cho khách hàng (dat-hang.thucphamsomot.vn, app khác hoàn toàn,
// không cùng deploy với web chính) gọi được route này. Các route
// /api/customer/** khác (products, orders, order, session...) đã có sẵn CORS
// "*" từ trước cho Zalo Mini App — route login/change-password là 2 route
// duy nhất còn thiếu vì trước giờ chỉ /portal (cùng origin, dùng cookie) gọi
// tới. Không đổi hành vi cũ cho /portal, chỉ thêm khả năng gọi cross-origin.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

interface LoginRpcRow {
  id: string;
  code: string;
  name: string;
  phone: string;
  company: string;
  email: string;
  tax_code: string;
  address: string;
  default_shipping_alias: string;
  default_shipping_address: string;
  default_shipping_name: string;
  default_shipping_phone: string;
  tier: string;
  discount_percent: number;
  verification_status?: "pending" | "verified" | "rejected";
  must_change_password: boolean;
  order_session_token: string;
}

export async function POST(req: NextRequest) {
  let body: { code?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Dữ liệu không hợp lệ" }, { status: 400, headers: corsHeaders });
  }

  const code = (body.code || "").trim();
  const password = body.password || "";
  if (!code || !password) {
    return NextResponse.json(
      { ok: false, error: "Vui lòng nhập đầy đủ Mã khách hàng và Mật khẩu" },
      { status: 400, headers: corsHeaders }
    );
  }

  const supabase = getCustomerSupabase();
  const { data, error } = await supabase.rpc("verify_customer_login", {
    p_code: code,
    p_password: password,
  });

  if (error) {
    console.error("verify_customer_login error:", error);
    return NextResponse.json(
      { ok: false, error: "Không thể đăng nhập lúc này, vui lòng thử lại" },
      { status: 500, headers: corsHeaders }
    );
  }

  const row: LoginRpcRow | undefined = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return NextResponse.json(
      { ok: false, error: "Mã khách hàng hoặc mật khẩu không đúng" },
      { status: 401, headers: corsHeaders }
    );
  }

  const session: CustomerSession = {
    id: row.id,
    code: row.code,
    name: row.name,
    phone: row.phone,
    company: row.company,
    email: row.email || "",
    taxCode: row.tax_code || "",
    address: row.address || "",
    defaultShippingAddress: {
      alias: row.default_shipping_alias || "Địa chỉ mặc định",
      address: row.default_shipping_address || row.address || "",
      name: row.default_shipping_name || row.name || "",
      phone: row.default_shipping_phone || row.phone || "",
    },
    tier: row.tier,
    discountPercent: Number(row.discount_percent) || 0,
    verificationStatus: row.verification_status || "verified",
    mustChangePassword: !!row.must_change_password,
    orderSessionToken: row.order_session_token || "",
  };

  // orderSessionToken đã có trong "session" trả về ở body JSON — webapp đặt
  // hàng riêng dùng đúng giá trị này làm Bearer token, KHÔNG phụ thuộc cookie
  // dưới đây (cookie httpOnly chỉ đọc được từ đúng origin đã set, vô ích với
  // app khác domain). Vẫn set cookie như cũ để không ảnh hưởng /portal.
  const response = NextResponse.json({ ok: true, session }, { headers: corsHeaders });
  response.cookies.set(CUSTOMER_SESSION_COOKIE, createSessionCookieValue(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
