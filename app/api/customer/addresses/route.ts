import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveCustomerApiAuth } from "@/lib/customer-api-auth";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization" };
const schema = z.object({
  label: z.string().trim().min(2).max(80), address: z.string().trim().min(5).max(500),
  contactName: z.string().trim().min(2).max(120), contactPhone: z.string().trim().min(8).max(20),
  isDefault: z.boolean().optional().default(false),
});
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: cors });

export async function POST(req: NextRequest) {
  const auth = await resolveCustomerApiAuth(req);
  if (!auth) return json({ ok: false, error: "Phiên đăng nhập đã hết hạn" }, 401);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ ok: false, error: parsed.error.issues[0]?.message || "Địa chỉ chưa hợp lệ" }, 400);
  const { data: existing } = await auth.supabase.from("customer_addresses")
    .select("id", { count: "exact" }).eq("customer_id", auth.customerId).eq("is_active", true).limit(1);
  const makeDefault = parsed.data.isDefault || !existing?.length;
  const { data, error } = await auth.supabase.from("customer_addresses").insert({
    customer_id: auth.customerId, label: parsed.data.label, address: parsed.data.address,
    contact_name: parsed.data.contactName, contact_phone: parsed.data.contactPhone,
    is_default: false, is_active: true,
  }).select("id, label, address, contact_name, contact_phone, is_default, is_active").single();
  if (error || !data) return json({ ok: false, error: "Không thêm được địa chỉ" }, 500);
  if (makeDefault) {
    const { error: defaultError } = await auth.supabase.rpc("customer_set_default_address", { p_customer_id: auth.customerId, p_address_id: data.id });
    if (defaultError) return json({ ok: false, error: defaultError.message }, 400);
    data.is_default = true;
  }
  return json({ ok: true, address: data }, 201);
}

export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: cors }); }
