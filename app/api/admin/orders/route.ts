import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";
import { type ConfirmationOrderItem } from "@/lib/order-confirmation-pdf";
import { generateSalesInvoicePdf, type SalesInvoiceSnapshot } from "@/lib/sales-invoice-pdf";
import { finalizeOrderCore } from "@/lib/order-finalize";
import { sendPushToCustomer } from "@/lib/push";
import { reconcileDelivery } from "@/lib/order-reconcile";

const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "preparing",
  "shipping",
  "completed",
  "canceled",
] as const;
const PAYMENT_STATUSES = ["pending", "cod", "paid", "failed", "refunded"] as const;
const PAYMENT_METHODS = ["COD", "CREDIT", "TRANSFER", "CASH"] as const;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Token",
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: corsHeaders });
}

// Chỉ Admin được xóa hẳn dữ liệu đơn. Giới hạn ở các trạng thái chưa tạo
// nghĩa vụ kho/kế toán; đơn đã thu tiền hoặc đã hoàn thành phải được lưu để
// đối soát, kể cả khi người dùng không còn muốn thấy trong luồng xử lý.
export async function DELETE(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) return json({ ok: false, error: auth.error }, 401);
  if (auth.profile?.role !== "admin") {
    return json({ ok: false, error: "Chỉ tài khoản Admin được phép xóa đơn hàng" }, 403);
  }

  try {
    const body = await req.json();
    const orderId = String(body?.orderId || "").trim();
    if (!orderId) return json({ ok: false, error: "Thiếu mã định danh đơn hàng" }, 400);

    const supabase = getCustomerSupabaseAdmin();
    const { data: order, error: findError } = await supabase
      .from("orders")
      .select("id, order_code, status, payment_status, paid_amount, invoice_document_status")
      .eq("id", orderId)
      .maybeSingle();
    if (findError) throw findError;
    if (!order) return json({ ok: false, error: "Không tìm thấy đơn hàng" }, 404);

    const allowedStatuses = new Set(["draft", "pending", "canceled"]);
    const hasFinancialRecord =
      Number(order.paid_amount || 0) > 0 ||
      ["paid", "refunded"].includes(String(order.payment_status || "")) ||
      Boolean(order.invoice_document_status);
    if (!allowedStatuses.has(order.status) || hasFinancialRecord) {
      return json({
        ok: false,
        error: "Không thể xóa đơn đã xác nhận/giao hàng hoặc đã phát sinh thanh toán. Hãy chuyển trạng thái sang Đã hủy để giữ lịch sử đối soát.",
      }, 409);
    }

    const { error: deleteError } = await supabase.from("orders").delete().eq("id", orderId);
    if (deleteError) throw deleteError;
    console.info(`[DELETE_ORDER] ${auth.profile?.name || "Admin"} đã xóa ${order.order_code} (${order.id})`);
    return json({ ok: true, deletedId: order.id, orderCode: order.order_code });
  } catch (error) {
    console.error("Admin orders DELETE error:", error);
    return json({ ok: false, error: error instanceof Error ? error.message : "Không xóa được đơn hàng" }, 500);
  }
}



export async function GET(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) {
    return json({ ok: false, error: auth.error }, 401);
  }

  try {
    const supabase = getCustomerSupabaseAdmin();
    const productSearch = req.nextUrl.searchParams.get("productSearch")?.trim();
    if (productSearch) {
      const customerId = req.nextUrl.searchParams.get("customerId")?.trim() || null;
      const { data: products, error: productError } = await supabase
        .from("products")
        .select("id, local_product_id, sku, name, category, unit, price_retail, price_wholesale, image_url, track_inventory, stock_qty, min_stock")
        .eq("active", true)
        .ilike("name", `%${productSearch.replace(/[%_]/g, "")}%`)
        .order("name")
        .limit(20);
      if (productError) throw productError;

      // Giá theo hạng/hợp đồng riêng — chỉ tính khi đã chọn khách (Giai đoạn
      // B, xem migration resolve_product_price). Không chọn khách -> giữ giá
      // gốc như trước đây, sale vẫn sửa tay được từng dòng trong giỏ như cũ.
      const basePrice = (p: { price_retail: number | null; price_wholesale: number | null }) =>
        Number(p.price_retail) || Number(p.price_wholesale) || 0;
      const resolvedPrices = customerId
        ? await Promise.all(
            (products || []).map((p) =>
              supabase
                .rpc("resolve_product_price", { p_product_id: p.id, p_customer_id: customerId })
                .then(({ data, error }) => (error ? basePrice(p) : Number(data) || basePrice(p)))
            )
          )
        : null;

      return json({
        ok: true,
        products: (products || []).map((product, idx) => ({
          id: product.id,
          localProductId: product.local_product_id,
          sku: product.sku,
          name: product.name,
          categoryLabel: product.category,
          unit: product.unit || "Kg",
          price: resolvedPrices ? resolvedPrices[idx] : basePrice(product),
          basePrice: basePrice(product),
          image_url: product.image_url,
          trackInventory: product.track_inventory,
          stockQty: product.track_inventory ? Number(product.stock_qty) || 0 : null,
          lowStock: product.track_inventory ? Number(product.stock_qty) <= Number(product.min_stock || 0) : false,
        })),
      });
    }
    const orderId = req.nextUrl.searchParams.get("id")?.trim();
    const status = req.nextUrl.searchParams.get("status");
    const deliveryDate = req.nextUrl.searchParams.get("deliveryDate")?.trim();
    const late = req.nextUrl.searchParams.get("late")?.trim();
    let query = supabase
      .from("orders")
      .select("*, order_items(*), order_history(*)")
      .order("created_at", { ascending: false });

    if (orderId) {
      query = query.eq("id", orderId);
    } else {
      query = query.limit(500);
      if (status && ORDER_STATUSES.includes(status as (typeof ORDER_STATUSES)[number])) {
        query = query.eq("status", status);
      }
      if (deliveryDate) {
        query = query.eq("delivery_date", deliveryDate);
      }
      if (late === "1") {
        query = query.eq("is_late_order", true);
      }
    }

    const { data, error } = await query;
    if (error) throw error;

    // Tên sale lên đơn (chưa hiện trên order trước đây — chỉ có sales_rep_id).
    // Khớp yêu cầu "tên của sale lên đơn như kiotviet" — join admin_profiles.
    const salesRepIds = [...new Set((data || []).map((order) => order.sales_rep_id).filter(Boolean))];
    const { data: salesReps } = salesRepIds.length
      ? await supabase.from("admin_profiles").select("id, name").in("id", salesRepIds)
      : { data: [] as { id: string; name: string }[] };
    const salesRepMap = new Map((salesReps || []).map((r) => [r.id, r.name]));

    if (orderId) {
      const singleOrder = data && data.length > 0 ? data[0] : null;
      // Gắn tồn kho hiện tại vào từng dòng hàng để màn "Xử lý đơn hàng" (POS)
      // biết ngay dòng nào thiếu hàng và cảnh báo + cho nhập hàng tại chỗ —
      // không còn chặn khách đặt hàng hết tồn nữa (yêu cầu 2026-09-11), việc
      // xử lý hết hàng chuyển hết sang cho sale lúc xác nhận đơn.
      const productIds = [...new Set((singleOrder?.order_items || []).map((it: any) => it.product_id).filter(Boolean))];
      let stockMap = new Map<string, { track_inventory: boolean; stock_qty: number; min_stock: number }>();
      if (productIds.length) {
        const { data: stockRows } = await supabase
          .from("products")
          .select("id, track_inventory, stock_qty, min_stock")
          .in("id", productIds);
        stockMap = new Map((stockRows || []).map((r) => [r.id, r]));
      }
      if (singleOrder) {
        singleOrder.order_items = (singleOrder.order_items || []).map((it: any) => {
          const stock = it.product_id ? stockMap.get(it.product_id) : null;
          return {
            ...it,
            track_inventory: stock?.track_inventory || false,
            stock_qty: stock ? Number(stock.stock_qty) || 0 : null,
            low_stock: stock?.track_inventory ? Number(stock.stock_qty) <= Number(stock.min_stock || 0) : false,
          };
        });
      }
      return json({
        ok: true,
        order: singleOrder ? { ...singleOrder, sales_rep_name: salesRepMap.get(singleOrder.sales_rep_id) || null } : null,
      });
    }
    const customerIds = [...new Set((data || []).map((order) => order.customer_id).filter(Boolean))];
    const { data: accounts } = customerIds.length
      ? await supabase
          .from("vip_accounts")
          .select("id, discount_tier, verification_status, verified_at")
          .in("id", customerIds)
      : { data: [] };
    const accountMap = new Map((accounts || []).map((account) => [account.id, account]));
    const { data: tiers } = await supabase
      .from("customer_tiers")
      .select("code, name, discount_percent")
      .order("code");
    return json({
      ok: true,
      orders: (data || []).map((order) => ({
        ...order,
        customer_account: accountMap.get(order.customer_id) || null,
        sales_rep_name: salesRepMap.get(order.sales_rep_id) || null,
      })),
      tiers: tiers || [],
    });
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

// Hóa đơn bán hàng — phát hành khi đơn chuyển sang "completed" (đã hoàn
// thành giao hàng), khác với phiếu xác nhận ở trên (phát hành lúc chốt giá,
// vẫn là phiếu tạm). Xem lib/sales-invoice-pdf.ts.
async function createInvoiceDocument(
  supabase: ReturnType<typeof getCustomerSupabaseAdmin>,
  orderId: string,
  actor: string
) {
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, order_code, customer_id, customer_code, customer_name, customer_phone, customer_company, delivery_name, delivery_phone, delivery_address, note, subtotal, discount_amount, shipping_amount, grand_total, paid_amount, debt_amount, completed_at, sales_rep_id, order_items(id, sku, name, unit, quantity, unit_price, line_total)")
    .eq("id", orderId)
    .single();
  if (orderError || !order) throw orderError || new Error("Không tìm thấy đơn hàng để tạo hóa đơn");

  const [{ data: customer }, { data: rep }] = await Promise.all([
    supabase.from("vip_accounts").select("tax_code").eq("id", order.customer_id).maybeSingle(),
    order.sales_rep_id
      ? supabase.from("admin_profiles").select("name").eq("id", order.sales_rep_id).maybeSingle()
      : Promise.resolve({ data: null as { name: string } | null }),
  ]);

  const snapshot: SalesInvoiceSnapshot = {
    id: order.id,
    order_code: order.order_code,
    customer_code: order.customer_code,
    customer_name: order.customer_name,
    customer_phone: order.customer_phone,
    customer_company: order.customer_company,
    customer_tax_code: customer?.tax_code || null,
    delivery_name: order.delivery_name,
    delivery_phone: order.delivery_phone,
    delivery_address: order.delivery_address,
    note: order.note,
    subtotal: Number(order.subtotal),
    discount_amount: Number(order.discount_amount),
    shipping_amount: Number(order.shipping_amount),
    grand_total: Number(order.grand_total),
    paid_amount: Number(order.paid_amount) || 0,
    debt_amount: order.debt_amount != null ? Number(order.debt_amount) : null,
    completed_at: order.completed_at,
    sales_rep_name: rep?.name || null,
    // Hóa đơn chỉ liệt kê mặt hàng thực giao (SL > 0) — dòng giao 0 (thiếu hàng) vẫn nằm trong đơn để truy vết
    order_items: (order.order_items || []).filter((item: { quantity?: number }) => Number(item.quantity) > 0) as ConfirmationOrderItem[],
  };

  const fileName = `HOA-DON_${order.order_code}.pdf`;
  const storagePath = `${order.id}/${fileName}`;
  const pdf = await generateSalesInvoicePdf(snapshot);
  const fileHash = createHash("sha256").update(pdf).digest("hex");

  const { error: uploadError } = await supabase.storage
    .from("order-confirmations")
    .upload(storagePath, pdf, { contentType: "application/pdf", upsert: true });
  if (uploadError) throw uploadError;

  const { error: documentError } = await supabase.from("order_documents").upsert(
    {
      order_id: order.id,
      document_type: "invoice",
      revision: 1,
      storage_path: storagePath,
      file_hash: fileHash,
      snapshot,
      status: "generated",
      generated_by: actor,
      generated_at: new Date().toISOString(),
    },
    { onConflict: "order_id,document_type,revision" }
  );
  if (documentError) throw documentError;

  await supabase.from("orders").update({ invoice_document_status: "generated" }).eq("id", order.id);
  return { fileName };
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) {
    return json({ ok: false, error: auth.error }, 401);
  }
  const body = await req.json().catch(() => null);
  const orderId = String(body?.orderId || "").trim();
  const customerTier = String(body?.customerTier || "VIP0").trim();
  const pricingMode = String(body?.pricingMode || "tier").trim();
  const actor = String(body?.actor || "admin").trim().slice(0, 120) || "admin";
  if (!orderId) return json({ ok: false, error: "Thiếu mã đơn hàng" }, 400);

  try {
    const supabase = getCustomerSupabaseAdmin();
    const result = await finalizeOrderCore(supabase, {
      orderId,
      customerTier,
      pricingMode,
      orderDiscountPercent: Number(body?.orderDiscountPercent || 0),
      shippingAmount: Number(body?.shippingAmount || 0),
      items: Array.isArray(body?.items) ? body.items : [],
      verificationNote: String(body?.verificationNote || "").trim(),
      pricingNote: String(body?.pricingNote || "").trim(),
      actor,
    });
    return json({ ok: true, order: result.order, document: result.document, warning: result.warning });
  } catch (error) {
    console.error("Admin order finalize error:", error);
    return json({ ok: false, error: error instanceof Error ? error.message : "Không chốt được giá đơn hàng" }, 500);
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) {
    return json({ ok: false, error: auth.error }, 401);
  }

  const body = await req.json().catch(() => null);
  const orderId = String(body?.orderId || "").trim();
  const hasStatusChange = body?.status !== undefined && body?.status !== null && String(body.status).trim() !== "";
  const nextStatus = String(body?.status || "").trim();
  const paymentStatus = body?.paymentStatus
    ? String(body.paymentStatus).trim()
    : undefined;
  const paymentMethod = body?.paymentMethod
    ? String(body.paymentMethod).trim().toUpperCase()
    : undefined;
  const note = String(body?.note || "").trim();
  // Giao hàng tự vận chuyển (mục 14.2-1 KE_HOACH) — cập nhật độc lập với đổi
  // trạng thái, vì soạn/giao hàng có thể chỉnh nhiều lần trước khi đơn hoàn tất.
  const delivery = body?.delivery && typeof body.delivery === "object" ? body.delivery : null;
  // Số lượng đã giao thực tế theo dòng (mục 14.2-2) — [{itemId, quantityDelivered}]
  const itemDeliveries: Array<{ itemId: string; quantityDelivered: number }> = Array.isArray(body?.itemDeliveries)
    ? body.itemDeliveries
        .map((row: Record<string, unknown>) => ({
          itemId: String(row?.itemId || "").trim(),
          quantityDelivered: Number(row?.quantityDelivered),
        }))
        .filter((row: { itemId: string; quantityDelivered: number }) => row.itemId && Number.isFinite(row.quantityDelivered) && row.quantityDelivered >= 0)
    : [];
  const regenerateInvoice = body?.regenerateInvoice === true;

  if (!orderId) {
    return json({ ok: false, error: "Thiếu mã đơn hàng" }, 400);
  }
  if (hasStatusChange && !ORDER_STATUSES.includes(nextStatus as (typeof ORDER_STATUSES)[number])) {
    return json({ ok: false, error: "Trạng thái đơn hàng không hợp lệ" }, 400);
  }
  if (!hasStatusChange && !delivery && !itemDeliveries.length && !regenerateInvoice && !paymentMethod && !paymentStatus) {
    return json({ ok: false, error: "Không có nội dung cần cập nhật" }, 400);
  }
  if (
    paymentStatus &&
    !PAYMENT_STATUSES.includes(paymentStatus as (typeof PAYMENT_STATUSES)[number])
  ) {
    return json({ ok: false, error: "Trạng thái thanh toán không hợp lệ" }, 400);
  }
  if (paymentMethod && !PAYMENT_METHODS.includes(paymentMethod as (typeof PAYMENT_METHODS)[number])) {
    return json({ ok: false, error: "Phương thức thanh toán không hợp lệ" }, 400);
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

    // Hoàn thành và Đã hủy là hai trạng thái kết thúc. Không cho phép đưa
    // đơn quay ngược về Chờ xác nhận/Đang xử lý vì sẽ làm lệch lịch sử giao
    // hàng, công nợ và chứng từ đã phát hành. Nếu cần xử lý ngoại lệ phải có
    // quy trình điều chỉnh riêng, không dùng dropdown trạng thái thông thường.
    if (hasStatusChange && current.status !== nextStatus && ["completed", "canceled"].includes(String(current.status))) {
      return json(
        { ok: false, error: `Đơn đã ở trạng thái kết thúc "${current.status === "completed" ? "Hoàn thành" : "Đã hủy"}", không thể chuyển ngược trạng thái.` },
        409,
      );
    }

    if (itemDeliveries.length) {
      for (const row of itemDeliveries) {
        const { error: itemError } = await supabase
          .from("order_items")
          .update({ quantity_delivered: row.quantityDelivered })
          .eq("id", row.itemId)
          .eq("order_id", orderId);
        if (itemError) throw itemError;
      }
    }

    if (!hasStatusChange) {
      const deliveryUpdates: Record<string, unknown> = {};
      if (paymentStatus) deliveryUpdates.payment_status = paymentStatus;
      if (paymentMethod) deliveryUpdates.payment_method = paymentMethod;
      if (delivery) {
        if (delivery.packageWeightG !== undefined) deliveryUpdates.package_weight_g = delivery.packageWeightG === null ? null : Number(delivery.packageWeightG) || null;
        if (delivery.packageDimensions !== undefined) deliveryUpdates.package_dimensions = String(delivery.packageDimensions || "").trim() || null;
        if (delivery.assignedDriver !== undefined) deliveryUpdates.assigned_driver = String(delivery.assignedDriver || "").trim() || null;
        if (delivery.codCollectAmount !== undefined) deliveryUpdates.cod_collect_amount = Number(delivery.codCollectAmount) || 0;
        // Địa chỉ/người nhận/ghi chú — cần khi "Xử lý đơn hàng" sửa lại các
        // trường này ngay trong màn Bán hàng (mục brief 2026-09-10).
        if (delivery.deliveryAddress !== undefined) deliveryUpdates.delivery_address = String(delivery.deliveryAddress || "").trim() || null;
        if (delivery.deliveryName !== undefined) deliveryUpdates.delivery_name = String(delivery.deliveryName || "").trim() || null;
        if (delivery.deliveryPhone !== undefined) deliveryUpdates.delivery_phone = String(delivery.deliveryPhone || "").trim() || null;
        if (delivery.note !== undefined) deliveryUpdates.note = String(delivery.note || "").trim() || null;
      }
      const { data: updated, error: updateError } = Object.keys(deliveryUpdates).length
        ? await supabase.from("orders").update(deliveryUpdates).eq("id", orderId).select("*, order_items(*)").single()
        : await supabase.from("orders").select("*, order_items(*)").eq("id", orderId).single();
      if (updateError) throw updateError;

      let regenerateWarning = "";
      if (regenerateInvoice) {
        if (current.status !== "completed") {
          return json({ ok: false, error: "Chỉ tạo lại hóa đơn khi đơn đã hoàn thành" }, 409);
        }
        try {
          await createInvoiceDocument(supabase, orderId, auth.profile?.name || "admin");
        } catch (invoiceError) {
          console.error("Tạo lại hóa đơn bán hàng lỗi:", invoiceError);
          regenerateWarning = "Không tạo lại được hóa đơn, thử lại sau.";
        }
      }
      return json({ ok: true, order: updated, warning: regenerateWarning || undefined });
    }
    if (
      current.pricing_status !== "finalized" &&
      nextStatus !== "pending" &&
      nextStatus !== "canceled"
    ) {
      return json(
        { ok: false, error: "Phải phân loại khách và chốt đơn giá trước khi chuyển trạng thái xử lý" },
        409
      );
    }
    if (
      current.pricing_status !== "finalized" &&
      paymentStatus &&
      ["paid", "refunded"].includes(paymentStatus)
    ) {
      return json(
        { ok: false, error: "Không thể ghi nhận thanh toán khi đơn giá chưa được xác nhận" },
        409
      );
    }

    // HOÀN THÀNH phải qua bước XÁC NHẬN THỰC GIAO (yêu cầu 2026-09-20): hóa đơn tính theo số thực giao.
    // confirmFullDelivery=true => giao đủ 100% (1 chạm). Nếu migration 20260920g chưa chạy
    // (cột delivery_confirmed_at chưa có) thì bỏ qua chốt chặn để luồng cũ vẫn chạy.
    if (nextStatus === "completed" && current.status !== "completed" && "delivery_confirmed_at" in current && !current.delivery_confirmed_at) {
      if (body?.confirmFullDelivery === true) {
        try {
          await reconcileDelivery(supabase, {
            orderId,
            full: true,
            actor: String(auth.profile?.name || auth.profile?.email || "admin"),
            note: "Giao đủ 100% (xác nhận khi hoàn thành)",
          });
        } catch (reconcileError) {
          return json(
            { ok: false, error: reconcileError instanceof Error ? reconcileError.message : "Không xác nhận được thực giao" },
            409
          );
        }
      } else {
        return json(
          { ok: false, code: "delivery_not_confirmed", error: "Cần xác nhận số lượng thực giao trước khi hoàn thành đơn (hóa đơn tính theo số thực giao)" },
          409
        );
      }
    }

    const now = new Date().toISOString();
    const updates: Record<string, unknown> = { status: nextStatus };
    if (paymentStatus) updates.payment_status = paymentStatus;
    if (paymentMethod) updates.payment_method = paymentMethod;
    if (nextStatus === "confirmed" && !current.confirmed_at) updates.confirmed_at = now;
    if (nextStatus === "shipping" && !current.shipping_at) updates.shipping_at = now;
    if (nextStatus === "completed" && !current.completed_at) updates.completed_at = now;
    if (nextStatus === "canceled" && !current.canceled_at) updates.canceled_at = now;
    if (delivery) {
      if (delivery.packageWeightG !== undefined) updates.package_weight_g = delivery.packageWeightG === null ? null : Number(delivery.packageWeightG) || null;
      if (delivery.packageDimensions !== undefined) updates.package_dimensions = String(delivery.packageDimensions || "").trim() || null;
      if (delivery.assignedDriver !== undefined) updates.assigned_driver = String(delivery.assignedDriver || "").trim() || null;
      if (delivery.codCollectAmount !== undefined) updates.cod_collect_amount = Number(delivery.codCollectAmount) || 0;
      if (delivery.deliveryAddress !== undefined) updates.delivery_address = String(delivery.deliveryAddress || "").trim() || null;
      if (delivery.deliveryName !== undefined) updates.delivery_name = String(delivery.deliveryName || "").trim() || null;
      if (delivery.deliveryPhone !== undefined) updates.delivery_phone = String(delivery.deliveryPhone || "").trim() || null;
      if (delivery.note !== undefined) updates.note = String(delivery.note || "").trim() || null;
    }

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
      actor: auth.profile?.name || auth.profile?.email || "admin",
      payload: paymentStatus ? { paymentStatus } : {},
    });
    if (historyError) throw historyError;

    // Trừ kho đúng lúc đơn được XÁC NHẬN (không phải lúc tạo nháp) — chỉ áp
    // dụng cho sản phẩm track_inventory = true, tự bỏ qua nếu đã trừ rồi
    // (idempotent). Không chặn việc đổi trạng thái nếu bước này lỗi — trạng
    // thái đơn quan trọng hơn, lệch tồn kho có thể chỉnh tay sau qua trang
    // Hàng hóa (inventory_transactions là nguồn sự thật, xem lại được).
    if (nextStatus === "confirmed" && current.status !== "confirmed") {
      const { error: deductError } = await supabase.rpc("deduct_inventory_for_order", {
        p_order_id: orderId,
        p_actor: auth.profile?.name || "admin",
      });
      if (deductError) console.error("deduct_inventory_for_order lỗi:", deductError.message);
    }

    // Hủy đơn đã xác nhận/đang soạn: hoàn lại tồn kho đã trừ (idempotent; migration 20260920g). Lỗi không chặn hủy.
    if (nextStatus === "canceled" && ["confirmed", "preparing"].includes(current.status)) {
      const { error: restoreError } = await supabase.rpc("sync_order_inventory", {
        p_order_id: orderId,
        p_actor: auth.profile?.name || "admin",
        p_mode: "zero",
      });
      if (restoreError) console.error("sync_order_inventory(zero) lỗi:", restoreError.message);
    }

    // Hóa đơn bán hàng — phát hành đúng lúc HOÀN THÀNH GIAO HÀNG (không phải
    // lúc chốt giá), khớp yêu cầu "lúc này mới tạo hoá đơn/invoice chứ nhỉ
    // còn lúc xác nhận đơn hàng chỉ là phiếu tạm thôi" (2026-09-11). Không
    // chặn đổi trạng thái nếu bước này lỗi — ghi log để tạo lại sau.
    let invoiceWarning = "";
    if (nextStatus === "completed" && current.status !== "completed") {
      try {
        await createInvoiceDocument(supabase, orderId, auth.profile?.name || "admin");
      } catch (invoiceError) {
        console.error("Tạo hóa đơn bán hàng lỗi:", invoiceError);
        await supabase.from("orders").update({ invoice_document_status: "failed" }).eq("id", orderId);
        invoiceWarning = "Đơn đã hoàn thành nhưng chưa tạo được hóa đơn. Có thể bấm tạo lại.";
      }
    }

    // Push notification cho khách hàng (order-webapp cài PWA) — không chặn
    // response nếu gửi lỗi/khách chưa bật thông báo, chỉ log lại.
    const STATUS_PUSH_LABEL: Record<string, string> = {
      confirmed: "đã được xác nhận",
      shipping: "đang được giao",
      completed: "đã giao thành công",
      canceled: "đã bị hủy",
    };
    const pushLabel = STATUS_PUSH_LABEL[nextStatus];
    if (pushLabel && updated?.customer_id) {
      sendPushToCustomer(updated.customer_id, {
        title: `Đơn ${updated.order_code} ${pushLabel}`,
        body:
          nextStatus === "completed"
            ? "Cảm ơn bạn đã đặt hàng tại TPS1! Xem hóa đơn trong mục Đơn hàng của tôi."
            : "Bấm để xem chi tiết đơn hàng.",
        url: `/don-hang/${orderId}`,
        tag: `order-${orderId}`,
      }).catch((err) => console.error("sendPushToCustomer lỗi:", err));
    }

    return json({ ok: true, order: updated, warning: invoiceWarning || undefined });
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
