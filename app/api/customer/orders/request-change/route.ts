import { NextRequest, NextResponse } from "next/server";
import { CUSTOMER_SESSION_COOKIE, parseSessionCookieValue } from "@/lib/customer-session";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";
import { fetchOrderCutoffConfig, getOrderCutoffInfo } from "@/lib/order-cutoff";

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

// Khách gửi YÊU CẦU điều chỉnh / hủy đơn (không tự sửa). Nhân viên duyệt ở
// /api/admin/order-change-requests/resolve. Quyết định D9 (2026-09-20).
export async function POST(req: NextRequest) {
  const websiteSession = parseSessionCookieValue(req.cookies.get(CUSTOMER_SESSION_COOKIE)?.value);
  const token =
    websiteSession?.orderSessionToken ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  let body: { orderId?: string; type?: string; message?: string; sessionToken?: string };
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Dữ liệu không hợp lệ" }, 400);
  }
  const effectiveToken = token || body.sessionToken;
  if (!effectiveToken) return json({ ok: false, error: "Vui lòng đăng nhập lại" }, 401);

  const type = body.type === "cancel" ? "cancel" : body.type === "adjust" ? "adjust" : null;
  const message = String(body.message || "").trim().slice(0, 500);
  const orderId = String(body.orderId || "").trim();
  if (!type) return json({ ok: false, error: "Loại yêu cầu không hợp lệ" }, 400);
  if (!orderId) return json({ ok: false, error: "Thiếu mã đơn hàng" }, 400);
  if (message.length < 3) return json({ ok: false, error: "Vui lòng nhập nội dung/lý do yêu cầu" }, 400);

  try {
    const supabase = getCustomerSupabaseAdmin();
    const { data: session } = await supabase
      .from("customer_sessions")
      .select("customer_id")
      .eq("token", effectiveToken)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (!session) return json({ ok: false, error: "Phiên đăng nhập đã hết hạn" }, 401);

    const { data: order } = await supabase
      .from("orders")
      .select("id, order_code, status, packing_status, delivery_date, customer_id")
      .eq("id", orderId)
      .eq("customer_id", session.customer_id)
      .maybeSingle();
    if (!order) return json({ ok: false, error: "Không tìm thấy đơn hàng" }, 404);

    if (!["pending", "confirmed", "preparing"].includes(order.status)) {
      return json({ ok: false, error: "Đơn đang giao/đã hoàn thành/đã hủy nên không gửi được yêu cầu — vui lòng liên hệ Vận hành" }, 409);
    }

    let afterCutoff = false;
    if (order.delivery_date) {
      const cfg = await fetchOrderCutoffConfig();
      afterCutoff = getOrderCutoffInfo(new Date(), order.delivery_date, cfg).isLate;
    }

    const { data: created, error } = await supabase
      .from("order_change_requests")
      .insert({
        order_id: order.id,
        customer_id: session.customer_id,
        type,
        message,
        order_status_at_request: order.status,
        packing_status_at_request: order.packing_status ?? null,
        after_cutoff: afterCutoff,
      })
      .select("id, type, status, requested_at")
      .single();

    if (error) {
      // 23505 = vi phạm unique (đã có yêu cầu đang mở cho đơn này)
      if ((error as { code?: string }).code === "23505") {
        return json({ ok: false, error: "Đơn này đã có yêu cầu đang chờ xử lý" }, 409);
      }
      if (/order_change_requests/.test(error.message || "")) {
        return json({ ok: false, error: "Tính năng yêu cầu điều chỉnh chưa sẵn sàng — vui lòng liên hệ Vận hành" }, 503);
      }
      throw error;
    }

    await supabase.from("order_history").insert({
      order_id: order.id,
      action: "change_requested",
      from_status: order.status,
      to_status: order.status,
      actor: "Khách hàng",
      note: message,
      payload: { requestId: created.id, type, afterCutoff },
    });

    return json({ ok: true, request: created, orderCode: order.order_code, afterCutoff });
  } catch (err) {
    console.error("POST /api/customer/orders/request-change lỗi:", err);
    return json({ ok: false, error: "Không gửi được yêu cầu, vui lòng thử lại" }, 500);
  }
}
