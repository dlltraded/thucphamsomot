import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";
import { generateOrderConfirmationPdf, type ConfirmationOrderSnapshot } from "@/lib/order-confirmation-pdf";

const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "preparing",
  "shipping",
  "completed",
  "canceled",
] as const;
const PAYMENT_STATUSES = ["pending", "cod", "paid", "failed", "refunded"] as const;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Token",
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: corsHeaders });
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
      const { data: products, error: productError } = await supabase
        .from("products")
        .select("id, local_product_id, sku, name, category, unit, price_retail, price_wholesale, image_url")
        .eq("active", true)
        .ilike("name", `%${productSearch.replace(/[%_]/g, "")}%`)
        .order("name")
        .limit(20);
      if (productError) throw productError;
      return json({
        ok: true,
        products: (products || []).map((product) => ({
          id: product.id,
          localProductId: product.local_product_id,
          sku: product.sku,
          name: product.name,
          categoryLabel: product.category,
          unit: product.unit || "Kg",
          price: Number(product.price_retail) || Number(product.price_wholesale) || 0,
          image_url: product.image_url,
        })),
      });
    }
    const status = req.nextUrl.searchParams.get("status");
    let query = supabase
      .from("orders")
      .select("*, order_items(*), order_history(*)")
      .order("created_at", { ascending: false })
      .limit(500);

    if (status && ORDER_STATUSES.includes(status as (typeof ORDER_STATUSES)[number])) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) throw error;
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

async function createConfirmationDocument(
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

async function finalizeOrderWithLegacyLineEditor(
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

    const { data, error } = await supabase.rpc("admin_finalize_order", {
      p_order_id: params.orderId,
      p_customer_tier: params.customerTier,
      p_pricing_mode: params.pricingMode,
      p_order_discount_percent: params.orderDiscountPercent,
      p_shipping_amount: params.shippingAmount,
      p_items: finalItems,
      p_verification_note: params.verificationNote,
      p_pricing_note: params.pricingNote,
      p_actor: params.actor,
    });
    if (error) throw error;
    return data;
  } catch (error) {
    await restoreOriginalItems();
    throw error;
  }
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
    const rpcParams = {
      p_order_id: orderId,
      p_customer_tier: customerTier,
      p_pricing_mode: pricingMode,
      p_order_discount_percent: Number(body?.orderDiscountPercent || 0),
      p_shipping_amount: Number(body?.shippingAmount || 0),
      p_items: Array.isArray(body?.items) ? body.items : [],
      p_verification_note: String(body?.verificationNote || "").trim(),
      p_pricing_note: String(body?.pricingNote || "").trim(),
      p_actor: actor,
    };
    let { data, error } = await supabase.rpc("admin_finalize_order_v2", rpcParams);
    if (error && /admin_finalize_order_v2|schema cache|function/i.test(error.message)) {
      data = await finalizeOrderWithLegacyLineEditor(supabase, {
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
      error = null;
    }
    if (error) return json({ ok: false, error: error.message }, 400);

    const finalized = data as ConfirmationOrderSnapshot;
    let document = null;
    let documentWarning = "";
    try {
      document = await createConfirmationDocument(supabase, finalized, actor);
    } catch (pdfError) {
      console.error("Order confirmation PDF error:", pdfError);
      documentWarning = "Đơn đã được chốt giá nhưng chưa tạo được PDF. Có thể bấm tạo lại chứng từ.";
      await supabase
        .from("orders")
        .update({ confirmation_document_status: "failed" })
        .eq("id", orderId);
    }

    const { data: fullOrder } = await supabase
      .from("orders")
      .select("*, order_items(*), order_history(*), order_documents(*)")
      .eq("id", orderId)
      .single();
    return json({ ok: true, order: fullOrder || finalized, document, warning: documentWarning });
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
  const nextStatus = String(body?.status || "").trim();
  const paymentStatus = body?.paymentStatus
    ? String(body.paymentStatus).trim()
    : undefined;
  const note = String(body?.note || "").trim();

  if (!orderId || !ORDER_STATUSES.includes(nextStatus as (typeof ORDER_STATUSES)[number])) {
    return json({ ok: false, error: "Đơn hàng hoặc trạng thái không hợp lệ" }, 400);
  }
  if (
    paymentStatus &&
    !PAYMENT_STATUSES.includes(paymentStatus as (typeof PAYMENT_STATUSES)[number])
  ) {
    return json({ ok: false, error: "Trạng thái thanh toán không hợp lệ" }, 400);
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

    const now = new Date().toISOString();
    const updates: Record<string, unknown> = { status: nextStatus };
    if (paymentStatus) updates.payment_status = paymentStatus;
    if (nextStatus === "confirmed" && !current.confirmed_at) updates.confirmed_at = now;
    if (nextStatus === "shipping" && !current.shipping_at) updates.shipping_at = now;
    if (nextStatus === "completed" && !current.completed_at) updates.completed_at = now;
    if (nextStatus === "canceled" && !current.canceled_at) updates.canceled_at = now;

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
      actor: "admin",
      payload: paymentStatus ? { paymentStatus } : {},
    });
    if (historyError) throw historyError;

    return json({ ok: true, order: updated });
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
