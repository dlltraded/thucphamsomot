import { NextRequest, NextResponse } from "next/server";
import { CUSTOMER_SESSION_COOKIE, parseSessionCookieValue } from "@/lib/customer-session";
import { getCustomerSupabase, getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";
import { fetchOrderCutoffConfig, getOrderCutoffInfo, getVnDateParts } from "@/lib/order-cutoff";

interface OrderItemInput {
  id?: string;
  productId?: string;
  slug?: string;
  title?: string;
  name?: string;
  quantity: number;
  note?: string;
}

interface CreateOrderBody {
  items?: OrderItemInput[];
  source?: "website" | "zalo_mini_app" | "sale_webapp";
  orderSessionToken?: string;
  deliveryDate?: string;
  addressId?: string;
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
  const orderSessionToken = body.orderSessionToken || websiteSession?.orderSessionToken;

  if (!orderSessionToken) {
    return json(
      { ok: false, error: "Phiên đặt hàng chưa hợp lệ, vui lòng đăng nhập lại" },
      401
    );
  }

  const supabaseAdmin = getCustomerSupabaseAdmin();
  const { data: sessionData, error: sessionErr } = await supabaseAdmin
    .from("customer_sessions")
    .select("customer_id, expires_at")
    .eq("token", orderSessionToken)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (sessionErr || !sessionData) {
    return json(
      { ok: false, error: "Phiên đặt hàng đã hết hạn, vui lòng đăng nhập lại" },
      401
    );
  }

  const customerId = sessionData.customer_id;

  // 1. Kiểm tra ngày giao hàng (bắt buộc, ≥ hôm nay, ≤ +30 ngày) — quyết định D4
  const deliveryDate = String(body.deliveryDate || "").trim();
  if (!deliveryDate || !/^\d{4}-\d{2}-\d{2}$/.test(deliveryDate)) {
    return json(
      { ok: false, error: "Vui lòng chọn ngày giao hàng hợp lệ (định dạng YYYY-MM-DD)" },
      400
    );
  }

  const vnNow = getVnDateParts(new Date());
  const todayYmd = vnNow.ymd;
  const [ty, tm, td] = todayYmd.split("-").map(Number);
  const maxDateObj = new Date(Date.UTC(ty, tm - 1, td + 30));
  const maxYmd = `${maxDateObj.getUTCFullYear()}-${String(maxDateObj.getUTCMonth() + 1).padStart(2, "0")}-${String(maxDateObj.getUTCDate()).padStart(2, "0")}`;

  if (deliveryDate < todayYmd || deliveryDate > maxYmd) {
    return json(
      { ok: false, error: "Ngày giao hàng phải từ hôm nay đến tối đa 30 ngày tới" },
      400
    );
  }

  // 2. Tính is_late_order từ server (không tin dữ liệu client)
  const cutoffConfig = await fetchOrderCutoffConfig();
  const cutoffInfo = getOrderCutoffInfo(new Date(), deliveryDate, cutoffConfig);
  const isLate = cutoffInfo.isLate;

  // Không nhận đơn trễ giờ chốt ở API. Trước đây chỉ gắn cờ is_late_order rồi
  // vẫn gọi RPC, khiến khách tưởng đơn đã được tiếp nhận dù ngày giao đã quá
  // giờ mua hàng. Client có thể bị bypass nên quy tắc phải nằm ở server.
  if (isLate) {
    return json(
      {
        ok: false,
        error: `Đã quá giờ chốt đơn cho ngày ${deliveryDate} (${cutoffInfo.cutoffTimeStr}). Vui lòng chọn ngày giao sớm nhất ${cutoffInfo.earliestDate}.`,
        code: "ORDER_CUTOFF_EXPIRED",
        earliestDate: cutoffInfo.earliestDate,
        cutoffAt: cutoffInfo.cutoffAt,
      },
      409
    );
  }

  // 3. Kiểm tra địa chỉ giao hàng (chọn từ customer_addresses, thuộc khách) — quyết định D3
  const addressId = String(body.addressId || "").trim();
  let selectedAddress: {
    id?: string;
    address: string;
    label: string;
    contact_name?: string | null;
    contact_phone?: string | null;
  } | null = null;

  if (addressId) {
    const { data: addr, error: addrErr } = await supabaseAdmin
      .from("customer_addresses")
      .select("id, label, address, contact_name, contact_phone, is_active")
      .eq("id", addressId)
      .eq("customer_id", customerId)
      .maybeSingle();

    if (addrErr || !addr) {
      return json(
        { ok: false, error: "Địa chỉ giao hàng không hợp lệ hoặc không thuộc tài khoản của bạn" },
        400
      );
    }
    selectedAddress = addr;
  } else if (body.deliveryAddress) {
    // Tương thích ngược nếu client cũ gửi chuỗi địa chỉ
    selectedAddress = {
      address: String(body.deliveryAddress).trim(),
      label: String(body.deliveryAlias || "Địa chỉ giao hàng").trim(),
      contact_name: String(body.deliveryName || "").trim(),
      contact_phone: String(body.deliveryPhone || "").trim(),
    };
  } else {
    return json(
      { ok: false, error: "Vui lòng chọn địa chỉ giao hàng" },
      400
    );
  }

  const items = Array.isArray(body.items)
    ? body.items
        .map((item) => ({
          productId: String(item.productId || item.id || item.slug || "").trim(),
          quantity: Number(item.quantity) || 0,
          name: String(item.name || item.title || "").trim(),
          note: typeof item.note === "string" ? item.note.trim().slice(0, 200) : "",
        }))
        .filter((item) => item.productId && item.quantity > 0)
    : [];

  if (items.length === 0) {
    return json({ ok: false, error: "Giỏ hàng đang trống" }, 400);
  }

  const deliveryType = body.deliveryType === "pickup" ? "pickup" : "shipping";
  const deliveryAddress = selectedAddress.address;
  const deliveryAlias = selectedAddress.label;
  const deliveryName = String(
    selectedAddress.contact_name || body.deliveryName || websiteSession?.name || ""
  ).trim();
  const deliveryPhone = String(
    selectedAddress.contact_phone || body.deliveryPhone || websiteSession?.phone || ""
  ).trim();
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

  // customer_create_order lấy customer_phone từ vip_accounts.phone (NOT NULL).
  // Một số tài khoản cũ chỉ có SĐT ở địa chỉ giao hàng, vì vậy đồng bộ số này
  // về hồ sơ trước khi gọi RPC để không làm rơi đơn ở ràng buộc NOT NULL.
  if (deliveryPhone) {
    const { data: customerRecord, error: customerRecordError } = await supabaseAdmin
      .from("vip_accounts")
      .select("phone")
      .eq("id", customerId)
      .maybeSingle();
    if (customerRecordError) {
      return json({ ok: false, error: "Không kiểm tra được thông tin số điện thoại khách hàng" }, 500);
    }
    if (!String(customerRecord?.phone || "").trim()) {
      const { error: phoneUpdateError } = await supabaseAdmin
        .from("vip_accounts")
        .update({ phone: deliveryPhone })
        .eq("id", customerId);
      if (phoneUpdateError) {
        return json({ ok: false, error: "Không lưu được số điện thoại khách hàng, vui lòng thử lại" }, 400);
      }
    }
  }

  const idempotencyKey = String(
    body.idempotencyKey || `${source}-${crypto.randomUUID()}`
  ).slice(0, 160);

  const supabase = getCustomerSupabase();
  const { data, error } = await supabase.rpc("customer_create_order", {
    p_session_token: orderSessionToken,
    p_source: source,
    p_items: items.map(({ note: _n, ...it }) => it),
    p_delivery_type: deliveryType,
    p_delivery_alias: deliveryAlias,
    p_delivery_address: deliveryAddress,
    p_delivery_name: deliveryName,
    p_delivery_phone: deliveryPhone,
    p_note: note,
    p_idempotency_key: idempotencyKey,
    p_voucher_code: (body as any).voucherCode || null,
    p_admin_id: null, // không nhận adminId từ client: khách không được giả danh nhân viên (2026-09-20)
  });

  if (error) {
    console.error("customer_create_order error:", error);
    const isSessionError =
      error.message?.includes("Phiên khách hàng không hợp lệ") ||
      error.message?.includes("hết hạn");
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

  // Cập nhật ngay sau khi tạo đơn qua RPC (D1-D4):
  // UPDATE orders: delivery_date, delivery_address_id, is_late_order, delivery_address, delivery_name, delivery_phone
  const orderUpdates: Record<string, any> = {
    delivery_date: deliveryDate,
    is_late_order: isLate,
    delivery_address: deliveryAddress,
    delivery_name: deliveryName,
    delivery_phone: deliveryPhone,
    delivery_alias: deliveryAlias,
  };
  if (selectedAddress.id) {
    orderUpdates.delivery_address_id = selectedAddress.id;
  }

  const warnings: string[] = [];

  const { error: updateOrderErr } = await supabaseAdmin
    .from("orders")
    .update(orderUpdates)
    .eq("id", order.id);

  if (updateOrderErr) {
    console.error("Lỗi UPDATE orders sau customer_create_order:", updateOrderErr);
    warnings.push("delivery_info_not_saved");
  }

  // Cập nhật customer_note cho từng dòng order_items (≤200 ký tự)
  for (const it of items) {
    if (it.note) {
      const { error: noteErr } = await supabaseAdmin
        .from("order_items")
        .update({ customer_note: it.note })
        .eq("order_id", order.id)
        .eq("product_id", it.productId);

      if (noteErr) {
        console.error("Lỗi UPDATE order_items.customer_note:", noteErr);
        if (!warnings.includes("item_notes_not_saved")) {
          warnings.push("item_notes_not_saved");
        }
      }
    }
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
          deliveryDate,
          isLate,
          deliveryType,
          deliveryAlias,
          deliveryAddress,
          deliveryName,
          deliveryPhone,
          message: `Mã đơn: ${order.order_code}\nNgày giao: ${deliveryDate} ${isLate ? "(TRỄ GIỜ CHỐT)" : ""}\nĐịa chỉ giao: ${deliveryAddress || "Nhận tại điểm"}\nNgười nhận: ${deliveryName} - ${deliveryPhone}\nGhi chú: ${note || "Không có"}\nTạm tính: ${order.grand_total}đ`,
          selectedItems: items
            .map((item) => `${item.name || item.productId} x${item.quantity}${item.note ? ` [${item.note}]` : ""}`)
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
    pricingStatus: fullOrder?.pricing_status || "provisional",
    total: Number(order.grand_total || 0),
    deliveryDate,
    isLate,
    warnings: warnings.length ? warnings : undefined,
    items: fullOrder?.items || [],
    idempotencyKey,
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}
