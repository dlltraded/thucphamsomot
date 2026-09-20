import type { getCustomerSupabaseAdmin } from "./customer-supabase-server";

type Supabase = ReturnType<typeof getCustomerSupabaseAdmin>;

export interface ReconcileRow {
  itemId: string;
  quantityDelivered: number;
}

export interface ReconcileParams {
  orderId: string;
  /** null/undefined + full=true => giao đủ 100% số đã chốt */
  rows?: ReconcileRow[] | null;
  full?: boolean;
  actor: string;
  note?: string;
}

export interface ReconcileResult {
  order: Record<string, any>;
  changes: Array<{ itemId: string; name: string; confirmedQty: number; deliveredQty: number }>;
  preTotal: number;
  newTotal: number;
  warnings: string[];
}

const RECONCILABLE_STATUSES = ["confirmed", "preparing", "shipping"];

// Xác nhận THỰC GIAO (yêu cầu 2026-09-20): sau khi giao, nhân viên nhập số thực giao từng
// dòng; hệ thống chụp lại số đã chốt (confirmed_quantity), đặt quantity = số thực giao,
// tính lại thành tiền/tổng đơn/công nợ và đưa tồn kho về đúng. Hóa đơn (PDF), báo cáo và
// màn khách hàng đều đọc order_items.quantity nên tự hiện số thật. Giữ nguyên đơn giá.
// Cho phép đối chiếu lại nhiều lần khi đơn chưa "Hoàn thành".
export async function reconcileDelivery(supabase: Supabase, params: ReconcileParams): Promise<ReconcileResult> {
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", params.orderId)
    .single();
  if (orderErr || !order) throw new Error("Không tìm thấy đơn hàng");

  if (!RECONCILABLE_STATUSES.includes(order.status)) {
    throw new Error(`Đơn đang ở trạng thái "${order.status}", chỉ đối chiếu thực giao khi đơn Đã xác nhận / Đang soạn / Đang giao`);
  }
  if (order.pricing_status !== "finalized") {
    throw new Error("Đơn chưa chốt giá — chốt giá trước khi xác nhận thực giao");
  }

  const items: Array<Record<string, any>> = order.order_items || [];
  if (!items.length) throw new Error("Đơn không có dòng hàng nào");

  const deliveredById = new Map<string, number>();
  for (const row of params.rows || []) {
    const d = Number(row.quantityDelivered);
    if (!Number.isFinite(d) || d < 0) throw new Error("Số lượng thực giao không hợp lệ (phải ≥ 0)");
    deliveredById.set(String(row.itemId), d);
  }

  const before = items.map((it) => ({
    id: it.id,
    quantity: it.quantity,
    quantity_delivered: it.quantity_delivered,
    line_total: it.line_total,
    final_line_total: it.final_line_total,
    confirmed_quantity: it.confirmed_quantity ?? null,
  }));
  const beforeOrder = {
    subtotal: order.subtotal,
    discount_amount: order.discount_amount,
    discount_percent: order.discount_percent,
    pricing_adjustment_amount: order.pricing_adjustment_amount,
    grand_total: order.grand_total,
    pre_delivery_grand_total: order.pre_delivery_grand_total ?? null,
    delivery_confirmed_at: order.delivery_confirmed_at ?? null,
    delivery_confirmed_by: order.delivery_confirmed_by ?? null,
    delivery_note: order.delivery_note ?? null,
  };

  let subtotal = 0;
  let merchandise = 0;
  const changes: ReconcileResult["changes"] = [];
  const plans = items.map((it) => {
    // Số đã chốt trước khi giao: nếu đã từng đối chiếu thì lấy confirmed_quantity, chưa thì quantity hiện tại.
    const confirmedQty = Number(it.confirmed_quantity ?? it.quantity) || 0;
    const explicit = deliveredById.get(String(it.id));
    const delivered = params.full ? confirmedQty : explicit !== undefined ? explicit : confirmedQty;
    const unitPrice = Number(it.unit_price) || 0;
    const basePrice = Number(it.base_unit_price) || 0;
    const lineTotal = Math.round(unitPrice * delivered);
    subtotal += Math.round(basePrice * delivered);
    merchandise += lineTotal;
    if (delivered !== confirmedQty) {
      changes.push({ itemId: it.id, name: it.name, confirmedQty, deliveredQty: delivered });
    }
    return { id: it.id, confirmedQty, delivered, lineTotal };
  });

  const shipping = Math.max(0, Number(order.shipping_amount) || 0);
  const discountAmount = Math.max(0, subtotal - merchandise);
  const effectiveDiscount = subtotal > 0 ? Math.round((discountAmount / subtotal) * 10000) / 100 : 0;
  const newTotal = merchandise + shipping;
  const preTotal = Number(order.pre_delivery_grand_total ?? order.grand_total) || 0;
  const now = new Date().toISOString();
  const warnings: string[] = [];

  try {
    for (const p of plans) {
      const { error } = await supabase
        .from("order_items")
        .update({
          confirmed_quantity: p.confirmedQty,
          quantity: p.delivered,
          quantity_delivered: p.delivered,
          line_total: p.lineTotal,
          final_line_total: p.lineTotal,
        })
        .eq("id", p.id)
        .eq("order_id", params.orderId);
      if (error) throw error;
    }

    const { data: updated, error: updErr } = await supabase
      .from("orders")
      .update({
        subtotal,
        discount_amount: discountAmount,
        discount_percent: effectiveDiscount,
        pricing_adjustment_amount: discountAmount,
        grand_total: newTotal,
        pre_delivery_grand_total: order.pre_delivery_grand_total ?? order.grand_total,
        delivery_confirmed_at: now,
        delivery_confirmed_by: params.actor,
        delivery_note: params.note?.trim() || null,
      })
      .eq("id", params.orderId)
      .select("*, order_items(*)")
      .single();
    if (updErr || !updated) throw updErr || new Error("Không cập nhật được đơn hàng");

    if (Number(updated.paid_amount) > newTotal) warnings.push("overpaid");

    // Đưa tồn kho về đúng số thực giao (chỉ mặt hàng theo dõi tồn kho). Lỗi ở đây không chặn đối chiếu.
    const { error: invErr } = await supabase.rpc("sync_order_inventory", {
      p_order_id: params.orderId,
      p_actor: params.actor,
      p_mode: "match_items",
    });
    if (invErr) {
      console.error("sync_order_inventory lỗi:", invErr.message);
      warnings.push("inventory_not_synced");
    }

    await supabase.from("order_history").insert({
      order_id: params.orderId,
      action: "delivery_reconciled",
      from_status: order.status,
      to_status: order.status,
      note: params.note?.trim() || null,
      actor: params.actor,
      payload: { preTotal, newTotal, itemChanges: changes, full: !!params.full },
    });

    return { order: updated, changes, preTotal, newTotal, warnings };
  } catch (error) {
    // Hoàn tác: khôi phục dòng hàng + đơn về trạng thái trước khi đối chiếu.
    for (const b of before) {
      await supabase
        .from("order_items")
        .update({
          quantity: b.quantity,
          quantity_delivered: b.quantity_delivered,
          line_total: b.line_total,
          final_line_total: b.final_line_total,
          confirmed_quantity: b.confirmed_quantity,
        })
        .eq("id", b.id);
    }
    await supabase.from("orders").update(beforeOrder).eq("id", params.orderId);
    throw error;
  }
}
