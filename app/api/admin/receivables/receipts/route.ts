import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { canForProfile } from "@/lib/permissions";
import { recordCustomerReceipt } from "@/lib/receivables-db";

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

export async function POST(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) return json({ ok: false, error: auth.error }, 401);

  // Chỉ finance.edit (Kế toán / BGĐ / Admin) được ghi nhận thu
  if (!canForProfile(auth.profile, "finance.edit")) {
    return json({ ok: false, error: "Chỉ Kế toán hoặc Ban Giám đốc có quyền ghi nhận thanh toán" }, 403);
  }

  const body = await req.json().catch(() => null);
  const customerId = String(body?.customerId || "").trim();
  const amount = Number(body?.amount);
  const paymentMethod = String(body?.paymentMethod || "").trim();
  const referenceCode = String(body?.referenceCode || "").trim();
  const note = String(body?.note || "").trim();
  const receiptDate = body?.receiptDate ? String(body.receiptDate).trim() : undefined;
  const idempotencyKey = String(body?.idempotencyKey || req.headers.get("Idempotency-Key") || "").trim() || undefined;
  const allocations = Array.isArray(body?.allocations) ? body.allocations : [];

  if (!customerId) {
    return json({ ok: false, error: "Thiếu ID khách hàng" }, 400);
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return json({ ok: false, error: "Số tiền thu phải lớn hơn 0" }, 400);
  }

  if (!["bank_transfer", "cash"].includes(paymentMethod)) {
    return json({ ok: false, error: "Phương thức thu phải là chuyển khoản (bank_transfer) hoặc tiền mặt (cash)" }, 400);
  }

  try {
    const actor = auth.profile?.name || auth.profile?.email || "ke_toan";
    const result = await recordCustomerReceipt({
      customerId,
      amount,
      paymentMethod: paymentMethod as 'bank_transfer' | 'cash',
      referenceCode,
      note,
      receiptDate,
      idempotencyKey,
      allocations,
      createdBy: actor,
    });

    return json({
      ok: true,
      message: "Ghi nhận phiếu thu thành công",
      receipt: result,
    });
  } catch (error: any) {
    console.error("POST /api/admin/receivables/receipts lỗi:", error);
    const msg = error?.message || "Không thể ghi nhận phiếu thu";
    const status = msg.includes("Xung đột Idempotency Key") ? 409 : 400;
    return json({ ok: false, error: msg }, status);
  }
}
