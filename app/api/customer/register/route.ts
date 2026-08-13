import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";

const schema = z
  .object({
    name: z.string().trim().min(2).max(120),
    phone: z.string().trim().min(9).max(20),
    password: z.string().min(8).max(100),
    confirmPassword: z.string().min(8).max(100),
    company: z.string().trim().max(180).optional().default(""),
    email: z.union([z.literal(""), z.string().trim().email().max(180)]).optional().default(""),
    source: z.enum(["zalo_mini_app", "website"]).optional().default("zalo_mini_app"),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Mật khẩu xác nhận chưa khớp",
    path: ["confirmPassword"],
  });

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: corsHeaders });

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return json({ ok: false, error: parsed.error.issues[0]?.message || "Thông tin đăng ký chưa hợp lệ" }, 400);
  }
  const value = parsed.data;
  try {
    const supabase = getCustomerSupabaseAdmin();
    const { data, error } = await supabase.rpc("register_customer_account", {
      p_name: value.name,
      p_phone: value.phone,
      p_password: value.password,
      p_company: value.company,
      p_email: value.email,
      p_source: value.source,
    });
    if (error) {
      const duplicate = /đã có tài khoản|duplicate|unique/i.test(error.message || "");
      return json({ ok: false, error: duplicate ? "Số điện thoại này đã có tài khoản" : error.message }, duplicate ? 409 : 400);
    }
    const account = Array.isArray(data) ? data[0] : data;
    if (!account) return json({ ok: false, error: "Không tạo được tài khoản" }, 500);
    return json({
      ok: true,
      account: {
        id: account.id,
        code: account.code,
        name: account.name,
        phone: account.phone,
        tier: account.tier || "VIP0",
        verificationStatus: account.verification_status || "pending",
      },
    }, 201);
  } catch (error) {
    console.error("customer register error:", error);
    return json({ ok: false, error: "Không thể đăng ký lúc này, vui lòng thử lại" }, 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}
