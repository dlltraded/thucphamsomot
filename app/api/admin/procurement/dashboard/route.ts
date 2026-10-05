import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { can } from "@/lib/permissions";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";

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

  if (!can(auth.profile?.role, "procurement.view") && !can(auth.profile?.role, "picking.view")) {
    return json({ ok: false, error: "Bạn không có quyền xem bảng theo dõi Thu mua / Soạn hàng" }, 403);
  }

  try {
    const supabase = getCustomerSupabaseAdmin();
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    // 1. Lấy tất cả reviews chưa hoàn tất
    const { data: reviews, error: revErr } = await supabase
      .from("procurement_review_requests")
      .select("id, status, assigned_to, due_at, created_at")
      .neq("status", "superseded")
      .neq("status", "canceled");

    if (revErr) throw revErr;

    const reviewMetrics = {
      pending_acceptance: 0,
      in_review: 0,
      responded: 0,
      needs_revision: 0,
      overdue_sla: 0,
      total_active: 0,
    };

    const staffWorkloadMap = new Map<string, { assignedReviews: number; assignedTasks: number }>();

    for (const r of reviews || []) {
      if (r.status === "pending_acceptance") reviewMetrics.pending_acceptance += 1;
      else if (r.status === "in_review") reviewMetrics.in_review += 1;
      else if (r.status === "responded") reviewMetrics.responded += 1;
      else if (r.status === "needs_revision") reviewMetrics.needs_revision += 1;

      if (r.status !== "accepted_by_operations") {
        reviewMetrics.total_active += 1;
      }

      if (r.due_at && new Date(r.due_at) < now && r.status !== "responded" && r.status !== "accepted_by_operations") {
        reviewMetrics.overdue_sla += 1;
      }

      if (r.assigned_to) {
        const current = staffWorkloadMap.get(r.assigned_to) || { assignedReviews: 0, assignedTasks: 0 };
        current.assignedReviews += 1;
        staffWorkloadMap.set(r.assigned_to, current);
      }
    }

    // 2. Lấy tất cả picking tasks chưa xong
    const { data: tasks, error: taskErr } = await supabase
      .from("picking_tasks")
      .select("id, status, assigned_to, created_at, order:orders(delivery_date)")
      .neq("status", "superseded")
      .neq("status", "canceled");

    if (taskErr) throw taskErr;

    const pickingMetrics = {
      released: 0,
      in_progress: 0,
      exception: 0,
      done: 0,
      overdue: 0,
      total_active: 0,
    };

    for (const t of tasks || []) {
      if (t.status === "released") pickingMetrics.released += 1;
      else if (t.status === "accepted" || t.status === "picking") pickingMetrics.in_progress += 1;
      else if (t.status === "exception") pickingMetrics.exception += 1;
      else if (t.status === "completed") pickingMetrics.done += 1;

      if (t.status !== "completed") {
        pickingMetrics.total_active += 1;
      }

      const deliveryDate = (t.order as any)?.delivery_date;
      if (deliveryDate && deliveryDate < todayStr && t.status !== "completed") {
        pickingMetrics.overdue += 1;
      }

      if (t.assigned_to) {
        const current = staffWorkloadMap.get(t.assigned_to) || { assignedReviews: 0, assignedTasks: 0 };
        current.assignedTasks += 1;
        staffWorkloadMap.set(t.assigned_to, current);
      }
    }

    // 3. Lấy thông tin profiles của nhân viên từ admin_profiles
    const staffIds = Array.from(staffWorkloadMap.keys());
    let staffList: any[] = [];
    if (staffIds.length > 0) {
      const { data: profiles } = await supabase
        .from("admin_profiles")
        .select("id, name, role, email")
        .in("id", staffIds);

      staffList = (profiles || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        full_name: p.name,
        role: p.role,
        active_reviews: staffWorkloadMap.get(p.id)?.assignedReviews || 0,
        active_tasks: staffWorkloadMap.get(p.id)?.assignedTasks || 0,
      }));
    }

    return json({
      ok: true,
      review_metrics: reviewMetrics,
      picking_metrics: pickingMetrics,
      staff_workload: staffList,
    });
  } catch (error: any) {
    console.error("GET /api/admin/procurement/dashboard error:", error);
    return json({ ok: false, error: error.message || "Lỗi tải dữ liệu dashboard" }, 500);
  }
}
