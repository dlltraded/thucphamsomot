import { NextRequest, NextResponse } from "next/server";
import { getCustomerSupabase, getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";
import { setAdminSession } from "@/lib/admin-session";

// LƯU Ý BẢO MẬT (2026-09-09): route này TRƯỚC ĐÂY không hề kiểm tra mật khẩu
// (chỉ tra tên/email trong admin_profiles rồi cho đăng nhập luôn), cộng thêm
// một "cửa sau" cho phép đăng nhập bằng admin/123456 bất kể admin_profiles có
// gì. Đã viết lại để xác thực thật qua Supabase Auth (email + mật khẩu).
//
// GIAI ĐOẠN A (2026-09-10): gộp thành màn đăng nhập DUY NHẤT cho cả nhân viên
// và khách hàng — không hỏi trước "bạn là ai". Thử xác thực nhân viên
// (admin_profiles + Supabase Auth) trước; nếu không khớp, thử xác thực khách
// hàng qua RPC verify_customer_login (RPC gốc đang dùng cho Zalo Mini App,
// không đổi hành vi của RPC). Hai hệ dữ liệu (admin_profiles / vip_accounts)
// không gộp vật lý — chỉ gộp ở API/UI đăng nhập này.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // "identifier" là tên field mới (email nhân viên HOẶC mã khách hàng).
    // Vẫn nhận "email" để tương thích ngược trong lúc frontend/backend có thể
    // chưa deploy đồng thời.
    const identifier = (body.identifier ?? body.email ?? "").trim();
    const password = typeof body.password === "string" ? body.password : "";

    if (!identifier || !password) {
      return NextResponse.json({ ok: false, error: "Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu" }, { status: 400 });
    }

    const staffResult = await tryStaffLogin(identifier, password);
    if (staffResult) return NextResponse.json(staffResult);

    const customerResult = await tryCustomerLogin(identifier, password);
    if (customerResult) return NextResponse.json(customerResult);

    // Không tiết lộ identifier thuộc hệ nào (nhân viên hay khách hàng) để
    // tránh dò tài khoản — luôn trả cùng một thông báo chung.
    return NextResponse.json({ ok: false, error: "Tên đăng nhập hoặc mật khẩu không đúng" }, { status: 401 });
  } catch (error) {
    console.error("Sale auth error:", error);
    return NextResponse.json({ ok: false, error: "Lỗi hệ thống" }, { status: 500 });
  }
}

async function tryStaffLogin(identifier: string, password: string) {
  // Supabase Auth chỉ chấp nhận định dạng email — mã khách hàng (vd "VIP001",
  // "TPS1-AB12") không phải email nên sẽ tự nhiên rơi qua nhánh khách hàng.
  if (!identifier.includes("@")) return null;

  // Xác thực thật bằng Supabase Auth. Dùng anon key (không phải service-role)
  // vì đây chính là API xác thực thật, không phải nơi cần bypass RLS.
  const authClient = getCustomerSupabase();
  const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
    email: identifier,
    password,
  });

  if (authError || !authData?.session || !authData.user) return null;

  // Tra hồ sơ nhân viên bằng service-role (không tin bất kỳ dữ liệu role/tên
  // nào do client tự gửi lên) để lấy role thật + kiểm tra tài khoản còn hoạt động.
  const adminSupabase = getCustomerSupabaseAdmin();
  const { data: profile, error: profileError } = await adminSupabase
    .from("admin_profiles")
    .select("id, name, role, is_active")
    .eq("id", authData.user.id)
    .eq("is_active", true)
    .single();

  if (profileError || !profile) {
    // Đăng nhập Supabase Auth thành công nhưng tài khoản này không có hồ sơ
    // nhân viên hợp lệ (hoặc đã bị khoá) -> huỷ phiên vừa tạo, từ chối truy cập.
    await authClient.auth.signOut();
    return null;
  }

  const userOut = {
    id: profile.id,
    name: profile.name,
    role: profile.role as string,
    email: authData.user.email || undefined,
  };

  // Vẫn lưu cookie phiên nội bộ (httpOnly) để các route cũ như
  // /api/sale/order/update tiếp tục hoạt động không cần sửa thêm.
  await setAdminSession({ id: userOut.id, name: userOut.name, role: userOut.role });

  return {
    ok: true,
    userType: "staff" as const,
    user: userOut,
    // Token thật của Supabase Auth, để sale-webapp dùng làm Bearer token khi
    // gọi các API /api/admin/** (thay cho token tĩnh hardcode trước đây).
    accessToken: authData.session.access_token,
    refreshToken: authData.session.refresh_token,
  };
}

interface CustomerLoginRow {
  id: string;
  code: string;
  name: string;
  phone: string;
  company: string;
  tier: string;
  discount_percent: number;
  must_change_password: boolean;
  order_session_token: string;
}

async function tryCustomerLogin(identifier: string, password: string) {
  const supabase = getCustomerSupabase();
  const { data, error } = await supabase.rpc("verify_customer_login", {
    p_code: identifier,
    p_password: password,
  });
  if (error) {
    console.error("verify_customer_login error (sale-auth):", error);
    return null;
  }

  const row: CustomerLoginRow | undefined = Array.isArray(data) ? data[0] : data;
  if (!row || !row.order_session_token) return null;

  return {
    ok: true,
    userType: "customer" as const,
    user: {
      id: row.id,
      code: row.code,
      name: row.name,
      phone: row.phone,
      company: row.company,
      tier: row.tier,
      discountPercent: Number(row.discount_percent) || 0,
      mustChangePassword: !!row.must_change_password,
    },
    // Dùng chung customer_sessions với Zalo Mini App — sale-webapp gửi kèm
    // header "Authorization: Bearer <customerToken>" khi gọi /api/customer/**
    // (các route đó đã hỗ trợ đọc Authorization header, xem app/api/customer/orders).
    customerToken: row.order_session_token,
  };
}
