import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { canForProfile } from "@/lib/permissions";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Token",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(req: NextRequest) {
  const requestStartedAt = Date.now();
  const requestId = randomUUID();
  const timings: Record<string, number> = {};
  const logTiming = () => console.info("[price-book-grid-timing]", JSON.stringify({
    requestId,
    totalMs: Date.now() - requestStartedAt,
    ...timings,
  }));
  const authStartedAt = Date.now();
  try {
    const auth = await verifyAdminAuth(req);
    timings.authMs = Date.now() - authStartedAt;
    if (!auth.ok) {
      logTiming();
      return NextResponse.json({ error: auth.error || "Chưa đăng nhập" }, { status: 401, headers: corsHeaders });
    }

    if (!canForProfile(auth.profile, "pricing.view") && !canForProfile(auth.profile, "products.view")) {
      logTiming();
      return NextResponse.json({ error: "Không có quyền xem bảng giá" }, { status: 403, headers: corsHeaders });
    }

    const supabase = getCustomerSupabaseAdmin();
    const url = req.nextUrl;

    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const rawPageSize = parseInt(url.searchParams.get("pageSize") || "20", 10);
    const pageSize = [10, 20, 50, 100].includes(rawPageSize) ? rawPageSize : 20;
    const offset = (page - 1) * pageSize;

    const skuFilter = url.searchParams.get("sku")?.trim() || "";
    const nameFilter = url.searchParams.get("name")?.trim() || "";
    const searchFilter = url.searchParams.get("search")?.trim() || "";
    const categoryFilter = url.searchParams.get("category")?.trim() || "";
    const rawPriceBookIds = url.searchParams.get("priceBookIds")?.trim() || "";
    const customerId = url.searchParams.get("customerId")?.trim() || "";
    const groupName = url.searchParams.get("groupName")?.trim() || "";

    // Ba nguồn nền độc lập được tải song song thay vì tuần tự qua nhiều lượt DB.
    let prodQuery = supabase
      .from("products")
      .select("id, sku, name, unit, category, price_retail, cost_price, last_import_price, min_order_qty, order_step, packaging_note, quantity_precision, active", { count: "exact" })
      .eq("active", true);

    if (skuFilter) prodQuery = prodQuery.ilike("sku", `%${skuFilter}%`);
    if (nameFilter) prodQuery = prodQuery.ilike("name", `%${nameFilter}%`);
    if (searchFilter) prodQuery = prodQuery.or(`sku.ilike.%${searchFilter}%,name.ilike.%${searchFilter}%`);
    if (categoryFilter) prodQuery = prodQuery.eq("category", categoryFilter);

    const productsQuery = prodQuery
      .order("sku", { ascending: true, nullsFirst: false })
      .range(offset, offset + pageSize - 1);
    const booksQuery = supabase
      .from("price_books")
      .select("id, code, name, kind, status, version, valid_from, valid_to, created_at, updated_at, created_by, approved_by")
      .in("status", ["active", "draft", "pending_approval"])
      .order("created_at", { ascending: false });
    const customerOptionsQuery = supabase
      .from("vip_accounts")
      .select("id, partner_code, name, company, customer_group")
      .eq("is_active", true)
      .order("company", { ascending: true })
      .limit(1000);
    const customerAssignmentsQuery = customerId
      ? Promise.all([
          supabase.from("vip_accounts").select("customer_group").eq("id", customerId).maybeSingle(),
          supabase.from("price_book_customer_assignments").select("price_book_id").eq("customer_id", customerId),
        ])
      : Promise.resolve(null);

    const baseQueriesStartedAt = Date.now();
    const [booksResult, productsResult, customerOptionsResult, customerAssignmentsResult] = await Promise.all([
      booksQuery,
      productsQuery,
      customerOptionsQuery,
      customerAssignmentsQuery,
    ]);
    timings.baseQueriesMs = Date.now() - baseQueriesStartedAt;
    const { data: allBooks, error: booksErr } = booksResult;
    const { data: products, count, error: prodErr } = productsResult;
    const { data: customerOptions } = customerOptionsResult;
    if (booksErr) throw booksErr;
    if (prodErr) throw prodErr;

    // Determine which price books to show as columns
    let selectedBooks: any[] = [];
    if (rawPriceBookIds) {
      const idList = rawPriceBookIds.split(",").map(id => id.trim()).filter(Boolean);
      selectedBooks = (allBooks || []).filter(b => idList.includes(b.id));
    }

    // Khi lọc theo khách hàng/nhóm bếp, chỉ đưa các bảng giá thực sự áp dụng
    // thành cột: giá riêng -> giá nhóm -> giá chung.
    if (!rawPriceBookIds && (customerId || groupName)) {
      const applicableIds = new Set<string>();
      let resolvedGroup = groupName;
      if (customerId) {
        const [customerResult, customerBookResult] = customerAssignmentsResult || [];
        const customer = customerResult?.data;
        resolvedGroup = customer?.customer_group || resolvedGroup;
        for (const row of customerBookResult?.data || []) applicableIds.add(row.price_book_id);
      }
      if (resolvedGroup) {
        const { data: groupAssignments } = await supabase.from("price_book_customer_group_assignments").select("price_book_id").ilike("group_name", resolvedGroup);
        for (const row of groupAssignments || []) applicableIds.add(row.price_book_id);
      }
      for (const book of allBooks || []) if (book.kind === "general") applicableIds.add(book.id);
      selectedBooks = (allBooks || []).filter(book => applicableIds.has(book.id));
    }

    if (selectedBooks.length === 0) {
      // Mặc định chỉ hiển thị Bảng giá chung. Người dùng chủ động chọn
      // thêm bảng giá khách/nhóm để tránh bảng quá rộng và khó quản lý.
      const general = (allBooks || []).find(b => b.kind === "general" && b.status === "active") || (allBooks || []).find(b => b.kind === "general");
      const defaultIds = new Set<string>();
      if (general) defaultIds.add(general.id);
      selectedBooks = (allBooks || []).filter(b => defaultIds.has(b.id));
    }

    // 3. Query price items for the fetched products in the selected price books
    const productIds = (products || []).map(p => p.id);
    const selectedBookIds = selectedBooks.map(b => b.id);

    let priceMap: Record<string, Record<string, number | null>> = {};
    let detailsMap: Record<string, Record<string, any>> = {};

    if (productIds.length > 0 && selectedBookIds.length > 0) {
      const priceItemsStartedAt = Date.now();
      const { data: priceItems, error: itemsErr } = await supabase
        .from("price_book_items")
        .select("price_book_id, product_id, price, base_price, discount_percent, min_qty, order_step")
        .in("product_id", productIds)
        .in("price_book_id", selectedBookIds);

      if (itemsErr) throw itemsErr;
      timings.priceItemsMs = Date.now() - priceItemsStartedAt;

      for (const item of (priceItems || [])) {
        if (!priceMap[item.product_id]) {
          priceMap[item.product_id] = {};
          detailsMap[item.product_id] = {};
        }
        priceMap[item.product_id][item.price_book_id] = Number(item.price);
        detailsMap[item.product_id][item.price_book_id] = item;
      }
    }

    // 4. Combine into final rows
    const rows = (products || []).map(p => {
      const prices: Record<string, number | null> = {};
      const priceDetails: Record<string, any> = {};

      for (const b of selectedBooks) {
        prices[b.id] = priceMap[p.id]?.[b.id] ?? null;
        priceDetails[b.id] = detailsMap[p.id]?.[b.id] ?? null;
      }

      return {
        id: p.id,
        sku: p.sku || "",
        name: p.name || "",
        unit: p.unit || "",
        category: p.category || "",
        cost_price: p.cost_price != null ? Number(p.cost_price) : null,
        last_import_price: p.last_import_price != null ? Number(p.last_import_price) : null,
        price_retail: p.price_retail != null ? Number(p.price_retail) : null,
        min_order_qty: p.min_order_qty != null ? Number(p.min_order_qty) : 1,
        order_step: p.order_step != null ? Number(p.order_step) : 1,
        packaging_note: p.packaging_note || "",
        is_active: p.active,
        prices,
        priceDetails
      };
    });

    const groupOptions = Array.from(new Set((customerOptions || []).map(c => c.customer_group).filter(Boolean))).sort();

    logTiming();
    return NextResponse.json({
      ok: true,
      data: {
        products: rows,
        priceBooks: selectedBooks,
        allPriceBooks: allBooks || [],
        customers: customerOptions || [],
        customerGroups: groupOptions,
        pagination: {
          page,
          pageSize,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / pageSize)
        }
      }
    }, { headers: corsHeaders });
  } catch (err: any) {
    console.error("Error in /api/admin/price-books/grid:", err);
    logTiming();
    return NextResponse.json({ error: err.message || "Lỗi tải dữ liệu bảng giá" }, { status: 500, headers: corsHeaders });
  }
}

