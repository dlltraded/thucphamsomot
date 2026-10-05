import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { canForProfile } from "@/lib/permissions";
import { updateInvoiceDueDate } from "@/lib/receivables-db";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Idempotency-Key, X-Admin-Token",
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: corsHeaders });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) return json({ ok: false, error: auth.error }, 401);

  // Chỉ finance.edit có quyền điều chỉnh hạn nợ
  if (!canForProfile(auth.profile, "finance.edit")) {
    return json({ ok: false, error: "Chỉ Kế toán hoặc Ban Giám đốc có quyền điều chỉnh hạn nợ" }, 403);
  }

  const { id: orderId } = await params;
  if (!orderId) return json({ ok: false, error: "Thiếu ID hóa đơn" }, 400);

  const body = await req.json().catch(() => null);
  const dueDateStr = String(body?.dueDate || "").trim();

  if (!dueDateStr || isNaN(new Date(dueDateStr).getTime())) {
    return json({ ok: false, error: "Ngày đến hạn không hợp lệ" }, 400);
  }

  try {
    const actor = auth.profile?.name || auth.profile?.email || "ke_toan";
    const result = await updateInvoiceDueDate(orderId, new Date(dueDateStr).toISOString(), actor);

    return json({
      ok: true,
      message: "Cập nhật ngày đến hạn thành công",
      result,
    });
  } catch (error: any) {
    console.error("PATCH /api/admin/receivables/invoices/[id]/due-date lỗi:", error);
    return json({ ok: false, error: error?.message || "Không thể cập nhật ngày đến hạn" }, 400);
  }
}
