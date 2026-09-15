import { createHash } from "crypto";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";
import { generateOrderConfirmationPdf, type ConfirmationOrderSnapshot } from "@/lib/order-confirmation-pdf";

// Lõi chốt giá đơn hàng — tách ra khỏi app/api/admin/orders/route.ts vì route
// handler của Next.js App Router chỉ được export GET/POST/... (không export
// được hàm/type dùng chung), mà logic này cần dùng lại ở cả chốt 1 đơn
// (OrderDetailPage/PosCreatePage xử lý đơn) lẫn xác nhận hàng loạt nhiều đơn
// cùng lúc (mục "Áp giá hàng ngày", 2026-09-11).

export async function createConfirmationDocument(
  supabase: ReturnType<typeof getCustomerSupabaseAdmin>,
  order: ConfirmationOrderSnapshot,
  actor: string
) {
  const revision = Number(order.price_revision || 1);
  const fileName = `XAC-NHAN-DON-HANG_${order.order_code}_R${revision}.pdf`;
  const storagePath = `${order.id}/${fileName}`;
  const pdf = await generateOrderConfirmationPdf(order);
  const fileHash = createHash("sha256").update(pdf).digest("hex");

  const bucketName = "order-confirmations";
  const { error: bucketError } = await supabase.storage.getBucket(bucketName);
  if (bucketError) {
    const { error: createBucketError } = await supabase.storage.createBucket(bucketName, {
      public: false,
      fileSizeLimit: 10 * 1024 * 1024,
      allowedMimeTypes: ["application/pdf"],
    });
    if (createBucketError && !/already exists/i.test(createBucketError.message)) {
      throw createBucketError;
    }
  }

  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(storagePath, pdf, { contentType: "application/pdf", upsert: true });
  if (uploadError) throw uploadError;

  const { data: document, error: documentError } = await supabase
    .from("order_documents")
    .upsert(
      {
        order_id: order.id,
        document_type: "order_confirmation",
        revision,
        storage_path: storagePath,
        file_hash: fileHash,
        snapshot: order,
        status: "generated",
        generated_by: actor,
        generated_at: new Date().toISOString(),
      },
      { onConflict: "order_id,document_type,revision" }
    )
    .select("id, revision, storage_path, file_hash, generated_at")
    .single();
  if (documentError) throw documentError;

  await supabase
    .from("orders")
    .update({ confirmation_document_status: "generated" })
    .eq("id", order.id);
  return { ...document, fileName };
}

export async function finalizeOrderWithLegacyLineEditor(
  supabase: ReturnType<typeof getCustomerSupabaseAdmin>,
  params: {
    orderId: string;
    customerTier: string;
    pricingMode: string;
    orderDiscountPercent: number;
    shippingAmount: number;
    items: Array<Record<string, unknown>>;
    verificationNote: string;
    pricingNote: string;
    actor: string;
  }
) {
  const { data: current, error: currentError } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", params.orderId)
    .single();
  if (currentError || !current) throw currentError || new Error("Không tìm thấy đơn hàng");
  if (["shipping", "completed", "canceled"].includes(current.status) || ["paid", "refunded"].includes(current.payment_status)) {
    throw new Error("Đơn đã khóa, không thể thay đổi danh sách sản phẩm");
  }
  if (!params.items.length) throw new Error("Đơn cuối cùng phải có ít nhất một sản phẩm");

  const originalItems = current.order_items || [];
  const originalMap = new Map(originalItems.map((item: Record<string, unknown>) => [String(item.id), item]));
  const keptIds: string[] = [];
  const finalItems: Array<{ itemId: string; finalUnitPrice: number; note: string }> = [];

  const restoreOriginalItems = async () => {
    await supabase.from("order_items").delete().eq("order_id", params.orderId);
    if (originalItems.length) await supabase.from("order_items").insert(originalItems);
  };

  try {
    for (const input of params.items) {
      const quantity = Number(input.quantity || 0);
      const finalUnitPrice = Number(input.finalUnitPrice || 0);
      const note = String(input.note || "").trim();
      if (!(quantity > 0) || finalUnitPrice < 0) throw new Error("Số lượng hoặc đơn giá sản phẩm không hợp lệ");

      let itemId = String(input.itemId || "");
      if (itemId) {
        if (!originalMap.has(itemId)) throw new Error("Một sản phẩm trong đơn không còn tồn tại");
        const { error } = await supabase
          .from("order_items")
          .update({ quantity, pricing_note: note || null })
          .eq("id", itemId)
          .eq("order_id", params.orderId);
        if (error) throw error;
      } else {
        const identifier = String(input.productId || input.productLocalId || "").trim();
        if (!identifier) throw new Error("Thiếu mã sản phẩm cần thêm");
        const { data: product, error: productError } = await supabase
          .from("products")
          .select("id, local_product_id, sku, name, unit, price_retail, price_wholesale")
          .or(`id.eq.${identifier},local_product_id.eq.${identifier}`)
          .eq("active", true)
          .limit(1)
          .maybeSingle();
        if (productError || !product) throw productError || new Error(`Không tìm thấy sản phẩm ${identifier}`);
        const basePrice = Number(product.price_retail) || Number(product.price_wholesale) || 0;
        const { data: inserted, error: insertError } = await supabase
          .from("order_items")
          .insert({
            order_id: params.orderId,
            product_id: product.id,
            product_local_id: product.local_product_id,
            sku: product.sku,
            name: product.name,
            unit: product.unit || "Kg",
            quantity,
            base_unit_price: basePrice,
            original_base_unit_price: basePrice,
            discount_percent: 0,
            unit_price: basePrice,
            line_total: Math.round(basePrice * quantity),
            pricing_mode: params.pricingMode,
            pricing_note: note || null,
          })
          .select("id")
          .single();
        if (insertError || !inserted) throw insertError || new Error("Không thêm được sản phẩm");
        itemId = inserted.id;
      }
      keptIds.push(itemId);
      finalItems.push({ itemId, finalUnitPrice, note });
    }

    const removeIds = originalItems
      .map((item: Record<string, unknown>) => String(item.id))
      .filter((id: string) => !keptIds.includes(id));
    if (removeIds.length) {
      const { error: deleteError } = await supabase.from("order_items").delete().in("id", removeIds).eq("order_id", params.orderId);
      if (deleteError) throw deleteError;
    }

    // Tính giá JS thuần: không gọi RPC để tránh hard-check tier trong DB cũ
    // Tra cứu discount_percent của tier (nếu không tìm thấy → 0%)
    const { data: tierRow } = await supabase
      .from("customer_tiers")
      .select("discount_percent")
      .eq("code", params.customerTier)
      .maybeSingle();
    const tierDiscountPct = Number(tierRow?.discount_percent) || 0;

    // Load giá hợp đồng riêng từng mặt hàng của khách — ưu tiên cao nhất
    // Khớp với logic resolve_product_price() trong DB.
    const today = new Date().toISOString().slice(0, 10);
    const { data: contractRows } = await supabase
      .from("customer_contract_prices")
      .select("product_id, price")
      .eq("customer_id", current.customer_id)
      .or(`valid_until.is.null,valid_until.gte.${today}`);
    const contractMap: Record<string, number> = {};
    for (const row of contractRows || []) {
      contractMap[row.product_id] = Number(row.price);
    }

    // Lấy lại danh sách order_items hiện tại sau khi đã sửa ở trên
    const { data: currentItems, error: itemsErr } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", params.orderId);
    if (itemsErr) throw itemsErr;

    let subtotal = 0;
    let merchandiseTotal = 0;

    for (const dbItem of currentItems || []) {
      const qty = Number(dbItem.quantity) || 0;
      const basePrice = Number(dbItem.base_unit_price) || 0;
      let finalUnitPrice: number;
      let discountPct: number;

      // Tìm finalUnitPrice từ params.items (đã được truyền từ UI)
      const inputItem = finalItems.find((f) => f.itemId === dbItem.id);

      // Ưu tiên 1: giá hợp đồng cố định riêng mặt hàng (còn hạn)
      const contractPrice = dbItem.product_id ? contractMap[dbItem.product_id] : undefined;
      if (contractPrice !== undefined) {
        finalUnitPrice = contractPrice;
        discountPct = basePrice > 0 ? Math.round((1 - finalUnitPrice / basePrice) * 10000) / 100 : 0;
      } else if (params.pricingMode === "tier") {
        discountPct = tierDiscountPct;
        finalUnitPrice = Math.round(basePrice * (1 - discountPct / 100));
      } else if (params.pricingMode === "order_discount") {
        discountPct = params.orderDiscountPercent;
        finalUnitPrice = Math.round(basePrice * (1 - discountPct / 100));
      } else {
        // manual_item_price
        finalUnitPrice = inputItem ? Math.round(inputItem.finalUnitPrice) : Math.round(basePrice);
        discountPct = basePrice > 0 ? Math.round((1 - finalUnitPrice / basePrice) * 10000) / 100 : 0;
      }


      const lineTotal = Math.round(finalUnitPrice * qty);
      subtotal += Math.round(basePrice * qty);
      merchandiseTotal += lineTotal;

      await supabase.from("order_items").update({
        unit_price: finalUnitPrice,
        final_unit_price: finalUnitPrice,
        line_total: lineTotal,
        final_line_total: lineTotal,
        discount_percent: discountPct,
        tier_discount_percent: tierDiscountPct,
        manual_discount_percent: params.pricingMode === "order_discount" ? discountPct : null,
        manual_unit_price: params.pricingMode === "manual_item_price" ? finalUnitPrice : null,
        pricing_mode: params.pricingMode,
        pricing_note: inputItem?.note || null,
        original_base_unit_price: dbItem.original_base_unit_price ?? basePrice,
      }).eq("id", dbItem.id);
    }

    const shipping = Math.max(0, params.shippingAmount);
    const discountAmount = Math.max(0, subtotal - merchandiseTotal);
    const effectiveDiscount = subtotal > 0 ? Math.round((discountAmount / subtotal) * 10000) / 100 : 0;

    // Cập nhật customer tier & verification
    await supabase.from("vip_accounts")
      .update({
        discount_tier: params.customerTier,
        verification_status: "verified",
        verified_at: new Date().toISOString(),
        verified_by: params.actor,
        verification_note: params.verificationNote || null,
      })
      .eq("id", current.customer_id);

    // Cập nhật đơn hàng
    const newRevision = Math.max(0, Number(current.price_revision) || 0) + 1;
    const now = new Date().toISOString();
    const { data: updatedOrder, error: updateErr } = await supabase
      .from("orders")
      .update({
        customer_tier: params.customerTier,
        discount_percent: effectiveDiscount,
        subtotal,
        discount_amount: discountAmount,
        pricing_adjustment_amount: subtotal - merchandiseTotal,
        shipping_amount: shipping,
        grand_total: merchandiseTotal + shipping,
        item_count: (currentItems || []).length,
        original_grand_total: current.original_grand_total ?? current.grand_total,
        pricing_status: "finalized",
        pricing_mode: params.pricingMode,
        manual_discount_percent: params.pricingMode === "order_discount" ? params.orderDiscountPercent : null,
        price_revision: newRevision,
        priced_at: now,
        priced_by: params.actor,
        pricing_note: params.pricingNote || null,
        confirmation_document_status: "pending",
        status: current.status === "pending" ? "confirmed" : current.status,
        confirmed_at: current.confirmed_at ?? now,
      })
      .eq("id", params.orderId)
      .select("*, order_items(*)")
      .single();
    if (updateErr) throw updateErr;

    // Ghi lịch sử
    try {
      await supabase.from("order_history").insert({
        order_id: params.orderId,
        action: "customer_classified_and_final_order_rebuilt",
        from_status: current.status,
        to_status: current.status === "pending" ? "confirmed" : current.status,
        note: params.pricingNote || null,
        actor: params.actor,
        payload: {
          previousTier: current.customer_tier,
          customerTier: params.customerTier,
          pricingMode: params.pricingMode,
          orderDiscountPercent: params.orderDiscountPercent,
          tierDiscountPercent: tierDiscountPct,
          previousTotal: current.grand_total,
          finalTotal: merchandiseTotal + shipping,
          itemCount: (currentItems || []).length,
          revision: newRevision,
        },
      });
    } catch {
      // bỏ qua lỗi ghi log
    }

    return updatedOrder;
  } catch (error) {
    await restoreOriginalItems();
    throw error;
  }
}

export interface FinalizeOrderParams {
  orderId: string;
  customerTier: string;
  pricingMode: string;
  orderDiscountPercent: number;
  shippingAmount: number;
  items: Array<Record<string, unknown>>;
  verificationNote: string;
  pricingNote: string;
  actor: string;
}

export async function finalizeOrderCore(
  supabase: ReturnType<typeof getCustomerSupabaseAdmin>,
  params: FinalizeOrderParams
) {
  const rpcParams = {
    p_order_id: params.orderId,
    p_customer_tier: params.customerTier,
    p_pricing_mode: params.pricingMode,
    p_order_discount_percent: params.orderDiscountPercent,
    p_shipping_amount: params.shippingAmount,
    p_items: params.items,
    p_verification_note: params.verificationNote,
    p_pricing_note: params.pricingNote,
    p_actor: params.actor,
  };
  let { data, error } = await supabase.rpc("admin_finalize_order_v2", rpcParams);
  // Fallback sang JS khi: (1) RPC chưa được tạo/cache schema cũ,
  // (2) DB cũ còn hard-check VIP0-VIP3 (trước khi migration mới được push),
  // (3) bất kỳ lỗi function-not-found nào.
  if (
    error &&
    (/admin_finalize_order_v2|schema cache|function/i.test(error.message) ||
      /h.ng kh.ch h.ng kh.ng h.p l./i.test(error.message) ||
      /tier kh.ng h.p l./i.test(error.message) ||
      /hang khach hang/i.test(error.message))
  ) {
    data = await finalizeOrderWithLegacyLineEditor(supabase, params);
    error = null;
  }
  if (error) throw new Error(error.message);

  const finalized = data as ConfirmationOrderSnapshot;
  let document = null;
  let documentWarning = "";
  try {
    document = await createConfirmationDocument(supabase, finalized, params.actor);
  } catch (pdfError) {
    console.error("Order confirmation PDF error:", pdfError);
    documentWarning = "Đơn đã được chốt giá nhưng chưa tạo được PDF. Có thể bấm tạo lại chứng từ.";
    await supabase
      .from("orders")
      .update({ confirmation_document_status: "failed" })
      .eq("id", params.orderId);
  }

  const { data: fullOrder } = await supabase
    .from("orders")
    .select("*, order_items(*), order_history(*), order_documents(*)")
    .eq("id", params.orderId)
    .single();
  return { order: fullOrder || finalized, document, warning: documentWarning };
}
