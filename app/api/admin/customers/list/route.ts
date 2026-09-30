import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { canForProfile } from "@/lib/permissions";
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

  if (!canForProfile(auth.profile, "customers.view")) {
    return json({ ok: false, error: "Bạn không có quyền xem danh sách khách hàng" }, 403);
  }

  const supabase = getCustomerSupabaseAdmin();
  const searchParams = req.nextUrl.searchParams;

  const search = searchParams.get("search")?.trim().toLowerCase() || "";
  const group = searchParams.get("group")?.trim() || "";
  const unassigned = searchParams.get("unassigned") === "1";
  const missingContact = searchParams.get("missingContact") === "1";
  const filterMissing = searchParams.get("filterMissing")?.trim() || "";
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

    // 2. Tính toán thống kê độ hoàn thiện dữ liệu khách hàng (G3) trên TOÀN BỘ tập dữ liệu thuộc phạm vi của user
    let statsQuery = supabase
      .from("vip_accounts")
      .select("id, phone, address, customer_group");

    if (isSaleRole) {
      statsQuery = statsQuery.eq("sales_rep_id", staffId);
    }

    const { data: statsRows, error: statsError } = await statsQuery;
    if (statsError) throw statsError;

    let missingPhoneCount = 0;
    let missingAddressCount = 0;
    let missingBothCount = 0;
    let completeCount = 0;
    const groupsSet = new Set<string>();

    for (const c of statsRows || []) {
      const hasPhone = Boolean(c.phone && String(c.phone).trim());
      const hasAddress = Boolean(c.address && String(c.address).trim());
      if (!hasPhone) missingPhoneCount++;
      if (!hasAddress) missingAddressCount++;
      if (!hasPhone && !hasAddress) missingBothCount++;
      if (hasPhone && hasAddress) completeCount++;
      if (c.customer_group) groupsSet.add(c.customer_group);
    }

    const stats = {
      total: (statsRows || []).length,
      missingPhone: missingPhoneCount,
      missingAddress: missingAddressCount,
      missingBoth: missingBothCount,
      complete: completeCount,
    };

    const distinctGroups = Array.from(groupsSet).sort((a, b) => a.localeCompare(b, "vi"));

    // 3. Query vip_accounts phía server (áp dụng tìm kiếm, lọc, phân trang trực tiếp xuống Supabase)
    let queryWithKiot = true;
    let query = supabase
      .from("vip_accounts")
      .select(`
        id, partner_code, name, company, phone, email, address, tax_code,
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

    if (search) {
      const safe = search.replace(/[%_,()]/g, "");
      if (safe) {
        query = query.or(`name.ilike.%${safe}%,partner_code.ilike.%${safe}%,phone.ilike.%${safe}%,email.ilike.%${safe}%,company.ilike.%${safe}%,kiotviet_code.ilike.%${safe}%`);
      }
    }

    // Lọc theo tiêu chí hoàn thiện dữ liệu trực tiếp trong SQL
    if (filterMissing === "missing_phone") {
      query = query.or("phone.is.null,phone.eq.");
    } else if (filterMissing === "missing_address") {
      query = query.or("address.is.null,address.eq.");
    } else if (filterMissing === "missing_both") {
      query = query.or("phone.is.null,phone.eq.").or("address.is.null,address.eq.");
    } else if (filterMissing === "complete") {
      query = query.not("phone", "is", null).neq("phone", "").not("address", "is", null).neq("address", "");
    } else if (missingContact) {
      query = query.or("phone.is.null,phone.eq.,address.is.null,address.eq.");
    }

    query = query.order("name", { ascending: true });

    if (!all) {
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);
    }

    const mainRes = await query;
    let customers: any[] = (mainRes.data as any[]) || [];
    let count: number | null = mainRes.count;
    let error = mainRes.error;

    if (error && (error.message.includes("kiotviet_code") || error.message.includes("email"))) {
      queryWithKiot = false;
      let fb = supabase
        .from("vip_accounts")
        .select(`
          id, partner_code, name, company, phone, address, tax_code,
          default_shipping_alias, default_shipping_address,
          default_shipping_name, default_shipping_phone,
          discount_tier, credit_limit, is_active, verification_status,
          sales_rep_id, created_at, updated_at
        `, { count: "exact" });

      if (isSaleRole) fb = fb.eq("sales_rep_id", staffId);
      if (unassigned) fb = fb.is("sales_rep_id", null);
      if (onlyPending) fb = fb.eq("verification_status", "pending");
      if (group) fb = fb.eq("customer_group", group);
      if (search) {
        const safe = search.replace(/[%_,()]/g, "");
        if (safe) fb = fb.or(`name.ilike.%${safe}%,partner_code.ilike.%${safe}%,phone.ilike.%${safe}%,company.ilike.%${safe}%`);
      }
      if (filterMissing === "missing_phone") {
        fb = fb.or("phone.is.null,phone.eq.");
      } else if (filterMissing === "missing_address") {
        fb = fb.or("address.is.null,address.eq.");
      } else if (filterMissing === "missing_both") {
        fb = fb.or("phone.is.null,phone.eq.").or("address.is.null,address.eq.");
      } else if (filterMissing === "complete") {
        fb = fb.not("phone", "is", null).neq("phone", "").not("address", "is", null).neq("address", "");
      } else if (missingContact) {
        fb = fb.or("phone.is.null,phone.eq.,address.is.null,address.eq.");
      }

      fb = fb.order("name", { ascending: true });

      if (!all) {
        const offset = (page - 1) * limit;
        fb = fb.range(offset, offset + limit - 1);
      }

      const fbRes = await fb;
      if (fbRes.error) throw fbRes.error;
      customers = (fbRes.data as any[]) || [];
      count = fbRes.count;
    } else if (error) {
      throw error;
    }

    const totalFiltered = count ?? (customers || []).length;
    const totalPages = all ? 1 : Math.ceil(totalFiltered / limit);

    // Gắn sales_rep_name
    const resultItems = (customers || []).map((c: any) => ({
      ...c,
      sales_rep_name: c.sales_rep_id ? staffMap.get(c.sales_rep_id) || "Chưa rõ" : null,
    }));

    return json({
      ok: true,
      customers: resultItems,
      total: totalFiltered,
      totalCount: count ?? totalFiltered,
      stats,
      page: all ? 1 : page,
      limit: all ? totalFiltered : limit,
      totalPages,
      groups: distinctGroups,
      queryWithKiot,
    });
  } catch (err: any) {
    console.error("GET /api/admin/customers/list error:", err);
    return json({ ok: false, error: err.message || "Không tải được danh sách khách hàng" }, 500);
  }
}
