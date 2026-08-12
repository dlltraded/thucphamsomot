import { NextRequest, NextResponse } from "next/server";
import { CUSTOMER_SESSION_COOKIE, parseSessionCookieValue } from "@/lib/customer-session";
import { getCustomerSupabase } from "@/lib/customer-supabase-server";

interface OrderItemInput {
  id?: string;
  productId?: string;
  slug?: string;
  title?: string;
  name?: string;
  quantity: number;
}

interface CreateOrderBody {
  items?: OrderItemInput[];
  source?: "website" | "zalo_mini_app";
  orderSessionToken?: string;
  deliveryArea?: string;
  deliveryType?: "shipping" | "pickup";
  deliveryAlias?: string;
  deliveryAddress?: string;
  deliveryName?: string;
  deliveryPhone?: string;
  note?: string;
  idempotencyKey?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  const websiteSession = parseSessionCookieValue(
    req.cookies.get(CUSTOMER_SESSION_COOKIE)?.value
  );

  let body: CreateOrderBody;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Dữ liệu không hợp lệ" }, 400);
  }

  const source = body.source === "zalo_mini_app" ? "zalo_mini_app" : "website";
  const orderSessionToken =
    source === "website"
      ? websiteSession?.orderSessionToken
      : body.orderSessionToken;

  if (!orderSessionToken) {
    return json(
      { ok: false, error: "Phiên đặt hàng chưa hợp lệ, vui lòng đăng nhập lại" },
      401
    );
  }

  const items = Array.isArray(body.items)
    ? body.items
        .map((item) => ({
          productId: String(item.productId || item.id || item.slug || "").trim(),
          quantity: Number(item.quantity) || 0,
          name: String(item.name || item.title || "").trim(),
        }))
        .filter((item) => item.productId && item.quantity > 0)
    : [];

  if (items.length === 0) {
    return json({ ok: false, error: "Giỏ hàng đang trống" }, 400);
  }

  const deliveryType = body.deliveryType === "pickup" ? "pickup" : "shipping";
  const deliveryAddress = String(
    body.deliveryAddress || body.deliveryArea || ""
  ).trim();
  const deliveryAlias = String(body.deliveryAlias || "").trim();
  const deliveryName = String(body.deliveryName || websiteSession?.name || "").trim();
  const deliveryPhone = String(body.deliveryPhone || websiteSession?.phone || "").trim();
  const note = String(body.note || "").trim();

  if (
    deliveryType === "shipping" &&
    (!deliveryAddress || !deliveryName || !deliveryPhone)
  ) {
    return json(
      { ok: false, error: "Vui lòng nhập đầy đủ địa chỉ, người nhận và số điện thoại giao hàng" },
      400
    );
  }

  const idempotencyKey = String(
    body.idempotencyKey || `${source}-${crypto.randomUUID()}`
  ).slice(0, 160);

  const supabase = getCustomerSupabase();
  const { data, error } = await supabase.rpc("customer_create_order", {
    p_session_token: orderSessionToken,
    p_source: source,
    p_items: items,
    p_delivery_type: deliveryType,
    p_delivery_alias: deliveryAlias,
    p_delivery_address: deliveryAddress,
    p_delivery_name: deliveryName,
    p_delivery_phone: deliveryPhone,
    p_note: note,
    p_idempotency_key: idempotencyKey,
  });

  if (error) {
    console.error("customer_create_order error:", error);
    const isSessionError = /phiên khách hàng|session/i.test(error.message || "");
    return json(
      {
        ok: false,
        error: isSessionError
          ? "Phiên đặt hàng đã hết hạn, vui lòng đăng nhập lại"
          : error.message || "Không tạo được đơn hàng",
      },
      isSessionError ? 401 : 400
    );
  }

  const order = Array.isArray(data) ? data[0] : data;
  if (!order) {
    return json({ ok: false, error: "Không nhận được dữ liệu đơn hàng" }, 502);
  }

  const { data: customerOrders } = await supabase.rpc("customer_list_orders", {
    p_session_token: orderSessionToken,
  });
  const fullOrder = (customerOrders || []).find(
    (candidate: { id?: string }) => candidate.id === order.id
  );

  // Google Sheets chỉ là bản sao vận hành. Lỗi Sheets không làm mất đơn trung tâm.
  const webhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL?.trim();
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          vaiTro: "Người mua",
          loaiForm: "dat_hang",
          kenh: source === "zalo_mini_app" ? "Zalo Mini App" : "Website",
          name: order.customer_name,
          phone: order.customer_phone,
          company: order.customer_company || "",
          source: source === "zalo_mini_app" ? "Zalo Mini App" : "Website",
          customerCode: order.customer_code,
          customerTier: order.customer_tier,
          discountPercent: order.discount_percent,
          orderId: order.id,
          orderCode: order.order_code,
          deliveryType,
          deliveryAlias,
          deliveryAddress,
          deliveryName,
          deliveryPhone,
          message: `Mã đơn: ${order.order_code}\nĐịa chỉ giao: ${deliveryAddress || "Nhận tại điểm"}\nNgười nhận: ${deliveryName} - ${deliveryPhone}\nGhi chú: ${note || "Không có"}\nTổng tiền: ${order.grand_total}đ`,
          selectedItems: items
            .map((item) => `${item.name || item.productId} x${item.quantity}`)
            .join(" | "),
          selectedCount: items.length,
          miniAppSource: source === "zalo_mini_app" ? "central_order" : "website_portal",
          gioHang: JSON.stringify(fullOrder?.items || items),
        }),
      });
    } catch (sheetError) {
      console.error("Không đồng bộ được bản sao đơn sang Google Sheets:", sheetError);
    }
  }

  return json({
    ok: true,
    orderId: order.id,
    orderCode: order.order_code,
    status: order.status,
    total: Number(order.grand_total || 0),
    items: fullOrder?.items || [],
    idempotencyKey,
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}
