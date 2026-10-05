import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { can } from "@/lib/permissions";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";
import {
  getPickingTaskDetail,
  claimPickingTaskCore,
  updatePickingItems,
  completePickingTaskCore,
} from "@/lib/picking-service";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: corsHeaders });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) {
    return json({ ok: false, error: auth.error }, 401);
  }

  if (!can(auth.profile?.role, "picking.view")) {
    return json({ ok: false, error: "Bạn không có quyền xem tác vụ Soạn hàng" }, 403);
  }

  try {
    const { id } = await params;
    const supabase = getCustomerSupabaseAdmin();
    const task = await getPickingTaskDetail(supabase, id);

    return json({ ok: true, data: task });
  } catch (error: any) {
    console.error("GET /api/admin/picking/tasks/[id] error:", error);
    return json({ ok: false, error: error.message || "Lỗi tải chi tiết tác vụ soạn hàng" }, 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) {
    return json({ ok: false, error: auth.error }, 401);
  }

  const { id } = await params;
  const actorId = auth.profile?.id !== "legacy-admin" ? auth.profile?.id : null;
  const actorName = auth.profile?.name || "Nhân viên";

  if (!actorId) {
    return json({ ok: false, error: "Cần tài khoản nhân viên hợp lệ để thao tác" }, 400);
  }

  try {
    const supabase = getCustomerSupabaseAdmin();
    const body = await req.json().catch(() => ({}));
    const { action } = body;

    if (action === "claim") {
      if (!can(auth.profile?.role, "picking.claim")) {
        return json({ ok: false, error: "Bạn không có quyền nhận tác vụ Soạn hàng" }, 403);
      }

      await claimPickingTaskCore(supabase, id, actorId);
      const updated = await getPickingTaskDetail(supabase, id);
      return json({ ok: true, data: updated });
    }

    if (action === "update_items") {
      if (!can(auth.profile?.role, "picking.update")) {
        return json({ ok: false, error: "Bạn không có quyền cập nhật số lượng soạn hàng" }, 403);
      }

      const items = Array.isArray(body.items) ? body.items : [];
      await updatePickingItems(supabase, id, actorId, items);
      const updated = await getPickingTaskDetail(supabase, id);
      return json({ ok: true, data: updated });
    }

    if (action === "complete") {
      if (!can(auth.profile?.role, "picking.update")) {
        return json({ ok: false, error: "Bạn không có quyền hoàn tất soạn hàng" }, 403);
      }

      await completePickingTaskCore(supabase, id, actorId, actorName);
      const updated = await getPickingTaskDetail(supabase, id);
      return json({ ok: true, data: updated });
    }

    return json({ ok: false, error: "Hành động không hợp lệ" }, 400);
  } catch (error: any) {
    console.error("PATCH /api/admin/picking/tasks/[id] error:", error);
    return json({ ok: false, error: error.message || "Lỗi cập nhật tác vụ soạn hàng" }, 400);
  }
}
