import { NextRequest, NextResponse } from "next/server";
import { resolveCustomerApiAuth } from "@/lib/customer-api-auth";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization" };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: cors });

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await resolveCustomerApiAuth(req);
  if (!auth) return json({ ok: false, error: "Phiên đăng nhập đã hết hạn" }, 401);
  const { id } = await context.params;
  const { error } = await auth.supabase.rpc("customer_set_default_address", {
    p_customer_id: auth.customerId, p_address_id: id,
  });
  if (error) return json({ ok: false, error: error.message }, 400);
  return json({ ok: true });
}

export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: cors }); }
