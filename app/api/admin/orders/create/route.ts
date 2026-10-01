import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { can } from "@/lib/permissions";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";
import {
  fetchOrderCutoffConfig,
  calculateEarliestDate,
  getOrderCutoffInfo,
  getVnDateParts,
} from "@/lib/order-cutoff";
import { resolvePriceBookPrices } from "@/lib/price-book-resolver";

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

  // 1. Kiểm tra quyền orders.create
  if (!can(auth.profile?.role, "orders.create")) {
    return json({ ok: false, error: "Bạn không có quyền tạo đơn hàng" }, 403);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Dữ liệu JSON không hợp lệ" }, 400);
  }

  const {
    customerId,
    items,
    deliveryDate: reqDeliveryDate,
    deliveryAddressId,
    deliveryName: reqDeliveryName,
    deliveryPhone: reqDeliveryPhone,
    deliveryAddress: reqDeliveryAddress,
    deliveryAlias: reqDeliveryAlias,
    saveNewAddress,
    externalRef: reqExternalRef,
    note,
    voucherCode,
    packageWeightG,
    packageDimensions,
    assignedDriver,
    codCollectAmount,
    paymentMethod: reqPaymentMethod,
    creditOverrideNote,
    idempotencyKey: reqIdempotencyKey,
  } = body || {};

  const paymentMethod = String(reqPaymentMethod || "COD").trim().toUpperCase();
  if (!["COD", "CREDIT", "TRANSFER", "CASH"].includes(paymentMethod)) {
    return json({ ok: false, error: "Phương thức thanh toán không hợp lệ" }, 400);
  }

  if (!customerId || typeof customerId !== "string") {
    return json({ ok: false, error: "Vui lòng chọn khách hàng" }, 400);
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return json({ ok: false, error: "Giỏ hàng phải có ít nhất 1 sản phẩm" }, 400);
  }

  const supabase = getCustomerSupabaseAdmin();

  // 2. Lấy thông tin khách hàng từ vip_accounts
  const { data: customer, error: custErr } = await supabase
    .from("vip_accounts")
    .select("id, name, partner_code, phone, company, address, credit_limit, verification_status, is_active")
    .eq("id", customerId)
    .maybeSingle();

  if (custErr || !customer) {
    return json({ ok: false, error: "Không tìm thấy thông tin khách hàng" }, 400);
  }

  if (!customer.is_active) {
    return json({ ok: false, error: `Khách hàng "${customer.name}" đang bị khóa tài khoản` }, 400);
  }

  // 3. Tính toán ngày giao và giờ chốt đơn
  const cutoffConfig = await fetchOrderCutoffConfig();
  const now = new Date();
  const earliestDate = calculateEarliestDate(now, cutoffConfig);

  let deliveryDate = reqDeliveryDate && /^\d{4}-\d{2}-\d{2}$/.test(String(reqDeliveryDate).trim())
    ? String(reqDeliveryDate).trim()
    : earliestDate;

  // Ngày giao hợp lệ: từ hôm nay (giờ VN) đến +60 ngày — tránh gõ nhầm năm / ngày quá khứ
  const todayVn = getVnDateParts(now).ymd;
  const maxYmd = new Date(Date.UTC(Number(todayVn.slice(0, 4)), Number(todayVn.slice(5, 7)) - 1, Number(todayVn.slice(8, 10)) + 60))
    .toISOString()
    .slice(0, 10);
  if (deliveryDate < todayVn || deliveryDate > maxYmd) {
    return json({ ok: false, error: "Ngày giao phải từ hôm nay đến tối đa 60 ngày tới" }, 400);
  }

  // Tính cờ trễ giờ chốt
  const cutoffInfo = getOrderCutoffInfo(now, deliveryDate, cutoffConfig);
  const isLateOrder = cutoffInfo.isLate;

  // 4. Xử lý điểm giao hàng
  let deliveryName = reqDeliveryName ? String(reqDeliveryName).trim() : customer.name || "";
  let deliveryPhone = reqDeliveryPhone ? String(reqDeliveryPhone).trim() : customer.phone || "";
  let deliveryAddress = reqDeliveryAddress ? String(reqDeliveryAddress).trim() : customer.address || "";
  let deliveryAlias = reqDeliveryAlias ? String(reqDeliveryAlias).trim() : "Địa chỉ giao hàng";
  let resolvedAddressId: string | null = null;

  if (deliveryAddressId) {
    const { data: addrData } = await supabase
      .from("customer_addresses")
      .select("id, label, address, contact_name, contact_phone")
      .eq("id", deliveryAddressId)
      .eq("customer_id", customerId)
      .maybeSingle();

    if (addrData) {
      resolvedAddressId = addrData.id;
      deliveryAddress = addrData.address || deliveryAddress;
      if (addrData.contact_name) deliveryName = addrData.contact_name;
      if (addrData.contact_phone) deliveryPhone = addrData.contact_phone;
      if (addrData.label) deliveryAlias = addrData.label;
    }
  } else if (saveNewAddress && deliveryAddress) {
    // Lưu địa chỉ mới vào customer_addresses nếu nhân viên yêu cầu
    try {
      const { data: newAddr } = await supabase
        .from("customer_addresses")
        .insert({
          customer_id: customerId,
          label: deliveryAlias || "Địa chỉ mới",
          address: deliveryAddress,
          contact_name: deliveryName,
          contact_phone: deliveryPhone,
          is_default: false,
          is_active: true,
        })
        .select("id")
        .maybeSingle();

      if (newAddr?.id) {
        resolvedAddressId = newAddr.id;
      }
    } catch (saveAddrErr) {
      console.warn("[POS CREATE] Không thể lưu địa chỉ mới vào customer_addresses:", saveAddrErr);
    }
  }

  // 5. Chuẩn hóa sản phẩm và giải quyết giá hoàn toàn ở server.
  // Client chỉ gửi productId + số lượng; giá client không phải nguồn sự thật.
  let orderTotal = 0;
  const invalidQtyNames: string[] = [];
  const productIds = [...new Set(items.map((i: any) => String(i.productId || "").trim()).filter(Boolean))] as string[];
  const { data: databaseProducts, error: databaseProductsError } = productIds.length
    ? await supabase.from("products").select("id, name, sku, unit, active").in("id", productIds)
    : { data: [], error: null };
  if (databaseProductsError) throw databaseProductsError;
  const productById = new Map((databaseProducts || []).map((product: any) => [product.id, product]));
  const resolvedPriceMap = await resolvePriceBookPrices(supabase, customerId, productIds);
  const missingPriceNames: string[] = [];
  const missingProductNames: string[] = [];
  const usedBooks = new Map<string, { id: string; version: number; name: string; source: string }>();

  const sanitizedItems = items.map((i: any) => {
    const qty = Number(i.quantity);
    // Không âm thầm "sửa" số lượng sai thành 1 — báo lỗi để nhân viên nhập lại (tránh sai đơn)
    if (!Number.isFinite(qty) || qty <= 0) invalidQtyNames.push(String(i.name || "Sản phẩm"));
    const validQty = Number.isFinite(qty) && qty > 0 ? qty : 1;
    const productId = String(i.productId || "").trim() || null;
    const product = productId ? productById.get(productId) : null;
    let validPrice = 0;
    let priceSource = "manual";
    let priceBookId: string | null = null;
    let priceBookVersion: number | null = null;
    let priceBookName: string | null = null;

    if (productId) {
      if (!product || !product.active) {
        missingProductNames.push(String(i.name || productId));
      } else {
        const resolved = resolvedPriceMap.get(productId);
        if (resolved?.price == null) {
          missingPriceNames.push(product.name || String(i.name || productId));
        } else {
          validPrice = Number(resolved.price);
          priceSource = resolved.priceSource;
          priceBookId = resolved.priceBookId;
          priceBookVersion = resolved.priceBookVersion;
          priceBookName = resolved.priceBookName;
          if (priceBookId) usedBooks.set(priceBookId, {
            id: priceBookId,
            version: priceBookVersion || 1,
            name: priceBookName || "Bảng giá",
            source: priceSource,
          });
        }
      }
    } else {
      const manualPrice = Number(i.price != null ? i.price : i.baseUnitPrice);
      const manualReason = String(i.manualPriceReason || i.note || "").trim();
      if (!can(auth.profile?.role, "orders.finalize_pricing") || !Number.isFinite(manualPrice) || manualPrice < 0 || !manualReason) {
        missingPriceNames.push(`${String(i.name || "Sản phẩm ngoài danh mục")} (cần giá và lý do nhập tay)`);
      } else {
        validPrice = manualPrice;
      }
    }
    orderTotal += validQty * validPrice;

    return {
      productId,
      name: String(product?.name || i.name || "Sản phẩm").trim(),
      unit: String(product?.unit || i.unit || "Kg").trim(),
      quantity: validQty,
      price: validPrice,
      note: i.note ? String(i.note).trim() : null,
      priceSource,
      priceBookId,
      priceBookVersion,
    };
  });

  if (invalidQtyNames.length) {
    return json({ ok: false, error: `Số lượng không hợp lệ (phải > 0): ${invalidQtyNames.join(", ")}` }, 400);
  }
  if (missingProductNames.length) {
    return json({ ok: false, error: `Sản phẩm không tồn tại hoặc đã ngừng kinh doanh: ${missingProductNames.join(", ")}` }, 400);
  }
  if (missingPriceNames.length) {
    return json({
      ok: false,
      code: "PRICE_MISSING",
      error: `Chưa có giá hợp lệ: ${missingPriceNames.join(", ")}`,
    }, 409);
  }

  // 6. Kiểm tra hạn mức công nợ (credit_limit > 0)
  const creditLimit = Number(customer.credit_limit) || 0;
  let hasOverriddenCredit = false;

  if (creditLimit > 0) {
    // Tính tổng nợ hiện tại từ các đơn chưa paid và không bị hủy
    const { data: unpaidOrders } = await supabase
      .from("orders")
      .select("grand_total, paid_amount, debt_amount")
      .eq("customer_id", customerId)
      .neq("status", "canceled")
      .neq("payment_status", "paid");

    const currentDebt = (unpaidOrders || []).reduce((sum, o) => {
      const debt = o.debt_amount != null
        ? Number(o.debt_amount)
        : Math.max(0, (Number(o.grand_total) || 0) - (Number(o.paid_amount) || 0));
      return sum + debt;
    }, 0);

    const projectedDebt = currentDebt + orderTotal;
    if (projectedDebt > creditLimit) {
      // Vượt hạn mức: kiểm tra xem người tạo có quyền credit_override không
      const canOverride = can(auth.profile?.role, "orders.credit_override");
      if (!canOverride) {
        return json(
          {
            ok: false,
            error: `Đơn này vượt hạn mức công nợ khách hàng (hạn mức ${creditLimit.toLocaleString("vi-VN")} đ, dự kiến công nợ sau đơn ${projectedDebt.toLocaleString("vi-VN")} đ). Vui lòng liên hệ Trưởng phòng hoặc Admin duyệt.`,
            overCreditLimit: true,
            creditLimit,
            projectedDebt,
          },
          400
        );
      }

      if (!creditOverrideNote || !String(creditOverrideNote).trim()) {
        return json(
          {
            ok: false,
            error: "Đơn vượt hạn mức công nợ. Cần nhập lý do duyệt vượt hạn mức.",
            requiresOverrideNote: true,
            creditLimit,
            projectedDebt,
          },
          400
        );
      }

      hasOverriddenCredit = true;
    }
  }

  // 7. Gọi RPC admin_create_order tạo đơn hàng
  const adminId = auth.profile?.id !== "legacy-admin" ? auth.profile?.id : null;
  // Client gửi 1 khóa cho mỗi lần bấm Tạo đơn (bấm đúp/thử lại không sinh đơn thứ 2); không có thì tự sinh như cũ
  const idempotencyKey =
    typeof reqIdempotencyKey === "string" && reqIdempotencyKey.trim()
      ? `sale-${reqIdempotencyKey.trim().slice(0, 100)}`
      : `sale-${Date.now()}-${customerId}`;

  const { data: rpcData, error: rpcErr } = await supabase.rpc("admin_create_order", {
    p_customer_id: customerId,
    p_items: sanitizedItems.map((i) => ({
      product_id: i.productId,
      name: i.name,
      unit: i.unit,
      quantity: i.quantity,
      base_unit_price: i.price,
      price_source: i.priceSource,
      price_book_id: i.priceBookId,
      price_book_version: i.priceBookVersion,
    })),
    p_delivery_type: deliveryAddress ? "shipping" : "pickup",
    p_delivery_alias: deliveryAlias,
    p_delivery_name: deliveryName || null,
    p_delivery_phone: deliveryPhone || null,
    p_delivery_address: deliveryAddress || null,
    p_note: note ? String(note).trim() : null,
    p_idempotency_key: idempotencyKey,
    p_voucher_code: voucherCode ? String(voucherCode).trim() : null,
    p_admin_id: adminId,
  });

  if (rpcErr) {
    console.error("RPC admin_create_order lỗi:", rpcErr);
    return json({ ok: false, error: rpcErr.message || "Không thể tạo đơn hàng" }, 400);
  }

  const createdOrder = Array.isArray(rpcData) ? rpcData[0] : rpcData;
  const orderId = createdOrder?.id;
  const orderCode = createdOrder?.order_code;

  if (!orderId) {
    return json({ ok: false, error: "Đơn hàng tạo không thành công (không có ID)" }, 500);
  }

  // RPC cũ chỉ nhận giá đã được server resolve. Ghi snapshot nguồn giá vào
  // từng dòng và đơn để mọi lần kiểm tra sau truy được đúng bảng giá.
  const { data: createdLines } = await supabase.from("order_items")
    .select("id, product_id")
    .eq("order_id", orderId);
  for (const line of createdLines || []) {
    const source = sanitizedItems.find((item) => item.productId === line.product_id);
    if (!source) continue;
    await supabase.from("order_items").update({
      assigned_unit_price: source.price,
      final_unit_price: source.price,
      price_source: source.priceSource,
      price_book_id: source.priceBookId,
      price_book_version: source.priceBookVersion,
      price_resolved_at: new Date().toISOString(),
    }).eq("id", line.id);
  }
  const primaryBook = [...usedBooks.values()][0] || null;
  await supabase.from("orders").update({
    customer_tier: null,
    discount_percent: 0,
    price_book_id: primaryBook?.id || null,
    price_book_version: primaryBook?.version || null,
    price_resolution_status: "resolved",
    customer_price_source: [...new Set([...usedBooks.values()].map((book) => book.source))].join(",") || "manual",
  }).eq("id", orderId);

  // 8. Cập nhật các trường Phase 1 (F1: không bao giờ trả lỗi sau khi đơn đã tạo)
  const warnings: string[] = [];
  const externalRef = reqExternalRef ? String(reqExternalRef).trim() : null;

  try {
    const updatePayload: Record<string, any> = {
      delivery_date: deliveryDate,
      is_late_order: isLateOrder,
      delivery_alias: deliveryAlias,
      payment_method: paymentMethod,
      updated_at: new Date().toISOString(),
    };

    if (resolvedAddressId) {
      updatePayload.delivery_address_id = resolvedAddressId;
    }
    if (externalRef) {
      updatePayload.external_ref = externalRef;
    }
    if (deliveryAddress) {
      updatePayload.delivery_address = deliveryAddress;
    }
    if (deliveryName) {
      updatePayload.delivery_name = deliveryName;
    }
    if (deliveryPhone) {
      updatePayload.delivery_phone = deliveryPhone;
    }

    // Các trường kiện hàng vận chuyển nếu có
    if (packageWeightG != null && packageWeightG !== "") {
      updatePayload.package_weight_g = Number(packageWeightG) || null;
    }
    if (packageDimensions) {
      updatePayload.package_dimensions = String(packageDimensions).trim();
    }
    if (assignedDriver) {
      updatePayload.assigned_driver = String(assignedDriver).trim();
    }
    if (codCollectAmount != null && codCollectAmount !== "") {
      updatePayload.cod_collect_amount = Number(codCollectAmount) || 0;
    }

    const { error: upOrderErr } = await supabase
      .from("orders")
      .update(updatePayload)
      .eq("id", orderId);

    if (upOrderErr) {
      console.warn("[POS CREATE] Cập nhật thông tin đơn hàng thất bại:", upOrderErr.message);
      warnings.push("delivery_fields_update_warning");
    }
  } catch (ex) {
    console.warn("[POS CREATE] Ngoại lệ khi cập nhật orders:", ex);
    warnings.push("delivery_fields_exception");
  }

  // Cập nhật customer_note cho từng dòng order_items nếu có
  try {
    const itemsWithNote = sanitizedItems.filter((i) => i.note && i.productId);
    if (itemsWithNote.length > 0) {
      await Promise.allSettled(
        itemsWithNote.map((it) =>
          supabase
            .from("order_items")
            .update({ customer_note: it.note })
            .eq("order_id", orderId)
            .eq("product_id", it.productId)
        )
      );
    }
  } catch (itemNoteEx) {
    console.warn("[POS CREATE] Ngoại lệ khi cập nhật ghi chú dòng order_items:", itemNoteEx);
    warnings.push("item_notes_exception");
  }

  // 9. Nếu có duyệt vượt hạn mức công nợ -> ghi log vào order_history
  if (hasOverriddenCredit && creditOverrideNote) {
    try {
      await supabase.from("order_history").insert({
        order_id: orderId,
        action: "credit_override_approved",
        actor: auth.profile?.name || "Admin",
        note: `Duyệt vượt hạn mức công nợ: ${creditOverrideNote.trim()}`,
        payload: {
          approved_by_id: auth.profile?.id,
          credit_limit: creditLimit,
          order_total: orderTotal,
        },
      });
    } catch (histErr) {
      console.warn("[POS CREATE] Không thể ghi lịch sử duyệt hạn mức:", histErr);
    }
  }

  return json({
    ok: true,
    orderId,
    orderCode,
    deliveryDate,
    isLate: isLateOrder,
    externalRef,
    warnings: warnings.length ? warnings : undefined,
  });
}
