import { NextRequest, NextResponse } from "next/server";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";
import { verifyAdminAuth } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok || auth.profile?.role !== 'admin') {
    return NextResponse.json({ ok: false, error: auth.error || "Permission denied" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { userId, newPassword } = body;

    if (!userId || !newPassword) {
      return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ ok: false, error: "Mật khẩu phải từ 6 ký tự" }, { status: 400 });
    }

    const supabase = getCustomerSupabaseAdmin();

    // 1. Update User Password in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (authError) {
      return NextResponse.json({ ok: false, error: authError.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, message: "Cập nhật mật khẩu thành công" });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
