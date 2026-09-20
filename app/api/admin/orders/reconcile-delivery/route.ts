import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { can } from "@/lib/permissions";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";
import { reconcileDelivery } from "@/lib/order-reconcile";

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

// Xác nhận thực giao → tính lại tiền (xem lib/order-reconcile.ts). Body:
// { orderId, full?: true }                       — giao đủ 100% số đã chốt (1 chạm)
// { orderId, items: [{itemId, quantityDelivered}], note? } — nhập số thực giao từng dòng
export async function POST(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) return json({ ok: false, error: auth.error }, 401);
  if (!can(auth.profile?.role, "orders.edit")) {
    return json({ ok: false, error: "Bạn không có quyền xác nhận thực giao" }, 403);
  }

  const body = await req.json().catch(() => null);
  const orderId = String(body?.orderId || "").trim();
  if (!orderId) return json({ ok: false, error: "Thiếu mã đơn hàng" }, 400);

  const full = body?.full === true;
  const rows = Array.isArray(body?.items)
    ? body.items.map((r: Record<string, unknown>) => ({
        itemId: String(r?.itemId || "").trim(),
        quantityDelivered: Number(r?.quantityDelivered),
      }))
    : null;
  if (!full && (!rows || !rows.length)) {
    return json({ ok: false, error: "Thiếu số lượng thực giao (hoặc chọn giao đủ 100%)" }, 400);
  }

  try {
    const result = await reconcileDelivery(getCustomerSupabaseAdmin(), {
      orderId,
      rows,
      full,
      actor: String(auth.profile?.name || auth.profile?.email || "NV Vận hành").trim(),
      note: typeof body?.note === "string" ? body.note.slice(0, 500) : undefined,
    });
    return json({
      ok: true,
      order: result.order,
      changes: result.changes,
      preTotal: result.preTotal,
      newTotal: result.newTotal,
      warnings: result.warnings.length ? result.warnings : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Không xác nhận được thực giao";
    const missingColumn = /delivery_confirmed_at|confirmed_quantity|sync_order_inventory|pre_delivery_grand_total/.test(message);
    console.error("POST /api/admin/orders/reconcile-delivery lỗi:", err);
    return json(
      { ok: false, error: missingColumn ? "Chưa chạy migration 20260920g trên Supabase — không thể xác nhận thực giao" : message },
      missingColumn ? 503 : 400
    );
  }
}
