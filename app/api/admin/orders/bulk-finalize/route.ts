import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";
import { finalizeOrderCore } from "@/lib/order-finalize";
import { can } from "@/lib/permissions";

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

// Xác nhận hàng loạt (mục brief 2026-09-11) — sau khi "Áp giá hàng ngày" đã
// cập nhật đơn giá từng dòng, bước này chốt giá THẬT SỰ cho nhiều đơn cùng
// lúc, dùng lại đúng lõi chốt giá 1 đơn (finalizeOrderCore, cùng logic với
// OrderDetailPage/PosCreatePage xử lý đơn) — không tạo luồng tính tổng riêng
// để tránh sai lệch công thức. Chạy tuần tự, lỗi 1 đơn không chặn các đơn còn
// lại — trả về danh sách rõ đơn nào thành công/bị bỏ qua và lý do.
export async function POST(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) return json({ ok: false, error: auth.error }, 401);
  if (!can(auth.profile?.role, "orders.finalize_pricing")) {
    return json({ ok: false, error: "Chỉ Admin, Trưởng phòng phụ trách hoặc Sale/Văn phòng Vận hành được chốt giá đơn hàng" }, 403);
  }

  const body = await req.json().catch(() => null);
  const orderIds: string[] = Array.isArray(body?.orderIds) ? body.orderIds.filter((id: unknown) => typeof id === "string" && id) : [];
  if (!orderIds.length) return json({ ok: false, error: "Chưa chọn đơn hàng nào" }, 400);

  const actor = String(auth.profile?.name || auth.profile?.email || "admin").trim().slice(0, 120) || "admin";
  const supabase = getCustomerSupabaseAdmin();

  const succeeded: string[] = [];
  const skipped: { orderCode: string; reason: string }[] = [];

  for (const orderId of orderIds) {
    try {
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("id, order_code, status, pricing_status, shipping_amount, customer_id, order_items(id, quantity, unit_price, pricing_note)")
        .eq("id", orderId)
        .single();
      if (orderError || !order) { skipped.push({ orderCode: orderId, reason: "Không tìm thấy đơn" }); continue; }
      if (order.status !== "pending" || order.pricing_status === "finalized") {
        skipped.push({ orderCode: order.order_code, reason: "Đơn không ở trạng thái chờ xác nhận" });
        continue;
      }
      const items = (order as any).order_items || [];
      if (!items.length) { skipped.push({ orderCode: order.order_code, reason: "Đơn không có sản phẩm" }); continue; }
      const hasZeroPrice = items.some((i: any) => Number(i.unit_price) <= 0);
      if (hasZeroPrice) {
        skipped.push({ orderCode: order.order_code, reason: "Còn mặt hàng chưa áp giá (0đ)" });
        continue;
      }

      const { data: customer } = await supabase.from("vip_accounts").select("discount_tier").eq("id", order.customer_id).maybeSingle();

      await finalizeOrderCore(supabase, {
        orderId: order.id,
        customerTier: customer?.discount_tier || "VIP0",
        pricingMode: "manual_item_price",
        orderDiscountPercent: 0,
        shippingAmount: Number(order.shipping_amount) || 0,
        items: items.map((i: any) => ({ itemId: i.id, quantity: Number(i.quantity), finalUnitPrice: Number(i.unit_price), note: i.pricing_note || "" })),
        verificationNote: "",
        pricingNote: "Xác nhận hàng loạt sau khi áp giá hàng ngày",
        actor,
      });
      succeeded.push(order.order_code);
    } catch (err) {
      console.error(`Bulk finalize lỗi cho đơn ${orderId}:`, err);
      skipped.push({ orderCode: orderId, reason: err instanceof Error ? err.message : "Lỗi không xác định" });
    }
  }

  return json({ ok: true, succeeded, skipped });
}
