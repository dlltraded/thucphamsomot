import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { canForProfile } from "@/lib/permissions";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const REVENUE_STATUSES = new Set(["confirmed", "preparing", "shipping", "completed"]);
const OPEN_STATUSES = ["draft", "pending", "confirmed", "preparing", "shipping"];
const PAGE_SIZE = 1000;
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: corsHeaders });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

function vnParts(date = new Date()) {
  const shifted = new Date(date.getTime() + VN_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
  };
}

function vnStartIso(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month, day) - VN_OFFSET_MS).toISOString();
}

function vnDateKey(value: string) {
  const shifted = new Date(new Date(value).getTime() + VN_OFFSET_MS);
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}-${String(shifted.getUTCDate()).padStart(2, "0")}`;
}

async function fetchConfirmedOrders(
  supabase: ReturnType<typeof getCustomerSupabaseAdmin>,
  from: string,
  to: string,
  salesRepId?: string,
) {
  const rows: any[] = [];
  for (let fromIndex = 0; ; fromIndex += PAGE_SIZE) {
    let query = supabase
      .from("orders")
      .select("id, status, grand_total, customer_id, customer_name, customer_company, confirmed_at")
      .gte("confirmed_at", from)
      .lt("confirmed_at", to)
      .order("confirmed_at", { ascending: true })
      .range(fromIndex, fromIndex + PAGE_SIZE - 1);
    if (salesRepId) query = query.eq("sales_rep_id", salesRepId);
    const { data, error } = await query;
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}

async function fetchOutstandingDebt(
  supabase: ReturnType<typeof getCustomerSupabaseAdmin>,
  salesRepId?: string,
) {
  let total = 0;
  for (let fromIndex = 0; ; fromIndex += PAGE_SIZE) {
    let query = supabase
      .from("orders")
      .select("debt_amount")
      .eq("status", "completed")
      .gt("debt_amount", 0)
      .range(fromIndex, fromIndex + PAGE_SIZE - 1);
    if (salesRepId) query = query.eq("sales_rep_id", salesRepId);
    const { data, error } = await query;
    if (error) throw error;
    total += (data || []).reduce((sum, row) => sum + (Number(row.debt_amount) || 0), 0);
    if (!data || data.length < PAGE_SIZE) break;
  }
  return total;
}

export async function GET(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) return json({ ok: false, error: auth.error }, 401);
  if (!canForProfile(auth.profile, "orders.view")) {
    return json({ ok: false, error: "Bạn không có quyền xem Dashboard" }, 403);
  }

  try {
    const supabase = getCustomerSupabaseAdmin();
    const isSale = auth.profile?.role === "sale" && auth.profile?.id !== "legacy-admin";
    const salesRepId = isSale ? auth.profile!.id : undefined;
    const now = new Date();
    const { year, month, day } = vnParts(now);
    const todayStart = vnStartIso(year, month, day);
    const tomorrowStart = vnStartIso(year, month, day + 1);
    const monthStart = vnStartIso(year, month, 1);
    const nextMonthStart = vnStartIso(year, month + 1, 1);
    const previousMonthStart = vnStartIso(year, month - 1, 1);
    const previousMonthToDateEnd = vnStartIso(year, month - 1, day + 1);
    const trendStart = vnStartIso(year, month, day - 13);
    const analyticsStart = new Date(previousMonthStart) < new Date(trendStart) ? previousMonthStart : trendStart;

    let openQuery = supabase
      .from("orders")
      .select("id, order_code, status, customer_name, customer_company, grand_total, delivery_date, created_at, updated_at")
      .in("status", OPEN_STATUSES)
      .order("delivery_date", { ascending: true })
      .limit(500);
    let todayQuery = supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayStart)
      .lt("created_at", tomorrowStart)
      .not("status", "in", "(canceled,merged)");
    let recentQuery = supabase
      .from("orders")
      .select("id, order_code, status, grand_total, customer_name, customer_company, delivery_date, created_at")
      .neq("status", "merged")
      .order("created_at", { ascending: false })
      .limit(8);
    if (salesRepId) {
      openQuery = openQuery.eq("sales_rep_id", salesRepId);
      todayQuery = todayQuery.eq("sales_rep_id", salesRepId);
      recentQuery = recentQuery.eq("sales_rep_id", salesRepId);
    }

    const [analyticsOrders, openResult, todayResult, recentResult, debtOutstanding, customerResult] = await Promise.all([
      fetchConfirmedOrders(supabase, analyticsStart, nextMonthStart, salesRepId),
      openQuery,
      todayQuery,
      recentQuery,
      fetchOutstandingDebt(supabase, salesRepId),
      supabase.from("vip_accounts").select("id", { count: "exact", head: true }).eq("is_active", true),
    ]);
    if (openResult.error) throw openResult.error;
    if (todayResult.error) throw todayResult.error;
    if (recentResult.error) throw recentResult.error;
    if (customerResult.error) throw customerResult.error;

    const monthRows = analyticsOrders.filter((order) => (
      order.confirmed_at >= monthStart && order.confirmed_at < nextMonthStart && REVENUE_STATUSES.has(order.status)
    ));
    const previousMonthRows = analyticsOrders.filter((order) => (
      order.confirmed_at >= previousMonthStart && order.confirmed_at < previousMonthToDateEnd && REVENUE_STATUSES.has(order.status)
    ));
    const monthRevenue = monthRows.reduce((sum, order) => sum + (Number(order.grand_total) || 0), 0);
    const previousMonthRevenue = previousMonthRows.reduce((sum, order) => sum + (Number(order.grand_total) || 0), 0);
    const revenueGrowth = previousMonthRevenue > 0
      ? ((monthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
      : null;

    const dailyMap = new Map<string, { date: string; orders: number; revenue: number }>();
    for (let offset = 13; offset >= 0; offset -= 1) {
      const iso = vnStartIso(year, month, day - offset);
      const key = vnDateKey(iso);
      dailyMap.set(key, { date: key, orders: 0, revenue: 0 });
    }
    for (const order of analyticsOrders) {
      if (!order.confirmed_at || order.confirmed_at < trendStart || !REVENUE_STATUSES.has(order.status)) continue;
      const entry = dailyMap.get(vnDateKey(order.confirmed_at));
      if (!entry) continue;
      entry.orders += 1;
      entry.revenue += Number(order.grand_total) || 0;
    }

    const openOrders = openResult.data || [];
    const byStatus = {
      pending: openOrders.filter((order) => ["draft", "pending"].includes(order.status)).length,
      confirmed: openOrders.filter((order) => order.status === "confirmed").length,
      preparing: openOrders.filter((order) => order.status === "preparing").length,
      shipping: openOrders.filter((order) => order.status === "shipping").length,
      completed: monthRows.filter((order) => order.status === "completed").length,
    };

    const customerMap = new Map<string, { name: string; company: string; orders: number; revenue: number }>();
    for (const order of monthRows) {
      const key = order.customer_id || order.customer_name || "khac";
      const entry = customerMap.get(key) || {
        name: order.customer_name || "Khách hàng",
        company: order.customer_company || "",
        orders: 0,
        revenue: 0,
      };
      entry.orders += 1;
      entry.revenue += Number(order.grand_total) || 0;
      customerMap.set(key, entry);
    }

    const todayKey = vnDateKey(now.toISOString());
    const attentionOrders = openOrders
      .map((order) => ({
        ...order,
        overdue: Boolean(order.delivery_date && order.delivery_date < todayKey),
      }))
      .sort((a, b) => {
        const priority = (value: any) => value.overdue ? 0 : ["draft", "pending"].includes(value.status) ? 1 : 2;
        return priority(a) - priority(b) || String(a.delivery_date || "").localeCompare(String(b.delivery_date || ""));
      })
      .slice(0, 8);

    return json({
      ok: true,
      generatedAt: now.toISOString(),
      scope: isSale ? "sale" : "all",
      summary: {
        todayOrders: todayResult.count || 0,
        monthOrders: monthRows.length,
        monthRevenue,
        previousMonthRevenue,
        revenueGrowth,
        debtOutstanding,
        activeCustomers: customerResult.count || 0,
        pendingOrders: byStatus.pending,
        inProgressOrders: byStatus.confirmed + byStatus.preparing + byStatus.shipping,
      },
      dailyTrend: Array.from(dailyMap.values()),
      byStatus,
      topCustomers: Array.from(customerMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 6),
      attentionOrders,
      recentOrders: recentResult.data || [],
    });
  } catch (error) {
    console.error("GET /api/admin/dashboard lỗi:", error);
    return json({ ok: false, error: "Không tải được dữ liệu Dashboard" }, 500);
  }
}
