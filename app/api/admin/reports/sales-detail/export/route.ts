import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";

const REVENUE_STATUSES = ["confirmed", "preparing", "shipping", "completed"];

const BRAND = {
  primary: "FF0F6F4B",
  primaryDark: "FF0B5A3C",
  cream: "FFF6F7F4",
  ink: "FF14231C",
  gold: "FFF5C84C",
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

const round = (n: number) => Math.round(Number(n) || 0);

// Xuất Excel cho khối "Báo cáo đã bán" trong trang Soạn hàng — 3 mức chi
// tiết trên 3 sheet: tổng hợp nhóm hàng, chi tiết từng mặt hàng, và chi tiết
// từng đơn/khách hàng (đúng yêu cầu "bán cho ai, đơn hàng nào").
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
        "id, order_code, customer_name, customer_company, sales_rep_id, confirmed_at, order_items(sku, name, unit, quantity, final_line_total, line_total)"
      )
      .in("status", REVENUE_STATUSES)
      .gte("confirmed_at", fromStr)
      .lt("confirmed_at", toStr);
    if (isSale) query = query.eq("sales_rep_id", auth.profile!.id);
    const { data: orders, error } = await query;
    if (error) throw error;

    const skus = [...new Set((orders || []).flatMap((o: any) => (o.order_items || []).map((i: any) => i.sku).filter(Boolean)))];
    const { data: products } = skus.length
      ? await supabase.from("products").select("sku, category").in("sku", skus)
      : { data: [] as { sku: string; category: string | null }[] };
    const categoryBySku = new Map((products || []).map((p) => [p.sku, p.category || "Chưa phân loại"]));

    interface DetailRow { category: string; product: string; unit: string; orderCode: string; customer: string; quantity: number; revenue: number }
    const detailRows: DetailRow[] = [];
    for (const o of orders || []) {
      for (const item of (o as any).order_items || []) {
        const category = item.sku ? categoryBySku.get(item.sku) || "Chưa phân loại" : "Hàng ngoài hệ thống";
        detailRows.push({
          category,
          product: item.name,
          unit: item.unit || "Kg",
          orderCode: o.order_code,
          customer: o.customer_company ? `${o.customer_name} (${o.customer_company})` : o.customer_name,
          quantity: Number(item.quantity) || 0,
          revenue: round(item.final_line_total ?? item.line_total),
        });
      }
    }

    const wb = new ExcelJS.Workbook();
    wb.creator = "TPS1 Sale System";
    wb.created = new Date();
    const rangeLabel = `${new Date(fromStr).toLocaleDateString("vi-VN")} – ${new Date(toStr).toLocaleDateString("vi-VN")}`;

    // ── Sheet 1: Tổng hợp nhóm hàng ─────────────────────────────────────
    const byCategory = new Map<string, { quantity: number; revenue: number; productSet: Set<string> }>();
    for (const r of detailRows) {
      const e = byCategory.get(r.category) || { quantity: 0, revenue: 0, productSet: new Set<string>() };
      e.quantity += r.quantity; e.revenue += r.revenue; e.productSet.add(r.product);
      byCategory.set(r.category, e);
    }
    const categoryRows = [...byCategory.entries()].map(([category, v]) => ({ category, ...v, productCount: v.productSet.size })).sort((a, b) => b.revenue - a.revenue);

    const s1 = wb.addWorksheet("Tổng hợp nhóm hàng", { views: [{ showGridLines: false }] });
    s1.columns = [{ width: 28 }, { width: 14 }, { width: 14 }, { width: 18 }];
    titleBlock(s1, "TỔNG HỢP THEO NHÓM HÀNG", `Khoảng thời gian: ${rangeLabel}`, 4);
    styleHeaderRow(s1.addRow(["Nhóm hàng", "Số mặt hàng", "Số lượng bán", "Doanh thu"]));
    categoryRows.forEach((c) => {
      const row = s1.addRow([c.category, c.productCount, c.quantity, c.revenue]);
      row.getCell(2).alignment = { horizontal: "center" };
      row.getCell(3).alignment = { horizontal: "center" };
      row.getCell(4).numFmt = '#,##0"đ"';
      row.getCell(4).font = { bold: true, color: { argb: BRAND.primary } };
    });
    zebraStripe(s1, 6);

    // ── Sheet 2: Chi tiết theo mặt hàng ─────────────────────────────────
    const byProduct = new Map<string, { category: string; unit: string; quantity: number; revenue: number }>();
    for (const r of detailRows) {
      const key = `${r.category}__${r.product}__${r.unit}`;
      const e = byProduct.get(key) || { category: r.category, unit: r.unit, quantity: 0, revenue: 0 };
      e.quantity += r.quantity; e.revenue += r.revenue;
      byProduct.set(key, e);
    }
    const productRows = [...byProduct.entries()]
      .map(([key, v]) => ({ product: key.split("__")[1], ...v }))
      .sort((a, b) => a.category.localeCompare(b.category) || b.revenue - a.revenue);

    const s2 = wb.addWorksheet("Chi tiết mặt hàng", { views: [{ showGridLines: false }] });
    s2.columns = [{ width: 22 }, { width: 34 }, { width: 10 }, { width: 14 }, { width: 18 }];
    titleBlock(s2, "CHI TIẾT THEO MẶT HÀNG", `Khoảng thời gian: ${rangeLabel}`, 5);
    styleHeaderRow(s2.addRow(["Nhóm hàng", "Mặt hàng", "Đơn vị", "Số lượng", "Doanh thu"]));
    productRows.forEach((p) => {
      const row = s2.addRow([p.category, p.product, p.unit, p.quantity, p.revenue]);
      row.getCell(3).alignment = { horizontal: "center" };
      row.getCell(4).alignment = { horizontal: "center" };
      row.getCell(5).numFmt = '#,##0"đ"';
      row.getCell(5).font = { bold: true, color: { argb: BRAND.primary } };
    });
    zebraStripe(s2, 6);

    // ── Sheet 3: Chi tiết đơn hàng (bán cho ai, đơn nào) ────────────────
    const s3 = wb.addWorksheet("Chi tiết đơn hàng", { views: [{ showGridLines: false }] });
    s3.columns = [{ width: 22 }, { width: 30 }, { width: 16 }, { width: 28 }, { width: 10 }, { width: 14 }, { width: 16 }];
    titleBlock(s3, "CHI TIẾT BÁN CHO AI / ĐƠN NÀO", `Khoảng thời gian: ${rangeLabel}`, 7);
    styleHeaderRow(s3.addRow(["Nhóm hàng", "Mặt hàng", "Mã đơn", "Khách hàng", "Đơn vị", "Số lượng", "Thành tiền"]));
    detailRows
      .sort((a, b) => a.category.localeCompare(b.category) || a.product.localeCompare(b.product))
      .forEach((d) => {
        const row = s3.addRow([d.category, d.product, d.orderCode, d.customer, d.unit, d.quantity, d.revenue]);
        row.getCell(5).alignment = { horizontal: "center" };
        row.getCell(6).alignment = { horizontal: "center" };
        row.getCell(7).numFmt = '#,##0"đ"';
        row.getCell(7).font = { bold: true, color: { argb: BRAND.primary } };
      });
    zebraStripe(s3, 6);

    const buffer = await wb.xlsx.writeBuffer();
    const filename = `bao-cao-ban-hang-chi-tiet_${fromStr}_${toStr}.xlsx`;
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("GET /api/admin/reports/sales-detail/export lỗi:", error);
    return NextResponse.json({ ok: false, error: "Không xuất được báo cáo" }, { status: 500 });
  }
}
