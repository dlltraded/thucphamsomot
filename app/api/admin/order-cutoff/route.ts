import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { fetchOrderCutoffConfig, getOrderCutoffInfo } from "@/lib/order-cutoff";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// Nguồn DUY NHẤT về giờ chốt đơn cho giao diện nhân viên (POS, Đơn tổng…): server tính theo
// giờ VN + cấu hình app_settings. Giao diện KHÔNG được tự tính lại quy tắc 16:30 / 17:00 Thứ Bảy.
// GET ?deliveryDate=YYYY-MM-DD (tuỳ chọn) -> { serverNow, earliestDate, deliveryDate, cutoffAt, cutoffTimeStr, minutesLeft, isLate }
export async function GET(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: 401, headers: corsHeaders });

  const requested = req.nextUrl.searchParams.get("deliveryDate")?.trim();
  const valid = requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : undefined;
  const config = await fetchOrderCutoffConfig();
  const info = getOrderCutoffInfo(new Date(), valid, config);
  return NextResponse.json({ ok: true, ...info }, { headers: corsHeaders });
}
