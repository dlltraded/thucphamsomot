import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { can } from "@/lib/permissions";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";
import { sendPushToCustomer } from "@/lib/push";

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

// Xử lý yêu cầu điều chỉnh/hủy của khách (WP6b, D9: sale đủ thẩm quyền, không cần Trưởng phòng).
// Body: { requestId, action: 'approve' | 'reject' | 'done', note? }
//  - approve + cancel : hủy đơn (hoàn kho nếu đã trừ kho), báo khách
//  - approve + adjust : chỉ đánh dấu đã duyệt, trả orderId để mở "Xử lý đơn hàng" sửa đơn
//  - done             : đóng yêu cầu điều chỉnh sau khi sale chốt lại phiếu mới, báo khách
//  - reject           : bắt buộc note, báo khách
export async function POST(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) return json({ ok: false, error: auth.error }, 401);
  if (!can(auth.profile?.role, "orders.edit")) {
    return json({ ok: false, error: "Bạn không có quyền xử lý yêu cầu của khách" }, 403);
  }

  const body = await req.json().catch(() => null);
  const requestId = String(body?.requestId || "").trim();
  const action = String(body?.action || "");
  const note = String(body?.note || "").trim().slice(0, 500);
  if (!requestId) return json({ ok: false, error: "Thiếu mã yêu cầu" }, 400);
  if (!["approve", "reject", "done"].includes(action)) return json({ ok: false, error: "Hành động không hợp lệ" }, 400);
  if (action === "reject" && note.length < 3) return json({ ok: false, error: "Từ chối phải ghi lý do để báo khách" }, 400);

  const actor = String(auth.profile?.name || auth.profile?.email || "NV Vận hành").trim();
  const supabase = getCustomerSupabaseAdmin();

  try {
    const { data: reqRow, error: reqErr } = await supabase
      .from("order_change_requests")
      .select("*")
      .eq("id", requestId)
      .maybeSingle();
    if (reqErr) throw reqErr;
    if (!reqRow) return json({ ok: false, error: "Không tìm thấy yêu cầu" }, 404);

    const { data: order } = await supabase
      .from("orders")
      .select("id, order_code, status, packing_status, customer_id, sales_rep_id, delivery_date, order_items(product_id, name, quantity, unit)")
      .eq("id", reqRow.order_id)
      .maybeSingle();
    if (!order) return json({ ok: false, error: "Không tìm thấy đơn hàng của yêu cầu" }, 404);

    // sale chỉ xử lý đơn khách mình phụ trách (cùng quy tắc với xác nhận hàng loạt)
    if (auth.profile?.role === "sale" && auth.profile?.id !== "legacy-admin") {
      let rep = order.sales_rep_id as string | null;
      if (!rep && order.customer_id) {
        const { data: c } = await supabase.from("vip_accounts").select("sales_rep_id").eq("id", order.customer_id).maybeSingle();
        rep = c?.sales_rep_id || null;
      }
      if (rep && rep !== auth.profile?.id) {
        return json({ ok: false, error: "Đơn thuộc khách hàng do nhân viên khác phụ trách" }, 403);
      }
    }

    const now = new Date().toISOString();
    const warnings: string[] = [];
    const push = (title: string, bodyText: string) => {
      if (!order.customer_id) return;
      sendPushToCustomer(order.customer_id, { title, body: bodyText, url: `/don-hang-cua-toi/${order.id}`, tag: `order-${order.id}` })
        .catch((e) => console.error("sendPushToCustomer lỗi:", e));
    };
    const close = async (status: "approved" | "rejected" | "done", allowFrom: string[]) => {
      const { data: updated, error } = await supabase
        .from("order_change_requests")
        .update({ status, handled_by: actor, handled_at: now, handled_note: note || null })
        .eq("id", requestId)
        .in("status", allowFrom)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      return !!updated;
    };

    if (action === "reject") {
      if (!(await close("rejected", ["open"]))) return json({ ok: false, error: "Yêu cầu đã được xử lý trước đó" }, 409);
      await supabase.from("order_history").insert({
        order_id: order.id, action: "change_request_rejected", from_status: order.status, to_status: order.status, actor, note, payload: { requestId },
      });
      push(`Đơn ${order.order_code}: yêu cầu chưa được chấp nhận`, note);
      return json({ ok: true, status: "rejected" });
    }

    if (action === "done") {
      if (!(await close("done", ["approved", "open"]))) return json({ ok: false, error: "Yêu cầu đã được xử lý trước đó" }, 409);
      await supabase.from("order_history").insert({
        order_id: order.id, action: "change_request_done", from_status: order.status, to_status: order.status, actor, note, payload: { requestId },
      });
      push(`Đơn ${order.order_code} đã được điều chỉnh`, "Vui lòng xem lại phiếu xác nhận mới trong mục Đơn hàng của tôi.");
      return json({ ok: true, status: "done" });
    }

    // approve
    if (reqRow.type === "adjust") {
      if (!(await close("approved", ["open"]))) return json({ ok: false, error: "Yêu cầu đã được xử lý trước đó" }, 409);
      await supabase.from("order_history").insert({
        order_id: order.id, action: "change_request_approved", from_status: order.status, to_status: order.status, actor, note, payload: { requestId, type: "adjust" },
      });
      return json({ ok: true, status: "approved", orderId: order.id, next: "process_order" });
    }

    // approve + cancel -> hủy đơn
    if (!["pending", "confirmed", "preparing"].includes(order.status)) {
      return json({ ok: false, error: `Đơn đang ở trạng thái "${order.status}", không thể hủy` }, 409);
    }
    if (order.packing_status && order.packing_status !== "not_started") warnings.push("already_packing");

    const { data: canceled, error: cancelErr } = await supabase
      .from("orders")
      .update({
        status: "canceled",
        canceled_at: now,
        cancel_reason: reqRow.message,
        canceled_by: actor,
        updated_at: now,
      })
      .eq("id", order.id)
      .in("status", ["pending", "confirmed", "preparing"])
      .select("id")
      .maybeSingle();
    if (cancelErr) throw cancelErr;
    if (!canceled) return json({ ok: false, error: "Đơn vừa đổi trạng thái, vui lòng tải lại" }, 409);

    // Hoàn kho (idempotent; chỉ tác động mặt hàng theo dõi tồn kho đã bị trừ)
    if (["confirmed", "preparing"].includes(order.status)) {
      const { error: invErr } = await supabase.rpc("sync_order_inventory", { p_order_id: order.id, p_actor: actor, p_mode: "zero" });
      if (invErr) {
        console.error("sync_order_inventory(zero) lỗi:", invErr.message);
        warnings.push("inventory_not_restored");
      }
    }

    await close("approved", ["open"]);
    await supabase.from("order_history").insert({
      order_id: order.id, action: "canceled_by_request", from_status: order.status, to_status: "canceled", actor, note: note || reqRow.message,
      payload: { requestId, warnings },
    });
    push(`Đơn ${order.order_code} đã được hủy`, "Đơn đã được hủy theo yêu cầu của bạn.");

    const summary = (order.order_items || []).map((i: any) => `${i.name} ${Number(i.quantity)}${i.unit ? " " + i.unit : ""}`).join("; ");
    return json({
      ok: true,
      status: "approved",
      canceled: true,
      warnings: warnings.length ? warnings : undefined,
      zaloText: `⚠️ Giao ngày ${order.delivery_date || "?"} — ĐƠN HỦY: ${order.order_code}, gồm: ${summary}. ${actor} báo lúc ${new Date().toLocaleTimeString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" })}.`,
    });
  } catch (err) {
    console.error("POST /api/admin/order-change-requests/resolve lỗi:", err);
    return json({ ok: false, error: err instanceof Error ? err.message : "Không xử lý được yêu cầu" }, 500);
  }
}
