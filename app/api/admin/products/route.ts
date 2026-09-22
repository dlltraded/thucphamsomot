import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { can } from "@/lib/permissions";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";
import { resolvePricesForProducts } from "@/lib/customer-pricing";

const CATALOG_CACHE_TTL_MS = 5 * 60 * 1000;
type CatalogProduct = {
  id: string;
  sku: string | null;
  name: string;
  category: string | null;
  unit: string | null;
  image_url: string | null;
  thumb_url: string | null;
  price_retail: number | null;
  price_wholesale: number | null;
  track_inventory: boolean | null;
  stock_qty: number | null;
  min_stock: number | null;
  is_low_stock: boolean | null;
};
let baseCatalogCache: { expiresAt: number; products: CatalogProduct[] } | null = null;
const pricedCatalogCache = new Map<string, { expiresAt: number; products: unknown[] }>();

async function loadBaseCatalog(supabase: ReturnType<typeof getCustomerSupabaseAdmin>) {
  if (baseCatalogCache && baseCatalogCache.expiresAt > Date.now()) return baseCatalogCache.products;
  const fields = "id, sku, name, category, unit, image_url, thumb_url, price_retail, price_wholesale, track_inventory, stock_qty, min_stock, is_low_stock";
  const pageSize = 1000;
  const first = await supabase.from("products").select(fields, { count: "exact" }).eq("active", true).order("name").range(0, pageSize - 1);
  if (first.error) throw first.error;
  const total = first.count || (first.data || []).length;
  const pageStarts: number[] = [];
  for (let offset = pageSize; offset < total; offset += pageSize) pageStarts.push(offset);
  const rest = await Promise.all(pageStarts.map(async (offset) => {
    const page = await supabase.from("products").select(fields).eq("active", true).order("name").range(offset, offset + pageSize - 1);
    if (page.error) throw page.error;
    return page.data || [];
  }));
  const products = [...(first.data || []), ...rest.flat()] as unknown as CatalogProduct[];
  baseCatalogCache = { products, expiresAt: Date.now() + CATALOG_CACHE_TTL_MS };
  return products;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Các cột sửa được trực tiếp trong trang chi tiết sản phẩm. KHÔNG cho sửa
// sku/stock_qty/data_source/kiotviet_group/last_synced_at ở đây — sku là
// định danh cố định sau khi tạo, stock_qty chỉ được đổi qua
// inventory_transactions (trigger DB tự cập nhật), data_source/kiotviet_group
// là dấu vết nguồn dữ liệu để đối chiếu khi đồng bộ lại.
const EDITABLE_FIELDS = [
  "name",
  "category",
  "sub_category",
  "unit",
  "pack_size",
  "supplier",
  "origin",
  "description",
  "notes",
  "tags",
  "cost_price",
  "price_retail",
  "price_wholesale",
  "min_stock",
  "max_stock",
  "track_inventory",
  "active",
] as const;

function slugifySku(name: string) {
  const base = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // xóa dấu thanh (kết hợp) sau khi tách bằng NFD
    .replace(/đ|Đ/g, "d") // "đ"/"Đ" (U+0111/U+0110) không tách được bằng NFD, thay tay
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return "SP-" + (base || "hang").toUpperCase();
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: corsHeaders });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// Trang "Hàng hóa" (Giai đoạn B & WP4-3B) — phân quyền qua can(role, 'products.*')

export async function GET(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) return json({ ok: false, error: auth.error }, 401);

  const supabase = getCustomerSupabaseAdmin();

  // Catalog rút gọn cho POS: tải một lần rồi tìm ngay trên trình duyệt.
  // Giá vẫn được server xác nhận lại khi tạo/chốt đơn.
  if (req.nextUrl.searchParams.get("catalog") === "1") {
    try {
      const customerId = req.nextUrl.searchParams.get("customerId")?.trim() || "";
      const cacheKey = customerId || "base";
      const cached = pricedCatalogCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return json({ ok: true, products: cached.products, cached: true });
      }
      const products = await loadBaseCatalog(supabase);
      const priceMap = customerId ? await resolvePricesForProducts(supabase, customerId, products) : null;
      const compact = products.map((p) => {
        const basePrice = Number(p.price_retail) || Number(p.price_wholesale) || 0;
        const resolved = priceMap?.get(p.id);
        return [
          p.id, p.sku || "", p.name, p.category || "", p.unit || "Kg",
          resolved?.price ?? basePrice, resolved?.basePrice ?? basePrice,
          p.thumb_url || p.image_url || "", Boolean(p.thumb_url),
          Boolean(p.track_inventory), p.stock_qty == null ? null : Number(p.stock_qty),
          Boolean(p.is_low_stock || (p.track_inventory && Number(p.stock_qty) <= Number(p.min_stock || 0))),
        ];
      });
      pricedCatalogCache.set(cacheKey, { products: compact, expiresAt: Date.now() + CATALOG_CACHE_TTL_MS });
      return json({ ok: true, products: compact, cached: false });
    } catch (error) {
      console.error("GET /api/admin/products catalog lỗi:", error);
      return json({ ok: false, error: "Không tải được catalog sản phẩm" }, 500);
    }
  }

  // 1. Meta danh mục & tiers — WP4-3B: ưu tiên dùng RPC get_distinct_categories
  if (req.nextUrl.searchParams.get("meta") === "1") {
    let categories: string[] = [];
    try {
      const { data: rpcCats, error: catErr } = await supabase.rpc("get_distinct_categories");
      if (!catErr && Array.isArray(rpcCats)) {
        categories = rpcCats.map((r: any) => r.category).filter(Boolean);
      }
    } catch {
      // Fallback nếu RPC chưa chạy migration
    }

    if (categories.length === 0) {
      const { data: catRows } = await supabase
        .from("products")
        .select("category")
        .eq("active", true)
        .not("category", "is", null);
      categories = [...new Set((catRows || []).map((r) => r.category as string))].sort();
    }

    const { data: tiers } = await supabase
      .from("customer_tiers")
      .select("code, name")
      .neq("code", "CUSTOM")
      .order("code");
    return json({ ok: true, categories, tiers: tiers || [] });
  }

  const productId = req.nextUrl.searchParams.get("productId")?.trim();
  if (productId) {
    const { data: product, error } = await supabase.from("products").select("*").eq("id", productId).single();
    if (error || !product) return json({ ok: false, error: "Không tìm thấy sản phẩm" }, 404);

    const { data: tierRows } = await supabase.from("product_tier_prices").select("tier, price").eq("product_id", productId);
    const { data: history } = await supabase
      .from("inventory_transactions")
      .select("id, type, quantity, note, created_at, created_by, admin_profiles(name)")
      .eq("product_id", productId)
      .order("created_at", { ascending: false })
      .limit(20);

    return json({
      ok: true,
      product: {
        ...product,
        tierPrices: Object.fromEntries((tierRows || []).map((r) => [r.tier, Number(r.price)])),
      },
      inventoryHistory: history || [],
      canEdit: can(auth.profile?.role, "products.edit"),
    });
  }

  const search = req.nextUrl.searchParams.get("search")?.trim() || "";
  const category = req.nextUrl.searchParams.get("category")?.trim() || "";
  const customerId = req.nextUrl.searchParams.get("customerId")?.trim() || "";
  const lowStockOnly = req.nextUrl.searchParams.get("lowStockOnly") === "1";
  const page = Math.max(0, Number(req.nextUrl.searchParams.get("page") || 0));
  const pageSize = Math.min(60, Math.max(1, Number(req.nextUrl.searchParams.get("pageSize") || 40)));

  try {
    let products: any[] = [];
    let totalCount = 0;
    let usedRpc = false;

    // 2. WP4-3B: Tìm kiếm thông minh qua RPC search_products
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
            price_retail: Number(r.price_retail) || 0,
            price_wholesale: Number(r.price_wholesale) || 0,
            track_inventory: r.track_inventory,
            stock_qty: r.stock_qty,
            min_stock: r.min_stock,
            is_low_stock: r.track_inventory && (Number(r.stock_qty) || 0) <= (Number(r.min_stock) || 0),
            active: r.active,
          }));
        }
      } catch {
        usedRpc = false;
      }
    }

    if (!usedRpc) {
      let query = supabase
        .from("products")
        .select(
          "id, sku, name, category, unit, image_url, thumb_url, price_retail, price_wholesale, cost_price, stock_qty, min_stock, max_stock, track_inventory, is_low_stock, active",
          { count: "exact" }
        )
        .order("name")
        .range(page * pageSize, page * pageSize + pageSize - 1);

      if (search) {
        const safe = search.replace(/[%_]/g, "");
        query = query.or(`name.ilike.%${safe}%,sku.ilike.%${safe}%`);
      }
      if (category) query = query.eq("category", category);
      if (lowStockOnly) query = query.eq("is_low_stock", true);

      const { data: qProducts, count, error } = await query;
      if (error) throw error;
      products = qProducts || [];
      totalCount = count || 0;
    }

    // 3. Tải giá theo hạng và giá riêng của khách hàng nếu có customerId
    const productIds = products.map((p) => p.id);
    let customerPriceMap: Map<string, any> | null = null;

    if (customerId && products.length > 0) {
      try {
        customerPriceMap = await resolvePricesForProducts(supabase, customerId, products);
      } catch (err) {
        console.warn("Lỗi resolvePricesForProducts trong admin products:", err);
      }
    }

    const { data: tierPrices } = productIds.length
      ? await supabase.from("product_tier_prices").select("product_id, tier, price").in("product_id", productIds)
      : { data: [] as { product_id: string; tier: string; price: number }[] };

    const tierMap = new Map<string, Record<string, number>>();
    for (const row of tierPrices || []) {
      const entry = tierMap.get(row.product_id) || {};
      entry[row.tier] = Number(row.price);
      tierMap.set(row.product_id, entry);
    }

    return json({
      ok: true,
      total: totalCount,
      page,
      pageSize,
      products: products.map((p) => {
        const resolved = customerPriceMap?.get(p.id);
        const price = resolved?.price ?? (Number(p.price_retail) || Number(p.price_wholesale) || 0);
        const basePrice = resolved?.basePrice ?? (Number(p.price_retail) || 0);
        return {
          ...p,
          price,
          basePrice,
          priceOnRequest: price <= 0,
          trackInventory: !!p.track_inventory,
          stockQty: p.stock_qty != null ? Number(p.stock_qty) : null,
          lowStock: !!p.is_low_stock,
          tierPrices: tierMap.get(p.id) || {},
        };
      }),
      canEdit: can(auth.profile?.role, "products.edit"),
    });
  } catch (error) {
    console.error("GET /api/admin/products lỗi:", error);
    return json({ ok: false, error: "Không tải được danh sách hàng hóa" }, 500);
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) return json({ ok: false, error: auth.error }, 401);
  if (!can(auth.profile?.role, "products.edit")) {
    return json({ ok: false, error: "Chỉ Quản trị viên hoặc Thu mua được sửa giá/tồn kho" }, 403);
  }

  const body = await req.json().catch(() => null);
  const productId = String(body?.productId || "").trim();
  if (!productId) return json({ ok: false, error: "Thiếu productId" }, 400);

  const supabase = getCustomerSupabaseAdmin();

  try {
    // 0. Sửa thông tin chung của sản phẩm (tên, ảnh, mô tả, giá gốc...).
    //    Chỉ nhận đúng các cột trong EDITABLE_FIELDS, bỏ qua field lạ.
    if (body?.fields && typeof body.fields === "object") {
      const patch: Record<string, unknown> = {};
      for (const key of EDITABLE_FIELDS) {
        if (key in body.fields) patch[key] = body.fields[key];
      }
      if (Object.keys(patch).length) {
        const { error: fieldsError } = await supabase.from("products").update(patch).eq("id", productId);
        if (fieldsError) throw fieldsError;
      }
    }

    // 1. Cập nhật giá theo hạng (nhận object { VIP0?: number|null, VIP1?: ... }).
    //    Giá trị null/rỗng -> xóa override, quay lại dùng giá gốc cho hạng đó.
    if (body?.tierPrices && typeof body.tierPrices === "object") {
      for (const [tier, priceRaw] of Object.entries(body.tierPrices as Record<string, unknown>)) {
        if (priceRaw === null || priceRaw === "" || priceRaw === undefined) {
          await supabase.from("product_tier_prices").delete().eq("product_id", productId).eq("tier", tier);
        } else {
          const price = Number(priceRaw);
          if (!Number.isFinite(price) || price < 0) continue;
          await supabase
            .from("product_tier_prices")
            .upsert({ product_id: productId, tier, price, updated_at: new Date().toISOString() }, { onConflict: "product_id,tier" });
        }
      }
    }

    // 2. Điều chỉnh tồn kho: insert 1 dòng inventory_transactions, trigger DB
    //    tự cập nhật stock_qty — không sửa tay stock_qty ở đây.
    if (body?.inventoryAdjustment) {
      const { type, quantity, note } = body.inventoryAdjustment as {
        type?: string;
        quantity?: number;
        note?: string;
      };
      if (!["in", "out", "adjust"].includes(type || "")) {
        return json({ ok: false, error: "Loại điều chỉnh tồn kho không hợp lệ" }, 400);
      }
      const qty = Number(quantity);
      if (!Number.isFinite(qty) || qty === 0) {
        return json({ ok: false, error: "Số lượng điều chỉnh không hợp lệ" }, 400);
      }
      const { error: invError } = await supabase.from("inventory_transactions").insert({
        product_id: productId,
        type,
        quantity: qty,
        note: note || null,
        created_by: auth.profile?.id !== "legacy-admin" ? auth.profile?.id : null,
      });
      if (invError) throw invError;
    }

    const { data: updated, error: fetchError } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();
    if (fetchError) throw fetchError;

    const { data: tierRows } = await supabase
      .from("product_tier_prices")
      .select("tier, price")
      .eq("product_id", productId);

    return json({
      ok: true,
      product: {
        ...updated,
        tierPrices: Object.fromEntries((tierRows || []).map((r) => [r.tier, Number(r.price)])),
      },
    });
  } catch (error) {
    console.error("PATCH /api/admin/products lỗi:", error);
    return json({ ok: false, error: "Không lưu được thay đổi" }, 500);
  }
}

// Tạo sản phẩm mới thủ công (không qua đồng bộ KiotViet). Mã hàng tự sinh từ
// tên (bỏ dấu, viết hoa, tiền tố "SP-"), tự thêm số thứ tự nếu trùng — chỉ
// cần nhập tên, các trường khác sửa sau trong trang chi tiết.
export async function POST(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) return json({ ok: false, error: auth.error }, 401);
  if (!can(auth.profile?.role, "products.create")) {
    return json({ ok: false, error: "Không có quyền thêm sản phẩm" }, 403);
  }

  const body = await req.json().catch(() => null);
  const name = String(body?.name || "").trim();
  if (!name) return json({ ok: false, error: "Thiếu tên sản phẩm" }, 400);

  const supabase = getCustomerSupabaseAdmin();

  try {
    const baseSku = slugifySku(name);
    let sku = baseSku;
    let suffix = 1;
    for (let attempt = 0; attempt < 20; attempt++) {
      const { data: clash } = await supabase.from("products").select("id").eq("sku", sku).maybeSingle();
      if (!clash) break;
      suffix += 1;
      sku = `${baseSku}-${suffix}`;
    }

    const { data: created, error } = await supabase
      .from("products")
      .insert({
        name,
        sku,
        local_product_id: sku.toLowerCase(),
        category: body?.category || null,
        unit: body?.unit || "Kg",
        price_retail: Number(body?.priceRetail) || 0,
        price_wholesale: Number(body?.priceWholesale) || 0,
        cost_price: Number(body?.costPrice) || 0,
        pack_size: body?.packSize || null,
        supplier: body?.supplier || null,
        origin: body?.origin || null,
        description: body?.description || null,
        track_inventory: body?.trackInventory !== false,
        data_source: "manual",
        active: true,
      })
      .select("*")
      .single();
    if (error) throw error;

    return json({ ok: true, product: { ...created, tierPrices: {} } });
  } catch (error) {
    console.error("POST /api/admin/products lỗi:", error);
    return json({ ok: false, error: "Không tạo được sản phẩm" }, 500);
  }
}
