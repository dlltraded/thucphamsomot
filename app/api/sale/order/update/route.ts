import { NextRequest, NextResponse } from "next/server";
import { getCustomerSupabaseAdmin as getAdminSupabase } from "@/lib/customer-supabase-server";
import { getAdminSession } from "@/lib/admin-session";

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { orderId, items, pricingStatus, shippingFee, otherDiscount, note, status } = body;

    const supabase = getAdminSupabase();

    // 1. Cập nhật chi tiết món và chốt giá qua RPC
    if (items && Array.isArray(items)) {
      const { data, error } = await supabase.rpc("sale_update_order", {
        p_admin_id: session.id,
        p_order_id: orderId,
        p_items: items,
        p_pricing_status: pricingStatus || 'provisional',
        p_shipping_fee: Number(shippingFee) || 0,
        p_other_discount: Number(otherDiscount) || 0,
        p_note: note || null
      });

      if (error) {
        console.error("sale_update_order error:", error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
    }

    // 2. Cập nhật trạng thái đơn (pending, confirmed, shipping, completed) nếu có truyền lên
    if (status) {
      const { error: statusError } = await supabase
        .from("orders")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", orderId);

      if (statusError) {
        return NextResponse.json({ ok: false, error: "Không thể cập nhật trạng thái: " + statusError.message }, { status: 400 });
      }
      
      // Ghi log trạng thái (nếu rpc chưa ghi hoặc ghi rồi)
      // RPC sale_update_order đã ghi 1 log "updated". Nếu chỉ đổi status thì có thể tự ghi.
      await supabase.from("order_history").insert({
        order_id: orderId,
        action: 'status_changed',
        to_status: status,
        actor: session.id,
        payload: { changed_by: session.name, role: session.role }
      });
    }

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error("Update order error:", error);
    return NextResponse.json({ ok: false, error: "Lỗi hệ thống" }, { status: 500 });
  }
}
