import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { can } from "@/lib/permissions";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";
import { finalizeOrderCore } from "@/lib/order-finalize";

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
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) return json({ ok: false, error: auth.error }, 401);

  // 1. Kiểm tra quyền orders.bulk_confirm
  if (!can(auth.profile?.role, "orders.bulk_confirm")) {
    return json({ ok: false, error: "Bạn không có quyền xác nhận đơn hàng hàng loạt" }, 403);
  }

  const body = await req.json().catch(() => null);
  const orderIds: string[] = Array.isArray(body?.orderIds)
    ? body.orderIds.filter((id: unknown) => typeof id === "string" && id)
    : [];

  if (!orderIds.length) {
    return json({ ok: false, error: "Chưa chọn đơn hàng nào" }, 400);
  }

  // F3c: Giới hạn tối đa 50 đơn/lần gọi để tránh quá thời gian xử lý
  if (orderIds.length > 50) {
    return json({ ok: false, error: "Tối đa 50 đơn hàng mỗi lần xác nhận (hệ thống chia lô 50 đơn)" }, 400);
  }

  const actor = String(auth.profile?.name || auth.profile?.email || "NV Vận hành").trim();
  const isSaleRole = auth.profile?.role === "sale";
  const staffId = auth.profile?.id;

  const supabase = getCustomerSupabaseAdmin();
  const confirmed: string[] = [];
  const skipped: Array<{ orderId: string; orderCode?: string; reason: string }> = [];

  for (const orderId of orderIds) {
    try {
      // Query đơn hàng kèm dòng hàng và thông tin sale phụ trách
      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .select(`
          id, order_code, status, pricing_status, shipping_amount, grand_total,
          customer_id, sales_rep_id, confirmed_at,
          order_items (id, product_id, sku, name, unit, quantity, unit_price, pricing_note)
        `)
        .eq("id", orderId)
        .maybeSingle();

      if (orderErr || !order) {
        skipped.push({ orderId, reason: "Không tìm thấy đơn hàng" });
        continue;
      }

      // Lấy thông tin khách hàng để kiểm tra quyền, xác thực và hạn mức
      let customer: {
        id: string;
        discount_tier?: string;
        sales_rep_id?: string | null;
        verification_status?: string | null;
        credit_limit?: number | null;
      } | null = null;

      if (order.customer_id) {
        const { data: cust } = await supabase
          .from("vip_accounts")
          .select("id, discount_tier, sales_rep_id, verification_status, credit_limit")
          .eq("id", order.customer_id)
          .maybeSingle();
        customer = cust;
      }

      // 2. Ràng buộc quyền NV Vận hành (sale): chỉ duyệt đơn khách mình phụ trách
      if (isSaleRole) {
        const assignedSaleId = order.sales_rep_id || customer?.sales_rep_id || null;
        // Quy tắc: khách đã phân cho sale khác -> chặn; chưa phân (null) hoặc đúng sale -> cho phép
        if (assignedSaleId && assignedSaleId !== staffId) {
          skipped.push({
            orderId: order.id,
            orderCode: order.order_code,
            reason: "Đơn thuộc khách hàng do nhân viên khác phụ trách",
          });
          continue;
        }
      }

      // 3. Đơn phải ở trạng thái pending
      if (order.status !== "pending") {
        skipped.push({
          orderId: order.id,
          orderCode: order.order_code,
          reason: `Đơn đang ở trạng thái "${order.status}", không phải Chờ xác nhận`,
        });
        continue;
      }

      // F3a: Bỏ qua khách chưa xác thực để tránh finalizeOrderCore tự động verified khách
      if (customer?.verification_status !== "verified") {
        skipped.push({
          orderId: order.id,
          orderCode: order.order_code,
          reason: "Khách chưa xác thực — cần xử lý riêng",
        });
        continue;
      }

      const items = (order as any).order_items || [];
      if (!items.length) {
        skipped.push({
          orderId: order.id,
          orderCode: order.order_code,
          reason: "Đơn hàng không có sản phẩm nào",
        });
        continue;
      }

      // 4. Kiểm tra đơn giá (nếu có dòng giá <= 0đ thì không thể xác nhận)
      const hasZeroPrice = items.some((i: any) => Number(i.unit_price) <= 0);
      if (hasZeroPrice) {
        skipped.push({
          orderId: order.id,
          orderCode: order.order_code,
          reason: "Đơn còn mặt hàng chưa có giá (0đ), cần chốt giá trước",
        });
        continue;
      }

      // F3b: Kiểm tra hạn mức công nợ nếu khách có cài đặt credit_limit > 0
      const creditLimit = Number(customer?.credit_limit) || 0;
      if (creditLimit > 0 && order.customer_id) {
        const { data: unpaidOrders } = await supabase
          .from("orders")
          .select("id, grand_total, debt_amount, paid_amount")
          .eq("customer_id", order.customer_id)
          .neq("status", "canceled")
          .neq("payment_status", "paid");

        let currentDebt = 0;
        for (const uo of unpaidOrders || []) {
          if (uo.id === order.id) continue;
          const debt = uo.debt_amount != null
            ? Number(uo.debt_amount)
            : Math.max(0, Number(uo.grand_total) - (Number(uo.paid_amount) || 0));
          if (debt > 0) currentDebt += debt;
        }

        const orderTotal = Number(order.grand_total) || (
          items.reduce((s: number, it: any) => s + (Number(it.quantity) * Number(it.unit_price)), 0) + (Number(order.shipping_amount) || 0)
        );
        const projectedDebt = currentDebt + orderTotal;

        if (projectedDebt > creditLimit) {
          skipped.push({
            orderId: order.id,
            orderCode: order.order_code,
            reason: "Vượt hạn mức công nợ",
          });
          continue;
        }
      }

      // 5. Xác nhận đơn theo đúng luồng hiện hành:
      const now = new Date().toISOString();

      if (order.pricing_status === "finalized") {
        // Đã finalize trước đó -> chuyển sang confirmed
        const { error: updateErr } = await supabase
          .from("orders")
          .update({
            status: "confirmed",
            confirmed_at: order.confirmed_at || now,
            updated_at: now,
          })
          .eq("id", order.id);

        if (updateErr) throw updateErr;

        // Trừ kho idempotent
        await supabase.rpc("deduct_inventory_for_order", {
          p_order_id: order.id,
          p_actor: actor,
        });

        // Ghi log order_history với actor thật
        await supabase.from("order_history").insert({
          order_id: order.id,
          action: "status_changed",
          from_status: "pending",
          to_status: "confirmed",
          note: "Xác nhận đơn hàng loạt",
          actor,
          payload: { bulk: true },
        });
      } else {
        // Chưa finalized nhưng giá đã hợp lệ (> 0đ) -> chốt đơn giá và xác nhận qua finalizeOrderCore
        await finalizeOrderCore(supabase, {
          orderId: order.id,
          customerTier: customer?.discount_tier || "VIP0",
          pricingMode: "manual_item_price",
          orderDiscountPercent: 0,
          shippingAmount: Number(order.shipping_amount) || 0,
          items: items.map((i: any) => ({
            itemId: i.id,
            quantity: Number(i.quantity),
            finalUnitPrice: Number(i.unit_price),
            note: i.pricing_note || "",
          })),
          verificationNote: "",
          pricingNote: "Xác nhận đơn hàng loạt",
          actor,
        });

        // Trừ kho
        await supabase.rpc("deduct_inventory_for_order", {
          p_order_id: order.id,
          p_actor: actor,
        });
      }

      confirmed.push(order.order_code);
    } catch (err) {
      console.error(`Lỗi bulk-confirm đơn ${orderId}:`, err);
      skipped.push({
        orderId,
        reason: err instanceof Error ? err.message : "Lỗi xử lý xác nhận",
      });
    }
  }

  return json({
    ok: true,
    confirmed,
    skipped,
  });
}
