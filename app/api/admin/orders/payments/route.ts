import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: corsHeaders });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// Thực tế TPS1 chỉ có 2 hình thức: COD (khách trả ngay khi giao) và công nợ
// (thu sau) — không dùng tiền mặt/chuyển khoản như 2 mục riêng.
const METHOD_LABELS: Record<string, string> = {
  cod: "COD (trả ngay)",
  debt_collection: "Thu công nợ (trả sau)",
};

// Giai đoạn C — ghi nhận thanh toán tách 3 phần cho 1 đơn (trả ngay/COD/công
// nợ). Mỗi lần ghi là 1 dòng order_payments, trigger DB tự cộng dồn
// orders.paid_amount và cập nhật payment_status khi trả đủ (xem migration
// 20260910d_order_payments.sql). Bất kỳ nhân viên nào cũng ghi nhận được
// (thu tiền là việc thường ngày của sale khi giao hàng), không giới hạn role
// như phần duyệt vượt hạn mức.
export async function GET(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) return json({ ok: false, error: auth.error }, 401);

  const orderId = req.nextUrl.searchParams.get("orderId")?.trim();
  if (!orderId) return json({ ok: false, error: "Thiếu orderId" }, 400);

  try {
    const supabase = getCustomerSupabaseAdmin();
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("grand_total, paid_amount, debt_amount")
      .eq("id", orderId)
      .single();
    if (orderError) throw orderError;

    const { data: payments, error } = await supabase
      .from("order_payments")
      .select("id, method, amount, note, created_at, admin_profiles(name)")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false });
    if (error) throw error;

    return json({
      ok: true,
      order,
      payments: (payments || []).map((p: any) => ({
        ...p,
        methodLabel: METHOD_LABELS[p.method] || p.method,
        createdByName: p.admin_profiles?.name || null,
      })),
    });
  } catch (error) {
    console.error("GET /api/admin/orders/payments lỗi:", error);
    return json({ ok: false, error: "Không tải được lịch sử thanh toán" }, 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) return json({ ok: false, error: auth.error }, 401);

  const body = await req.json().catch(() => null);
  const orderId = String(body?.orderId || "").trim();
  const method = String(body?.method || "").trim();
  const amount = Number(body?.amount);
  const note = String(body?.note || "").trim();

  if (!orderId) return json({ ok: false, error: "Thiếu orderId" }, 400);
  if (!Object.keys(METHOD_LABELS).includes(method)) {
    return json({ ok: false, error: "Phương thức thanh toán không hợp lệ" }, 400);
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return json({ ok: false, error: "Số tiền không hợp lệ" }, 400);
  }

  try {
    const supabase = getCustomerSupabaseAdmin();

    // Chặn thu quá số còn nợ (tránh nhập nhầm số 0 thừa) — cho phép sai số
    // nhỏ 1đ vì làm tròn.
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("grand_total, paid_amount, debt_amount")
      .eq("id", orderId)
      .single();
    if (orderError) throw orderError;
    if (amount > Number(order.debt_amount) + 1) {
      return json(
        { ok: false, error: `Số tiền vượt quá công nợ còn lại (${Number(order.debt_amount).toLocaleString("vi-VN")}đ)` },
        400
      );
    }

    const { error } = await supabase.from("order_payments").insert({
      order_id: orderId,
      method,
      amount,
      note: note || null,
      created_by: auth.profile?.id !== "legacy-admin" ? auth.profile?.id : null,
    });
    if (error) throw error;

    const { data: updated } = await supabase
      .from("orders")
      .select("grand_total, paid_amount, debt_amount, payment_status")
      .eq("id", orderId)
      .single();

    return json({ ok: true, order: updated });
  } catch (error) {
    console.error("POST /api/admin/orders/payments lỗi:", error);
    return json({ ok: false, error: "Không ghi nhận được thanh toán" }, 500);
  }
}
