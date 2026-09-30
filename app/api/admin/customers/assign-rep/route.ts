import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";
import { canForProfile } from "@/lib/permissions";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: corsHeaders });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) return json({ ok: false, error: auth.error }, 401);

  // Chỉ admin hoặc truong_phong mới có quyền phân công người phụ trách
  if (!canForProfile(auth.profile, "customers.assign_rep")) {
    return json({ ok: false, error: "Chỉ Trưởng phòng, Ban Giám đốc hoặc Quản trị hệ thống mới được phân công nhân viên phụ trách" }, 403);
  }

  const body = await req.json().catch(() => null);
  const customerIds: string[] = Array.isArray(body?.customerIds)
    ? body.customerIds.filter((id: unknown) => typeof id === "string" && id)
    : [];
  const salesRepId = String(body?.salesRepId || "").trim();

  if (!customerIds.length) {
    return json({ ok: false, error: "Chưa chọn khách hàng nào" }, 400);
  }

  if (customerIds.length > 200) {
    return json({ ok: false, error: "Mỗi lần chỉ được phân công tối đa 200 khách hàng" }, 400);
  }

  if (!salesRepId) {
    return json({ ok: false, error: "Chưa chọn nhân viên phụ trách" }, 400);
  }

  const supabase = getCustomerSupabaseAdmin();

  // Kiểm tra salesRepId là nhân viên đang hoạt động trong admin_profiles
  const { data: staff, error: staffErr } = await supabase
    .from("admin_profiles")
    .select("id, name, role, position, is_active, departments(function_group)")
    .eq("id", salesRepId)
    .maybeSingle();

  if (staffErr || !staff) {
    return json({ ok: false, error: "Không tìm thấy nhân viên được chọn" }, 400);
  }

  if (!staff.is_active) {
    return json({ ok: false, error: `Nhân viên "${staff.name}" đang bị khóa tài khoản` }, 400);
  }

  // Chỉ gán cho nhân sự có quyền chăm sóc khách hàng theo đúng phòng ban.
  if (!canForProfile(staff, "customers.edit")) {
    return json(
      {
        ok: false,
        error: `Nhân viên "${staff.name}" không thuộc nhóm được phân công chăm sóc khách hàng`,
      },
      400
    );
  }

  try {
    const { data: updatedRows, error: updateErr } = await supabase
      .from("vip_accounts")
      .update({
        sales_rep_id: salesRepId,
        updated_at: new Date().toISOString(),
      })
      .in("id", customerIds)
      .select("id");

    if (updateErr) throw updateErr;

    const affectedRows = updatedRows?.length || 0;

    console.log(
      `[ASSIGN_REP] ${auth.profile?.name} (${auth.profile?.role || "unknown"}) đã gán ${affectedRows} khách hàng cho ${staff.name} (${staff.id})`
    );

    return json({
      ok: true,
      affectedRows,
      salesRepId: staff.id,
      salesRepName: staff.name,
    });
  } catch (err: any) {
    console.error("POST /api/admin/customers/assign-rep error:", err);
    return json({ ok: false, error: err.message || "Lỗi cập nhật người phụ trách" }, 500);
  }
}
