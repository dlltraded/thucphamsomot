import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { can } from "@/lib/permissions";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";
import { signMergePreviewToken } from "@/lib/order-merge-token";

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
  if (!auth.ok) {
    return json({ ok: false, error: auth.error }, 401);
  }

  // 1. Phân quyền: Cần quyền orders.merge
  if (!can(auth.profile?.role, "orders.merge")) {
    return json({ ok: false, error: "Bạn không có quyền thực hiện thao tác gộp đơn hàng" }, 403);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Dữ liệu JSON không hợp lệ" }, 400);
  }

  const { orderIds } = body || {};
  if (!Array.isArray(orderIds) || orderIds.length < 2) {
    return json({ ok: false, error: "Cần chọn ít nhất 2 đơn hàng để xem trước khi gộp" }, 400);
  }

  // Loại bỏ ID trùng lặp
  const uniqueOrderIds = Array.from(new Set(orderIds.map((id: any) => String(id).trim()).filter(Boolean)));
  if (uniqueOrderIds.length < 2) {
    return json({ ok: false, error: "Cần chọn ít nhất 2 đơn hàng phân biệt" }, 400);
  }

  try {
    const supabase = getCustomerSupabaseAdmin();

    // 2. Tải toàn bộ đơn hàng và sản phẩm chi tiết
    const { data: rawOrders, error: ordersErr } = await supabase
      .from("orders")
      .select(`
        id, order_code, customer_id, customer_code, customer_name, customer_phone, customer_company,
        customer_tier, source, status, payment_method, payment_status, delivery_type,
        delivery_alias, delivery_address, delivery_name, delivery_phone, delivery_date, delivery_shift,
        delivery_address_id, branch_id, note, subtotal, discount_amount, shipping_amount, grand_total,
        paid_amount, debt_amount, voucher_code, voucher_discount, sales_rep_id, created_at, updated_at,
        confirmed_at, pricing_status, confirmation_document_status, invoice_document_status, price_book_id,
        order_items (
          id, order_id, product_id, sku, name, unit, quantity,
          base_unit_price, unit_price, line_total, discount_percent, discount_amount,
          customer_note, pricing_note, packaging_note, unit_snapshot,
          manual_price, manual_price_reason, price_source
        )
      `)
      .in("id", uniqueOrderIds);

    if (ordersErr) throw ordersErr;

    const orders = rawOrders || [];
    if (orders.length !== uniqueOrderIds.length) {
      return json({ ok: false, error: "Không tìm thấy một số đơn hàng trong hệ thống (có thể đã bị xóa)" }, 404);
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // 3. Kiểm tra điều kiện bắt buộc
    // a. Khách hàng
    const customerIds = new Set(orders.map((o) => (o.customer_id || o.customer_code || "").trim()));
    if (customerIds.size > 1) {
      const customersList = orders.map((o) => `${o.order_code}: ${o.customer_name} (${o.customer_code || "không mã"})`).join(", ");
      errors.push(`Các đơn không cùng khách hàng (${customersList})`);
    }

    // b. Ngày giao hàng
    const dates = new Set(orders.map((o) => (o.delivery_date ? String(o.delivery_date).slice(0, 10) : "chua_co")));
    if (dates.size > 1) {
      const dateList = orders.map((o) => `${o.order_code}: ${o.delivery_date || "Chưa có ngày"}`).join(", ");
      errors.push(`Các đơn không cùng ngày giao hàng (${dateList})`);
    }

    // c. Địa chỉ nhận hàng
    const normalizeAddr = (a?: string | null) =>
      (a || "")
        .trim()
        .toLowerCase()
        .replace(/[.,\-\/]/g, " ")
        .replace(/\s+/g, " ");

    const addresses = new Set(orders.map((o) => normalizeAddr(o.delivery_address)));
    if (addresses.size > 1) {
      const addrList = orders.map((o) => `${o.order_code}: "${o.delivery_address || "Chưa có địa chỉ"}"`).join(", ");
      errors.push(`Các đơn không cùng địa chỉ nhận hàng (${addrList})`);
    }

    // d. Chi nhánh (nếu có lưu branch_id)
    const branchIds = new Set(orders.map((o) => o.branch_id).filter(Boolean));
    if (branchIds.size > 1) {
      errors.push("Các đơn hàng thuộc các chi nhánh khác nhau");
    }

    const paymentMethods = new Set(orders.map((o) => o.payment_method || ""));
    if (paymentMethods.size > 1) {
      errors.push("Các đơn hàng có phương thức thanh toán khác nhau");
    }

    const priceBookIds = new Set(orders.map((o) => o.price_book_id || ""));
    if (priceBookIds.size > 1) {
      errors.push("Các đơn hàng đang áp dụng bảng giá khác nhau");
    }

    // e. Trạng thái đơn hàng
    for (const o of orders) {
      if (o.status === "completed") {
        errors.push(`Đơn ${o.order_code} đã hoàn thành, không được phép gộp`);
      } else if (o.status === "canceled") {
        errors.push(`Đơn ${o.order_code} đã bị hủy, không được phép gộp`);
      } else if (o.status === "merged") {
        errors.push(`Đơn ${o.order_code} đã được gộp trước đó, không thể gộp lại`);
      } else if (o.status === "shipping") {
        errors.push(`Đơn ${o.order_code} đang giao hàng, không thể gộp`);
      } else if (o.invoice_document_status === "issued") {
        errors.push(`Đơn ${o.order_code} đã phát hành hóa đơn bán hàng, không thể gộp`);
      }
    }

    // f. Kiểm tra quyền khi đơn đã xác nhận / chốt giá
    const hasConfirmedOrder = orders.some(
      (o) => o.status === "confirmed" || o.pricing_status === "finalized" || o.confirmation_document_status === "confirmed"
    );
    if (hasConfirmedOrder) {
      if (!can(auth.profile?.role, "orders.merge_locked")) {
        errors.push("Có đơn hàng đã chốt xác nhận giá. Cần quyền Trưởng phòng hoặc Admin để gộp đơn đã chốt.");
      } else {
        warnings.push("Các đơn hàng đã có xác nhận chốt giá sẽ tạo một phiên bản đơn gộp mới và cần xác nhận lại chứng từ.");
      }
    }

    // 4. Gom nhóm sản phẩm theo quy tắc TPS1
    // Quy tắc sống còn: Cùng SKU nhưng khác đơn vị tính, quy cách đóng gói (packaging_note), hoặc ghi chú chế biến (customer_note/pricing_note)
    // PHẢI GIỮ RIÊNG THÀNH TỪNG DÒNG ĐỘC LẬP!
    let totalItemsBefore = 0;
    const combinedMap = new Map<string, any>();

    for (const order of orders) {
      const items = (order as any).order_items || [];
      totalItemsBefore += items.length;

      for (const it of items) {
        const prodKey = String(it.product_id || it.sku || it.name || "").trim().toLowerCase();
        const unitKey = String(it.unit || "").trim().toLowerCase();
        const packKey = String(it.packaging_note || "").trim().toLowerCase();
        const custNoteKey = String(it.customer_note || "").trim().toLowerCase();
        const priceNoteKey = String(it.pricing_note || "").trim().toLowerCase();
        const unitPrice = Number(it.unit_price ?? it.base_unit_price ?? 0);
        const priceKey = String(unitPrice);

        // Tạo khóa định danh duy nhất cho dòng sản phẩm
        const groupKey = `${prodKey}:::${unitKey}:::${packKey}:::${custNoteKey}:::${priceNoteKey}:::${priceKey}`;

        if (!combinedMap.has(groupKey)) {
          combinedMap.set(groupKey, {
            groupKey,
            productId: it.product_id || null,
            sku: it.sku || "",
            name: it.name || it.ordered_product_name || "Sản phẩm",
            unit: it.unit || "Kg",
            unitPrice: unitPrice,
            baseUnitPrice: Number(it.base_unit_price || unitPrice),
            quantity: Number(it.quantity) || 0,
            lineTotal: Number(it.line_total) || (Number(it.quantity) || 0) * unitPrice,
            packagingNote: it.packaging_note ? String(it.packaging_note).trim() : null,
            customerNote: it.customer_note ? String(it.customer_note).trim() : null,
            pricingNote: it.pricing_note ? String(it.pricing_note).trim() : null,
            sourceOrderCodes: [order.order_code],
            mergeCount: 1,
          });
        } else {
          const existing = combinedMap.get(groupKey);
          existing.quantity += Number(it.quantity) || 0;
          existing.lineTotal += Number(it.line_total) || (Number(it.quantity) || 0) * unitPrice;
          if (!existing.sourceOrderCodes.includes(order.order_code)) {
            existing.sourceOrderCodes.push(order.order_code);
          }
          existing.mergeCount += 1;
        }
      }
    }

    const combinedItems = Array.from(combinedMap.values());

    // 5. Tính toán tài chính
    const subtotal = orders.reduce((acc, o) => acc + (Number(o.subtotal) || 0), 0);
    const totalDiscount = orders.reduce((acc, o) => acc + (Number(o.discount_amount) || 0), 0);
    // Phí giao hàng: Mặc định lấy phí cao nhất trong các đơn (vì cùng địa chỉ và ngày giao)
    const suggestedShipping = Math.max(0, ...orders.map((o) => Number(o.shipping_amount) || 0));
    // Giữ đúng số tiền đã chốt của từng đơn, chỉ hợp nhất phí giao hàng vì các
    // đơn cùng địa chỉ/ngày giao. Không trừ chiết khấu lần thứ hai.
    const goodsTotal = orders.reduce(
      (acc, o) => acc + Math.max(0, (Number(o.grand_total) || 0) - (Number(o.shipping_amount) || 0)),
      0,
    );
    const grandTotal = Math.max(0, goodsTotal + suggestedShipping);
    const totalPaid = orders.reduce((acc, o) => acc + (Number(o.paid_amount) || 0), 0);
    const debtAmount = Math.max(0, grandTotal - totalPaid);

    // Thu thập danh sách voucher từ các đơn
    const appliedVouchers = orders
      .filter((o) => o.voucher_code)
      .map((o) => ({ orderCode: o.order_code, code: o.voucher_code, discount: Number(o.voucher_discount || 0) }));

    if (appliedVouchers.length > 1) {
      warnings.push("Nhiều đơn có áp dụng voucher khác nhau. Hệ thống sẽ giữ tổng chiết khấu, vui lòng kiểm tra lại điều kiện voucher.");
    }

    // 6. Ký previewToken nếu hợp lệ
    let previewToken: string | null = null;
    if (errors.length === 0) {
      previewToken = signMergePreviewToken({
        orderIds: uniqueOrderIds,
        customerId: orders[0]?.customer_id || orders[0]?.customer_code || "",
        deliveryDate: orders[0]?.delivery_date ? String(orders[0].delivery_date).slice(0, 10) : "",
        itemsBeforeCount: totalItemsBefore,
        itemsAfterCount: combinedItems.length,
        subtotal: subtotal,
      });
    }

    const firstOrder = orders[0];

    return json({
      ok: true,
      eligible: errors.length === 0,
      errors,
      warnings,
      previewToken,
      customer: {
        id: firstOrder.customer_id,
        code: firstOrder.customer_code,
        name: firstOrder.customer_name,
        phone: firstOrder.customer_phone,
        company: firstOrder.customer_company,
        tier: firstOrder.customer_tier,
      },
      delivery: {
        date: firstOrder.delivery_date,
        shift: firstOrder.delivery_shift || "Sáng",
        address: firstOrder.delivery_address,
        alias: firstOrder.delivery_alias,
        name: firstOrder.delivery_name,
        phone: firstOrder.delivery_phone,
      },
      sourceOrders: orders.map((o) => ({
        id: o.id,
        order_code: o.order_code,
        created_at: o.created_at,
        status: o.status,
        payment_status: o.payment_status,
        item_count: (o as any).order_items?.length || 0,
        subtotal: Number(o.subtotal) || 0,
        discount_amount: Number(o.discount_amount) || 0,
        shipping_amount: Number(o.shipping_amount) || 0,
        grand_total: Number(o.grand_total) || 0,
        paid_amount: Number(o.paid_amount) || 0,
        note: o.note || "",
        voucher_code: o.voucher_code || null,
      })),
      itemsBeforeCount: totalItemsBefore,
      itemsAfterCount: combinedItems.length,
      combinedItems,
      financials: {
        subtotal,
        discount_amount: totalDiscount,
        suggestedShipping,
        grand_total: grandTotal,
        paid_amount: totalPaid,
        debt_amount: debtAmount,
      },
      appliedVouchers,
    });
  } catch (error: any) {
    console.error("POST /api/admin/orders/merge/preview lỗi:", error);
    return json({ ok: false, error: error.message || "Lỗi xử lý xem trước gộp đơn" }, 500);
  }
}
