import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveCustomerApiAuth } from "@/lib/customer-api-auth";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization" };
const schema = z.object({
  company: z.string().trim().max(180).optional().default(""),
  taxCode: z.string().trim().max(30).optional().default(""),
  reason: z.string().trim().min(5, "Vui lòng ghi rõ lý do cập nhật").max(500),
}).refine((value) => value.company || value.taxCode, "Vui lòng nhập tên công ty hoặc mã số thuế mới");
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: cors });

export async function POST(req: NextRequest) {
  const auth = await resolveCustomerApiAuth(req);
  if (!auth) return json({ ok: false, error: "Phiên đăng nhập đã hết hạn" }, 401);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ ok: false, error: parsed.error.issues[0]?.message || "Yêu cầu chưa hợp lệ" }, 400);
  const { data: pending } = await auth.supabase.from("customer_profile_change_requests")
    .select("id").eq("customer_id", auth.customerId).eq("status", "pending").limit(1);
  if (pending?.length) return json({ ok: false, error: "Tài khoản đang có một yêu cầu cập nhật chờ xử lý" }, 409);
  const { data, error } = await auth.supabase.from("customer_profile_change_requests").insert({
    customer_id: auth.customerId, requested_company: parsed.data.company || null,
    requested_tax_code: parsed.data.taxCode || null, reason: parsed.data.reason, requested_by: "customer",
  }).select("id, requested_company, requested_tax_code, reason, status, created_at").single();
  if (error) return json({ ok: false, error: "Không gửi được yêu cầu cập nhật" }, 500);
  return json({ ok: true, request: data }, 201);
}

export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: cors }); }
