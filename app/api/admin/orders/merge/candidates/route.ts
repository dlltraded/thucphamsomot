import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { canForProfile } from "@/lib/permissions";
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

export interface CandidateOrder {
  id: string;
  order_code: string;
  created_at: string;
  delivery_date: string | null;
  delivery_shift: string | null;
  delivery_address: string | null;
  delivery_alias: string | null;
  status: string;
  payment_status: string;
  grand_total: number;
  subtotal: number;
  paid_amount: number;
  item_count: number;
  note: string | null;
}

export interface CustomerMergeGroup {
  groupKey: string;
  customerId: string;
  customerCode: string;
  customerName: string;
  customerPhone: string | null;
  customerCompany: string | null;
  deliveryDate: string | null;
  deliveryAddress: string | null;
  deliveryAlias: string | null;
  orderCount: number;
  totalAmount: number;
  orders: CandidateOrder[];
}

export async function GET(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) {
    return json({ ok: false, error: auth.error }, 401);
  }

  if (!canForProfile(auth.profile, "orders.merge")) {
    return json({ ok: false, error: "Bạn không có quyền gộp đơn hàng" }, 403);
  }

  try {
    const supabase = getCustomerSupabaseAdmin();
    const search = req.nextUrl.searchParams.get("search")?.trim().toLowerCase() || "";
    const filterDate = req.nextUrl.searchParams.get("date")?.trim() || "";

    // Chỉ lấy các đơn chưa hoàn thành, chưa hủy, chưa gộp, chưa chuyển giao
    let query = supabase
      .from("orders")
      .select(`
        id, order_code, customer_id, customer_code, customer_name, customer_phone, customer_company,
        delivery_date, delivery_shift, delivery_address, delivery_alias, delivery_name, delivery_phone,
        status, payment_status, grand_total, subtotal, paid_amount, item_count, note, created_at,
        merged_into_order_id, invoice_document_status, sales_rep_id
      `)
      .in("status", ["draft", "pending", "confirmed"])
      .is("merged_into_order_id", null)
      .order("created_at", { ascending: false })
      .limit(1000);

    if (filterDate) {
      query = query.eq("delivery_date", filterDate);
    }

    const isSale = auth.profile?.role === "sale" && auth.profile?.id !== "legacy-admin";
    if (isSale) {
      query = query.eq("sales_rep_id", auth.profile!.id);
    }

    const { data: rawOrders, error } = await query;
    if (error) throw error;

    const orders = rawOrders || [];

    // Nhóm theo Khách hàng + Ngày giao + Địa chỉ nhận
    const groupMap = new Map<string, CustomerMergeGroup>();

    const normalize = (s?: string | null) =>
      (s || "").trim().toLowerCase().replace(/[.,\-\/]/g, " ").replace(/\s+/g, " ");

    for (const o of orders) {
      const custId = (o.customer_id || o.customer_code || "unknown").trim();
      const delDate = o.delivery_date ? String(o.delivery_date).slice(0, 10) : "chua_co_ngay";
      const delAddrNorm = normalize(o.delivery_address);

      // Nhóm theo: Khách hàng + Ngày giao (để hiển thị theo từng bếp / điểm giao)
      const groupKey = `${custId}___${delDate}___${delAddrNorm}`;

      if (!groupMap.has(groupKey)) {
        // Tên hiển thị nhóm: Tên khách + Điểm giao (nếu có)
        const displayName = o.delivery_alias
          ? `${o.customer_name} - ${o.delivery_alias}`
          : (o.customer_company ? `${o.customer_name} (${o.customer_company})` : o.customer_name);

        groupMap.set(groupKey, {
          groupKey,
          customerId: o.customer_id,
          customerCode: o.customer_code || "",
          customerName: displayName,
          customerPhone: o.customer_phone || null,
          customerCompany: o.customer_company || null,
          deliveryDate: o.delivery_date ? String(o.delivery_date).slice(0, 10) : null,
          deliveryAddress: o.delivery_address || null,
          deliveryAlias: o.delivery_alias || null,
          orderCount: 0,
          totalAmount: 0,
          orders: [],
        });
      }

      const group = groupMap.get(groupKey)!;
      group.orderCount += 1;
      group.totalAmount += Number(o.grand_total) || 0;
      group.orders.push({
        id: o.id,
        order_code: o.order_code,
        created_at: o.created_at,
        delivery_date: o.delivery_date,
        delivery_shift: o.delivery_shift,
        delivery_address: o.delivery_address,
        delivery_alias: o.delivery_alias,
        status: o.status,
        payment_status: o.payment_status,
        grand_total: Number(o.grand_total) || 0,
        subtotal: Number(o.subtotal) || 0,
        paid_amount: Number(o.paid_amount) || 0,
        item_count: o.item_count || 0,
        note: o.note || null,
      });
    }

    // Chỉ giữ lại các nhóm có từ 2 đơn trở lên (đủ điều kiện gộp)
    let candidateGroups = Array.from(groupMap.values()).filter((g) => g.orderCount >= 2);

    // Lọc theo từ khóa tìm kiếm nếu có
    if (search) {
      candidateGroups = candidateGroups.filter((g) =>
        g.customerName.toLowerCase().includes(search) ||
        g.customerCode.toLowerCase().includes(search) ||
        (g.deliveryAddress && g.deliveryAddress.toLowerCase().includes(search)) ||
        g.orders.some((o) => o.order_code.toLowerCase().includes(search))
      );
    }

    // Sắp xếp: nhóm có nhiều đơn nhất lên đầu
    candidateGroups.sort((a, b) => b.orderCount - a.orderCount);

    return json({
      ok: true,
      totalGroups: candidateGroups.length,
      groups: candidateGroups,
    });
  } catch (error: any) {
    console.error("GET /api/admin/orders/merge/candidates lỗi:", error);
    return json({ ok: false, error: error.message || "Lỗi lấy danh sách đơn gộp theo khách" }, 500);
  }
}
