import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";

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

const ACTIONS = ["claim", "complete", "release"] as const;
const OVERRIDE_ROLES = new Set(["admin", "truong_phong"]);

// Luồng "nhận soạn" đơn hàng (mục brief 2026-09-11) — claim: 1 nhân viên
// nhận 1/nhiều đơn "chưa soạn" để soạn, gán packed_by = chính mình, khóa
// không cho người khác cũng nhận đơn đó cùng lúc. complete: đánh dấu soạn
// xong (chỉ người đã nhận, hoặc admin/truong_phong). release: trả đơn về
// "chưa soạn" nếu cần đổi người (chỉ người đã nhận, hoặc admin/truong_phong
// — theo đúng lựa chọn "chỉ Admin/Trưởng phòng được giành lại" khi cần).
export async function POST(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) return json({ ok: false, error: auth.error }, 401);

  const body = await req.json().catch(() => null);
  const orderIds: string[] = Array.isArray(body?.orderIds) ? body.orderIds.filter((id: unknown) => typeof id === "string" && id) : [];
  const action = String(body?.action || "");
  if (!orderIds.length) return json({ ok: false, error: "Chưa chọn đơn hàng nào" }, 400);
  if (!ACTIONS.includes(action as (typeof ACTIONS)[number])) return json({ ok: false, error: "Hành động không hợp lệ" }, 400);

  const actorId = auth.profile?.id !== "legacy-admin" ? auth.profile?.id ?? null : null;
  const actorName = auth.profile?.name || "Nhân viên";
  const canOverride = OVERRIDE_ROLES.has(auth.profile?.role || "");

  try {
    const supabase = getCustomerSupabaseAdmin();
    const { data: orders, error: fetchError } = await supabase
      .from("orders")
      .select("id, order_code, packing_status, packed_by")
      .in("id", orderIds);
    if (fetchError) throw fetchError;

    const ok: string[] = [];
    const skipped: { orderCode: string; reason: string }[] = [];
    const now = new Date().toISOString();

    for (const order of orders || []) {
      if (action === "claim") {
        if (order.packing_status === "not_started" || (order.packing_status === "in_progress" && order.packed_by === actorId)) {
          ok.push(order.id);
        } else {
          skipped.push({ orderCode: order.order_code, reason: order.packing_status === "done" ? "Đã soạn xong" : "Đang được người khác soạn" });
        }
      } else {
        // complete / release: phải là người đã nhận, hoặc admin/truong_phong
        const isOwner = order.packed_by === actorId;
        if (order.packing_status === "in_progress" && (isOwner || canOverride)) {
          ok.push(order.id);
        } else if (order.packing_status !== "in_progress") {
          skipped.push({ orderCode: order.order_code, reason: "Đơn chưa ở trạng thái đang soạn" });
        } else {
          skipped.push({ orderCode: order.order_code, reason: "Chỉ người đã nhận soạn hoặc Admin/Trưởng phòng được thao tác" });
        }
      }
    }

    if (ok.length) {
      const updates =
        action === "claim"
          ? { packing_status: "in_progress", packed_by: actorId, packing_started_at: now }
          : action === "complete"
            ? { packing_status: "done", packed_at: now }
            : { packing_status: "not_started", packed_by: null, packing_started_at: null };
      const { error: updateError } = await supabase.from("orders").update(updates).in("id", ok);
      if (updateError) throw updateError;

      const historyAction = action === "claim" ? "packing_claimed" : action === "complete" ? "packing_completed" : "packing_released";
      const historyNote = action === "claim" ? `${actorName} nhận soạn` : action === "complete" ? `${actorName} soạn xong` : `${actorName} trả đơn (hủy nhận soạn)`;
      await supabase.from("order_history").insert(
        ok.map((orderId) => ({
          order_id: orderId,
          action: historyAction,
          note: historyNote,
          actor: actorName,
          payload: {},
        }))
      );
    }

    return json({ ok: true, updated: ok.length, skipped });
  } catch (error) {
    console.error("POST /api/admin/orders/packing lỗi:", error);
    return json({ ok: false, error: "Không cập nhật được trạng thái soạn hàng" }, 500);
  }
}
