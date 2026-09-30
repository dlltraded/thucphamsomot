import { NextRequest, NextResponse } from "next/server";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { randomInt } from "node:crypto";

function generateSecureTempPassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const special = "!@#$%";
  const all = upper + lower + digits + special;
  const pass = [
    upper[randomInt(upper.length)],
    lower[randomInt(lower.length)],
    digits[randomInt(digits.length)],
    special[randomInt(special.length)],
  ];
  for (let i = 0; i < 6; i++) {
    pass.push(all[randomInt(all.length)]);
  }
  for (let i = pass.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [pass[i], pass[j]] = [pass[j], pass[i]];
  }
  return pass.join("");
}

function isStrongStaffPassword(password: string): boolean {
  return password.length >= 10
    && /[A-Z]/.test(password)
    && /[a-z]/.test(password)
    && /\d/.test(password)
    && /[^A-Za-z0-9]/.test(password);
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
      if (!isStrongStaffPassword(targetPassword)) {
        return NextResponse.json({ ok: false, error: "Mật khẩu phải có ít nhất 10 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt" }, { status: 400 });
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
      return NextResponse.json({ ok: false, error: "Không thể đặt lại mật khẩu cho tài khoản này" }, { status: 400 });
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
  } catch {
    return NextResponse.json({ ok: false, error: "Lỗi hệ thống khi đặt lại mật khẩu" }, { status: 500 });
  }
}
