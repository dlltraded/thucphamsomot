import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";

const REVENUE_STATUSES = ["confirmed", "preparing", "shipping", "completed"];

// Bảng màu thương hiệu TPS1 thật (xem app/globals.css :root) — dùng lại
// đúng bộ này cho file Excel xuất ra, thay vì màu Excel mặc định.
const BRAND = {
  primary: "FF0F6F4B", // xanh rêu đậm
  primaryDark: "FF0B5A3C",
  cream: "FFF6F7F4",
  ink: "FF14231C",
  gold: "FFF5C84C",
  red: "FFC7372F",
  white: "FFFFFFFF",
};

function styleHeaderRow(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND.primary } };
    cell.font = { color: { argb: BRAND.white }, bold: true, size: 11 };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = { bottom: { style: "thin", color: { argb: BRAND.primaryDark } } };
  });
  row.height = 22;
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
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = "TPS1 — CÔNG TY TNHH THỰC PHẨM SỐ MỘT";
  titleCell.font = { bold: true, size: 13, color: { argb: BRAND.primary } };
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

const money = (n: number) => Math.round(Number(n) || 0);

export async function GET(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });

  const fromStr = req.nextUrl.searchParams.get("from");
  const toStr = req.nextUrl.searchParams.get("to");
  if (!fromStr || !toStr) return NextResponse.json({ ok: false, error: "Thiếu from/to" }, { status: 400 });

  try {
    const supabase = getCustomerSupabaseAdmin();
    const isSale = auth.profile?.role === "sale" && auth.profile?.id !== "legacy-admin";

    let query = supabase
      .from("orders")
      .select(
        "id, order_code, status, grand_total, paid_amount, debt_amount, customer_id, customer_name, customer_company, sales_rep_id, confirmed_at, order_items(name, sku, quantity, unit, line_total, final_line_total)"
      )
      .in("status", REVENUE_STATUSES)
      .gte("confirmed_at", fromStr)
      .lt("confirmed_at", toStr);
    if (isSale) query = query.eq("sales_rep_id", auth.profile!.id);
    const { data: orders, error } = await query;
    if (error) throw error;

    const { data: codPayments } = await supabase
      .from("order_payments")
      .select("amount")
      .eq("method", "cod")
      .gte("created_at", fromStr)
      .lt("created_at", toStr);

    const salesRepIds = [...new Set((orders || []).map((o) => o.sales_rep_id).filter(Boolean))];
    const { data: reps } = salesRepIds.length
      ? await supabase.from("admin_profiles").select("id, name").in("id", salesRepIds)
      : { data: [] as { id: string; name: string }[] };
    const repNameById = new Map((reps || []).map((r) => [r.id, r.name]));

    const totalRevenue = (orders || []).reduce((s, o) => s + money(o.grand_total), 0);
    const codCollected = (codPayments || []).reduce((s, p) => s + money(p.amount), 0);
    const debtOutstanding = (orders || []).reduce((s, o) => s + money(o.debt_amount), 0);

    const wb = new ExcelJS.Workbook();
    wb.creator = "TPS1 Sale System";
    wb.created = new Date();

    const rangeLabel = `${new Date(fromStr).toLocaleDateString("vi-VN")} – ${new Date(toStr).toLocaleDateString("vi-VN")}`;

    // ── Sheet 1: Tổng quan ──────────────────────────────────────────────
    const sOverview = wb.addWorksheet("Tổng quan", { views: [{ showGridLines: false }] });
    sOverview.columns = [{ width: 28 }, { width: 22 }];
    titleBlock(sOverview, "BÁO CÁO BÁN HÀNG", `Khoảng thời gian: ${rangeLabel}`, 2);

    const stats: [string, string | number][] = [
      ["Doanh thu", totalRevenue],
      ["Số đơn xác nhận", (orders || []).length],
      ["COD đã thu", codCollected],
      ["Công nợ còn lại", debtOutstanding],
    ];
    let r = 6;
    for (const [label, value] of stats) {
      const labelCell = sOverview.getCell(r, 1);
      labelCell.value = label;
      labelCell.font = { bold: true, color: { argb: BRAND.ink } };
      labelCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND.cream } };
      const valueCell = sOverview.getCell(r, 2);
      valueCell.value = value;
      if (typeof value === "number" && label !== "Số đơn xác nhận") valueCell.numFmt = '#,##0"đ"';
      valueCell.font = { bold: true, size: 12, color: { argb: BRAND.primary } };
      valueCell.alignment = { horizontal: "right" };
      r++;
    }
    sOverview.getRow(6).height = 20;

    // ── Sheet 2: Theo khách hàng ────────────────────────────────────────
    const byCustomer = new Map<string, { name: string; company: string | null; revenue: number; orderCount: number }>();
    for (const o of orders || []) {
      const key = o.customer_id || o.customer_name;
      const entry = byCustomer.get(key) || { name: o.customer_name, company: o.customer_company, revenue: 0, orderCount: 0 };
      entry.revenue += money(o.grand_total);
      entry.orderCount += 1;
      byCustomer.set(key, entry);
    }
    const customerRows = [...byCustomer.values()].sort((a, b) => b.revenue - a.revenue);

    const sCustomer = wb.addWorksheet("Theo khách hàng", { views: [{ showGridLines: false }] });
    sCustomer.columns = [{ width: 32 }, { width: 26 }, { width: 14 }, { width: 18 }];
    titleBlock(sCustomer, "DOANH THU THEO KHÁCH HÀNG", `Khoảng thời gian: ${rangeLabel}`, 4);
    const custHeaderRow = sCustomer.addRow(["Khách hàng", "Công ty", "Số đơn", "Doanh thu"]);
    styleHeaderRow(custHeaderRow);
    customerRows.forEach((c) => {
      const row = sCustomer.addRow([c.name, c.company || "—", c.orderCount, c.revenue]);
      row.getCell(3).alignment = { horizontal: "center" };
      row.getCell(4).numFmt = '#,##0"đ"';
      row.getCell(4).font = { bold: true, color: { argb: BRAND.primary } };
    });
    zebraStripe(sCustomer, 6);

    // ── Sheet 3: Theo sản phẩm ──────────────────────────────────────────
    const byProduct = new Map<string, { name: string; unit: string; quantity: number; revenue: number }>();
    for (const o of orders || []) {
      for (const item of (o as any).order_items || []) {
        const key = `${item.name}__${item.unit || "Kg"}`;
        const entry = byProduct.get(key) || { name: item.name, unit: item.unit || "Kg", quantity: 0, revenue: 0 };
        entry.quantity += Number(item.quantity) || 0;
        entry.revenue += money(item.final_line_total ?? item.line_total);
        byProduct.set(key, entry);
      }
    }
    const productRows = [...byProduct.values()].sort((a, b) => b.revenue - a.revenue);

    const sProduct = wb.addWorksheet("Theo sản phẩm", { views: [{ showGridLines: false }] });
    sProduct.columns = [{ width: 38 }, { width: 12 }, { width: 14 }, { width: 18 }];
    titleBlock(sProduct, "DOANH THU THEO SẢN PHẨM", `Khoảng thời gian: ${rangeLabel}`, 4);
    const prodHeaderRow = sProduct.addRow(["Sản phẩm", "Đơn vị", "Số lượng", "Doanh thu"]);
    styleHeaderRow(prodHeaderRow);
    productRows.forEach((p) => {
      const row = sProduct.addRow([p.name, p.unit, p.quantity, p.revenue]);
      row.getCell(2).alignment = { horizontal: "center" };
      row.getCell(3).alignment = { horizontal: "center" };
      row.getCell(4).numFmt = '#,##0"đ"';
      row.getCell(4).font = { bold: true, color: { argb: BRAND.primary } };
    });
    zebraStripe(sProduct, 6);

    // ── Sheet 4: Theo nhân viên sale ────────────────────────────────────
    const bySale = new Map<string, { name: string; revenue: number; orderCount: number }>();
    for (const o of orders || []) {
      const key = o.sales_rep_id || "khac";
      const entry = bySale.get(key) || { name: o.sales_rep_id ? repNameById.get(o.sales_rep_id) || "—" : "Không có sale phụ trách", revenue: 0, orderCount: 0 };
      entry.revenue += money(o.grand_total);
      entry.orderCount += 1;
      bySale.set(key, entry);
    }
    const saleRows = [...bySale.values()].sort((a, b) => b.revenue - a.revenue);

    const sSale = wb.addWorksheet("Theo sale", { views: [{ showGridLines: false }] });
    sSale.columns = [{ width: 30 }, { width: 14 }, { width: 18 }];
    titleBlock(sSale, "DOANH THU THEO NHÂN VIÊN SALE", `Khoảng thời gian: ${rangeLabel}`, 3);
    const saleHeaderRow = sSale.addRow(["Nhân viên", "Số đơn", "Doanh thu"]);
    styleHeaderRow(saleHeaderRow);
    saleRows.forEach((s) => {
      const row = sSale.addRow([s.name, s.orderCount, s.revenue]);
      row.getCell(2).alignment = { horizontal: "center" };
      row.getCell(3).numFmt = '#,##0"đ"';
      row.getCell(3).font = { bold: true, color: { argb: BRAND.primary } };
    });
    zebraStripe(sSale, 6);

    const buffer = await wb.xlsx.writeBuffer();
    const filename = `bao-cao-ban-hang_${fromStr}_${toStr}.xlsx`;
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("GET /api/admin/reports/export lỗi:", error);
    return NextResponse.json({ ok: false, error: "Không xuất được báo cáo" }, { status: 500 });
  }
}
