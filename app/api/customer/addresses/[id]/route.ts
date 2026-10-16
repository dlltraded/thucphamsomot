import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveCustomerApiAuth } from "@/lib/customer-api-auth";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "PATCH, DELETE, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization" };
const schema = z.object({
  label: z.string().trim().min(2).max(80), address: z.string().trim().min(5).max(500),
  contactName: z.string().trim().min(2).max(120), contactPhone: z.string().trim().min(8).max(20),
});
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: cors });

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await resolveCustomerApiAuth(req);
  if (!auth) return json({ ok: false, error: "Phiên đăng nhập đã hết hạn" }, 401);
  const { id } = await context.params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ ok: false, error: parsed.error.issues[0]?.message || "Địa chỉ chưa hợp lệ" }, 400);
  const { data, error } = await auth.supabase.from("customer_addresses").update({
    label: parsed.data.label, address: parsed.data.address, contact_name: parsed.data.contactName,
    contact_phone: parsed.data.contactPhone, updated_at: new Date().toISOString(),
  }).eq("id", id).eq("customer_id", auth.customerId).eq("is_active", true)
    .select("id, label, address, contact_name, contact_phone, is_default, is_active").maybeSingle();
  if (error || !data) return json({ ok: false, error: "Không tìm thấy hoặc không lưu được địa chỉ" }, 404);
  return json({ ok: true, address: data });
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await resolveCustomerApiAuth(req);
  if (!auth) return json({ ok: false, error: "Phiên đăng nhập đã hết hạn" }, 401);
  const { id } = await context.params;
  const { data: address } = await auth.supabase.from("customer_addresses")
    .select("id, is_default").eq("id", id).eq("customer_id", auth.customerId).eq("is_active", true).maybeSingle();
  if (!address) return json({ ok: false, error: "Không tìm thấy địa chỉ" }, 404);
  if (address.is_default) return json({ ok: false, error: "Vui lòng chọn địa chỉ mặc định khác trước khi ngừng sử dụng địa chỉ này" }, 409);
  const { error } = await auth.supabase.from("customer_addresses")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id).eq("customer_id", auth.customerId);
  if (error) return json({ ok: false, error: "Không ngừng sử dụng được địa chỉ" }, 500);
  return json({ ok: true });
}

export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: cors }); }
