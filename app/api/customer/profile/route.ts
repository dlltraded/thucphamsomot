import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";
import {
  CUSTOMER_SESSION_COOKIE,
  createSessionCookieValue,
  parseSessionCookieValue,
  type CustomerSession,
} from "@/lib/customer-session";

const optionalText = (max: number) => z.string().trim().max(max).optional().default("");
const profileSchema = z.object({
  name: z.string().trim().min(2, "Tên liên hệ phải có ít nhất 2 ký tự").max(120),
  phone: z.string().trim().min(8, "Số điện thoại chưa hợp lệ").max(20),
  company: optionalText(180),
  email: z.union([z.literal(""), z.string().trim().email("Email chưa đúng định dạng").max(180)]).optional().default(""),
  taxCode: optionalText(30),
  address: optionalText(500),
  shippingAlias: optionalText(80),
  shippingAddress: optionalText(500),
  shippingName: optionalText(120),
  shippingPhone: optionalText(20),
});

export async function PATCH(req: NextRequest) {
  const session = parseSessionCookieValue(req.cookies.get(CUSTOMER_SESSION_COOKIE)?.value);
  if (!session?.id || !session.orderSessionToken) {
    return NextResponse.json({ ok: false, error: "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại" }, { status: 401 });
  }

  const parsed = profileSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message || "Thông tin chưa hợp lệ" }, { status: 400 });
  }

  const values = parsed.data;
  if (values.shippingAddress && (!values.shippingName || values.shippingPhone.length < 8)) {
    return NextResponse.json({ ok: false, error: "Vui lòng nhập đủ người nhận và số điện thoại giao hàng" }, { status: 400 });
  }

  try {
    const supabase = getCustomerSupabaseAdmin();
    const now = new Date().toISOString();
    const { data: validSession, error: sessionError } = await supabase
      .from("customer_sessions")
      .select("customer_id")
      .eq("token", session.orderSessionToken)
      .eq("customer_id", session.id)
      .gt("expires_at", now)
      .maybeSingle();

    if (sessionError || !validSession) {
      return NextResponse.json({ ok: false, error: "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại" }, { status: 401 });
    }

    const shippingAddress = values.shippingAddress || values.address;
    const { data: customer, error: updateError } = await supabase
      .from("vip_accounts")
      .update({
        name: values.name,
        phone: values.phone,
        company: values.company || null,
        email: values.email || null,
        tax_code: values.taxCode || null,
        address: values.address || null,
        default_shipping_alias: values.shippingAlias || "Địa chỉ mặc định",
        default_shipping_address: shippingAddress || null,
        default_shipping_name: values.shippingName || values.name,
        default_shipping_phone: values.shippingPhone || values.phone,
        updated_at: now,
      })
      .eq("id", session.id)
      .eq("is_active", true)
      .select("id, partner_code, name, phone, company, email, tax_code, address, default_shipping_alias, default_shipping_address, default_shipping_name, default_shipping_phone, discount_tier, must_change_password")
      .single();

    if (updateError || !customer) {
      console.error("customer profile update error:", updateError);
      return NextResponse.json({ ok: false, error: "Không lưu được thông tin, vui lòng thử lại" }, { status: 500 });
    }

    await supabase.from("customer_sessions").update({ last_used_at: now }).eq("token", session.orderSessionToken);

    const nextSession: CustomerSession = {
      ...session,
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
      tier: customer.discount_tier || session.tier,
      mustChangePassword: !!customer.must_change_password,
    };

    const response = NextResponse.json({ ok: true, session: nextSession });
    response.cookies.set(CUSTOMER_SESSION_COOKIE, createSessionCookieValue(nextSession), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch (error) {
    console.error("customer profile API error:", error);
    return NextResponse.json({ ok: false, error: "Không thể kết nối dữ liệu khách hàng" }, { status: 500 });
  }
}
