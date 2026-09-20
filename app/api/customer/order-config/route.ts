import { NextRequest, NextResponse } from "next/server";
import { CUSTOMER_SESSION_COOKIE, parseSessionCookieValue } from "@/lib/customer-session";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";
import { fetchOrderCutoffConfig, getOrderCutoffInfo } from "@/lib/order-cutoff";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(req: NextRequest) {
  const websiteSession = parseSessionCookieValue(
    req.cookies.get(CUSTOMER_SESSION_COOKIE)?.value
  );
  const token =
    websiteSession?.orderSessionToken ||
    req.nextUrl.searchParams.get("sessionToken") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Vui lòng đăng nhập lại" },
      { status: 401, headers: corsHeaders }
    );
  }

  try {
    const supabase = getCustomerSupabaseAdmin();
    const { data: customerSession, error: sessionError } = await supabase
      .from("customer_sessions")
      .select("customer_id, expires_at")
      .eq("token", token)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (sessionError || !customerSession) {
      return NextResponse.json(
        { ok: false, error: "Phiên đăng nhập đã hết hạn" },
        { status: 401, headers: corsHeaders }
      );
    }

    // 1. Tính toán giờ chốt đơn theo server (D4)
    const requestedDate = req.nextUrl.searchParams.get("deliveryDate")?.trim() || undefined;
    const config = await fetchOrderCutoffConfig();
    const cutoffInfo = getOrderCutoffInfo(new Date(), requestedDate, config);

    // 2. Tải danh sách địa chỉ của khách hàng (D3)
    let addressRows: any[] = [];
    try {
      const { data, error: addrError } = await supabase
        .from("customer_addresses")
        .select("id, label, address, contact_name, contact_phone, is_default, is_active")
        .eq("customer_id", customerSession.customer_id)
        .or("is_active.is.null,is_active.eq.true")
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true });

      if (!addrError && data) {
        addressRows = data;
      }
    } catch {
      // customer_addresses chưa tạo nếu migration chưa chạy
    }

    let addresses = addressRows.map((row) => ({
      id: row.id,
      label: row.label,
      address: row.address,
      contactName: row.contact_name || "",
      contactPhone: row.contact_phone || "",
      isDefault: Boolean(row.is_default),
    }));

    // Tự động tạo 1 địa chỉ giao mặc định từ vip_accounts nếu khách chưa có bản ghi customer_addresses nào
    if (addresses.length === 0) {
      const { data: account } = await supabase
        .from("vip_accounts")
        .select(
          "id, name, phone, address, default_shipping_alias, default_shipping_address, default_shipping_name, default_shipping_phone"
        )
        .eq("id", customerSession.customer_id)
        .maybeSingle();

      const rawAddress = account?.default_shipping_address || account?.address;
      if (rawAddress && rawAddress.trim()) {
        try {
          const newAddress = {
            customer_id: customerSession.customer_id,
            label: account.default_shipping_alias || "Địa chỉ mặc định",
            address: rawAddress.trim(),
            contact_name: account.default_shipping_name || account.name || null,
            contact_phone: account.default_shipping_phone || account.phone || null,
            is_default: true,
          };
          const { data: inserted } = await supabase
            .from("customer_addresses")
            .insert(newAddress)
            .select("id, label, address, contact_name, contact_phone, is_default")
            .single();

          if (inserted) {
            addresses = [
              {
                id: inserted.id,
                label: inserted.label,
                address: inserted.address,
                contactName: inserted.contact_name || "",
                contactPhone: inserted.contact_phone || "",
                isDefault: true,
              },
            ];
          }
        } catch (insertErr) {
          console.warn("Không thể tự động tạo địa chỉ mặc định trong customer_addresses:", insertErr);
        }
      }
    }

    return NextResponse.json(
      {
        ok: true,
        serverNow: cutoffInfo.serverNow,
        earliestDate: cutoffInfo.earliestDate,
        deliveryDate: cutoffInfo.deliveryDate,
        cutoffAt: cutoffInfo.cutoffAt,
        cutoffTimeStr: cutoffInfo.cutoffTimeStr,
        minutesLeft: cutoffInfo.minutesLeft,
        isLate: cutoffInfo.isLate,
        addresses,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("GET /api/customer/order-config lỗi:", error);
    return NextResponse.json(
      { ok: false, error: "Không tải được cấu hình đặt hàng" },
      { status: 500, headers: corsHeaders }
    );
  }
}
