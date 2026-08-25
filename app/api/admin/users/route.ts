import { NextRequest, NextResponse } from "next/server";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";
import { verifyAdminAuth } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok || auth.role !== 'admin') {
    return NextResponse.json({ ok: false, error: auth.error || "Permission denied" }, { status: 403 });
  }

  const supabase = getCustomerSupabaseAdmin();

  const { data, error } = await supabase
    .from("admin_profiles")
    .select("id, name, role, is_active, email")
    .order("name");

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, users: data });
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok || auth.role !== 'admin') {
    return NextResponse.json({ ok: false, error: auth.error || "Permission denied" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { email, password, name, role } = body;

    if (!email || !password || !name || !role) {
      return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
    }

    const supabase = getCustomerSupabaseAdmin();

    // 1. Create User in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      return NextResponse.json({ ok: false, error: authError.message }, { status: 400 });
    }

    const userId = authData.user.id;

    // 2. Insert into admin_profiles
    const { error: profileError } = await supabase
      .from("admin_profiles")
      .insert({
        id: userId,
        name,
        role,
        is_active: true,
        email: email
      });

    if (profileError) {
      // Rollback Auth user if profile fails (optional, but good practice)
      await supabase.auth.admin.deleteUser(userId);
      return NextResponse.json({ ok: false, error: profileError.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, user: { id: userId, name, role, email } });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
