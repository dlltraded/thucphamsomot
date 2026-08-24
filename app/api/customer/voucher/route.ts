import { NextRequest, NextResponse } from "next/server";
import { CUSTOMER_SESSION_COOKIE, parseSessionCookieValue } from "@/lib/customer-session";
import { getCustomerSupabase } from "@/lib/customer-supabase-server";

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
  const websiteSession = parseSessionCookieValue(
    req.cookies.get(CUSTOMER_SESSION_COOKIE)?.value
  );

  let body: { voucherCode?: string; orderSessionToken?: string; totalAmount?: number };
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Dữ liệu không hợp lệ" }, 400);
  }

  const orderSessionToken = body.orderSessionToken || websiteSession?.orderSessionToken;
  if (!orderSessionToken) {
    return json({ ok: false, error: "Phiên đặt hàng chưa hợp lệ, vui lòng đăng nhập lại" }, 401);
  }

  const voucherCode = body.voucherCode?.trim();
  if (!voucherCode) {
    return json({ ok: false, error: "Vui lòng nhập mã khuyến mãi" }, 400);
  }

  const totalAmount = body.totalAmount || 0;

  const supabase = getCustomerSupabase();

  // 1. Get Customer ID from session
  const { data: sessionData, error: sessionError } = await supabase
    .from("customer_sessions")
    .select("customer_id")
    .eq("token", orderSessionToken)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (sessionError || !sessionData) {
    return json({ ok: false, error: "Phiên đặt hàng đã hết hạn" }, 401);
  }
  const customerId = sessionData.customer_id;

  // 2. Validate Voucher
  const { data: voucher, error: voucherError } = await supabase
    .from("vouchers")
    .select("*")
    .eq("code", voucherCode)
    .eq("is_active", true)
    .single();

  if (voucherError || !voucher) {
    return json({ ok: false, error: "Mã khuyến mãi không tồn tại hoặc đã bị khóa" }, 404);
  }

  if (voucher.expires_at && new Date(voucher.expires_at).getTime() < Date.now()) {
    return json({ ok: false, error: "Mã khuyến mãi đã hết hạn" }, 400);
  }

  if (totalAmount < voucher.min_order_value) {
    return json({ ok: false, error: `Mã áp dụng cho đơn hàng từ ${voucher.min_order_value.toLocaleString()}đ` }, 400);
  }

  if (voucher.max_uses_total > 0 && voucher.current_uses_total >= voucher.max_uses_total) {
    return json({ ok: false, error: "Mã khuyến mãi đã hết lượt sử dụng" }, 400);
  }

  // 3. Check usage per user
  const { count, error: usageError } = await supabase
    .from("voucher_usages")
    .select("*", { count: "exact", head: true })
    .eq("voucher_code", voucherCode)
    .eq("customer_id", customerId);

  if (usageError) {
    return json({ ok: false, error: "Lỗi kiểm tra lịch sử sử dụng mã" }, 500);
  }

  if (count !== null && count >= voucher.max_uses_per_user) {
    return json({ ok: false, error: `Bạn đã hết lượt sử dụng mã này (Tối đa ${voucher.max_uses_per_user} lần)` }, 400);
  }

  // Calculate projected discount
  let projectedDiscount = 0;
  if (voucher.discount_amount > 0) {
    projectedDiscount = voucher.discount_amount;
  } else if (voucher.discount_percent > 0) {
    projectedDiscount = Math.round(totalAmount * (voucher.discount_percent / 100));
    if (voucher.max_discount_value > 0 && projectedDiscount > voucher.max_discount_value) {
      projectedDiscount = voucher.max_discount_value;
    }
  }

  if (projectedDiscount > totalAmount) {
    projectedDiscount = totalAmount;
  }

  return json({
    ok: true,
    voucher: {
      code: voucher.code,
      discount_amount: voucher.discount_amount,
      discount_percent: voucher.discount_percent,
      max_discount_value: voucher.max_discount_value,
      min_order_value: voucher.min_order_value,
      projectedDiscount,
    },
  });
}
