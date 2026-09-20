import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { can } from "@/lib/permissions";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";
import { fetchOrderCutoffConfig, calculateEarliestDate } from "@/lib/order-cutoff";
import { fetchProductsByIds } from "@/lib/products-fetcher";

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
  if (!auth.ok) {
    return json({ ok: false, error: auth.error }, 401);
  }

  // Kiểm tra quyền procurement.view
  if (!can(auth.profile?.role, "procurement.view")) {
    return json({ ok: false, error: "Bạn không có quyền xem Đơn tổng / Thu mua" }, 403);
  }

  try {
    const supabase = getCustomerSupabaseAdmin();
    const config = await fetchOrderCutoffConfig();

    // Mặc định ngày mai nếu không chỉ định date
    const requestedDate = req.nextUrl.searchParams.get("date")?.trim();
    const deliveryDate = requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate)
      ? requestedDate
      : calculateEarliestDate(new Date(), config);

    const includePending = req.nextUrl.searchParams.get("includePending") === "1";
    const statuses = includePending
      ? ["confirmed", "preparing", "pending"]
      : ["confirmed", "preparing"];

    // 1. Query danh sách đơn và dòng hàng theo ngày giao (không .limit(500) ngầm)
    const { data: orders, error: ordersErr } = await supabase
      .from("orders")
      .select(`
        id, order_code, external_ref, customer_id, customer_name, customer_code,
        delivery_name, delivery_phone, delivery_address, delivery_alias,
        status, is_late_order, note, updated_at, created_at,
        order_items (
          id, product_id, sku, name, unit, quantity,
          ordered_quantity, ordered_product_name, customer_note
        )
      `)
      .eq("delivery_date", deliveryDate)
      .in("status", statuses)
      .order("order_code", { ascending: true });

    if (ordersErr) throw ordersErr;

    const orderList = orders || [];

    // Thu thập tất cả product_id để query 1 lần lấy thông tin danh mục, tồn kho (tránh N+1)
    const allProductIds = new Set<string>();
    for (const order of orderList) {
      for (const item of (order as any).order_items || []) {
        if (item.product_id) {
          allProductIds.add(item.product_id);
        }
      }
    }

    const productDetailsMap = new Map<string, any>();
    if (allProductIds.size > 0) {
      const productsData = await fetchProductsByIds(
        supabase,
        Array.from(allProductIds),
        "id, sku, name, category, unit, track_inventory, stock_qty"
      );

      for (const p of productsData) {
        productDetailsMap.set(p.id, p);
      }
    }

    // 2. Tổng hợp theo sản phẩm & nhóm hàng (category)
    interface ProductAggLine {
      productId: string;
      sku: string;
      name: string;
      unit: string;
      totalQty: number; // SL cuối cùng
      orderedQty: number; // SL khách đặt ban đầu
      orderCount: number;
      customerCount: number;
      stockQty: number | null;
      shortfall: number;
      notes: Array<{ customer: string; note: string }>;
      customerLines: Array<{
        orderCode: string;
        externalRef?: string | null;
        customerName: string;
        quantity: number;
        orderedQuantity: number;
        note: string;
      }>;
    }

    const productAggMap = new Map<string, { category: string; line: ProductAggLine; customerSet: Set<string> }>();
    let totalLineItems = 0;
    let sumQtyByLines = 0;

    for (const order of orderList) {
      const customerKey = order.customer_id || order.customer_name || "khach_le";
      const items = (order as any).order_items || [];

      for (const item of items) {
        totalLineItems += 1;
        const qty = Number(item.quantity) || 0;
        const ordQty = item.ordered_quantity != null ? Number(item.ordered_quantity) : qty;
        sumQtyByLines += qty;

        const pid = item.product_id || item.sku || item.name;
        const pInfo = item.product_id ? productDetailsMap.get(item.product_id) : null;
        const category = pInfo?.category || "Khác";

        let agg = productAggMap.get(pid);
        if (!agg) {
          const track = pInfo?.track_inventory ? true : false;
          const stock = track ? Number(pInfo?.stock_qty) || 0 : null;
          agg = {
            category,
            customerSet: new Set<string>(),
            line: {
              productId: item.product_id || "",
              sku: pInfo?.sku || item.sku || "",
              name: pInfo?.name || item.name || "",
              unit: pInfo?.unit || item.unit || "Kg",
              totalQty: 0,
              orderedQty: 0,
              orderCount: 0,
              customerCount: 0,
              stockQty: stock,
              shortfall: 0,
              notes: [],
              customerLines: [],
            },
          };
          productAggMap.set(pid, agg);
        }

        agg.line.totalQty += qty;
        agg.line.orderedQty += ordQty;
        agg.line.orderCount += 1;
        agg.customerSet.add(customerKey);

        const custNote = (item.customer_note || "").trim();
        if (custNote) {
          agg.line.notes.push({
            customer: order.customer_name || "Khách hàng",
            note: custNote,
          });
        }

        agg.line.customerLines.push({
          orderCode: order.order_code,
          externalRef: (order as any).external_ref || null,
          customerName: order.customer_name || "Khách hàng",
          quantity: qty,
          orderedQuantity: ordQty,
          note: custNote,
        });
      }
    }

    // Hoàn thiện customerCount, shortfall, gom theo nhóm
    let sumQtyByProducts = 0;
    const categoryGroupsMap = new Map<string, ProductAggLine[]>();

    for (const [, agg] of productAggMap.entries()) {
      agg.line.customerCount = agg.customerSet.size;
      agg.line.totalQty = Math.round(agg.line.totalQty * 1000) / 1000;
      agg.line.orderedQty = Math.round(agg.line.orderedQty * 1000) / 1000;
      sumQtyByProducts += agg.line.totalQty;

      if (agg.line.stockQty !== null) {
        agg.line.shortfall = Math.max(0, Math.round((agg.line.totalQty - agg.line.stockQty) * 1000) / 1000);
      }

      const catLines = categoryGroupsMap.get(agg.category) || [];
      catLines.push(agg.line);
      categoryGroupsMap.set(agg.category, catLines);
    }

    sumQtyByLines = Math.round(sumQtyByLines * 1000) / 1000;
    sumQtyByProducts = Math.round(sumQtyByProducts * 1000) / 1000;

    const groups = Array.from(categoryGroupsMap.entries())
      .map(([category, lines]) => {
        lines.sort((a, b) => a.name.localeCompare(b.name, "vi"));
        const totalQty = Math.round(lines.reduce((s, l) => s + l.totalQty, 0) * 1000) / 1000;
        const orderedQty = Math.round(lines.reduce((s, l) => s + l.orderedQty, 0) * 1000) / 1000;
        return {
          category,
          itemCount: lines.length,
          totalQty,
          orderedQty,
          lines,
        };
      })
      .sort((a, b) => a.category.localeCompare(b.category, "vi"));

    // 3. Danh sách đơn tóm tắt (orders[])
    const ordersSummary = orderList.map((o: any) => ({
      orderId: o.id,
      orderCode: o.order_code,
      externalRef: o.external_ref || null,
      customerName: o.customer_name || "",
      customerCode: o.customer_code || "",
      deliveryName: o.delivery_name || "",
      deliveryPhone: o.delivery_phone || "",
      deliveryAddress: o.delivery_address || "",
      status: o.status,
      isLate: Boolean(o.is_late_order),
      lineCount: (o.order_items || []).length,
      note: o.note || "",
    }));

    // 4. Kiểm tra checksum
    const checksum = {
      orderCount: orderList.length,
      lineItemCount: totalLineItems,
      sumQtyByLines,
      sumQtyByProducts,
      isMatching: Math.abs(sumQtyByLines - sumQtyByProducts) < 0.001,
    };

    // 5. Kiểm tra lần xuất gần nhất & đơn có thay đổi sau xuất (changedSinceLastExport)
    let lastExportedAt: string | null = null;
    let changedSinceLastExport: Array<{
      orderId: string;
      orderCode: string;
      customerName: string;
      updatedAt: string;
    }> = [];

    try {
      const { data: lastExp } = await supabase
        .from("procurement_exports")
        .select("id, exported_at, exported_by, file_name")
        .eq("delivery_date", deliveryDate)
        .order("exported_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastExp?.exported_at) {
        lastExportedAt = lastExp.exported_at;
        const lastExportTime = new Date(lastExp.exported_at).getTime();

        // Đơn ĐÃ HỦY sau lần xuất (bị loại khỏi truy vấn chính nên phải tra riêng) — Thu mua/Kho cần được báo (WP6b)
        const { data: canceledRows } = await supabase
          .from("orders")
          .select("id, order_code, customer_name, canceled_at, updated_at")
          .eq("delivery_date", deliveryDate)
          .eq("status", "canceled");
        for (const c of canceledRows || []) {
          const t = new Date((c as any).canceled_at || (c as any).updated_at || 0).getTime();
          if (t > lastExportTime) {
            changedSinceLastExport.push({
              orderId: c.id,
              orderCode: c.order_code,
              customerName: c.customer_name || "",
              updatedAt: (c as any).canceled_at || (c as any).updated_at,
              kind: "canceled",
            } as any);
          }
        }

        for (const o of orderList) {
          if (o.updated_at && new Date(o.updated_at).getTime() > lastExportTime) {
            changedSinceLastExport.push({
              orderId: o.id,
              orderCode: o.order_code,
              customerName: o.customer_name || "",
              updatedAt: o.updated_at,
            });
          }
        }
      }
    } catch {
      // bảng procurement_exports chưa tạo nếu migration chưa chạy
    }

    return json({
      ok: true,
      deliveryDate,
      includePending,
      groups,
      orders: ordersSummary,
      checksum,
      lastExportedAt,
      changedSinceLastExport,
    });
  } catch (error) {
    console.error("GET /api/admin/procurement/summary lỗi:", error);
    return json(
      { ok: false, error: "Không tải được dữ liệu tổng hợp đơn hàng Thu mua" },
      500
    );
  }
}
