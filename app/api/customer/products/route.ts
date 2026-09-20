import { NextRequest, NextResponse } from "next/server";
import { CUSTOMER_SESSION_COOKIE, parseSessionCookieValue } from "@/lib/customer-session";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";
import { resolvePricesForProducts } from "@/lib/customer-pricing";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      ...corsHeaders,
      "Cache-Control": "private, max-age=30, stale-while-revalidate=90",
      Vary: "Authorization, Cookie",
    },
  });
}

type CustomerContext = { customerId: string; tier: string | null; expiresAt: number };
const customerContextCache = new Map<string, CustomerContext>();
const CUSTOMER_CONTEXT_TTL_MS = 60_000;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

async function resolveCustomerContext(req: NextRequest, supabase: ReturnType<typeof getCustomerSupabaseAdmin>) {
  const websiteSession = parseSessionCookieValue(req.cookies.get(CUSTOMER_SESSION_COOKIE)?.value);
  const token =
    websiteSession?.orderSessionToken ||
    req.nextUrl.searchParams.get("sessionToken") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;

  const cached = customerContextCache.get(token);
  if (cached && cached.expiresAt > Date.now()) return cached;

  const { data } = await supabase
    .from("customer_sessions")
    .select("customer_id, expires_at")
    .eq("token", token)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (!data?.customer_id) return null;

  const { data: customer } = await supabase
    .from("vip_accounts")
    .select("discount_tier")
    .eq("id", data.customer_id)
    .maybeSingle();
  const context: CustomerContext = {
    customerId: data.customer_id,
    tier: customer?.discount_tier || null,
    expiresAt: Date.now() + CUSTOMER_CONTEXT_TTL_MS,
  };
  customerContextCache.set(token, context);
  return context;
}

// Giai đoạn E — trang "Đặt hàng": khách tìm sản phẩm để tự lên đơn, thấy
// đúng giá theo hạng/hợp đồng riêng của mình. Giá tính trong bộ nhớ (không
// gọi RPC resolve_product_price cho từng sản phẩm — 24 sp/trang x gọi tuần
// tự/song song vẫn chậm và có thể trông như "không tải được") — cùng cách
// tối ưu đã dùng ở app/api/customer/order/import-excel.
//
// 2026-09-10: theo đúng yêu cầu — KHÔNG ẩn mã chưa có giá (price = 0) nữa
// (trước đó ẩn hẳn), vì đơn nào cũng qua bước chốt giá lại bởi sale trước
// khi giao nên khách vẫn đặt được, chỉ cần gắn nhãn "Liên hệ báo giá" để
// khách biết giá hiển thị chưa chính xác. Không hiện số tồn kho chính xác
// cho khách (thông tin nội bộ), chỉ hiện còn/hết hàng.
export async function GET(req: NextRequest) {
  const supabase = getCustomerSupabaseAdmin();
  const customerContext = await resolveCustomerContext(req, supabase);
  if (!customerContext) return json({ ok: false, error: "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại" }, 401);

  if (req.nextUrl.searchParams.get("meta") === "1") {
    let categories: string[] = [];
    try {
      const { data: rpcCats, error: catErr } = await supabase.rpc("get_distinct_categories");
      if (!catErr && Array.isArray(rpcCats)) {
        categories = rpcCats.map((r: any) => r.category).filter(Boolean);
      }
    } catch { /* ignore */ }

    if (categories.length === 0) {
      const { data: catRows } = await supabase.from("products").select("category").eq("active", true).not("category", "is", null);
      categories = [...new Set((catRows || []).map((r) => r.category as string))].sort();
    }
    return json({ ok: true, categories });
  }

  const search = req.nextUrl.searchParams.get("search")?.trim() || "";
  const category = req.nextUrl.searchParams.get("category")?.trim() || "";
  const page = Math.max(0, Number(req.nextUrl.searchParams.get("page") || 0));
  // Nếu đang tìm kiếm autocomplete thì trả về tối đa 50 kết quả để xổ dropdown
  const pageSize = search ? 50 : 24;

  try {
    let products: any[] = [];
    let totalCount = 0;
    let usedRpc = false;

    if (search || category) {
      try {
        const { data: rpcRows, error: rpcErr } = await supabase.rpc("search_products", {
          p_query: search || null,
          p_category: category || null,
          p_limit: pageSize,
          p_offset: page * pageSize,
        });

        if (!rpcErr && Array.isArray(rpcRows)) {
          usedRpc = true;
          totalCount = rpcRows.length > 0 ? Number(rpcRows[0].total) || rpcRows.length : 0;
          products = rpcRows.map((r: any) => ({
            id: r.id,
            sku: r.sku,
            name: r.name,
            category: r.category,
            unit: r.unit,
            image_url: r.image_url,
            thumb_url: r.thumb_url,
            price_retail: r.price_retail,
            price_wholesale: r.price_wholesale,
            track_inventory: r.track_inventory,
            stock_qty: r.stock_qty,
            min_stock: r.min_stock,
          }));
        }
      } catch {
        usedRpc = false;
      }
    }

    if (!usedRpc) {
      let query = supabase
        .from("products")
        .select("id, sku, name, category, unit, image_url, thumb_url, price_retail, price_wholesale, track_inventory, stock_qty, min_stock", { count: "exact" })
        .eq("active", true)
        .order("name")
        .range(page * pageSize, page * pageSize + pageSize - 1);
      if (search) {
        const safe = search.replace(/[%_]/g, "");
        query = query.or(`name.ilike.%${safe}%,sku.ilike.%${safe}%`);
      }
      if (category) query = query.eq("category", category);

      const { data: qProducts, count, error } = await query;
      if (error) throw error;
      products = qProducts || [];
      totalCount = count || 0;
    }

    // Giá theo hạng/hợp đồng riêng dùng chung hàm resolvePricesForProducts (F5)
    const priceMap = await resolvePricesForProducts(supabase, customerContext.customerId, products || [], customerContext.tier);

    const resolved = (products || []).map((p) => {
      const priceInfo = priceMap.get(p.id);
      const price = priceInfo?.price ?? (Number(p.price_retail) || Number(p.price_wholesale) || 0);
      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category,
        unit: p.unit || "Kg",
        imageUrl: p.thumb_url || p.image_url,
        thumbUrl: p.thumb_url || p.image_url,
        price,
        priceOnRequest: price <= 0,
        // Hàng tươi sống tồn kho = 0 vẫn nhận đặt hàng, bộ phận thu mua sẽ sắp xếp nhập giao khách
        available: true,
        stockQty: Number(p.stock_qty) || 0,
      };
    });

    return json({ ok: true, total: totalCount, page, pageSize, products: resolved });
  } catch (error) {
    console.error("GET /api/customer/products lỗi:", error);
    return json({ ok: false, error: "Không tải được danh sách sản phẩm, vui lòng thử lại" }, 500);
  }
}
