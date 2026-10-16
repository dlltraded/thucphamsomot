import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";
import {
  CUSTOMER_SESSION_COOKIE,
  createSessionCookieValue,
  parseSessionCookieValue,
  type CustomerSession,
} from "@/lib/customer-session";
import { resolveCustomerApiAuth } from "@/lib/customer-api-auth";

const profileSchema = z.object({
  customerId: z.string().uuid().optional(),
  orderSessionToken: z.string().uuid().optional(),
  name: z.string().trim().min(2, "Tên liên hệ phải có ít nhất 2 ký tự").max(120),
  phone: z.string().trim().min(8, "Số điện thoại chưa hợp lệ").max(20),
  email: z.union([z.literal(""), z.string().trim().email("Email chưa đúng định dạng").max(180)]).optional().default(""),
  address: z.string().trim().max(500).optional().default(""),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: corsHeaders });
}

export async function PATCH(req: NextRequest) {
  const websiteSession = parseSessionCookieValue(req.cookies.get(CUSTOMER_SESSION_COOKIE)?.value);
  const parsed = profileSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return json({ ok: false, error: parsed.error.issues[0]?.message || "Thông tin chưa hợp lệ" }, 400);
  }

  const values = parsed.data;
  const auth = await resolveCustomerApiAuth(req);
  const customerId = auth?.customerId || websiteSession?.id || values.customerId;
  const orderSessionToken = auth?.token || websiteSession?.orderSessionToken || values.orderSessionToken;
  if (!customerId || !orderSessionToken) {
    return json({ ok: false, error: "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại" }, 401);
  }
  try {
    const supabase = auth?.supabase || getCustomerSupabaseAdmin();
    const now = new Date().toISOString();
    const { data: validSession, error: sessionError } = await supabase
      .from("customer_sessions")
      .select("customer_id")
      .eq("token", orderSessionToken)
      .eq("customer_id", customerId)
      .gt("expires_at", now)
      .maybeSingle();

    if (sessionError || !validSession) {
      return json({ ok: false, error: "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại" }, 401);
    }

    const { data: customer, error: updateError } = await supabase
      .from("vip_accounts")
      .update({
        name: values.name,
        phone: values.phone,
        email: values.email || null,
        address: values.address || null,
        updated_at: now,
      })
      .eq("id", customerId)
      .eq("is_active", true)
      .select("id, partner_code, name, phone, company, email, tax_code, address, default_shipping_alias, default_shipping_address, default_shipping_name, default_shipping_phone, discount_tier, verification_status, must_change_password")
      .single();

    if (updateError || !customer) {
      console.error("customer profile update error:", updateError);
      return json({ ok: false, error: "Không lưu được thông tin, vui lòng thử lại" }, 500);
    }

    await supabase.from("customer_sessions").update({ last_used_at: now }).eq("token", orderSessionToken);
    const { data: tier } = await supabase
      .from("customer_tiers")
      .select("discount_percent")
      .eq("code", customer.discount_tier)
      .maybeSingle();

    const nextSession: CustomerSession = {
      id: customer.id,
      code: customer.partner_code,
      name: customer.name,
      phone: customer.phone,
      company: customer.company || "",
      email: customer.email || "",
      taxCode: customer.tax_code || "",
      address: customer.address || "",
      defaultShippingAddress: {
        alias: customer.default_shipping_alias || "Địa chỉ mặc định",
        address: customer.default_shipping_address || customer.address || "",
        name: customer.default_shipping_name || customer.name,
        phone: customer.default_shipping_phone || customer.phone,
      },
      tier: customer.discount_tier || websiteSession?.tier || "VIP0",
      discountPercent: Number(tier?.discount_percent ?? websiteSession?.discountPercent ?? 0),
      verificationStatus: customer.verification_status || websiteSession?.verificationStatus || "pending",
      mustChangePassword: !!customer.must_change_password,
      orderSessionToken,
    };

    const response = json({ ok: true, session: nextSession });
    if (websiteSession) {
      response.cookies.set(CUSTOMER_SESSION_COOKIE, createSessionCookieValue(nextSession), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    }
    return response;
  } catch (error) {
    console.error("customer profile API error:", error);
    return json({ ok: false, error: "Không thể kết nối dữ liệu khách hàng" }, 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}
