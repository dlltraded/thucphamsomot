import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { canForProfile } from "@/lib/permissions";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";

const BRAND = {
  primary: "FF0F6F4B",
  primaryDark: "FF0B5A3C",
  cream: "FFF6F7F4",
  ink: "FF14231C",
  gold: "FFF5C84C",
  white: "FFFFFFFF",
  red: "FFC7372F",
};

function styleHeaderRow(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND.primary } };
    cell.font = { color: { argb: BRAND.white }, bold: true, size: 11 };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = { bottom: { style: "thin", color: { argb: BRAND.primaryDark } } };
  });
  row.height = 24;
}

function zebraStripe(sheet: ExcelJS.Worksheet, startRow: number) {
  for (let i = startRow; i <= sheet.rowCount; i++) {
    if ((i - startRow) % 2 === 1) {
      sheet.getRow(i).eachCell({ includeEmpty: true }, (cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND.cream } };
      });
    }
  }
}

function titleBlock(sheet: ExcelJS.Worksheet, title: string, subtitle: string, cols: number) {
  sheet.mergeCells(1, 1, 1, cols);
  const brandCell = sheet.getCell(1, 1);
  brandCell.value = "TPS1 — CÔNG TY TNHH THỰC PHẨM SỐ MỘT";
  brandCell.font = { bold: true, size: 13, color: { argb: BRAND.primary } };
  sheet.getRow(1).height = 22;

  sheet.mergeCells(2, 1, 2, cols);
  const t = sheet.getCell(2, 1);
  t.value = title;
  t.font = { bold: true, size: 16, color: { argb: BRAND.ink } };
  sheet.getRow(2).height = 26;

  sheet.mergeCells(3, 1, 3, cols);
  const s = sheet.getCell(3, 1);
  s.value = subtitle;
  s.font = { italic: true, size: 10, color: { argb: "FF59665F" } };

  sheet.mergeCells(4, 1, 4, cols);
  sheet.getCell(4, 1).border = { bottom: { style: "medium", color: { argb: BRAND.gold } } };
  sheet.getRow(4).height = 6;
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Đơn nháp",
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  preparing: "Đang chuẩn bị",
  shipping: "Đang giao",
  completed: "Hoàn thành",
  canceled: "Đã hủy",
  merged: "Đã gộp",
};

const PAYMENT_LABELS: Record<string, string> = {
  pending: "Chờ xử lý",
  cod: "COD",
  paid: "Đã thanh toán",
  partially_paid: "Thanh toán 1 phần",
  failed: "Thất bại",
  refunded: "Đã hoàn tiền",
};

async function exportSingleOrder(req: NextRequest, orderId: string) {
  const supabase = getCustomerSupabaseAdmin();
  const { data: order, error } = await supabase
    .from("orders")
    .select(`
      order_code, created_at, delivery_date, customer_name, customer_company, customer_phone, sales_rep_id,
      order_items(sku, name, unit, quantity, base_unit_price, unit_price, line_total, packaging_note, customer_note),
      subtotal, discount_amount, grand_total, shipping_amount, paid_amount
    `)
    .eq("id", orderId)
    .single();

  if (error || !order) return NextResponse.json({ ok: false, error: "Không tìm thấy đơn hàng" }, { status: 404 });

  const { data: rep } = order.sales_rep_id
    ? await supabase.from("admin_profiles").select("name").eq("id", order.sales_rep_id).maybeSingle()
    : { data: null as { name: string } | null };

  const wb = new ExcelJS.Workbook();
  wb.creator = "TPS1 Sale System";
  wb.created = new Date();
  const sheet = wb.addWorksheet("Chi tiết đặt hàng", { views: [{ showGridLines: false }] });
  sheet.columns = [
    { width: 16 }, { width: 34 }, { width: 10 }, { width: 22 },
    { width: 12 }, { width: 14 }, { width: 12 }, { width: 14 }, { width: 16 }
  ];

  titleBlock(
    sheet,
    `CHI TIẾT ĐƠN HÀNG ${order.order_code}`,
    `${order.customer_name}${order.customer_company ? ` (${order.customer_company})` : ""} · ${new Date(order.created_at).toLocaleString("vi-VN")}${rep?.name ? ` · Sale: ${rep.name}` : ""}`,
    9
  );

  styleHeaderRow(sheet.addRow([
    "Mã hàng", "Tên hàng", "ĐVT", "Quy cách / Ghi chú", "Số lượng", "Đơn giá", "Giảm giá", "Giá bán", "Thành tiền"
  ]));

  let totalQty = 0;
  ((order as any).order_items || []).forEach((it: any) => {
    const discount = Math.round((Number(it.base_unit_price) - Number(it.unit_price)) * Number(it.quantity));
    totalQty += Number(it.quantity) || 0;
    const noteText = [it.packaging_note, it.customer_note].filter(Boolean).join(" | ");
    const row = sheet.addRow([
      it.sku || "",
      it.name,
      it.unit || "Kg",
      noteText || "—",
      Number(it.quantity),
      Number(it.base_unit_price),
      discount,
      Number(it.unit_price),
      Number(it.line_total)
    ]);
    row.getCell(5).alignment = { horizontal: "center" };
    [6, 7, 8, 9].forEach((c) => { row.getCell(c).numFmt = '#,##0"đ"'; });
    row.getCell(9).font = { bold: true, color: { argb: BRAND.primary } };
  });
  zebraStripe(sheet, 6);

  const gap = sheet.addRow([]);
  gap.height = 6;
  const r1 = sheet.addRow(["", "", "", "", "", "", "", "Tổng số lượng", totalQty]);
  const r2 = sheet.addRow(["", "", "", "", "", "", "", "Tổng tiền hàng", Number(order.subtotal)]);
  const r3 = sheet.addRow(["", "", "", "", "", "", "", "Giảm giá", Number(order.discount_amount)]);
  const r4 = sheet.addRow(["", "", "", "", "", "", "", "Phí giao", Number(order.shipping_amount || 0)]);
  const r5 = sheet.addRow(["", "", "", "", "", "", "", "Tổng cộng", Number(order.grand_total)]);
  [r2, r3, r4, r5].forEach((r) => { r.getCell(9).numFmt = '#,##0"đ"'; });
  r5.font = { bold: true, size: 13 };
  r5.getCell(9).font = { bold: true, size: 13, color: { argb: BRAND.primary } };
  r5.eachCell((cell) => { cell.border = { top: { style: "medium", color: { argb: BRAND.gold } } }; });

  const buffer = await wb.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="chi-tiet-don-hang_${order.order_code}.xlsx"`,
    },
  });
}

export async function GET(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });

  // Phân quyền orders.export
  if (!canForProfile(auth.profile, "orders.export")) {
    return NextResponse.json({ ok: false, error: "Bạn không có quyền xuất dữ liệu đơn hàng" }, { status: 403 });
  }

  const orderId = req.nextUrl.searchParams.get("orderId");
  if (orderId) return exportSingleOrder(req, orderId);

  const orderIdsParam = req.nextUrl.searchParams.get("orderIds") || "";
  const mode = req.nextUrl.searchParams.get("mode") || "list"; // 'list' | 'details'
  const status = req.nextUrl.searchParams.get("status") || "";
  const paymentStatus = req.nextUrl.searchParams.get("paymentStatus") || "";
  const fromStr = req.nextUrl.searchParams.get("from") || "";
  const toStr = req.nextUrl.searchParams.get("to") || "";
  const search = req.nextUrl.searchParams.get("search")?.trim() || "";

  try {
    const supabase = getCustomerSupabaseAdmin();
    const selectFields = mode === "details"
      ? `
        id, order_code, created_at, delivery_date, customer_code, customer_name, customer_company,
        delivery_address, sales_rep_id, item_count, subtotal, discount_amount, shipping_amount,
        grand_total, paid_amount, debt_amount, status, payment_status,
        order_items (
          sku, name, unit, quantity, base_unit_price, unit_price, line_total, packaging_note, customer_note
        )
      `
      : "id, order_code, created_at, delivery_date, customer_code, customer_name, customer_company, delivery_address, sales_rep_id, item_count, subtotal, discount_amount, shipping_amount, grand_total, paid_amount, debt_amount, status, payment_status";

    let query = supabase
      .from("orders")
      .select(selectFields)
      .order("created_at", { ascending: false })
      .limit(5000);

    // Lọc theo danh sách đơn được chọn nếu có
    if (orderIdsParam) {
      const selectedIds = orderIdsParam.split(",").map((s) => s.trim()).filter(Boolean);
      if (selectedIds.length > 0) {
        query = query.in("id", selectedIds);
      }
    } else {
      if (status) query = query.eq("status", status);
      else query = query.neq("status", "merged");
      if (paymentStatus) query = query.eq("payment_status", paymentStatus);
      if (fromStr) query = query.gte("created_at", fromStr);
      if (toStr) query = query.lt("created_at", toStr);
      if (search) {
        const safe = search.replace(/[%_]/g, "");
        query = query.or(`order_code.ilike.%${safe}%,customer_name.ilike.%${safe}%,customer_code.ilike.%${safe}%,customer_phone.ilike.%${safe}%`);
      }
    }

    const isSale = auth.profile?.role === "sale" && auth.profile?.id !== "legacy-admin";
    if (isSale) query = query.eq("sales_rep_id", auth.profile!.id);

    const { data: rawOrders, error } = await query;
    if (error) throw error;
    const orders: any[] = (rawOrders as any) || [];

    const salesRepIds = [...new Set(orders.map((o) => o.sales_rep_id).filter(Boolean))];
    const { data: salesReps } = salesRepIds.length
      ? await supabase.from("admin_profiles").select("id, name").in("id", salesRepIds)
      : { data: [] as { id: string; name: string }[] };
    const salesRepMap = new Map((salesReps || []).map((r) => [r.id, r.name]));

    const wb = new ExcelJS.Workbook();
    wb.creator = "TPS1 Sale System";
    wb.created = new Date();

    if (mode === "details") {
      // Xuất file Chi tiết từng đơn để đối chiếu / kiểm tra
      const sheet = wb.addWorksheet("Chi tiết các đơn hàng", { views: [{ showGridLines: false }] });
      sheet.columns = [
        { width: 16 }, { width: 14 }, { width: 12 }, { width: 28 }, { width: 14 },
        { width: 30 }, { width: 8 }, { width: 20 }, { width: 10 }, { width: 13 }, { width: 14 }
      ];

      titleBlock(
        sheet,
        "CHI TIẾT MẶT HÀNG TỪNG ĐƠN ĐẶT HÀNG",
        `Tổng cộng: ${orders.length} đơn hàng · Xuất lúc: ${new Date().toLocaleString("vi-VN")}`,
        11
      );

      styleHeaderRow(sheet.addRow([
        "Mã đơn", "Ngày đặt", "Mã KH", "Khách hàng", "Mã hàng", "Tên sản phẩm",
        "ĐVT", "Quy cách / Ghi chú", "Số lượng", "Đơn giá", "Thành tiền"
      ]));

      let totalQty = 0;
      let totalAmount = 0;

      orders.forEach((o) => {
        const items = (o as any).order_items || [];
        items.forEach((it: any) => {
          totalQty += Number(it.quantity) || 0;
          totalAmount += Number(it.line_total) || 0;
          const noteText = [it.packaging_note, it.customer_note].filter(Boolean).join(" | ");
          const row = sheet.addRow([
            o.order_code,
            new Date(o.created_at).toLocaleDateString("vi-VN"),
            o.customer_code,
            o.customer_name,
            it.sku || "",
            it.name,
            it.unit || "Kg",
            noteText || "—",
            Number(it.quantity) || 0,
            Number(it.unit_price) || 0,
            Number(it.line_total) || 0,
          ]);
          row.getCell(9).alignment = { horizontal: "center" };
          [10, 11].forEach((c) => { row.getCell(c).numFmt = '#,##0"đ"'; });
          row.getCell(11).font = { bold: true, color: { argb: BRAND.primary } };
        });
      });

      zebraStripe(sheet, 6);

      const totalRow = sheet.addRow(["", "", "", "", "", "TỔNG CỘNG", "", "", totalQty, "", totalAmount]);
      totalRow.font = { bold: true };
      totalRow.getCell(11).numFmt = '#,##0"đ"';
      totalRow.getCell(11).font = { bold: true, color: { argb: BRAND.primary } };
      totalRow.eachCell((cell) => { cell.border = { top: { style: "medium", color: { argb: BRAND.gold } } }; });

      const buffer = await wb.xlsx.writeBuffer();
      const filename = `chi-tiet-don-hang_${new Date().toISOString().slice(0, 10)}.xlsx`;
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // mode === 'list' (Mặc định)
    const rangeLabel = orderIdsParam
      ? `Được chọn: ${orders.length} đơn`
      : (fromStr || toStr
        ? `${fromStr ? new Date(fromStr).toLocaleDateString("vi-VN") : "..."} – ${toStr ? new Date(toStr).toLocaleDateString("vi-VN") : "..."}`
        : "Toàn bộ");

    const sheet = wb.addWorksheet("Danh sách đơn hàng", { views: [{ showGridLines: false }] });
    sheet.columns = [
      { width: 14 }, { width: 16 }, { width: 12 }, { width: 12 }, { width: 30 }, { width: 18 },
      { width: 8 }, { width: 14 }, { width: 12 }, { width: 12 }, { width: 14 },
      { width: 14 }, { width: 14 }, { width: 16 }, { width: 14 },
    ];
    titleBlock(sheet, "DANH SÁCH ĐƠN HÀNG", `Phạm vi: ${rangeLabel} · ${orders.length} đơn`, 15);
    styleHeaderRow(sheet.addRow([
      "Mã đơn", "Ngày đặt", "Ngày giao", "Mã KH", "Khách hàng", "Sale phụ trách", "Số SP",
      "Tổng tiền hàng", "Giảm giá", "Phí giao", "Tổng cộng", "Đã trả", "Còn nợ",
      "Trạng thái xử lý", "Trạng thái TT",
    ]));

    let totalGrand = 0, totalPaid = 0, totalDebt = 0;
    orders.forEach((o) => {
      const debt = o.debt_amount != null ? Number(o.debt_amount) : Number(o.grand_total) - Number(o.paid_amount || 0);
      totalGrand += Number(o.grand_total) || 0;
      totalPaid += Number(o.paid_amount) || 0;
      totalDebt += debt;
      const row = sheet.addRow([
        o.order_code,
        new Date(o.created_at).toLocaleString("vi-VN"),
        o.delivery_date ? String(o.delivery_date).slice(0, 10) : "—",
        o.customer_code,
        o.customer_company ? `${o.customer_name} (${o.customer_company})` : o.customer_name,
        salesRepMap.get(o.sales_rep_id) || "—",
        o.item_count || 0,
        Number(o.subtotal) || 0,
        Number(o.discount_amount) || 0,
        Number(o.shipping_amount) || 0,
        Number(o.grand_total) || 0,
        Number(o.paid_amount) || 0,
        debt,
        STATUS_LABELS[o.status] || o.status,
        PAYMENT_LABELS[o.payment_status] || o.payment_status,
      ]);
      [8, 9, 10, 11, 12, 13].forEach((c) => { row.getCell(c).numFmt = '#,##0"đ"'; });
      row.getCell(11).font = { bold: true, color: { argb: BRAND.primary } };
      if (debt > 0) row.getCell(13).font = { bold: true, color: { argb: BRAND.red } };
      row.getCell(7).alignment = { horizontal: "center" };
    });
    zebraStripe(sheet, 6);

    const totalRow = sheet.addRow(["", "", "", "", "", "", "TỔNG CỘNG", "", "", "", totalGrand, totalPaid, totalDebt, "", ""]);
    totalRow.font = { bold: true };
    [11, 12, 13].forEach((c) => {
      totalRow.getCell(c).numFmt = '#,##0"đ"';
      totalRow.getCell(c).font = { bold: true, color: { argb: BRAND.primary } };
    });
    totalRow.eachCell((cell) => { cell.border = { top: { style: "medium", color: { argb: BRAND.gold } } }; });

    const buffer = await wb.xlsx.writeBuffer();
    const filename = `danh-sach-don-hang_${new Date().toISOString().slice(0, 10)}.xlsx`;
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("GET /api/admin/orders/export lỗi:", error);
    return NextResponse.json({ ok: false, error: "Không xuất được danh sách đơn hàng" }, { status: 500 });
  }
}
