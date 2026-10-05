import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { canForProfile } from "@/lib/permissions";
import {
  operationsAcceptReview,
  operationsRequestRevision,
} from "@/lib/procurement-service";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Token",
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: corsHeaders });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok || !auth.profile) {
    return json({ ok: false, error: auth.error || "Chưa đăng nhập" }, 401);
  }

  if (!canForProfile(auth.profile, "procurement.review_accept")) {
    return json({ ok: false, error: "Không có quyền phê duyệt/yêu cầu kiểm tra lại" }, 403);
  }

  const { id } = await context.params;
  if (!id) {
    return json({ ok: false, error: "Thiếu ID yêu cầu kiểm tra" }, 400);
  }

  try {
    const body = await req.json();
    const action = String(body.action || "").trim();

    if (action === "accept") {
      const note = body.note ? String(body.note).trim() : undefined;
      const updated = await operationsAcceptReview(id, auth.profile.id, note);
      return json({ ok: true, data: updated });
    }

    if (action === "request_revision") {
      const reason = String(body.reason || "").trim();
      if (!reason) {
        return json({ ok: false, error: "Bắt buộc phải nhập lý do yêu cầu kiểm tra lại" }, 400);
      }
      const updated = await operationsRequestRevision(id, auth.profile.id, reason);
      return json({ ok: true, data: updated });
    }

    return json({ ok: false, error: `Hành động không hợp lệ: ${action}` }, 400);
  } catch (err: any) {
    console.error("Lỗi POST operations procurement review:", err);
    return json({ ok: false, error: err.message || "Lỗi hệ thống khi xử lý yêu cầu" }, 400);
  }
}
