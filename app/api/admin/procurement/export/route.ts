import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { can } from "@/lib/permissions";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";
import { fetchOrderCutoffConfig, calculateEarliestDate } from "@/lib/order-cutoff";
import { fetchProductsByIds } from "@/lib/products-fetcher";

const BRAND = {
  primary: "FF0F6F4B",
  primaryDark: "FF0B5A3C",
  cream: "FFF6F7F4",
  ink: "FF14231C",
  gold: "FFF5C84C",
  white: "FFFFFFFF",
  gray: "FF59665F",
  lightGray: "FFE0E0E0",
  warningBg: "FFFFF9E6",
  warningText: "FF996600",
};

function styleHeaderRow(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND.primary } };
    cell.font = { color: { argb: BRAND.white }, bold: true, size: 10 };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: BRAND.primaryDark } },
      bottom: { style: "medium", color: { argb: BRAND.primaryDark } },
      left: { style: "thin", color: { argb: BRAND.primaryDark } },
      right: { style: "thin", color: { argb: BRAND.primaryDark } },
    };
  });
  row.height = 24;
}

function titleBlock(sheet: ExcelJS.Worksheet, title: string, subtitle: string, cols: number) {
  sheet.mergeCells(1, 1, 1, cols);
  const brandCell = sheet.getCell(1, 1);
  brandCell.value = "TPS1 — CÔNG TY TNHH THỰC PHẨM SỐ MỘT";
  brandCell.font = { bold: true, size: 12, color: { argb: BRAND.primary } };
  sheet.getRow(1).height = 20;

  sheet.mergeCells(2, 1, 2, cols);
  const t = sheet.getCell(2, 1);
  t.value = title;
  t.font = { bold: true, size: 15, color: { argb: BRAND.ink } };
  sheet.getRow(2).height = 24;

  sheet.mergeCells(3, 1, 3, cols);
  const s = sheet.getCell(3, 1);
  s.value = subtitle;
  s.font = { italic: true, size: 10, color: { argb: BRAND.gray } };
  sheet.getRow(3).height = 18;

  sheet.mergeCells(4, 1, 4, cols);
  sheet.getCell(4, 1).border = { bottom: { style: "medium", color: { argb: BRAND.gold } } };
  sheet.getRow(4).height = 4;
}

export async function GET(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });
  }

  // Quyền procurement.export hoặc procurement.view
  if (!can(auth.profile?.role, "procurement.export") && !can(auth.profile?.role, "procurement.view")) {
    return NextResponse.json({ ok: false, error: "Bạn không có quyền xuất file Đơn tổng" }, { status: 403 });
  }

  try {
    const supabase = getCustomerSupabaseAdmin();
    const config = await fetchOrderCutoffConfig();

    const requestedDate = req.nextUrl.searchParams.get("date")?.trim();
    const deliveryDate = requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate)
      ? requestedDate
      : calculateEarliestDate(new Date(), config);

    const includePending = req.nextUrl.searchParams.get("includePending") === "1";
    const statuses = includePending
      ? ["confirmed", "preparing", "pending"]
      : ["confirmed", "preparing"];

    // 1. Query danh sách đơn và dòng hàng theo ngày giao
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
    if (orderList.length === 0) {
      return NextResponse.json(
        { ok: false, error: `Không có đơn hàng nào cho ngày giao ${deliveryDate}` },
        { status: 404 }
      );
    }

    // Tra cứu danh mục, tồn kho từ bảng products
    const allProductIds = new Set<string>();
    for (const order of orderList) {
      for (const item of (order as any).order_items || []) {
        if (item.product_id) allProductIds.add(item.product_id);
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

    // 2. Chuẩn bị dữ liệu tổng hợp
    interface ProductAgg {
      productId: string;
      sku: string;
      name: string;
      category: string;
      unit: string;
      totalQty: number; // SL cuối cùng
      orderedQty: number; // SL khách đặt ban đầu
      orderCount: number;
      customerSet: Set<string>;
      stockQty: number | null;
      shortfall: number;
      notes: string[];
    }

    const productAggMap = new Map<string, ProductAgg>();
    let totalLinesCount = 0;
    let sumQtySheet2 = 0;

    interface DetailLineItem {
      deliveryDate: string;
      orderCode: string;
      externalRef?: string;
      customerName: string;
      deliveryAddress: string;
      category: string;
      sku: string;
      name: string;
      unit: string;
      orderedQty: number;
      finalQty: number;
      customerNote: string;
      status: string;
      isLate: boolean;
    }

    const detailLines: DetailLineItem[] = [];

    for (const order of orderList) {
      const customerKey = order.customer_id || order.customer_name || "khach_le";
      const items = (order as any).order_items || [];
      const customerDisplayName = order.customer_name || "Khách lẻ";
      const fullAddress = order.delivery_address || order.delivery_alias || "";

      for (const item of items) {
        totalLinesCount += 1;
        const qty = Number(item.quantity) || 0;
        const ordQty = item.ordered_quantity != null ? Number(item.ordered_quantity) : qty;
        sumQtySheet2 += qty;

        const pInfo = item.product_id ? productDetailsMap.get(item.product_id) : null;
        const category = pInfo?.category || "Khác";
        const sku = pInfo?.sku || item.sku || "";
        const name = pInfo?.name || item.name || "";
        const unit = pInfo?.unit || item.unit || "Kg";
        const pid = item.product_id || sku || name;

        let agg = productAggMap.get(pid);
        if (!agg) {
          const track = pInfo?.track_inventory ? true : false;
          const stock = track ? Number(pInfo?.stock_qty) || 0 : null;
          agg = {
            productId: item.product_id || "",
            sku,
            name,
            category,
            unit,
            totalQty: 0,
            orderedQty: 0,
            orderCount: 0,
            customerSet: new Set<string>(),
            stockQty: stock,
            shortfall: 0,
            notes: [],
          };
          productAggMap.set(pid, agg);
        }

        agg.totalQty += qty;
        agg.orderedQty += ordQty;
        agg.orderCount += 1;
        agg.customerSet.add(customerKey);

        const custNote = (item.customer_note || "").trim();
        if (custNote) {
          agg.notes.push(`${customerDisplayName}: ${custNote}`);
        }

        detailLines.push({
          deliveryDate,
          orderCode: order.order_code,
          externalRef: order.external_ref || "",
          customerName: customerDisplayName,
          deliveryAddress: fullAddress,
          category,
          sku,
          name,
          unit,
          orderedQty: ordQty,
          finalQty: qty,
          customerNote: custNote,
          status: order.status,
          isLate: Boolean(order.is_late_order),
        });
      }
    }

    // Tính toán shortfall & làm tròn
    let sumQtySheet1 = 0;
    const categoryGroupsMap = new Map<string, ProductAgg[]>();

    for (const [, agg] of productAggMap.entries()) {
      agg.totalQty = Math.round(agg.totalQty * 1000) / 1000;
      agg.orderedQty = Math.round(agg.orderedQty * 1000) / 1000;
      sumQtySheet1 += agg.totalQty;

      if (agg.stockQty !== null) {
        agg.shortfall = Math.max(0, Math.round((agg.totalQty - agg.stockQty) * 1000) / 1000);
      }

      const list = categoryGroupsMap.get(agg.category) || [];
      list.push(agg);
      categoryGroupsMap.set(agg.category, list);
    }

    sumQtySheet1 = Math.round(sumQtySheet1 * 1000) / 1000;
    sumQtySheet2 = Math.round(sumQtySheet2 * 1000) / 1000;

    // KIỂM TRA BẮT BUỘC (D5 / WP5): Tổng ở Sheet 1 PHẢI bằng tổng Sheet 2
    if (Math.abs(sumQtySheet1 - sumQtySheet2) >= 0.001) {
      console.error(`LỆCH ĐỐI CHIẾU: Sheet 1 = ${sumQtySheet1}, Sheet 2 = ${sumQtySheet2}`);
      return NextResponse.json(
        {
          ok: false,
          error: `Lỗi đối chiếu dữ liệu: Tổng số lượng bảng tổng hợp (${sumQtySheet1}) lệch với bảng chi tiết (${sumQtySheet2})`,
        },
        { status: 500 }
      );
    }

    // 3. Khởi tạo Workbook Excel
    const wb = new ExcelJS.Workbook();
    wb.creator = "TPS1 Procurement System";
    wb.created = new Date();

    const exporterName = auth.profile?.name || auth.profile?.email || "Vận hành";
    const exportTimeStr = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
    const subTitleCommon = `Giao ngày: ${deliveryDate} · Phạm vi: ${includePending ? "Đã xác nhận + Đang soạn + Chờ xác nhận" : "Đã xác nhận + Đang soạn"} · Xuất lúc: ${exportTimeStr} bởi ${exporterName}`;

    // ─── SHEET 1: Tổng hợp ──────────────────────────────────────────
    const s1 = wb.addWorksheet("Tổng hợp", {
      views: [{ showGridLines: true, state: "frozen", ySplit: 5 }],
      pageSetup: { orientation: "landscape", paperSize: 9, fitToPage: true, fitToWidth: 1 },
    });

    s1.columns = [
      { width: 6 },  // STT
      { width: 14 }, // Mã hàng
      { width: 34 }, // Tên hàng
      { width: 8 },  // ĐVT
      { width: 15 }, // Tổng SL cuối cùng
      { width: 15 }, // SL ban đầu
      { width: 9 },  // Số đơn
      { width: 9 },  // Số khách
      { width: 11 }, // Tồn kho
      { width: 11 }, // Cần bù
      { width: 40 }, // Ghi chú của khách
    ];

    titleBlock(s1, `TỔNG HỢP SOẠN HÀNG — GIAO NGÀY ${deliveryDate}`, subTitleCommon, 11);

    const s1Header = s1.addRow([
      "STT", "Mã hàng", "Tên hàng", "ĐVT", "Tổng SL cuối cùng", "SL ban đầu", "Số đơn", "Số khách", "Tồn kho", "Cần bù", "Ghi chú của khách"
    ]);
    styleHeaderRow(s1Header);

    let stt = 1;
    const sortedCategories = Array.from(categoryGroupsMap.keys()).sort((a, b) => a.localeCompare(b, "vi"));

    for (const cat of sortedCategories) {
      const prods = categoryGroupsMap.get(cat) || [];
      prods.sort((a, b) => a.name.localeCompare(b.name, "vi"));

      // Dòng tiêu đề nhóm hàng
      const catRow = s1.addRow([`Nhóm: ${cat.toUpperCase()}`, "", "", "", "", "", "", "", "", "", ""]);
      s1.mergeCells(catRow.number, 1, catRow.number, 11);
      catRow.getCell(1).font = { bold: true, color: { argb: BRAND.primaryDark }, size: 11 };
      catRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND.cream } };
      catRow.height = 22;

      let catFinalQty = 0;
      let catOrdQty = 0;

      for (const p of prods) {
        catFinalQty += p.totalQty;
        catOrdQty += p.orderedQty;

        const row = s1.addRow([
          stt++,
          p.sku,
          p.name,
          p.unit,
          p.totalQty,
          p.orderedQty,
          p.orderCount,
          p.customerSet.size,
          p.stockQty !== null ? p.stockQty : "-",
          p.shortfall > 0 ? p.shortfall : "-",
          p.notes.join("; "),
        ]);

        row.getCell(1).alignment = { horizontal: "center" };
        row.getCell(2).alignment = { horizontal: "center" };
        row.getCell(4).alignment = { horizontal: "center" };
        row.getCell(5).alignment = { horizontal: "right" };
        row.getCell(5).font = { bold: true, color: { argb: BRAND.primary } };
        row.getCell(5).numFmt = "#,##0.0##";
        row.getCell(6).alignment = { horizontal: "right" };
        row.getCell(6).numFmt = "#,##0.0##";
        row.getCell(7).alignment = { horizontal: "center" };
        row.getCell(8).alignment = { horizontal: "center" };
        row.getCell(9).alignment = { horizontal: "right" };
        row.getCell(10).alignment = { horizontal: "right" };
        if (p.shortfall > 0) {
          row.getCell(10).font = { bold: true, color: { argb: "FFD32F2F" } };
        }
      }

      // Dòng tổng nhóm
      const catTotalRow = s1.addRow([
        "", "", `Tổng nhóm ${cat} (chỉ để đối chiếu)`, "", Math.round(catFinalQty * 1000) / 1000, Math.round(catOrdQty * 1000) / 1000, "", "", "", "", ""
      ]);
      catTotalRow.font = { bold: true, italic: true };
      catTotalRow.getCell(3).alignment = { horizontal: "right" };
      catTotalRow.getCell(5).alignment = { horizontal: "right" };
      catTotalRow.getCell(5).numFmt = "#,##0.0##";
      catTotalRow.getCell(6).alignment = { horizontal: "right" };
      catTotalRow.getCell(6).numFmt = "#,##0.0##";
      catTotalRow.eachCell((cell) => {
        cell.border = { top: { style: "thin", color: { argb: BRAND.primaryDark } } };
      });
    }

    // Dòng tổng cộng chân trang
    const grandRow = s1.addRow([
      "", "", `TỔNG SỐ LƯỢNG (${stt - 1} mặt hàng, ${orderList.length} đơn) — chỉ để đối chiếu`, "", sumQtySheet1, "", "", "", "", "", "Đối chiếu khớp ✓"
    ]);
    grandRow.font = { bold: true, size: 11 };
    grandRow.height = 24;
    grandRow.getCell(3).alignment = { horizontal: "right" };
    grandRow.getCell(5).alignment = { horizontal: "right" };
    grandRow.getCell(5).numFmt = "#,##0.0##";
    grandRow.getCell(11).alignment = { horizontal: "center" };
    grandRow.getCell(11).font = { bold: true, color: { argb: BRAND.primary } };
    grandRow.eachCell((cell) => {
      cell.border = { top: { style: "double", color: { argb: BRAND.gold } }, bottom: { style: "medium", color: { argb: BRAND.gold } } };
    });

    // ─── SHEET 2: Chi tiết theo khách ──────────────────────────────
    const s2 = wb.addWorksheet("Chi tiết theo khách", {
      views: [{ showGridLines: true, state: "frozen", ySplit: 5 }],
      pageSetup: { orientation: "landscape", paperSize: 9 },
    });

    s2.columns = [
      { width: 12 }, // Ngày giao
      { width: 14 }, // Mã đơn
      { width: 14 }, // Mã KiotViet
      { width: 28 }, // Tên khách hàng
      { width: 32 }, // Điểm giao / Địa chỉ
      { width: 18 }, // Nhóm hàng
      { width: 13 }, // Mã hàng
      { width: 30 }, // Tên hàng
      { width: 8 },  // ĐVT
      { width: 13 }, // SL khách đặt
      { width: 14 }, // SL cuối cùng
      { width: 28 }, // Ghi chú dòng
      { width: 13 }, // Trạng thái
      { width: 14 }, // Trễ giờ chốt
    ];

    titleBlock(s2, `CHI TIẾT THEO KHÁCH HÀNG — GIAO NGÀY ${deliveryDate}`, subTitleCommon, 14);

    const s2Header = s2.addRow([
      "Ngày giao", "Mã đơn", "Mã KiotViet", "Tên khách hàng", "Điểm giao / Địa chỉ", "Nhóm hàng",
      "Mã hàng", "Tên hàng", "ĐVT", "SL khách đặt", "SL cuối cùng", "Ghi chú dòng", "Trạng thái", "Trễ giờ chốt"
    ]);
    styleHeaderRow(s2Header);

    // Sắp theo: Khách hàng -> Nhóm hàng -> Tên hàng
    detailLines.sort((a, b) => {
      const c1 = a.customerName.localeCompare(b.customerName, "vi");
      if (c1 !== 0) return c1;
      const c2 = a.category.localeCompare(b.category, "vi");
      if (c2 !== 0) return c2;
      return a.name.localeCompare(b.name, "vi");
    });

    for (const d of detailLines) {
      const row = s2.addRow([
        d.deliveryDate,
        d.orderCode,
        d.externalRef || "-",
        d.customerName,
        d.deliveryAddress,
        d.category,
        d.sku,
        d.name,
        d.unit,
        d.orderedQty,
        d.finalQty,
        d.customerNote,
        d.status === "confirmed" ? "Đã xác nhận" : d.status === "preparing" ? "Đang soạn" : "Chờ xác nhận",
        d.isLate ? "Trễ giờ chốt ⚠️" : "Đúng giờ",
      ]);

      row.getCell(1).alignment = { horizontal: "center" };
      row.getCell(2).alignment = { horizontal: "center" };
      row.getCell(3).alignment = { horizontal: "center" };
      row.getCell(9).alignment = { horizontal: "center" };
      row.getCell(10).alignment = { horizontal: "right" };
      row.getCell(10).numFmt = "#,##0.0##";
      row.getCell(11).alignment = { horizontal: "right" };
      row.getCell(11).font = { bold: true, color: { argb: BRAND.primary } };
      row.getCell(11).numFmt = "#,##0.0##";
      row.getCell(13).alignment = { horizontal: "center" };
      row.getCell(14).alignment = { horizontal: "center" };
      if (d.isLate) {
        row.getCell(14).font = { color: { argb: BRAND.warningText }, bold: true };
      }
    }

    s2.autoFilter = { from: "A5", to: "N5" };

    // ─── SHEET 3: Danh sách đơn ────────────────────────────────────
    const s3 = wb.addWorksheet("Danh sách đơn", {
      views: [{ showGridLines: true, state: "frozen", ySplit: 5 }],
      pageSetup: { orientation: "landscape", paperSize: 9 },
    });

    s3.columns = [
      { width: 14 }, // Mã đơn
      { width: 14 }, // Mã KiotViet
      { width: 28 }, // Khách hàng
      { width: 14 }, // Mã KH
      { width: 32 }, // Điểm giao
      { width: 20 }, // Người nhận
      { width: 14 }, // SĐT
      { width: 12 }, // Số dòng hàng
      { width: 14 }, // Trạng thái
      { width: 14 }, // Trễ giờ chốt
      { width: 30 }, // Ghi chú đơn
    ];

    titleBlock(s3, `DANH SÁCH ĐƠN HÀNG — GIAO NGÀY ${deliveryDate}`, subTitleCommon, 11);

    const s3Header = s3.addRow([
      "Mã đơn", "Mã KiotViet", "Khách hàng", "Mã KH", "Điểm giao", "Người nhận", "SĐT", "Số dòng hàng", "Trạng thái", "Trễ giờ chốt", "Ghi chú đơn"
    ]);
    styleHeaderRow(s3Header);

    for (const o of orderList) {
      const row = s3.addRow([
        o.order_code,
        o.external_ref || "-",
        o.customer_name || "",
        o.customer_code || "",
        o.delivery_address || o.delivery_alias || "",
        o.delivery_name || "",
        o.delivery_phone || "",
        (o.order_items || []).length,
        o.status === "confirmed" ? "Đã xác nhận" : o.status === "preparing" ? "Đang soạn" : "Chờ xác nhận",
        o.is_late_order ? "Trễ giờ chốt ⚠️" : "Đúng giờ",
        o.note || "",
      ]);

      row.getCell(1).alignment = { horizontal: "center" };
      row.getCell(2).alignment = { horizontal: "center" };
      row.getCell(4).alignment = { horizontal: "center" };
      row.getCell(7).alignment = { horizontal: "center" };
      row.getCell(8).alignment = { horizontal: "center" };
      row.getCell(9).alignment = { horizontal: "center" };
      row.getCell(10).alignment = { horizontal: "center" };
      if (o.is_late_order) {
        row.getCell(10).font = { color: { argb: BRAND.warningText }, bold: true };
      }
    }

    const s3TotalRow = s3.addRow([
      `Tổng cộng: ${orderList.length} đơn hàng`, "", "", "", "", "", "", totalLinesCount, "", "", ""
    ]);
    s3TotalRow.font = { bold: true };
    s3TotalRow.getCell(8).alignment = { horizontal: "center" };
    s3TotalRow.eachCell((cell) => {
      cell.border = { top: { style: "medium", color: { argb: BRAND.gold } } };
    });

    // 4. Tạo file buffer & ghi log vào procurement_exports
    const filename = `TONG_HOP_SOAN_HANG_${deliveryDate}.xlsx`;
    const buffer = await wb.xlsx.writeBuffer();

    try {
      await supabase.from("procurement_exports").insert({
        delivery_date: deliveryDate,
        exported_by: exporterName,
        exported_at: new Date().toISOString(),
        include_pending: includePending,
        order_count: orderList.length,
        line_count: totalLinesCount,
        total_qty: sumQtySheet1,
        file_name: filename,
      });
    } catch (logErr) {
      console.warn("Không thể ghi log procurement_exports:", logErr);
    }

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("GET /api/admin/procurement/export lỗi:", error);
    return NextResponse.json(
      { ok: false, error: "Không xuất được file Excel đơn tổng hợp" },
      { status: 500 }
    );
  }
}
