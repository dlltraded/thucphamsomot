import { NextRequest, NextResponse } from "next/server";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";
import { verifyAdminAuth } from "@/lib/admin-auth";

function generateSecureTempPassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const special = "!@#$%";
  const all = upper + lower + digits + special;
  const pass = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
    special[Math.floor(Math.random() * special.length)],
  ];
  for (let i = 0; i < 6; i++) {
    pass.push(all[Math.floor(Math.random() * all.length)]);
  }
  return pass.sort(() => Math.random() - 0.5).join("");
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok || auth.profile?.role !== 'admin') {
    return NextResponse.json({ ok: false, error: auth.error || "Permission denied" }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const userId = String(body?.userId || "").trim();

    if (!userId) {
      return NextResponse.json({ ok: false, error: "Thiếu mã định danh nhân viên (userId)" }, { status: 400 });
    }

    let targetPassword = typeof body?.newPassword === "string" ? body.newPassword.trim() : "";
    if (targetPassword) {
      if (targetPassword.length < 6) {
        return NextResponse.json({ ok: false, error: "Mật khẩu phải từ 6 ký tự trở lên" }, { status: 400 });
      }
    } else {
      targetPassword = generateSecureTempPassword();
    }

    const supabase = getCustomerSupabaseAdmin();

    // Tra thông tin nhân viên để lấy email và họ tên hiển thị
    const { data: profile, error: profileErr } = await supabase
      .from("admin_profiles")
      .select("id, name, email")
      .eq("id", userId)
      .single();

    if (profileErr || !profile) {
      return NextResponse.json({ ok: false, error: "Không tìm thấy tài khoản nhân viên" }, { status: 404 });
    }

    // 1. Cập nhật mật khẩu trong Supabase Auth
    const { error: authError } = await supabase.auth.admin.updateUserById(
      userId,
      { password: targetPassword }
    );

    if (authError) {
      return NextResponse.json({ ok: false, error: `Lỗi cập nhật mật khẩu: ${authError.message}` }, { status: 400 });
    }

    // Trả về payload gồm email và mật khẩu tạm để UI cho phép copy một lần
    // Tuyệt đối không ghi mật khẩu vào console, log, database hoặc audit log
    return NextResponse.json({
      ok: true,
      email: profile.email || "",
      name: profile.name,
      tempPassword: targetPassword,
      message: "Đặt lại mật khẩu tạm thành công"
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || "Lỗi hệ thống khi đặt lại mật khẩu" }, { status: 500 });
  }
}
