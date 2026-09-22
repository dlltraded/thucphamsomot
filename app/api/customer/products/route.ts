import { NextRequest, NextResponse } from "next/server";
import { CUSTOMER_SESSION_COOKIE, parseSessionCookieValue } from "@/lib/customer-session";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";
import { resolvePricesForProducts } from "@/lib/customer-pricing";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return NextResponse.json(body, {
    status,
    headers: {
      ...corsHeaders,
      "Cache-Control": "private, max-age=30, stale-while-revalidate=90",
      Vary: "Authorization, Cookie",
      ...extraHeaders,
    },
  });
}

type CustomerContext = {
  customerId: string;
  tier: string | null;
  contractDiscountPercent: number | null;
  tierExpiryDate: string | null;
  expiresAt: number;
};
const customerContextCache = new Map<string, CustomerContext>();
const CUSTOMER_CONTEXT_TTL_MS = 60_000;
const PRODUCT_CATALOG_TTL_MS = 5 * 60_000;
const productCatalogCache = new Map<string, { expiresAt: number; body: unknown }>();
let baseProductCatalogCache: { expiresAt: number; products: any[] } | null = null;
let categoryListCache: { expiresAt: number; categories: string[] } | null = null;

function getRequestToken(req: NextRequest) {
  const websiteSession = parseSessionCookieValue(req.cookies.get(CUSTOMER_SESSION_COOKIE)?.value);
  return (
    websiteSession?.orderSessionToken ||
    req.nextUrl.searchParams.get("sessionToken") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    ""
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

async function resolveCustomerContext(req: NextRequest, supabase: ReturnType<typeof getCustomerSupabaseAdmin>) {
  const token = getRequestToken(req);
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
    .select("discount_tier, contract_discount_percent, tier_expiry_date")
    .eq("id", data.customer_id)
    .maybeSingle();
  const context: CustomerContext = {
    customerId: data.customer_id,
    tier: customer?.discount_tier || null,
    contractDiscountPercent: customer?.contract_discount_percent == null
      ? null
      : Number(customer.contract_discount_percent),
    tierExpiryDate: customer?.tier_expiry_date || null,
    expiresAt: Date.now() + CUSTOMER_CONTEXT_TTL_MS,
  };
  customerContextCache.set(token, context);
  return context;
}

async function loadProductCatalog(
  supabase: ReturnType<typeof getCustomerSupabaseAdmin>,
  customerContext: CustomerContext | null
) {
  const cacheKey = customerContext?.customerId || "guest";
  const cached = productCatalogCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return { body: cached.body, cacheStatus: "HIT" };
  }

  let products = baseProductCatalogCache?.expiresAt && baseProductCatalogCache.expiresAt > Date.now()
    ? baseProductCatalogCache.products
    : null;
  if (!products) {
    const selectFields = "id, sku, name, category, unit, thumb_url, price_retail, price_wholesale";
    const pageSize = 1000;
    const first = await supabase
      .from("products")
      .select(selectFields, { count: "exact" })
      .eq("active", true)
      .order("name")
      .range(0, pageSize - 1);
    if (first.error) throw first.error;

    const count = first.count || 0;
    const pageCount = Math.ceil(count / pageSize);
    const remainingPages = await Promise.all(
      Array.from({ length: Math.max(0, pageCount - 1) }, (_, index) => {
        const page = index + 1;
        return supabase
          .from("products")
          .select(selectFields)
          .eq("active", true)
          .order("name")
          .range(page * pageSize, (page + 1) * pageSize - 1);
      })
    );
    for (const page of remainingPages) {
      if (page.error) throw page.error;
    }

    products = [
      ...(first.data || []),
      ...remainingPages.flatMap((page) => page.data || []),
    ] as any[];
    baseProductCatalogCache = {
      expiresAt: Date.now() + PRODUCT_CATALOG_TTL_MS,
      products,
    };
  }
  const priceMap = customerContext
    ? await resolvePricesForProducts(
        supabase,
        customerContext.customerId,
        products,
        {
          tier: customerContext.tier,
          contractDiscountPercent: customerContext.contractDiscountPercent,
          tierExpiryDate: customerContext.tierExpiryDate,
        }
      )
    : new Map<string, { price?: number }>();
  const supabaseUrl = (process.env.SUPABASE_PRODUCTS_URL || "").replace(/\/$/, "");
  const imageBaseUrl = supabaseUrl
    ? `${supabaseUrl}/storage/v1/object/public/product-images/thumbs`
    : "";

  // Mảng tuple giảm kích thước JSON khoảng 4 lần so với lặp lại tên field 5.000 lần.
  // [id, sku, name, category, unit, price, priceOnRequest, hasImage]
  const items = products.map((product) => {
    const priceInfo = priceMap.get(product.id);
    const price = customerContext
      ? priceInfo?.price ?? (Number(product.price_retail) || Number(product.price_wholesale) || 0)
      : Number(product.price_retail) || 0;
    return [
      product.id,
      product.sku || "",
      product.name || "",
      product.category || null,
      product.unit || "Kg",
      price,
      price <= 0,
      Boolean(product.thumb_url),
    ];
  });
  const body = { ok: true, count: items.length, imageBaseUrl, items };

  for (const [key, entry] of productCatalogCache) {
    if (entry.expiresAt <= Date.now()) productCatalogCache.delete(key);
  }
  productCatalogCache.set(cacheKey, {
    expiresAt: Date.now() + PRODUCT_CATALOG_TTL_MS,
    body,
  });
  return { body, cacheStatus: "MISS" };
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
  const requestToken = getRequestToken(req);
  const customerContext = await resolveCustomerContext(req, supabase);
  // Catalog bán lẻ được mở cho khách chưa đăng nhập để đúng luồng Mini App:
  // xem hàng trước, đăng ký/đăng nhập khi thanh toán. Nếu client có gửi token
  // nhưng token đã hết hạn thì vẫn trả 401, tránh vô tình hiển thị giá bán lẻ
  // thay cho giá hợp đồng mà khách không biết.
  if (requestToken && !customerContext) {
    return json({ ok: false, error: "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại" }, 401);
  }

  if (req.nextUrl.searchParams.get("meta") === "1") {
    let categories = categoryListCache?.expiresAt && categoryListCache.expiresAt > Date.now()
      ? categoryListCache.categories
      : [];
    if (categories.length === 0) {
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
      categoryListCache = { expiresAt: Date.now() + PRODUCT_CATALOG_TTL_MS, categories };
    }
    return json(
      { ok: true, categories },
      200,
      customerContext
        ? { "Cache-Control": "private, max-age=300, stale-while-revalidate=600" }
        : { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" }
    );
  }

  if (req.nextUrl.searchParams.get("catalog") === "1") {
    try {
      const catalog = await loadProductCatalog(supabase, customerContext);
      return json(catalog.body, 200, {
        "Cache-Control": customerContext
          ? "private, max-age=300, stale-while-revalidate=600"
          : "public, max-age=300, stale-while-revalidate=600",
        "X-TPS1-Catalog-Cache": catalog.cacheStatus,
      });
    } catch (error) {
      console.error("GET /api/customer/products?catalog=1 lỗi:", error);
      return json({ ok: false, error: "Không tải được danh mục sản phẩm" }, 500);
    }
  }

  const search = req.nextUrl.searchParams.get("search")?.trim() || "";
  const category = req.nextUrl.searchParams.get("category")?.trim() || "";
  const categories = (req.nextUrl.searchParams.get("categories") || "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 50);
  const productId = req.nextUrl.searchParams.get("id")?.trim() || "";
  const page = Math.max(0, Number(req.nextUrl.searchParams.get("page") || 0));
  // Nếu đang tìm kiếm autocomplete thì trả về tối đa 50 kết quả để xổ dropdown
  const pageSize = search ? 50 : 24;

  try {
    let products: any[] = [];
    let totalCount = 0;
    let usedRpc = false;

    if ((search || category) && categories.length === 0 && !productId) {
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
      if (productId) query = query.eq("id", productId);
      if (search) {
        const safe = search.replace(/[%_]/g, "");
        query = query.or(`name.ilike.%${safe}%,sku.ilike.%${safe}%`);
      }
      if (category) query = query.eq("category", category);
      if (categories.length) query = query.in("category", categories);

      const { data: qProducts, count, error } = await query;
      if (error) throw error;
      products = qProducts || [];
      totalCount = count || 0;
    }

    // Giá theo hạng/hợp đồng riêng dùng chung hàm resolvePricesForProducts (F5)
    const priceMap = customerContext
      ? await resolvePricesForProducts(supabase, customerContext.customerId, products || [], {
          tier: customerContext.tier,
          contractDiscountPercent: customerContext.contractDiscountPercent,
          tierExpiryDate: customerContext.tierExpiryDate,
        })
      : new Map<string, { price?: number }>();

    const resolved = (products || []).map((p) => {
      const priceInfo = priceMap.get(p.id);
      const price = customerContext
        ? priceInfo?.price ?? (Number(p.price_retail) || Number(p.price_wholesale) || 0)
        : Number(p.price_retail) || 0;
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

    return json(
      { ok: true, total: totalCount, page, pageSize, products: resolved },
      200,
      customerContext
        ? {}
        : { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" }
    );
  } catch (error) {
    console.error("GET /api/customer/products lỗi:", error);
    return json({ ok: false, error: "Không tải được danh sách sản phẩm, vui lòng thử lại" }, 500);
  }
}
