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

export async function POST(req: NextRequest) {
  const websiteSession = parseSessionCookieValue(
    req.cookies.get(CUSTOMER_SESSION_COOKIE)?.value
  );
  const token =
    websiteSession?.orderSessionToken ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  let body: { orderId?: string; cancelReason?: string; sessionToken?: string };
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Dữ liệu không hợp lệ" }, 400);
  }

  const effectiveToken = token || body.sessionToken;
  if (!effectiveToken) {
    return json({ ok: false, error: "Vui lòng đăng nhập lại" }, 401);
  }

  try {
    const supabase = getCustomerSupabaseAdmin();
    const { data: session, error: sessionErr } = await supabase
      .from("customer_sessions")
      .select("customer_id, expires_at")
      .eq("token", effectiveToken)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (sessionErr || !session) {
      return json({ ok: false, error: "Phiên đăng nhập đã hết hạn" }, 401);
    }

    const orderId = String(body.orderId || "").trim();
    if (!orderId) {
      return json({ ok: false, error: "Thiếu mã đơn hàng cần hủy" }, 400);
    }

    // 1. Kiểm tra đơn hàng thuộc khách
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, order_code, status, delivery_date, customer_id, customer_name")
      .eq("id", orderId)
      .eq("customer_id", session.customer_id)
      .maybeSingle();

    if (orderErr || !order) {
      return json({ ok: false, error: "Không tìm thấy đơn hàng" }, 404);
    }

    // 2. Chỉ cho khách tự hủy đơn ở trạng thái pending (F2)
    // Đơn confirmed đã trừ kho và hệ thống chưa có hàm hoàn kho, nên khách phải liên hệ Vận hành.
    if (order.status !== "pending") {
      return json(
        {
          ok: false,
          error: "Đơn đã được xác nhận, vui lòng liên hệ Vận hành",
        },
        409
      );
    }

    // 3. Kiểm tra giờ chốt của ngày giao hàng (D4)
    if (order.delivery_date) {
      const config = await fetchOrderCutoffConfig();
      const cutoffInfo = getOrderCutoffInfo(new Date(), order.delivery_date, config);
      if (cutoffInfo.isLate) {
        return json(
          {
            ok: false,
            error: "Đã quá giờ chốt đơn cho ngày giao này. Vui lòng liên hệ Vận hành để được hỗ trợ hủy đơn",
          },
          409
        );
      }
    }

    // 4. Thực hiện hủy đơn: bắt buộc điều kiện status = 'pending' để tránh race condition (F2)
    const cancelReason = String(body.cancelReason || "Khách hàng tự hủy đơn").trim();
    const actor = order.customer_name || "Khách hàng";
    const now = new Date().toISOString();

    const { data: updatedOrder, error: updateErr } = await supabase
      .from("orders")
      .update({
        status: "canceled",
        cancel_reason: cancelReason,
        canceled_by: actor,
        updated_at: now,
      })
      .eq("id", order.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (updateErr) {
      console.error("Lỗi update status cancel order:", updateErr);
      return json({ ok: false, error: "Không thể hủy đơn hàng lúc này: " + updateErr.message }, 500);
    }

    if (!updatedOrder) {
      return json(
        { ok: false, error: "Đơn hàng đã được xử lý hoặc thay đổi trạng thái, vui lòng tải lại trang" },
        409
      );
    }

    // Ghi order_history
    await supabase.from("order_history").insert({
      order_id: order.id,
      action: "customer_canceled",
      from_status: order.status,
      to_status: "canceled",
      actor,
      note: cancelReason,
      payload: { reason: cancelReason },
    });

    return json({
      ok: true,
      message: "Đã hủy đơn hàng thành công",
      orderId: order.id,
      orderCode: order.order_code,
    });
  } catch (error) {
    console.error("POST /api/customer/orders/cancel lỗi:", error);
    return json({ ok: false, error: "Lỗi hệ thống khi hủy đơn hàng" }, 500);
  }
}
