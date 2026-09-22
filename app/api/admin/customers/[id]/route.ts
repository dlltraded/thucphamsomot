import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { can } from "@/lib/permissions";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
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

// Trang chi tiết khách hàng gọi cùng endpoint này bằng GET. Trước đây route
// chỉ có POST/DELETE nên mở hồ sơ theo UUID rơi vào nhánh "không tìm thấy"
// dù khách đã tồn tại trong vip_accounts.
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) return json({ ok: false, error: auth.error }, 401);
  if (!can(auth.profile?.role, "customers.view")) {
    return json({ ok: false, error: "Bạn không có quyền xem khách hàng" }, 403);
  }

  try {
    const { id } = await context.params;
    const supabase = getCustomerSupabaseAdmin();
    const { data: customer, error } = await supabase
      .from("vip_accounts")
      .select(`
        id, partner_code, name, phone, company, email, tax_code, address,
        default_shipping_alias, default_shipping_address, default_shipping_name,
        default_shipping_phone, discount_tier, contract_discount_percent,
        tier_expiry_date, credit_limit, notes, is_active, verification_status,
        verification_note, registration_source, registered_at, created_at, updated_at,
        sales_rep_id
      `)
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!customer) return json({ ok: false, error: "Không tìm thấy khách hàng" }, 404);

    if (auth.profile?.role === 'sale' && customer.sales_rep_id && customer.sales_rep_id !== auth.profile.id) {
      return json({ ok: false, error: "Bạn không có quyền xem khách hàng này" }, 403);
    }

    const [{ data: addresses }, { data: orders, error: ordersError }] = await Promise.all([
      supabase.from('customer_addresses').select('id, label, address, contact_name, contact_phone, is_default, is_active, created_at').eq('customer_id', id).order('is_default', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('orders').select('id, order_code, status, payment_status, payment_method, delivery_date, grand_total, paid_amount, debt_amount, created_at').eq('customer_id', id).order('created_at', { ascending: false }).limit(50),
    ]);
    if (ordersError) console.warn('Không tải được lịch sử đơn khách hàng:', ordersError.message);

    return json({ ok: true, customer, addresses: addresses || [], orders: orders || [] });
  } catch (error) {
    console.error('GET /api/admin/customers/[id] error:', error);
    return json({ ok: false, error: error instanceof Error ? error.message : 'Không tải được khách hàng' }, 500);
  }
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
