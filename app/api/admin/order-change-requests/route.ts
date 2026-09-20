import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { can } from "@/lib/permissions";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: corsHeaders });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// Danh sách yêu cầu điều chỉnh/hủy của khách (WP6b). Query: status=open|approved|rejected|done|all (mặc định open),
// orderId=, deliveryDate=YYYY-MM-DD. Kèm tình trạng soạn hàng hiện tại + "có thể đã nằm trong file tổng đã xuất".
export async function GET(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) return json({ ok: false, error: auth.error }, 401);
  if (!can(auth.profile?.role, "orders.view")) {
    return json({ ok: false, error: "Bạn không có quyền xem yêu cầu của khách" }, 403);
  }

  const supabase = getCustomerSupabaseAdmin();
  const sp = req.nextUrl.searchParams;
  const status = sp.get("status") || "open";
  const orderId = sp.get("orderId")?.trim();
  const deliveryDate = sp.get("deliveryDate")?.trim();

  try {
    let query = supabase
      .from("order_change_requests")
      .select(
        "id, order_id, customer_id, type, message, status, order_status_at_request, packing_status_at_request, after_cutoff, requested_at, handled_by, handled_at, handled_note, orders(order_code, customer_name, delivery_date, grand_total, status, packing_status, sales_rep_id, created_at)"
      )
      .order("requested_at", { ascending: true })
      .limit(300);
    if (status !== "all") query = query.eq("status", status);
    if (orderId) query = query.eq("order_id", orderId);

    const { data, error } = await query;
    if (error) {
      if (/order_change_requests/.test(error.message || "")) {
        return json({ ok: true, requests: [], available: false });
      }
      throw error;
    }

    let rows = (data || []) as any[];
    if (deliveryDate) rows = rows.filter((r) => r.orders?.delivery_date === deliveryDate);

    // Lần xuất file tổng gần nhất theo từng ngày giao (để biết yêu cầu có thể ảnh hưởng file đã gửi Thu mua)
    const dates = [...new Set(rows.map((r) => r.orders?.delivery_date).filter(Boolean))] as string[];
    const lastExportByDate = new Map<string, string>();
    if (dates.length) {
      const { data: exps } = await supabase
        .from("procurement_exports")
        .select("delivery_date, exported_at")
        .in("delivery_date", dates)
        .order("exported_at", { ascending: false });
      for (const e of exps || []) {
        if (!lastExportByDate.has(e.delivery_date)) lastExportByDate.set(e.delivery_date, e.exported_at);
      }
    }

    const now = Date.now();
    const requests = rows.map((r) => {
      const o = r.orders || {};
      const exportedAt = o.delivery_date ? lastExportByDate.get(o.delivery_date) : undefined;
      return {
        id: r.id,
        orderId: r.order_id,
        orderCode: o.order_code,
        customerName: o.customer_name,
        deliveryDate: o.delivery_date,
        grandTotal: Number(o.grand_total) || 0,
        orderStatus: o.status,
        packingStatus: o.packing_status ?? null,
        type: r.type,
        message: r.message,
        status: r.status,
        afterCutoff: r.after_cutoff,
        requestedAt: r.requested_at,
        waitingMinutes: Math.max(0, Math.round((now - new Date(r.requested_at).getTime()) / 60000)),
        possiblyExported: !!exportedAt && !!o.created_at && new Date(o.created_at).getTime() <= new Date(exportedAt).getTime(),
        lastExportedAt: exportedAt || null,
        handledBy: r.handled_by,
        handledAt: r.handled_at,
        handledNote: r.handled_note,
      };
    });

    return json({ ok: true, available: true, requests });
  } catch (err) {
    console.error("GET /api/admin/order-change-requests lỗi:", err);
    return json({ ok: false, error: "Không tải được danh sách yêu cầu" }, 500);
  }
}
