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

// Ghi log khi Trưởng phòng/Admin duyệt tạo đơn vượt hạn mức công nợ (Giai
// đoạn C, mục 13.5). Đi qua service-role thay vì insert thẳng từ client vì
// order_history hiện chỉ có policy SELECT cho authenticated (migration
// 20260909), không có policy INSERT — insert thẳng từ client sẽ bị RLS chặn.
export async function POST(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) return json({ ok: false, error: auth.error }, 401);
  if (!["admin", "truong_phong"].includes(auth.profile?.role || "")) {
    return json({ ok: false, error: "Chỉ Trưởng phòng hoặc Admin được duyệt vượt hạn mức" }, 403);
  }

  const body = await req.json().catch(() => null);
  const orderId = String(body?.orderId || "").trim();
  const note = String(body?.note || "").trim();
  if (!orderId || !note) return json({ ok: false, error: "Thiếu orderId hoặc lý do duyệt" }, 400);

  try {
    const supabase = getCustomerSupabaseAdmin();
    const { error } = await supabase.from("order_history").insert({
      order_id: orderId,
      action: "credit_limit_override",
      note,
      actor: auth.profile?.name || "admin",
    });
    if (error) throw error;
    return json({ ok: true });
  } catch (error) {
    console.error("POST /api/admin/orders/credit-override lỗi:", error);
    return json({ ok: false, error: "Không ghi được log duyệt vượt hạn mức" }, 500);
  }
}
