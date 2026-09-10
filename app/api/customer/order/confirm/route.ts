import { NextRequest, NextResponse } from "next/server";
import { CUSTOMER_SESSION_COOKIE, parseSessionCookieValue } from "@/lib/customer-session";
import { getCustomerSupabase, getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  const websiteSession = parseSessionCookieValue(
    req.cookies.get(CUSTOMER_SESSION_COOKIE)?.value
  );

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Dữ liệu không hợp lệ" }, { status: 400, headers: corsHeaders });
  }

  const orderSessionToken = body.orderSessionToken || websiteSession?.orderSessionToken;
  if (!orderSessionToken) {
    return NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401, headers: corsHeaders });
  }

  const { orderId } = body;
  if (!orderId) {
    return NextResponse.json({ ok: false, error: "Thiếu orderId" }, { status: 400, headers: corsHeaders });
  }

  const supabase = getCustomerSupabase();
  const { error } = await supabase.rpc("customer_confirm_draft_order", {
    p_session_token: orderSessionToken,
    p_order_id: orderId,
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400, headers: corsHeaders });
  }

  // Trừ kho ngay khi KHÁCH tự xác nhận đơn (đúng chỗ theo kế hoạch, khác với
  // luồng nhân viên finalize ở app/api/admin/orders PATCH). RPC tự bỏ qua nếu
  // đơn này đã được trừ kho rồi (idempotent) — an toàn dù gọi từ cả 2 luồng.
  // Không chặn phản hồi cho khách nếu bước này lỗi, chỉ log lại để đối chiếu.
  try {
    const admin = getCustomerSupabaseAdmin();
    const { error: deductError } = await admin.rpc("deduct_inventory_for_order", {
      p_order_id: orderId,
      p_actor: "customer",
    });
    if (deductError) console.error("deduct_inventory_for_order lỗi (customer confirm):", deductError.message);
  } catch (err) {
    console.error("deduct_inventory_for_order lỗi (customer confirm):", err);
  }

  return NextResponse.json({ ok: true }, { headers: corsHeaders });
}
