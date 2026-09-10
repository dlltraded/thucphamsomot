import { NextRequest, NextResponse } from "next/server";
import { CUSTOMER_SESSION_COOKIE, parseSessionCookieValue } from "@/lib/customer-session";
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

async function resolveCustomerId(req: NextRequest, supabase: ReturnType<typeof getCustomerSupabaseAdmin>) {
  const websiteSession = parseSessionCookieValue(req.cookies.get(CUSTOMER_SESSION_COOKIE)?.value);
  const token =
    websiteSession?.orderSessionToken ||
    req.nextUrl.searchParams.get("sessionToken") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;

  const { data } = await supabase
    .from("customer_sessions")
    .select("customer_id, expires_at")
    .eq("token", token)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  return data?.customer_id || null;
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
  const customerId = await resolveCustomerId(req, supabase);
  if (!customerId) return json({ ok: false, error: "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại" }, 401);

  if (req.nextUrl.searchParams.get("meta") === "1") {
    const { data: catRows } = await supabase.from("products").select("category").eq("active", true).not("category", "is", null);
    const categories = [...new Set((catRows || []).map((r) => r.category as string))].sort();
    return json({ ok: true, categories });
  }

  const search = req.nextUrl.searchParams.get("search")?.trim() || "";
  const category = req.nextUrl.searchParams.get("category")?.trim() || "";
  const page = Math.max(0, Number(req.nextUrl.searchParams.get("page") || 0));
  const pageSize = 24;

  try {
    let query = supabase
      .from("products")
      .select("id, sku, name, category, unit, image_url, price_retail, price_wholesale, track_inventory, stock_qty, min_stock", { count: "exact" })
      .eq("active", true)
      .order("name")
      .range(page * pageSize, page * pageSize + pageSize - 1);
    if (search) {
      const safe = search.replace(/[%_]/g, "");
      query = query.ilike("name", `%${safe}%`);
    }
    if (category) query = query.eq("category", category);

    const { data: products, count, error } = await query;
    if (error) throw error;

    // Giá theo hạng/hợp đồng riêng — tính 1 lần trong bộ nhớ cho cả trang,
    // giống hệt thứ tự ưu tiên của hàm SQL resolve_product_price.
    const [{ data: customer }, { data: contractRows }] = await Promise.all([
      supabase.from("vip_accounts").select("discount_tier").eq("id", customerId).maybeSingle(),
      supabase.from("customer_contract_prices").select("product_id, price, valid_until").eq("customer_id", customerId),
    ]);
    const tier = customer?.discount_tier || null;
    const now = new Date();
    const contractByProduct = new Map(
      (contractRows || []).filter((c) => !c.valid_until || new Date(c.valid_until) > now).map((c) => [c.product_id, Number(c.price)])
    );
    const { data: tierPriceRows } = tier
      ? await supabase.from("product_tier_prices").select("product_id, price").eq("tier", tier)
      : { data: [] as { product_id: string; price: number }[] };
    const tierPriceByProduct = new Map((tierPriceRows || []).map((t) => [t.product_id, Number(t.price)]));

    const resolved = (products || []).map((p) => {
      const base = Number(p.price_retail) || Number(p.price_wholesale) || 0;
      const price = contractByProduct.has(p.id) ? contractByProduct.get(p.id)! : tierPriceByProduct.has(p.id) ? tierPriceByProduct.get(p.id)! : base;
      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category,
        unit: p.unit || "Kg",
        imageUrl: p.image_url,
        price,
        priceOnRequest: price <= 0,
        available: !p.track_inventory || Number(p.stock_qty) > 0,
      };
    });

    return json({ ok: true, total: count || 0, page, pageSize, products: resolved });
  } catch (error) {
    console.error("GET /api/customer/products lỗi:", error);
    return json({ ok: false, error: "Không tải được danh sách sản phẩm, vui lòng thử lại" }, 500);
  }
}
