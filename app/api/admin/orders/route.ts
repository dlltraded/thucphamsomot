import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
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

function isAuthorized(req: NextRequest) {
  const expected = process.env.ADMIN_TOKEN?.trim() || "19871988";
  const supplied =
    req.headers.get("x-admin-token") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return Boolean(supplied && supplied === expected);
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return json({ ok: false, error: "Không có quyền quản lý đơn hàng" }, 401);
  }

  try {
    const supabase = getCustomerSupabaseAdmin();
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

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return json({ ok: false, error: "Không có quyền chốt giá đơn hàng" }, 401);
  }
  const body = await req.json().catch(() => null);
  const orderId = String(body?.orderId || "").trim();
  const customerTier = String(body?.customerTier || "VIP0").trim();
  const pricingMode = String(body?.pricingMode || "tier").trim();
  const actor = String(body?.actor || "admin").trim().slice(0, 120) || "admin";
  if (!orderId) return json({ ok: false, error: "Thiếu mã đơn hàng" }, 400);

  try {
    const supabase = getCustomerSupabaseAdmin();
    const { data, error } = await supabase.rpc("admin_finalize_order", {
      p_order_id: orderId,
      p_customer_tier: customerTier,
      p_pricing_mode: pricingMode,
      p_order_discount_percent: Number(body?.orderDiscountPercent || 0),
      p_shipping_amount: Number(body?.shippingAmount || 0),
      p_items: Array.isArray(body?.items) ? body.items : [],
      p_verification_note: String(body?.verificationNote || "").trim(),
      p_pricing_note: String(body?.pricingNote || "").trim(),
      p_actor: actor,
    });
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
  if (!isAuthorized(req)) {
    return json({ ok: false, error: "Không có quyền cập nhật đơn hàng" }, 401);
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
