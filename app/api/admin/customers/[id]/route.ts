import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { can } from "@/lib/permissions";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: corsHeaders });
}

async function requireAdmin(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) return { response: json({ ok: false, error: auth.error }, 401) };
  if (!["admin", "ban_giam_doc"].includes(auth.profile?.role || "")) {
    return { response: json({ ok: false, error: "Chỉ Ban Giám đốc hoặc Quản trị hệ thống được thực hiện thao tác này" }, 403) };
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
        sales_rep_id, customer_group
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

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) return json({ ok: false, error: auth.error }, 401);
  if (!can(auth.profile?.role, "customers.edit")) {
    return json({ ok: false, error: "Bạn không có quyền chỉnh sửa khách hàng" }, 403);
  }

  try {
    const { id } = await context.params;
    const body = await req.json();
    const supabase = getCustomerSupabaseAdmin();

    const { data: customer, error: findError } = await supabase
      .from("vip_accounts")
      .select("id, partner_code, name, company, tax_code, sales_rep_id, discount_tier, credit_limit, is_active, customer_group")
      .eq("id", id)
      .maybeSingle();

    if (findError) throw findError;
    if (!customer) return json({ ok: false, error: "Không tìm thấy khách hàng" }, 404);

    const isSale = auth.profile?.role === "sale" && auth.profile?.id !== "legacy-admin";

    // 1. Kiểm tra quyền sở hữu khách hàng đối với Sale
    if (isSale) {
      if (!customer.sales_rep_id || customer.sales_rep_id !== auth.profile?.id) {
        return json({ ok: false, error: "Bạn chỉ được chỉnh sửa khách hàng được phân công cho chính mình" }, 403);
      }
      // Sale chỉ được cập nhật thông tin liên hệ, không được đổi tên pháp nhân, công ty, mã số thuế hoặc nhóm
      if (body.name !== undefined && String(body.name).trim() !== String(customer.name || "").trim()) {
        return json({ ok: false, error: "Nhân viên kinh doanh không có quyền thay đổi tên pháp nhân khách hàng" }, 403);
      }
      if (body.company !== undefined && String(body.company || "").trim() !== String(customer.company || "").trim()) {
        return json({ ok: false, error: "Nhân viên kinh doanh không có quyền thay đổi tên công ty khách hàng" }, 403);
      }
      if (body.tax_code !== undefined && String(body.tax_code || "").trim() !== String(customer.tax_code || "").trim()) {
        return json({ ok: false, error: "Nhân viên kinh doanh không có quyền thay đổi mã số thuế khách hàng" }, 403);
      }
      if (body.customer_group !== undefined && String(body.customer_group || "").trim() !== String(customer.customer_group || "").trim()) {
        return json({ ok: false, error: "Nhân viên kinh doanh không có quyền thay đổi nhóm khách hàng" }, 403);
      }
    }

    // 2. Field-level permission checks (khi có sự thay đổi giá trị thực tế)
    // a. Hạng giá (discount_tier): chỉ admin hoặc role có pricing.edit
    if (body.discount_tier !== undefined && String(body.discount_tier) !== String(customer.discount_tier || "VIP0")) {
      if (!can(auth.profile?.role, "pricing.edit") && auth.profile?.role !== "admin") {
        return json({ ok: false, error: "Bạn không có quyền thay đổi hạng giá khách hàng" }, 403);
      }
    }

    // b. Hạn mức công nợ (credit_limit): chỉ admin hoặc role có finance.edit
    if (body.credit_limit !== undefined && Number(body.credit_limit) !== Number(customer.credit_limit || 0)) {
      if (!can(auth.profile?.role, "finance.edit") && auth.profile?.role !== "admin") {
        return json({ ok: false, error: "Bạn không có quyền thay đổi hạn mức công nợ khách hàng" }, 403);
      }
    }

    // c. Trạng thái tài khoản (is_active): chỉ admin hoặc trưởng phòng
    if (body.is_active !== undefined && Boolean(body.is_active) !== Boolean(customer.is_active)) {
      if (!["admin", "ban_giam_doc", "truong_phong"].includes(auth.profile?.role || "")) {
        return json({ ok: false, error: "Bạn không có quyền khóa hoặc mở khóa tài khoản khách hàng" }, 403);
      }
    }

    // d. Nhân viên phụ trách (sales_rep_id): chỉ admin hoặc trưởng phòng
    if (body.sales_rep_id !== undefined && (body.sales_rep_id || null) !== (customer.sales_rep_id || null)) {
      if (!["admin", "ban_giam_doc", "truong_phong"].includes(auth.profile?.role || "")) {
        return json({ ok: false, error: "Bạn không có quyền phân công lại nhân viên phụ trách" }, 403);
      }
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (body.name !== undefined) {
      const name = String(body.name || "").trim();
      if (!name) return json({ ok: false, error: "Tên khách hàng không được để trống" }, 400);
      updates.name = name;
    }

    if (body.phone !== undefined) {
      const phone = String(body.phone || "").trim();
      if (phone) {
        const cleanPhone = phone.replace(/[\s.-]/g, "");
        if (!/^(0|\+84)(([35789][0-9]{8})|(2[0-9]{9}))$/.test(cleanPhone)) {
          return json({
            ok: false,
            error: "Số điện thoại không đúng định dạng Việt Nam (di động 10 số hoặc cố định 11 số)",
          }, 400);
        }
        updates.phone = cleanPhone;
      } else {
        updates.phone = null;
      }
    }

    if (body.email !== undefined) {
      const email = String(body.email || "").trim();
      if (email) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return json({ ok: false, error: "Email không đúng định dạng" }, 400);
        }
        updates.email = email.toLowerCase();
      } else {
        updates.email = null;
      }
    }

    if (body.address !== undefined) {
      updates.address = String(body.address || "").trim() || null;
    }

    if (body.company !== undefined) {
      updates.company = String(body.company || "").trim() || null;
    }

    if (body.tax_code !== undefined) {
      updates.tax_code = String(body.tax_code || "").trim() || null;
    }

    if (body.customer_group !== undefined) {
      updates.customer_group = String(body.customer_group || "").trim() || null;
    }

    if (body.default_shipping_name !== undefined) {
      updates.default_shipping_name = String(body.default_shipping_name || "").trim() || null;
    }

    if (body.default_shipping_phone !== undefined) {
      const shipPhone = String(body.default_shipping_phone || "").trim();
      if (shipPhone) {
        const cleanShipPhone = shipPhone.replace(/[\s.-]/g, "");
        if (!/^(0|\+84)(([35789][0-9]{8})|(2[0-9]{9}))$/.test(cleanShipPhone)) {
          return json({
            ok: false,
            error: "SĐT người nhận không đúng định dạng Việt Nam",
          }, 400);
        }
        updates.default_shipping_phone = cleanShipPhone;
      } else {
        updates.default_shipping_phone = null;
      }
    }

    if (body.default_shipping_address !== undefined) {
      updates.default_shipping_address = String(body.default_shipping_address || "").trim() || null;
    }

    if (body.default_shipping_alias !== undefined) {
      updates.default_shipping_alias = String(body.default_shipping_alias || "").trim() || "Địa chỉ mặc định";
    }

    if (body.discount_tier !== undefined) {
      const allowedTiers = ["VIP0", "VIP1", "VIP2", "VIP3", "CUSTOM"];
      if (!allowedTiers.includes(String(body.discount_tier))) {
        return json({ ok: false, error: "Hạng giá không hợp lệ" }, 400);
      }
      updates.discount_tier = body.discount_tier;
    }

    if (body.credit_limit !== undefined) {
      const credit = Number(body.credit_limit);
      if (isNaN(credit) || credit < 0) {
        return json({ ok: false, error: "Hạn mức công nợ không hợp lệ" }, 400);
      }
      updates.credit_limit = credit;
    }

    if (body.is_active !== undefined) {
      updates.is_active = Boolean(body.is_active);
    }

    if (body.notes !== undefined) {
      updates.notes = String(body.notes || "").trim() || null;
    }

    if (body.sales_rep_id !== undefined) {
      updates.sales_rep_id = body.sales_rep_id || null;
    }

    const { data: updatedCustomer, error: updateError } = await supabase
      .from("vip_accounts")
      .update(updates)
      .eq("id", id)
      .select(`
        id, partner_code, name, phone, company, email, tax_code, address,
        default_shipping_alias, default_shipping_address, default_shipping_name,
        default_shipping_phone, discount_tier, contract_discount_percent,
        tier_expiry_date, credit_limit, notes, is_active, verification_status,
        customer_group, sales_rep_id, updated_at
      `)
      .single();

    if (updateError) throw updateError;

    return json({ ok: true, customer: updatedCustomer });
  } catch (error) {
    console.error("PATCH /api/admin/customers/[id] error:", error);
    return json({ ok: false, error: error instanceof Error ? error.message : "Không thể cập nhật khách hàng" }, 500);
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
