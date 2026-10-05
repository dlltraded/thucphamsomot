import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { can } from "@/lib/permissions";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";
import { listPickingTasks } from "@/lib/picking-service";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: corsHeaders });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) {
    return json({ ok: false, error: auth.error }, 401);
  }

  if (!can(auth.profile?.role, "picking.view")) {
    return json({ ok: false, error: "Bạn không có quyền xem tác vụ Soạn hàng" }, 403);
  }

  try {
    const supabase = getCustomerSupabaseAdmin();
    const { searchParams } = new URL(req.url);

    const status = searchParams.get("status") || undefined;
    const deliveryDate = searchParams.get("date") || undefined;
    const search = searchParams.get("search") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const result = await listPickingTasks(supabase, {
      status,
      deliveryDate,
      search,
      page,
      limit,
    });

    return json({
      ok: true,
      data: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  } catch (error: any) {
    console.error("GET /api/admin/picking/tasks error:", error);
    return json({ ok: false, error: error.message || "Lỗi tải danh sách tác vụ soạn hàng" }, 500);
  }
}
