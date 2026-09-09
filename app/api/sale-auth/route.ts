import { NextRequest, NextResponse } from "next/server";
import { getCustomerSupabase, getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";
import { setAdminSession } from "@/lib/admin-session";

// LƯU Ý BẢO MẬT (2026-09-09): route này TRƯỚC ĐÂY không hề kiểm tra mật khẩu
// (chỉ tra tên/email trong admin_profiles rồi cho đăng nhập luôn), cộng thêm
// một "cửa sau" cho phép đăng nhập bằng admin/123456 bất kể admin_profiles có
// gì. Đã viết lại để xác thực thật qua Supabase Auth (email + mật khẩu).
export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json({ ok: false, error: "Vui lòng nhập email và mật khẩu" }, { status: 400 });
    }

    // Xác thực thật bằng Supabase Auth. Dùng anon key (không phải service-role)
    // vì đây chính là API xác thực thật, không phải nơi cần bypass RLS.
    const authClient = getCustomerSupabase();
    const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError || !authData?.session || !authData.user) {
      return NextResponse.json({ ok: false, error: "Email hoặc mật khẩu không đúng" }, { status: 401 });
    }

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
      return NextResponse.json(
        { ok: false, error: "Tài khoản không có quyền truy cập hệ thống bán hàng hoặc đã bị khóa" },
        { status: 403 }
      );
    }

    const userOut = {
      id: profile.id,
      name: profile.name,
      role: profile.role,
      email: authData.user.email || undefined,
    };

    // Vẫn lưu cookie phiên nội bộ (httpOnly) để các route cũ như
    // /api/sale/order/update tiếp tục hoạt động không cần sửa thêm.
    await setAdminSession({ id: userOut.id, name: userOut.name, role: userOut.role });

    return NextResponse.json({
      ok: true,
      user: userOut,
      // Token thật của Supabase Auth, để sale-webapp dùng làm Bearer token khi
      // gọi các API /api/admin/** (thay cho token tĩnh hardcode trước đây).
      accessToken: authData.session.access_token,
      refreshToken: authData.session.refresh_token,
    });
  } catch (error) {
    console.error("Sale auth error:", error);
    return NextResponse.json({ ok: false, error: "Lỗi hệ thống" }, { status: 500 });
  }
}
