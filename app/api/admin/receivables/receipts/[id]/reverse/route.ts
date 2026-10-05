import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { canForProfile } from "@/lib/permissions";
import { reverseCustomerReceipt } from "@/lib/receivables-db";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Idempotency-Key, X-Admin-Token",
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: corsHeaders });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) return json({ ok: false, error: auth.error }, 401);

  // Chỉ finance.edit có quyền lập phiếu đảo
  if (!canForProfile(auth.profile, "finance.edit")) {
    return json({ ok: false, error: "Chỉ Kế toán hoặc Ban Giám đốc có quyền lập phiếu đảo" }, 403);
  }

  const { id: receiptId } = await params;
  if (!receiptId) return json({ ok: false, error: "Thiếu ID phiếu thu" }, 400);

  const body = await req.json().catch(() => null);
  const reason = String(body?.reason || "").trim();

  if (reason.length < 3) {
    return json({ ok: false, error: "Bắt buộc phải nhập lý do lập phiếu đảo (tối thiểu 3 ký tự)" }, 400);
  }

  try {
    const actor = auth.profile?.name || auth.profile?.email || "ke_toan";
    const result = await reverseCustomerReceipt({
      receiptId,
      reason,
      actor,
    });

    return json({
      ok: true,
      message: "Lập phiếu đảo thành công, đã hoàn lại công nợ chính xác",
      result,
    });
  } catch (error: any) {
    console.error("POST /api/admin/receivables/receipts/[id]/reverse lỗi:", error);
    return json({ ok: false, error: error?.message || "Không thể lập phiếu đảo" }, 400);
  }
}
