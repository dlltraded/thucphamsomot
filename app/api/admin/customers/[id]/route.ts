import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: corsHeaders });
}

async function requireAdmin(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) return { response: json({ ok: false, error: auth.error }, 401) };
  if (auth.profile?.role !== "admin") {
    return { response: json({ ok: false, error: "Chỉ tài khoản Admin được thực hiện thao tác này" }, 403) };
  }
  return { auth };
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if ("response" in guard) return guard.response;

  try {
    const { id } = await context.params;
    const body = await req.json();
    if (body?.action !== "reset-password") {
      return json({ ok: false, error: "Thao tác không hợp lệ" }, 400);
    }

    const supabase = getCustomerSupabaseAdmin();
    const { data: customer, error: findError } = await supabase
      .from("vip_accounts")
      .select("id, partner_code, name")
      .eq("id", id)
      .maybeSingle();
    if (findError) throw findError;
    if (!customer) return json({ ok: false, error: "Không tìm thấy khách hàng" }, 404);

    const { data: temporaryPassword, error: resetError } = await supabase.rpc(
      "admin_reset_customer_password",
      { p_code: customer.partner_code }
    );
    if (resetError) throw resetError;
    console.info(`[RESET_CUSTOMER_PASSWORD] ${guard.auth.profile?.name || "Admin"} đã reset ${customer.partner_code}`);
    return json({ ok: true, temporaryPassword, customerName: customer.name, partnerCode: customer.partner_code });
  } catch (error) {
    console.error("Customer reset password error:", error);
    return json({ ok: false, error: error instanceof Error ? error.message : "Không reset được mật khẩu" }, 500);
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if ("response" in guard) return guard.response;

  try {
    const { id } = await context.params;
    const supabase = getCustomerSupabaseAdmin();
    const { data: customer, error: findError } = await supabase
      .from("vip_accounts")
      .select("id, partner_code, name")
      .eq("id", id)
      .maybeSingle();
    if (findError) throw findError;
    if (!customer) return json({ ok: false, error: "Không tìm thấy khách hàng" }, 404);

    const { count, error: countError } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", id);
    if (countError) throw countError;
    if ((count || 0) > 0) {
      return json({
        ok: false,
        code: "customer_has_orders",
        error: `Khách hàng đã có ${count} đơn hàng nên không thể xóa hẳn. Hãy khóa tài khoản để giữ lịch sử giao dịch.`,
      }, 409);
    }

    const { error: deleteError } = await supabase.from("vip_accounts").delete().eq("id", id);
    if (deleteError) throw deleteError;
    console.info(`[DELETE_CUSTOMER] ${guard.auth.profile?.name || "Admin"} đã xóa ${customer.partner_code} (${customer.id})`);
    return json({ ok: true, deletedId: customer.id, partnerCode: customer.partner_code });
  } catch (error) {
    console.error("Customer DELETE error:", error);
    return json({ ok: false, error: error instanceof Error ? error.message : "Không xóa được khách hàng" }, 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}
