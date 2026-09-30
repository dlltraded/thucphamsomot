import { NextRequest, NextResponse } from "next/server";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";
import { verifyAdminAuth } from "@/lib/admin-auth";

function isStrongStaffPassword(password: string): boolean {
  return password.length >= 10
    && /[A-Z]/.test(password)
    && /[a-z]/.test(password)
    && /\d/.test(password)
    && /[^A-Za-z0-9]/.test(password);
}

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
    return NextResponse.json({ ok: false, error: "Không tải được danh sách nhân viên và phòng ban" }, { status: 500 });
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

    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json({ ok: false, error: "Định dạng email không hợp lệ" }, { status: 400 });
    }

    const normalizedName = String(name || "").trim();
    if (!normalizedName) {
      return NextResponse.json({ ok: false, error: "Họ và tên không được để trống" }, { status: 400 });
    }

    if (!password || !isStrongStaffPassword(String(password))) {
      return NextResponse.json({ ok: false, error: "Mật khẩu phải có ít nhất 10 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt" }, { status: 400 });
    }

    const supabase = getCustomerSupabaseAdmin();

    const normalizedPosition = String(position || "nhan_vien");
    const allowedRoles = ["admin", "ban_giam_doc", "truong_phong", "sale", "thu_mua", "kho", "ke_toan", "tai_xe"];
    const allowedPositions = ["nhan_vien", "tro_ly", "truong_nhom", "truong_phong", "ban_giam_doc", "quan_tri_he_thong"];
    if (!allowedRoles.includes(String(role))) {
      return NextResponse.json({ ok: false, error: "Vai trò nghiệp vụ không hợp lệ" }, { status: 400 });
    }
    if (!allowedPositions.includes(normalizedPosition)) {
      return NextResponse.json({ ok: false, error: "Chức vụ không hợp lệ" }, { status: 400 });
    }

    if (role !== "admin" && !departmentId) {
      return NextResponse.json({ ok: false, error: "Vui lòng chọn phòng ban cho nhân viên nghiệp vụ" }, { status: 400 });
    }
    let selectedDepartment: { id: string; function_group: string } | null = null;
    if (departmentId) {
      const { data: department } = await supabase
        .from("departments")
        .select("id, function_group")
        .eq("id", departmentId)
        .eq("is_active", true)
        .maybeSingle();
      if (!department) {
        return NextResponse.json({ ok: false, error: "Phòng ban không tồn tại hoặc đã ngừng hoạt động" }, { status: 400 });
      }
      selectedDepartment = department;
    }
    if (role === "ban_giam_doc" && (normalizedPosition !== "ban_giam_doc" || selectedDepartment?.function_group !== "executive")) {
      return NextResponse.json({ ok: false, error: "Tài khoản Ban Giám đốc phải có chức vụ Ban Giám đốc và thuộc Ban Giám đốc" }, { status: 400 });
    }
    if (normalizedPosition === "ban_giam_doc" && role !== "ban_giam_doc") {
      return NextResponse.json({ ok: false, error: "Chức vụ Ban Giám đốc chỉ áp dụng cho vai trò Ban Giám đốc" }, { status: 400 });
    }
    if (role === "admin" && normalizedPosition !== "quan_tri_he_thong") {
      return NextResponse.json({ ok: false, error: "Tài khoản Quản trị hệ thống phải chọn chức vụ Quản trị hệ thống" }, { status: 400 });
    }
    if (role === "truong_phong" && normalizedPosition !== "truong_phong") {
      return NextResponse.json({ ok: false, error: "Vai trò Trưởng phòng bắt buộc phải chọn chức vụ Trưởng phòng" }, { status: 400 });
    }
    if (normalizedPosition === "truong_phong" && !departmentId) {
      return NextResponse.json({ ok: false, error: "Chức vụ Trưởng phòng bắt buộc phải chọn phòng ban" }, { status: 400 });
    }

    // 1. Create User in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
    });

    if (authError) {
      const msg = authError.message.toLowerCase();
      if (msg.includes("already registered") || msg.includes("already exists")) {
        return NextResponse.json({ ok: false, error: "Email này đã được sử dụng cho một tài khoản khác" }, { status: 409 });
      }
      return NextResponse.json({ ok: false, error: "Không thể tạo tài khoản nhân viên. Vui lòng kiểm tra thông tin và thử lại" }, { status: 400 });
    }

    const userId = authData.user.id;

    // 2. Insert into admin_profiles
    const { error: profileError } = await supabase
      .from("admin_profiles")
      .insert({
        id: userId,
        name: normalizedName,
        role,
        department_id: departmentId || null,
        position: normalizedPosition,
        is_active: true,
        email: normalizedEmail,
      });

    if (profileError) {
      // Rollback Auth user if profile fails
      await supabase.auth.admin.deleteUser(userId);
      return NextResponse.json({ ok: false, error: "Không thể lưu hồ sơ nhân viên" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, user: { id: userId, name: normalizedName, role, departmentId: departmentId || null, position: normalizedPosition, email: normalizedEmail } });
  } catch {
    return NextResponse.json({ ok: false, error: "Lỗi hệ thống khi tạo nhân viên" }, { status: 500 });
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
    if (!userId) return NextResponse.json({ ok: false, error: "Thiếu mã định danh nhân viên (userId)" }, { status: 400 });

    // Không cho Admin tự khóa chính tài khoản đang đăng nhập
    if (auth.profile?.id === userId && body.isActive === false) {
      return NextResponse.json({ ok: false, error: "Không thể tự khóa tài khoản của chính mình" }, { status: 400 });
    }
    // Không cho Admin tự hạ quyền chính mình
    if (auth.profile?.id === userId && body.role !== undefined && body.role !== "admin") {
      return NextResponse.json({ ok: false, error: "Không thể tự hạ quyền Quản trị hệ thống của chính mình" }, { status: 400 });
    }

    const allowedRoles = ["admin", "ban_giam_doc", "truong_phong", "sale", "thu_mua", "kho", "ke_toan", "tai_xe"];
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
    const { data: currentUser, error: currentUserError } = await supabase
      .from("admin_profiles")
      .select("id, role, position, department_id, is_active")
      .eq("id", userId)
      .single();
    if (currentUserError || !currentUser) {
      return NextResponse.json({ ok: false, error: "Không tìm thấy tài khoản nhân viên" }, { status: 404 });
    }

    // Không cho hạ quyền hoặc khóa Admin hoạt động cuối cùng
    const isDeactivating = body.isActive === false && currentUser.is_active;
    const isDemotingAdmin = currentUser.role === "admin" && body.role !== undefined && body.role !== "admin";

    if (currentUser.role === "admin" && (isDeactivating || isDemotingAdmin)) {
      const { count: activeAdminCount, error: countErr } = await supabase
        .from("admin_profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin")
        .eq("is_active", true);

      if (countErr) {
        return NextResponse.json({ ok: false, error: "Không kiểm tra được số tài khoản Quản trị đang hoạt động" }, { status: 503 });
      }
      if ((activeAdminCount || 0) <= 1) {
        return NextResponse.json({
          ok: false,
          error: "Không thể khóa hoặc hạ quyền Quản trị hệ thống đang hoạt động cuối cùng của hệ thống"
        }, { status: 400 });
      }
    }

    let selectedDepartmentGroup: string | null = null;
    const nextDepartmentId = body.departmentId !== undefined ? body.departmentId || null : currentUser.department_id;
    if (body.departmentId !== undefined) {
      if (body.departmentId) {
        const { data: department } = await supabase.from("departments").select("id, function_group").eq("id", body.departmentId).eq("is_active", true).maybeSingle();
        if (!department) return NextResponse.json({ ok: false, error: "Phòng ban không tồn tại hoặc đã ngừng hoạt động" }, { status: 400 });
        selectedDepartmentGroup = department.function_group;
      }
      patch.department_id = body.departmentId || null;
    } else if (nextDepartmentId) {
      const { data: department } = await supabase.from("departments").select("function_group").eq("id", nextDepartmentId).eq("is_active", true).maybeSingle();
      selectedDepartmentGroup = department?.function_group || null;
    }

    const nextRole = String(body.role ?? currentUser.role);
    const nextPosition = String(body.position ?? currentUser.position);
    if (nextRole !== "admin" && !nextDepartmentId) {
      return NextResponse.json({ ok: false, error: "Nhân viên nghiệp vụ bắt buộc phải có phòng ban" }, { status: 400 });
    }
    if (nextRole === "ban_giam_doc" && (nextPosition !== "ban_giam_doc" || selectedDepartmentGroup !== "executive")) {
      return NextResponse.json({ ok: false, error: "Tài khoản Ban Giám đốc phải có chức vụ Ban Giám đốc và thuộc Ban Giám đốc" }, { status: 400 });
    }
    if (nextPosition === "ban_giam_doc" && nextRole !== "ban_giam_doc") {
      return NextResponse.json({ ok: false, error: "Chức vụ Ban Giám đốc chỉ áp dụng cho vai trò Ban Giám đốc" }, { status: 400 });
    }
    if (nextRole === "admin" && nextPosition !== "quan_tri_he_thong") {
      return NextResponse.json({ ok: false, error: "Tài khoản Quản trị hệ thống phải chọn chức vụ Quản trị hệ thống" }, { status: 400 });
    }
    if (nextRole === "truong_phong" && nextPosition !== "truong_phong") {
      return NextResponse.json({ ok: false, error: "Vai trò Trưởng phòng bắt buộc phải chọn chức vụ Trưởng phòng" }, { status: 400 });
    }
    if (nextPosition === "truong_phong" && !nextDepartmentId) {
      return NextResponse.json({ ok: false, error: "Chức vụ Trưởng phòng bắt buộc phải chọn phòng ban" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("admin_profiles")
      .update(patch)
      .eq("id", userId)
      .select("id, name, role, position, department_id, is_active, email")
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, user: data });
  } catch {
    return NextResponse.json({ ok: false, error: "Không cập nhật được nhân viên" }, { status: 500 });
  }
}
