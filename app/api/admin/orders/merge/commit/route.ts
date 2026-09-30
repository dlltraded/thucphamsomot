import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { canForProfile } from "@/lib/permissions";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";
import { verifyMergePreviewToken } from "@/lib/order-merge-token";

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

export async function POST(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) return json({ ok: false, error: auth.error }, 401);
  if (!canForProfile(auth.profile, "orders.merge")) {
    return json({ ok: false, error: "Bạn không có quyền gộp đơn hàng" }, 403);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Dữ liệu gửi lên không hợp lệ" }, 400);
  }

  const orderIds = Array.isArray(body.orderIds)
    ? [...new Set(body.orderIds.map(String).map((id) => id.trim()).filter(Boolean))]
    : [];
  const previewToken = typeof body.previewToken === "string" ? body.previewToken : "";
  const idempotencyKey = typeof body.idempotencyKey === "string" ? body.idempotencyKey.trim() : "";

  if (orderIds.length < 2) return json({ ok: false, error: "Cần chọn ít nhất 2 đơn hàng" }, 400);
  if (!idempotencyKey) {
    return json({ ok: false, error: "Thiếu mã chống tạo trùng. Vui lòng mở lại màn hình gộp đơn." }, 400);
  }

  const verified = verifyMergePreviewToken(previewToken);
  if (!verified.valid || !verified.data) {
    return json({ ok: false, error: verified.error || "Bản xem trước đã hết hạn" }, 400);
  }
  const tokenIds = [...verified.data.orderIds].sort();
  if (JSON.stringify([...orderIds].sort()) !== JSON.stringify(tokenIds)) {
    return json({ ok: false, error: "Danh sách đơn không khớp bản xem trước" }, 409);
  }

  const shippingAmount = typeof body.shippingAmount === "number" && Number.isFinite(body.shippingAmount)
    ? Math.max(0, body.shippingAmount)
    : null;

  try {
    const supabase = getCustomerSupabaseAdmin();
    const actorId = auth.profile?.id && auth.profile.id !== "legacy-admin" ? auth.profile.id : null;
    const { data, error } = await supabase.rpc("admin_merge_orders_atomic", {
      p_order_ids: orderIds,
      p_idempotency_key: idempotencyKey.slice(0, 100),
      p_shipping_amount: shippingAmount,
      p_note: typeof body.note === "string" ? body.note.trim() || null : null,
      p_reason: typeof body.reason === "string" ? body.reason.trim() || null : null,
      p_actor_id: actorId,
      p_actor_name: auth.profile?.name || auth.profile?.email || "admin",
      p_allow_locked: canForProfile(auth.profile, "orders.merge_locked"),
    });
    if (error) {
      const migrationMissing = /admin_merge_orders_atomic|schema cache|function/i.test(error.message || "");
      return json({
        ok: false,
        error: migrationMissing
          ? "Chưa cài bản nâng cấp gộp đơn an toàn trên database"
          : error.message || "Không thể gộp đơn hàng",
      }, migrationMissing ? 503 : 409);
    }
    return json(data || { ok: true });
  } catch (error) {
    console.error("POST /api/admin/orders/merge/commit lỗi:", error);
    return json({ ok: false, error: "Không thể hoàn tất gộp đơn" }, 500);
  }
}
