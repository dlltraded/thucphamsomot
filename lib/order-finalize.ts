import { createHash } from "crypto";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";
import { generateOrderConfirmationPdf, type ConfirmationOrderSnapshot } from "@/lib/order-confirmation-pdf";
import { resolvePriceBookPrices } from "@/lib/price-book-resolver";

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

export interface FinalizeOrderParams {
  orderId: string;
  customerTier: string;
  pricingMode: string;
  orderDiscountPercent: number;
  shippingAmount: number;
  items: Array<Record<string, unknown>>;
  verificationNote: string;
  pricingNote?: string;
  actor: string;
  actorId?: string | null;
  bypassProcurementReview?: boolean;
  bypassReason?: string;
  hasBypassPermission?: boolean;
}

export async function finalizeOrderWithLegacyLineEditor(
  supabase: ReturnType<typeof getCustomerSupabaseAdmin>,
  params: FinalizeOrderParams
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
  const originalByProduct = new Map<string, Array<Record<string, unknown>>>();
  for (const item of originalItems as Array<Record<string, unknown>>) {
    for (const key of [item.product_id, item.product_local_id]) {
      const identifier = String(key || "").trim();
      if (!identifier) continue;
      const rows = originalByProduct.get(identifier) || [];
      if (!rows.some((row) => String(row.id) === String(item.id))) rows.push(item);
      originalByProduct.set(identifier, rows);
    }
  }
  const keptIds: string[] = [];
  const finalItems: Array<{ itemId: string; finalUnitPrice: number; note: string }> = [];

  const restoreOriginalItems = async () => {
    await supabase.from("order_items").delete().eq("order_id", params.orderId);
    if (originalItems.length) await supabase.from("order_items").insert(originalItems);
  };

  // ─── GATE G4: KIỂM TRA ĐIỀU KIỆN THU MUA TRƯỚC KHI XÁC NHẬN ĐƠN ───
  // Đơn pending/processing muốn xác nhận bắt buộc phải có phiên kiểm tra Thu mua đạt 'accepted_by_operations'
  // trừ khi có quyền bỏ qua (credit_override/admin) và có lý do cụ thể.
  if (current.status === "pending" || current.status === "processing") {
    const { data: latestReview, error: revError } = await supabase
      .from("procurement_review_requests")
      .select("id, version, status, note")
      .eq("order_id", params.orderId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (revError && !/relation.*does not exist/i.test(revError.message)) {
      console.warn("Lỗi đọc procurement_review_requests:", revError.message);
    }

    const isBypass = params.bypassProcurementReview && params.hasBypassPermission && params.bypassReason?.trim();

    if (!isBypass) {
      if (!latestReview) {
        throw new Error("Không thể xác nhận đơn: Đơn hàng chưa được gửi cho Thu mua kiểm tra. Vui lòng bấm 'Gửi Thu mua kiểm tra' trước khi xác nhận.");
      }
      if (latestReview.status !== "accepted_by_operations") {
        const statusLabels: Record<string, string> = {
          pending_acceptance: "Chờ Thu mua tiếp nhận",
          in_review: "Thu mua đang kiểm tra",
          responded: "Thu mua đã phản hồi (Chờ Vận hành chấp nhận)",
          needs_revision: "Cần Thu mua kiểm tra lại",
          canceled: "Đã hủy",
        };
        const label = statusLabels[latestReview.status] || latestReview.status;
        throw new Error(`Không thể xác nhận đơn: Kết quả kiểm tra từ Thu mua chưa được hoàn tất hoặc chưa được Vận hành chấp nhận (Trạng thái hiện tại: ${label}). Vui lòng xử lý kết quả Thu mua trước khi xác nhận đơn.`);
      }
    } else {
      // Ghi audit bỏ qua kiểm tra Thu mua
      try {
        if (latestReview?.id) {
          await supabase.from("procurement_review_audit_logs").insert({
            review_id: latestReview.id,
            order_id: params.orderId,
            action: "bypass_review",
            actor_id: params.actorId || null,
            reason: params.bypassReason?.trim(),
          });
        }
      } catch {
        // ignore
      }
    }
  }

  try {
    for (const input of params.items) {
      const quantity = Number(input.quantity || 0);
      const finalUnitPrice = Number(input.finalUnitPrice || 0);
      const note = String(input.note || "").trim();
      if (!(quantity > 0) || finalUnitPrice < 0) throw new Error("Số lượng hoặc đơn giá sản phẩm không hợp lệ");

      let itemId = String(input.itemId || "").trim();
      const identifier = String(input.productId || input.productLocalId || "").trim();

      // Tương thích các màn hình/phiên đăng nhập cũ chỉ gửi productId. Nếu
      // sản phẩm đã nằm trong đơn thì phải cập nhật đúng dòng order_items,
      // không được hiểu nhầm là thêm sản phẩm mới rồi tra lại danh mục.
      if (!itemId && identifier) {
        const existing = (originalByProduct.get(identifier) || [])
          .find((row) => !keptIds.includes(String(row.id)));
        if (existing) itemId = String(existing.id);
      }
      if (itemId) {
        if (!originalMap.has(itemId)) throw new Error("Một sản phẩm trong đơn không còn tồn tại");
        const { error } = await supabase
          .from("order_items")
          .update({ quantity, pricing_note: note || null })
          .eq("id", itemId)
          .eq("order_id", params.orderId);
        if (error) throw error;
      } else {
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

    // Lấy lại danh sách order_items hiện tại sau khi đã sửa ở trên
    const { data: currentItems, error: itemsErr } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", params.orderId);
    if (itemsErr) throw itemsErr;

    const resolvedPrices = await resolvePriceBookPrices(
      supabase,
      current.customer_id,
      (currentItems || []).map((item) => item.product_id).filter(Boolean),
    );

    let subtotal = 0;
    let merchandiseTotal = 0;
    let hasManualPrice = false;
    const usedBooks = new Map<string, { id: string; version: number; source: string; name: string }>();

    for (const dbItem of currentItems || []) {
      const qty = Number(dbItem.quantity) || 0;
      const inputItem = finalItems.find((f) => f.itemId === dbItem.id);
      const resolved = dbItem.product_id ? resolvedPrices.get(dbItem.product_id) : null;
      const officialPrice = resolved?.price;
      const requestedPrice = Number(inputItem?.finalUnitPrice);
      const wantsManual = Number.isFinite(requestedPrice) && requestedPrice >= 0 &&
        (officialPrice == null || Math.round(requestedPrice) !== Math.round(officialPrice));
      if (wantsManual && !String(inputItem?.note || params.pricingNote || "").trim()) {
        throw new Error(`Cần ghi lý do khi sửa giá sản phẩm ${dbItem.name}`);
      }
      if (officialPrice == null && !wantsManual) {
        throw new Error(`Sản phẩm ${dbItem.name} chưa có giá trong bảng giá áp dụng`);
      }
      const finalUnitPrice = wantsManual ? Math.round(requestedPrice) : Number(officialPrice);
      const basePrice = Number(officialPrice ?? finalUnitPrice);
      const priceSource = wantsManual ? "manual" : resolved!.priceSource;
      if (wantsManual) hasManualPrice = true;
      if (resolved?.priceBookId) usedBooks.set(resolved.priceBookId, {
        id: resolved.priceBookId,
        version: resolved.priceBookVersion || 1,
        source: resolved.priceSource,
        name: resolved.priceBookName || "Bảng giá",
      });
      const lineTotal = Math.round(finalUnitPrice * qty);
      subtotal += Math.round(basePrice * qty);
      merchandiseTotal += lineTotal;

      await supabase.from("order_items").update({
        base_unit_price: basePrice,
        assigned_unit_price: officialPrice,
        unit_price: finalUnitPrice,
        final_unit_price: finalUnitPrice,
        line_total: lineTotal,
        final_line_total: lineTotal,
        discount_percent: 0,
        discount_amount: Math.max(0, (basePrice - finalUnitPrice) * qty),
        tier_discount_percent: null,
        manual_discount_percent: null,
        manual_unit_price: wantsManual ? finalUnitPrice : null,
        manual_price: wantsManual ? finalUnitPrice : null,
        manual_price_reason: wantsManual ? (inputItem?.note || params.pricingNote) : null,
        price_source: priceSource,
        price_book_id: resolved?.priceBookId || null,
        price_book_version: resolved?.priceBookVersion || null,
        price_resolved_at: new Date().toISOString(),
        pricing_mode: wantsManual ? "manual_item_price" : "price_book",
        pricing_note: inputItem?.note || null,
        original_base_unit_price: dbItem.original_base_unit_price ?? basePrice,
      }).eq("id", dbItem.id);
    }

    const shipping = Math.max(0, params.shippingAmount);
    const discountAmount = Math.max(0, subtotal - merchandiseTotal);
    const primaryBook = [...usedBooks.values()][0] || null;

    // Cập nhật đơn hàng
    const newRevision = Math.max(0, Number(current.price_revision) || 0) + 1;
    const now = new Date().toISOString();
    const { data: updatedOrder, error: updateErr } = await supabase
      .from("orders")
      .update({
        customer_tier: null,
        discount_percent: 0,
        subtotal,
        discount_amount: discountAmount,
        pricing_adjustment_amount: subtotal - merchandiseTotal,
        shipping_amount: shipping,
        grand_total: merchandiseTotal + shipping,
        item_count: (currentItems || []).length,
        original_grand_total: current.original_grand_total ?? current.grand_total,
        pricing_status: "finalized",
        pricing_mode: hasManualPrice ? "manual_item_price" : "price_book",
        manual_discount_percent: null,
        price_book_id: primaryBook?.id || null,
        price_book_version: primaryBook?.version || null,
        price_resolution_status: hasManualPrice ? "manual" : "resolved",
        customer_price_source: [...new Set([...usedBooks.values()].map((book) => book.source))].join(",") || "manual",
        price_locked_at: now,
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
        action: "price_book_order_finalized",
        from_status: current.status,
        to_status: current.status === "pending" ? "confirmed" : current.status,
        note: params.pricingNote || null,
        actor: params.actor,
        payload: {
          pricingMode: hasManualPrice ? "manual_item_price" : "price_book",
          priceBookIds: [...usedBooks.keys()],
          previousTotal: current.grand_total,
          finalTotal: merchandiseTotal + shipping,
          itemCount: (currentItems || []).length,
          revision: newRevision,
        },
      });
    } catch {
      // bỏ qua lỗi ghi log
    }

    return {
      ...updatedOrder,
      price_book_name: primaryBook?.name || "Bảng giá chung",
      price_book_version: primaryBook?.version || updatedOrder.price_book_version || null,
    };
  } catch (error) {
    await restoreOriginalItems();
    throw error;
  }
}

export async function finalizeOrderCore(
  supabase: ReturnType<typeof getCustomerSupabaseAdmin>,
  params: FinalizeOrderParams
) {
  // Không gọi RPC VIP/tier cũ nữa. Toàn bộ giá được resolve qua bảng giá mới
  // ở server và chỉ cho phép ngoại lệ nhập tay khi có lý do.
  const finalized = await finalizeOrderWithLegacyLineEditor(supabase, params) as ConfirmationOrderSnapshot;
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

  // Tự động phát hành Tác vụ Soạn hàng (Picking Task) cho đơn đã xác nhận.
  // QUAN TRỌNG: Lỗi RPC phải được bắt và báo cáo rõ ràng — KHÔNG được im lặng bỏ qua.
  // Đơn đã được chốt giá thành công, nhưng nếu không tạo được picking task thì
  // nhân viên kho sẽ không biết có đơn cần soạn → nguy cơ giao hàng trễ.
  if ((finalized as any).status === "confirmed") {
    let pickingTaskWarning = "";
    let pickSuccess = false;
    let lastErrorMsg = "";

    // Retry loop tối đa 3 lần nếu gặp sự cố mạng hoặc khóa tạm thời
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const pickResult = await supabase.rpc("create_picking_task_on_confirm", {
          p_order_id: params.orderId,
          p_actor_id: params.actorId || null,
          p_version: Number(finalized.price_revision || 1),
        });

        if (pickResult.error) {
          lastErrorMsg = pickResult.error.message || "Lỗi kết nối khi tạo lệnh soạn hàng";
        } else if (pickResult.data && pickResult.data.success === false) {
          lastErrorMsg = pickResult.data.message || `Lỗi nghiệp vụ (${pickResult.data.error_code || 'UNKNOWN'})`;
        } else if (pickResult.data && pickResult.data.success === true) {
          pickSuccess = true;
          break;
        }
      } catch (pickErr: any) {
        lastErrorMsg = pickErr?.message || "Lỗi không xác định khi gọi create_picking_task_on_confirm";
      }

      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 150));
      }
    }

    if (!pickSuccess) {
      console.error(`Lỗi phát hành picking task sau 3 lần thử cho đơn ${params.orderId}:`, lastErrorMsg);
      // Ghi nhận vào hàng đợi retry để không mất đơn
      try {
        await supabase.from("picking_task_retry_queue").upsert(
          {
            order_id: params.orderId,
            actor_id: params.actorId || null,
            version: Number(finalized.price_revision || 1),
            status: "pending",
            last_error: lastErrorMsg,
            next_retry_at: new Date(Date.now() + 60000).toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "order_id,version" }
        );
      } catch (queueErr: any) {
        console.error("Lỗi khi đưa đơn vào picking_task_retry_queue:", queueErr?.message);
      }

      pickingTaskWarning = `Đơn đã được xác nhận nhưng Lệnh Soạn Hàng chưa được phát hành ngay: ${lastErrorMsg}. Hệ thống đã đưa vào hàng đợi tự động retry để đảm bảo không mất đơn.`;
    }

    if (pickingTaskWarning) {
      documentWarning = documentWarning
        ? `${documentWarning}\n${pickingTaskWarning}`
        : pickingTaskWarning;
    }
  }

  const { data: fullOrder } = await supabase
    .from("orders")
    .select("*, order_items(*), order_history(*), order_documents(*)")
    .eq("id", params.orderId)
    .single();
  return { order: fullOrder || finalized, document, warning: documentWarning };
}
