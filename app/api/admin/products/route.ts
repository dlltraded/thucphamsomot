import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";

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

// Trang "Hàng hóa" (Giai đoạn B) — mọi người có tài khoản nhân viên hợp lệ
// đều xem được (vd. sale cần tra tồn kho khi tư vấn khách); chỉ admin/thu_mua
// được SỬA giá theo hạng hoặc điều chỉnh tồn kho (đúng người chịu trách
// nhiệm nhập liệu theo kế hoạch mục 4).
const CAN_EDIT_ROLES = new Set(["admin", "thu_mua"]);

export async function GET(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) return json({ ok: false, error: auth.error }, 401);

  const supabase = getCustomerSupabaseAdmin();

  if (req.nextUrl.searchParams.get("meta") === "1") {
    const { data: catRows } = await supabase
      .from("products")
      .select("category")
      .not("category", "is", null);
    const categories = [...new Set((catRows || []).map((r) => r.category as string))].sort();
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
      canEdit: CAN_EDIT_ROLES.has(auth.profile?.role || ""),
    });
  }

  const search = req.nextUrl.searchParams.get("search")?.trim() || "";
  const category = req.nextUrl.searchParams.get("category")?.trim() || "";
  const lowStockOnly = req.nextUrl.searchParams.get("lowStockOnly") === "1";
  const page = Math.max(0, Number(req.nextUrl.searchParams.get("page") || 0));
  const pageSize = 40;

  try {
    let query = supabase
      .from("products")
      .select(
        "id, sku, name, category, unit, image_url, price_retail, price_wholesale, cost_price, stock_qty, min_stock, max_stock, track_inventory, is_low_stock, active",
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

    const { data: products, count, error } = await query;
    if (error) throw error;

    const productIds = (products || []).map((p) => p.id);
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
      total: count || 0,
      page,
      pageSize,
      products: (products || []).map((p) => ({
        ...p,
        tierPrices: tierMap.get(p.id) || {},
      })),
      canEdit: CAN_EDIT_ROLES.has(auth.profile?.role || ""),
    });
  } catch (error) {
    console.error("GET /api/admin/products lỗi:", error);
    return json({ ok: false, error: "Không tải được danh sách hàng hóa" }, 500);
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) return json({ ok: false, error: auth.error }, 401);
  if (!CAN_EDIT_ROLES.has(auth.profile?.role || "")) {
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
  if (!CAN_EDIT_ROLES.has(auth.profile?.role || "")) {
    return json({ ok: false, error: "Chỉ Quản trị viên hoặc Thu mua được thêm sản phẩm" }, 403);
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
