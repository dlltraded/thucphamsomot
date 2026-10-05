import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { canForProfile } from "@/lib/permissions";
import {
  getProcurementReviewDetail,
  claimProcurementReview,
  saveProcurementReviewDraft,
  submitProcurementReview,
} from "@/lib/procurement-service";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Token",
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: corsHeaders });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok || !auth.profile) {
    return json({ ok: false, error: auth.error || "Chưa đăng nhập" }, 401);
  }

  if (!canForProfile(auth.profile, "procurement.review_view")) {
    return json({ ok: false, error: "Không có quyền xem chi tiết kiểm tra hàng" }, 403);
  }

  const { id } = await context.params;
  if (!id) {
    return json({ ok: false, error: "Thiếu ID yêu cầu kiểm tra" }, 400);
  }

  try {
    const detail = await getProcurementReviewDetail(id);
    if (!detail) {
      return json({ ok: false, error: "Không tìm thấy yêu cầu kiểm tra hàng" }, 404);
    }
    return json({ ok: true, data: detail });
  } catch (err: any) {
    console.error("Lỗi getProcurementReviewDetail:", err);
    return json({ ok: false, error: err.message || "Lỗi hệ thống khi tải chi tiết" }, 500);
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok || !auth.profile) {
    return json({ ok: false, error: auth.error || "Chưa đăng nhập" }, 401);
  }

  const { id } = await context.params;
  if (!id) {
    return json({ ok: false, error: "Thiếu ID yêu cầu kiểm tra" }, 400);
  }

  try {
    const body = await req.json();
    const action = String(body.action || "").trim();

    if (action === "claim") {
      if (!canForProfile(auth.profile, "procurement.review_claim")) {
        return json({ ok: false, error: "Không có quyền tiếp nhận yêu cầu kiểm tra" }, 403);
      }
      const data = await claimProcurementReview(id, auth.profile.id);
      return json({ ok: true, data });
    }

    if (action === "save_draft") {
      if (!canForProfile(auth.profile, "procurement.review_submit")) {
        return json({ ok: false, error: "Không có quyền cập nhật kết quả kiểm tra" }, 403);
      }
      const items = Array.isArray(body.items) ? body.items : [];
      const result = await saveProcurementReviewDraft(id, auth.profile.id, items);
      return json({ ok: true, ...result });
    }

    if (action === "submit") {
      if (!canForProfile(auth.profile, "procurement.review_submit")) {
        return json({ ok: false, error: "Không có quyền gửi kết quả kiểm tra" }, 403);
      }
      const items = Array.isArray(body.items) ? body.items : [];
      const note = body.note ? String(body.note).trim() : undefined;
      const updated = await submitProcurementReview(id, auth.profile.id, items, note);
      return json({ ok: true, data: updated });
    }

    return json({ ok: false, error: `Hành động không hợp lệ: ${action}` }, 400);
  } catch (err: any) {
    console.error("Lỗi PATCH procurement review:", err);
    return json({ ok: false, error: err.message || "Lỗi hệ thống khi xử lý yêu cầu" }, 400);
  }
}
