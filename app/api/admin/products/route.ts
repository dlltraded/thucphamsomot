import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { canForProfile } from "@/lib/permissions";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";
import { resolvePricesForProducts } from "@/lib/customer-pricing";

import { invalidateCustomerCatalogCache } from "@/app/api/customer/products/route";

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
  packaging_note?: string | null;
  min_order_qty?: number | null;
  order_step?: number | null;
  enforce_order_step?: boolean | null;
};
let baseCatalogCache: { expiresAt: number; products: CatalogProduct[] } | null = null;
const pricedCatalogCache = new Map<string, { expiresAt: number; products: unknown[] }>();

export function invalidateAdminCatalogCache() {
  baseCatalogCache = null;
  pricedCatalogCache.clear();
}

async function loadBaseCatalog(supabase: ReturnType<typeof getCustomerSupabaseAdmin>) {
  if (baseCatalogCache && baseCatalogCache.expiresAt > Date.now()) return baseCatalogCache.products;
  const fields = "id, sku, name, category, unit, image_url, thumb_url, price_retail, price_wholesale, track_inventory, stock_qty, min_stock, is_low_stock, packaging_note, min_order_qty, order_step, enforce_order_step";
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
  "packaging_note",
  "min_order_qty",
  "order_step",
  "enforce_order_step",
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
          p.packaging_note || null,
          p.min_order_qty == null ? 1 : Number(p.min_order_qty) || 1,
          p.order_step == null ? 1 : Number(p.order_step) || 1,
          Boolean(p.enforce_order_step),
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
      canEdit: canForProfile(auth.profile, "products.edit"),
    });
  }

  const search = req.nextUrl.searchParams.get("search")?.trim() || "";
  const category = req.nextUrl.searchParams.get("category")?.trim() || "";
  const customerId = req.nextUrl.searchParams.get("customerId")?.trim() || "";
  const lowStockOnly = req.nextUrl.searchParams.get("lowStockOnly") === "1";
  const specFilter = req.nextUrl.searchParams.get("specFilter")?.trim() || "";
  const page = Math.max(0, Number(req.nextUrl.searchParams.get("page") || 0));
  const pageSize = Math.min(60, Math.max(1, Number(req.nextUrl.searchParams.get("pageSize") || 40)));

  try {
    let products: any[] = [];
    let totalCount = 0;
    let usedRpc = false;

    // 2. WP4-3B: Tìm kiếm thông minh qua RPC search_products (khi không dùng specFilter)
    if ((search || category) && !specFilter) {
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

          // Lấy bổ sung 4 trường quy cách từ bảng products theo danh sách ID (không cần migration)
          const productIds = rpcRows.map((r: any) => r.id).filter(Boolean);
          const specMap = new Map<string, any>();
          if (productIds.length > 0) {
            const { data: specRows, error: specErr } = await supabase
              .from("products")
              .select("id, packaging_note, min_order_qty, order_step, enforce_order_step")
              .in("id", productIds);
            if (specErr) {
              console.error("Lỗi truy vấn bổ sung quy cách sản phẩm:", specErr);
              // Nếu truy vấn quy cách lỗi, không được trả mặc định làm mất quy cách; fallback sang query bảng products trực tiếp
              usedRpc = false;
            } else {
              for (const s of specRows || []) {
                specMap.set(s.id, s);
              }
            }
          }

          if (usedRpc) {
            products = rpcRows.map((r: any) => {
              const spec = specMap.get(r.id);
              return {
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
                packaging_note: spec?.packaging_note || null,
                min_order_qty: spec?.min_order_qty == null ? 1 : Number(spec.min_order_qty) || 1,
                order_step: spec?.order_step == null ? 1 : Number(spec.order_step) || 1,
                enforce_order_step: Boolean(spec?.enforce_order_step),
              };
            });
          }
        }
      } catch {
        usedRpc = false;
      }
    }

    if (!usedRpc) {
      let query = supabase
        .from("products")
        .select(
          "id, sku, name, category, unit, image_url, thumb_url, price_retail, price_wholesale, cost_price, stock_qty, min_stock, max_stock, track_inventory, is_low_stock, active, packaging_note, min_order_qty, order_step, enforce_order_step",
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

      if (specFilter === "configured") {
        query = query.or("enforce_order_step.eq.true,packaging_note.not.is.null");
      } else if (specFilter === "unconfigured") {
        query = query.is("packaging_note", null).eq("enforce_order_step", false);
      } else if (specFilter === "enforced") {
        query = query.eq("enforce_order_step", true);
      }

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

    // Thống kê chỉ số quy cách phục vụ chỉ báo giao diện
    let specStats = { total: 0, configured: 0, unconfigured: 0, enforced: 0 };
    try {
      const [{ count: tot }, { count: enf }, { count: conf }] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }).eq("active", true),
        supabase.from("products").select("id", { count: "exact", head: true }).eq("active", true).eq("enforce_order_step", true),
        supabase.from("products").select("id", { count: "exact", head: true }).eq("active", true).or("enforce_order_step.eq.true,packaging_note.not.is.null"),
      ]);
      const totalAct = tot || 0;
      const confCount = conf || 0;
      specStats = {
        total: totalAct,
        configured: confCount,
        unconfigured: Math.max(0, totalAct - confCount),
        enforced: enf || 0,
      };
    } catch (e) {
      console.warn("Lỗi tính specStats:", e);
    }

    return json({
      ok: true,
      total: totalCount,
      page,
      pageSize,
      specStats,
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
          packaging_note: p.packaging_note || null,
          min_order_qty: p.min_order_qty == null ? 1 : Number(p.min_order_qty) || 1,
          order_step: p.order_step == null ? 1 : Number(p.order_step) || 1,
          enforce_order_step: Boolean(p.enforce_order_step),
        };
      }),
      canEdit: canForProfile(auth.profile, "products.edit"),
    });
  } catch (error) {
    console.error("GET /api/admin/products lỗi:", error);
    return json({ ok: false, error: "Không tải được danh sách hàng hóa" }, 500);
  }
}

function validateSpecFields(fields: Record<string, unknown>): string | null {
  if (fields.packaging_note !== undefined && fields.packaging_note !== null) {
    if (typeof fields.packaging_note !== "string") return "Quy cách đóng gói phải là chuỗi ký tự";
    if (fields.packaging_note.trim().length > 120) return "Quy cách đóng gói tối đa 120 ký tự";
  }
  if (fields.min_order_qty !== undefined && fields.min_order_qty !== null) {
    const min = Number(fields.min_order_qty);
    if (!Number.isFinite(min) || min < 0) return "Số lượng tối thiểu không được âm hoặc không hợp lệ";
    if (Math.round(min * 1000) !== min * 1000) return "Số lượng tối thiểu tối đa 3 chữ số thập phân";
  }
  if (fields.order_step !== undefined && fields.order_step !== null) {
    const step = Number(fields.order_step);
    if (!Number.isFinite(step) || step < 0) return "Bước đặt hàng không được âm hoặc không hợp lệ";
    if (Math.round(step * 1000) !== step * 1000) return "Bước đặt hàng tối đa 3 chữ số thập phân";
  }
  if (fields.enforce_order_step === true) {
    if (fields.min_order_qty !== undefined && Number(fields.min_order_qty) <= 0) {
      return "Khi bật kiểm tra quy cách, số lượng tối thiểu phải lớn hơn 0";
    }
    if (fields.order_step !== undefined && Number(fields.order_step) <= 0) {
      return "Khi bật kiểm tra quy cách, bước đặt hàng phải lớn hơn 0";
    }
  }
  return null;
}

export async function PATCH(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) return json({ ok: false, error: auth.error }, 401);
  if (!canForProfile(auth.profile, "products.edit")) {
    return json({ ok: false, error: "Chỉ Admin, Thu mua hoặc Kế toán được sửa thông tin và giá sản phẩm" }, 403);
  }

  const body = await req.json().catch(() => null);
  const productId = String(body?.productId || "").trim();
  const productIds = Array.isArray(body?.productIds) ? (body.productIds as string[]).map(String).filter(Boolean) : [];

  if (!productId && productIds.length === 0) {
    return json({ ok: false, error: "Thiếu productId hoặc productIds" }, 400);
  }

  const supabase = getCustomerSupabaseAdmin();

  try {
    // 0. Sửa hàng loạt nhiều sản phẩm cùng lúc
    if (productIds.length > 0) {
      if (body?.fields && typeof body.fields === "object") {
        const specErr = validateSpecFields(body.fields);
        if (specErr) return json({ ok: false, error: specErr }, 400);

        // Khi bật enforce_order_step=true hàng loạt, bắt buộc xác minh TẤT CẢ sản phẩm được chọn
        // đều có min_order_qty > 0 và order_step > 0 (kể cả khi payload không gửi 2 trường này)
        if (body.fields.enforce_order_step === true) {
          const { data: existingProducts, error: checkError } = await supabase
            .from("products")
            .select("id, name, sku, min_order_qty, order_step")
            .in("id", productIds);
          if (checkError) throw checkError;

          const invalidProducts: string[] = [];
          for (const p of existingProducts || []) {
            const minVal = body.fields.min_order_qty !== undefined
              ? Number(body.fields.min_order_qty)
              : Number(p.min_order_qty || 0);
            const stepVal = body.fields.order_step !== undefined
              ? Number(body.fields.order_step)
              : Number(p.order_step || 0);
            if (minVal <= 0 || stepVal <= 0) {
              invalidProducts.push(p.sku || p.name || p.id);
            }
          }

          if (invalidProducts.length > 0) {
            const sample = invalidProducts.slice(0, 3).join(", ");
            const more = invalidProducts.length > 3 ? ` và ${invalidProducts.length - 3} sản phẩm khác` : "";
            return json({
              ok: false,
              error: `Không thể bật kiểm tra quy cách: Có ${invalidProducts.length} sản phẩm chưa có số lượng tối thiểu hoặc bước đặt hàng lớn hơn 0 (${sample}${more}). Vui lòng thiết lập tối thiểu và bước nhảy lớn hơn 0 trước khi bật kiểm tra.`,
            }, 400);
          }
        }

        const patch: Record<string, unknown> = {};
        for (const key of EDITABLE_FIELDS) {
          if (key in body.fields) patch[key] = body.fields[key];
        }
        if (Object.keys(patch).length > 0) {
          const { error: batchError } = await supabase
            .from("products")
            .update(patch)
            .in("id", productIds);
          if (batchError) throw batchError;
        }
      }
      invalidateAdminCatalogCache();
      invalidateCustomerCatalogCache();
      return json({ ok: true, updatedCount: productIds.length });
    }

    // 1. Sửa thông tin chung của sản phẩm đơn lẻ (tên, ảnh, mô tả, quy cách...).
    if (body?.fields && typeof body.fields === "object") {
      const specErr = validateSpecFields(body.fields);
      if (specErr) return json({ ok: false, error: specErr }, 400);

      // Nếu bật enforce_order_step nhưng không gửi min/step mới, kiểm tra giá trị hiện tại
      if (body.fields.enforce_order_step === true) {
        const { data: cur } = await supabase.from("products").select("min_order_qty, order_step").eq("id", productId).single();
        const minVal = body.fields.min_order_qty !== undefined ? Number(body.fields.min_order_qty) : Number(cur?.min_order_qty || 0);
        const stepVal = body.fields.order_step !== undefined ? Number(body.fields.order_step) : Number(cur?.order_step || 0);
        if (minVal <= 0 || stepVal <= 0) {
          return json({ ok: false, error: "Khi bật kiểm tra quy cách, số lượng tối thiểu và bước đặt hàng phải lớn hơn 0" }, 400);
        }
      }

      const patch: Record<string, unknown> = {};
      for (const key of EDITABLE_FIELDS) {
        if (key in body.fields) patch[key] = body.fields[key];
      }
      if (Object.keys(patch).length) {
        const { error: fieldsError } = await supabase.from("products").update(patch).eq("id", productId);
        if (fieldsError) throw fieldsError;
      }
    }

    // 2. Cập nhật giá theo hạng
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

    // 3. Điều chỉnh tồn kho: insert 1 dòng inventory_transactions
    if (body?.inventoryAdjustment) {
      if (!canForProfile(auth.profile, "products.stock_in")) {
        return json({ ok: false, error: "Chỉ Admin hoặc Thu mua được điều chỉnh tồn kho" }, 403);
      }
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

    // Xóa cache sau khi sửa đổi dữ liệu sản phẩm
    invalidateAdminCatalogCache();
    invalidateCustomerCatalogCache();

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
  if (!canForProfile(auth.profile, "products.create")) {
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
