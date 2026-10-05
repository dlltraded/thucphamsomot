import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { can } from "@/lib/permissions";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";
import {
  reportPickingExceptionCore,
  resolvePickingExceptionCore,
} from "@/lib/picking-service";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, PATCH, OPTIONS",
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
  if (!auth.ok) {
    return json({ ok: false, error: auth.error }, 401);
  }

  if (!can(auth.profile?.role, "picking.exception")) {
    return json({ ok: false, error: "Bạn không có quyền báo cáo ngoại lệ soạn hàng" }, 403);
  }

  const actorId = auth.profile?.id !== "legacy-admin" ? auth.profile?.id : null;
  if (!actorId) {
    return json({ ok: false, error: "Cần tài khoản nhân viên hợp lệ để thao tác" }, 400);
  }

  try {
    const supabase = getCustomerSupabaseAdmin();
    const body = await req.json().catch(() => ({}));
    const {
      taskId,
      taskItemId,
      orderId,
      exceptionType,
      requestedQty,
      actualQty,
      proposedProductId,
      reason,
    } = body;

    if (!taskId || !orderId || !exceptionType || !reason) {
      return json({ ok: false, error: "Thiếu thông tin bắt buộc (taskId, orderId, exceptionType, reason)" }, 400);
    }

    const exception = await reportPickingExceptionCore(supabase, {
      taskId,
      taskItemId,
      orderId,
      exceptionType,
      requestedQty,
      actualQty,
      proposedProductId,
      reason,
      reportedBy: actorId,
    });

    return json({ ok: true, data: exception });
  } catch (error: any) {
    console.error("POST /api/admin/picking/exceptions error:", error);
    return json({ ok: false, error: error.message || "Lỗi báo cáo ngoại lệ" }, 400);
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) {
    return json({ ok: false, error: auth.error }, 401);
  }

  if (!can(auth.profile?.role, "picking.exception_resolve")) {
    return json({ ok: false, error: "Bạn không có quyền duyệt / giải quyết ngoại lệ soạn hàng" }, 403);
  }

  const actorId = auth.profile?.id !== "legacy-admin" ? auth.profile?.id : null;
  if (!actorId) {
    return json({ ok: false, error: "Cần tài khoản nhân viên hợp lệ để thao tác" }, 400);
  }

  try {
    const supabase = getCustomerSupabaseAdmin();
    const body = await req.json().catch(() => ({}));
    const { exceptionId, action, resolutionAction } = body;

    if (!exceptionId || !action) {
      return json({ ok: false, error: "Thiếu exceptionId hoặc action" }, 400);
    }

    const result = await resolvePickingExceptionCore(supabase, {
      exceptionId,
      action,
      resolvedBy: actorId,
      resolutionAction,
    });

    return json({ ok: true, data: result });
  } catch (error: any) {
    console.error("PATCH /api/admin/picking/exceptions error:", error);
    return json({ ok: false, error: error.message || "Lỗi xử lý ngoại lệ" }, 400);
  }
}
