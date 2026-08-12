import { NextRequest, NextResponse } from "next/server";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";

const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "preparing",
  "shipping",
  "completed",
  "canceled",
] as const;
const PAYMENT_STATUSES = ["pending", "cod", "paid", "failed", "refunded"] as const;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Token",
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: corsHeaders });
}

function isAuthorized(req: NextRequest) {
  const expected = process.env.ADMIN_TOKEN?.trim() || "19871988";
  const supplied =
    req.headers.get("x-admin-token") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return Boolean(supplied && supplied === expected);
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return json({ ok: false, error: "Không có quyền quản lý đơn hàng" }, 401);
  }

  try {
    const supabase = getCustomerSupabaseAdmin();
    const status = req.nextUrl.searchParams.get("status");
    let query = supabase
      .from("orders")
      .select("*, order_items(*), order_history(*)")
      .order("created_at", { ascending: false })
      .limit(500);

    if (status && ORDER_STATUSES.includes(status as (typeof ORDER_STATUSES)[number])) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return json({ ok: true, orders: data || [] });
  } catch (error) {
    console.error("Admin orders GET error:", error);
    return json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Không tải được đơn hàng trung tâm",
      },
      500
    );
  }
}

export async function PATCH(req: NextRequest) {
  if (!isAuthorized(req)) {
    return json({ ok: false, error: "Không có quyền cập nhật đơn hàng" }, 401);
  }

  const body = await req.json().catch(() => null);
  const orderId = String(body?.orderId || "").trim();
  const nextStatus = String(body?.status || "").trim();
  const paymentStatus = body?.paymentStatus
    ? String(body.paymentStatus).trim()
    : undefined;
  const note = String(body?.note || "").trim();

  if (!orderId || !ORDER_STATUSES.includes(nextStatus as (typeof ORDER_STATUSES)[number])) {
    return json({ ok: false, error: "Đơn hàng hoặc trạng thái không hợp lệ" }, 400);
  }
  if (
    paymentStatus &&
    !PAYMENT_STATUSES.includes(paymentStatus as (typeof PAYMENT_STATUSES)[number])
  ) {
    return json({ ok: false, error: "Trạng thái thanh toán không hợp lệ" }, 400);
  }

  try {
    const supabase = getCustomerSupabaseAdmin();
    const { data: current, error: currentError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();
    if (currentError || !current) {
      return json({ ok: false, error: "Không tìm thấy đơn hàng" }, 404);
    }

    const now = new Date().toISOString();
    const updates: Record<string, unknown> = { status: nextStatus };
    if (paymentStatus) updates.payment_status = paymentStatus;
    if (nextStatus === "confirmed" && !current.confirmed_at) updates.confirmed_at = now;
    if (nextStatus === "shipping" && !current.shipping_at) updates.shipping_at = now;
    if (nextStatus === "completed" && !current.completed_at) updates.completed_at = now;
    if (nextStatus === "canceled" && !current.canceled_at) updates.canceled_at = now;

    const { data: updated, error: updateError } = await supabase
      .from("orders")
      .update(updates)
      .eq("id", orderId)
      .select("*")
      .single();
    if (updateError) throw updateError;

    const { error: historyError } = await supabase.from("order_history").insert({
      order_id: orderId,
      action: "status_changed",
      from_status: current.status,
      to_status: nextStatus,
      note: note || null,
      actor: "admin",
      payload: paymentStatus ? { paymentStatus } : {},
    });
    if (historyError) throw historyError;

    return json({ ok: true, order: updated });
  } catch (error) {
    console.error("Admin orders PATCH error:", error);
    return json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Không cập nhật được đơn hàng",
      },
      500
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}
