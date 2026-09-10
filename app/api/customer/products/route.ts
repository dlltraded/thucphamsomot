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
// đúng giá theo hạng/hợp đồng riêng của mình (resolve_product_price, xem
// migration Giai đoạn B) — KHÔNG hiện số tồn kho chính xác cho khách (thông
// tin nội bộ), chỉ hiện còn/hết hàng.
export async function GET(req: NextRequest) {
  const supabase = getCustomerSupabaseAdmin();
  const customerId = await resolveCustomerId(req, supabase);
  if (!customerId) return json({ ok: false, error: "Vui lòng đăng nhập lại" }, 401);

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
      // ~45% catalog (2.379/5.295 mã, kiểm tra 2026-09-10) đang có cả
      // price_retail và price_wholesale = 0 (thu mua chưa kịp nhập giá thật
      // sau khi đồng bộ KiotViet — xem KE_HOACH... mục 6). Nhân viên POS vẫn
      // thấy và sửa giá tay được, nhưng khách tự đặt hàng thì KHÔNG được
      // hiện mã chưa có giá, tránh đặt nhầm với giá 0đ.
      .or("price_retail.gt.0,price_wholesale.gt.0")
      .order("name")
      .range(page * pageSize, page * pageSize + pageSize - 1);
    if (search) {
      const safe = search.replace(/[%_]/g, "");
      query = query.ilike("name", `%${safe}%`);
    }
    if (category) query = query.eq("category", category);

    const { data: products, count, error } = await query;
    if (error) throw error;

    const resolved = await Promise.all(
      (products || []).map(async (p) => {
        const { data: price, error: priceError } = await supabase.rpc("resolve_product_price", {
          p_product_id: p.id,
          p_customer_id: customerId,
        });
        const base = Number(p.price_retail) || Number(p.price_wholesale) || 0;
        return {
          id: p.id,
          sku: p.sku,
          name: p.name,
          category: p.category,
          unit: p.unit || "Kg",
          imageUrl: p.image_url,
          price: priceError ? base : Number(price) || base,
          available: !p.track_inventory || Number(p.stock_qty) > 0,
        };
      })
    );

    return json({ ok: true, total: count || 0, page, pageSize, products: resolved });
  } catch (error) {
    console.error("GET /api/customer/products lỗi:", error);
    return json({ ok: false, error: "Không tải được danh sách sản phẩm" }, 500);
  }
}
