import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { can } from "@/lib/permissions";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: corsHeaders });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) return json({ ok: false, error: auth.error }, 401);

  if (!can(auth.profile?.role, "customers.view")) {
    return json({ ok: false, error: "Bạn không có quyền xem danh sách khách hàng" }, 403);
  }

  const supabase = getCustomerSupabaseAdmin();
  const searchParams = req.nextUrl.searchParams;

  const search = searchParams.get("search")?.trim().toLowerCase() || "";
  const group = searchParams.get("group")?.trim() || "";
  const unassigned = searchParams.get("unassigned") === "1";
  const missingContact = searchParams.get("missingContact") === "1";
  const onlyPending = searchParams.get("onlyPending") === "1";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.max(1, Math.min(200, parseInt(searchParams.get("limit") || "50", 10)));
  const all = searchParams.get("all") === "1";

  const isSaleRole = auth.profile?.role === "sale" && auth.profile?.id !== "legacy-admin";
  const staffId = auth.profile?.id;

  try {
    // 1. Tải danh sách admin_profiles để map sales_rep_name
    const { data: staffList } = await supabase
      .from("admin_profiles")
      .select("id, name, role")
      .eq("is_active", true);

    const staffMap = new Map<string, string>();
    for (const s of staffList || []) {
      staffMap.set(s.id, s.name);
    }

    // 2. Query vip_accounts (không lấy password_hash)
    // TODO: khi > 1000 khách phải lọc ở DB (PostgREST mặc định cắt 1000 dòng)
    // Cố gắng query các cột mới; nếu migration chưa chạy thì fallback
    let queryWithKiot = true;
    let query = supabase
      .from("vip_accounts")
      .select(`
        id, partner_code, name, company, phone, address, tax_code,
        default_shipping_alias, default_shipping_address,
        default_shipping_name, default_shipping_phone,
        discount_tier, credit_limit, is_active, verification_status,
        sales_rep_id, kiotviet_code, customer_group, kiotviet_opening_debt,
        created_at, updated_at
      `, { count: "exact" });

    if (isSaleRole) {
      query = query.eq("sales_rep_id", staffId);
    }

    if (unassigned) {
      query = query.is("sales_rep_id", null);
    }

    if (onlyPending) {
      query = query.eq("verification_status", "pending");
    }

    if (group) {
      query = query.eq("customer_group", group);
    }

    let { data: customers, count, error } = await query.order("name", { ascending: true });

    if (error && error.message.includes("kiotviet_code")) {
      queryWithKiot = false;
      let fallbackQuery = supabase
        .from("vip_accounts")
        .select(`
          id, partner_code, name, company, phone, address, tax_code,
          default_shipping_alias, default_shipping_address,
          default_shipping_name, default_shipping_phone,
          discount_tier, credit_limit, is_active, verification_status,
          sales_rep_id, created_at, updated_at
        `, { count: "exact" });

      if (isSaleRole) {
        fallbackQuery = fallbackQuery.eq("sales_rep_id", staffId);
      }
      if (unassigned) {
        fallbackQuery = fallbackQuery.is("sales_rep_id", null);
      }
      if (onlyPending) {
        fallbackQuery = fallbackQuery.eq("verification_status", "pending");
      }

      const fbRes = await fallbackQuery.order("name", { ascending: true });
      if (fbRes.error) throw fbRes.error;
      customers = fbRes.data as any[];
      count = fbRes.count;
    } else if (error) {
      throw error;
    }

    let list = customers || [];

    // Lọc theo search tiếng Việt (client/server)
    if (search) {
      list = list.filter((c: any) => {
        const hay = [
          c.name,
          c.partner_code,
          c.phone,
          c.company,
          c.kiotviet_code,
          c.customer_group,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(search);
      });
    }

    // Lọc thiếu liên hệ (SĐT hoặc địa chỉ)
    if (missingContact) {
      list = list.filter((c: any) => !c.phone || !c.address);
    }

    // Lấy danh sách nhóm khách hàng duy nhất để đưa vào dropdown filter
    const groupsSet = new Set<string>();
    for (const c of customers || []) {
      if (c.customer_group) groupsSet.add(c.customer_group);
    }
    const distinctGroups = Array.from(groupsSet).sort((a, b) => a.localeCompare(b, "vi"));

    const totalFiltered = list.length;

    // Phân trang nếu không chọn all
    const pagedList = all ? list : list.slice((page - 1) * limit, page * limit);

    // Gắn sales_rep_name
    const resultItems = pagedList.map((c: any) => ({
      ...c,
      sales_rep_name: c.sales_rep_id ? staffMap.get(c.sales_rep_id) || "Chưa rõ" : null,
    }));

    return json({
      ok: true,
      customers: resultItems,
      total: totalFiltered,
      totalCount: count || totalFiltered,
      page,
      limit: all ? totalFiltered : limit,
      groups: distinctGroups,
      queryWithKiot,
    });
  } catch (err: any) {
    console.error("GET /api/admin/customers/list error:", err);
    return json({ ok: false, error: err.message || "Không tải được danh sách khách hàng" }, 500);
  }
}
