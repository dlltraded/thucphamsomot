import { NextRequest, NextResponse } from "next/server";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";
import { verifyAdminAuth } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok || auth.profile?.role !== 'admin') {
    return NextResponse.json({ ok: false, error: auth.error || "Permission denied" }, { status: 403 });
  }

  const supabase = getCustomerSupabaseAdmin();

  const [{ data, error }, { data: departments, error: departmentError }] = await Promise.all([
    supabase
      .from("admin_profiles")
      .select("id, name, role, position, department_id, is_active, email, departments(id, code, name, function_group)")
      .order("name"),
    supabase
      .from("departments")
      .select("id, code, name, function_group, is_active")
      .eq("is_active", true)
      .order("code"),
  ]);

  if (error || departmentError) {
    return NextResponse.json({ ok: false, error: error?.message || departmentError?.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, users: data, departments: departments || [] });
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok || auth.profile?.role !== 'admin') {
    return NextResponse.json({ ok: false, error: auth.error || "Permission denied" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { email, password, name, role, departmentId, position } = body;

    if (!email || !password || !name || !role) {
      return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
    }

    const supabase = getCustomerSupabaseAdmin();

    const normalizedPosition = String(position || "nhan_vien");
    const allowedPositions = ["nhan_vien", "tro_ly", "truong_nhom", "truong_phong", "ban_giam_doc", "quan_tri_he_thong"];
    if (!allowedPositions.includes(normalizedPosition)) {
      return NextResponse.json({ ok: false, error: "Chức vụ không hợp lệ" }, { status: 400 });
    }

    if (role !== "admin" && !departmentId) {
      return NextResponse.json({ ok: false, error: "Vui lòng chọn phòng ban cho nhân viên" }, { status: 400 });
    }
    if (departmentId) {
      const { data: department } = await supabase
        .from("departments")
        .select("id")
        .eq("id", departmentId)
        .eq("is_active", true)
        .maybeSingle();
      if (!department) {
        return NextResponse.json({ ok: false, error: "Phòng ban không tồn tại hoặc đã ngừng hoạt động" }, { status: 400 });
      }
    }

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
        department_id: departmentId || null,
        position: normalizedPosition,
        is_active: true,
        email: email
      });

    if (profileError) {
      // Rollback Auth user if profile fails (optional, but good practice)
      await supabase.auth.admin.deleteUser(userId);
      return NextResponse.json({ ok: false, error: profileError.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, user: { id: userId, name, role, departmentId: departmentId || null, position: normalizedPosition, email } });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok || auth.profile?.role !== "admin") {
    return NextResponse.json({ ok: false, error: auth.error || "Permission denied" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const userId = String(body?.userId || "").trim();
    if (!userId) return NextResponse.json({ ok: false, error: "Thiếu userId" }, { status: 400 });

    const allowedRoles = ["admin", "truong_phong", "sale", "thu_mua", "kho", "ke_toan", "tai_xe"];
    const allowedPositions = ["nhan_vien", "tro_ly", "truong_nhom", "truong_phong", "ban_giam_doc", "quan_tri_he_thong"];
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.role !== undefined) {
      if (!allowedRoles.includes(String(body.role))) return NextResponse.json({ ok: false, error: "Vai trò nghiệp vụ không hợp lệ" }, { status: 400 });
      patch.role = String(body.role);
    }
    if (body.position !== undefined) {
      if (!allowedPositions.includes(String(body.position))) return NextResponse.json({ ok: false, error: "Chức vụ không hợp lệ" }, { status: 400 });
      patch.position = String(body.position);
    }
    if (body.isActive !== undefined) patch.is_active = Boolean(body.isActive);

    const supabase = getCustomerSupabaseAdmin();
    if (body.departmentId !== undefined) {
      if (body.departmentId) {
        const { data: department } = await supabase.from("departments").select("id").eq("id", body.departmentId).eq("is_active", true).maybeSingle();
        if (!department) return NextResponse.json({ ok: false, error: "Phòng ban không tồn tại hoặc đã ngừng hoạt động" }, { status: 400 });
      }
      patch.department_id = body.departmentId || null;
    }

    const { data, error } = await supabase
      .from("admin_profiles")
      .update(patch)
      .eq("id", userId)
      .select("id, name, role, position, department_id, is_active, email")
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, user: data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Không cập nhật được nhân viên" }, { status: 500 });
  }
}
