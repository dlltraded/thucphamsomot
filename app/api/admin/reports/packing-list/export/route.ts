import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";

const PACKING_STATUSES = ["confirmed", "preparing", "shipping"];

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

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Tên sheet Excel tối đa 31 ký tự, không chứa \/:*?[] — mã đơn (VD DH079078)
// vốn đã hợp lệ, chỉ cắt bớt + thêm hậu tố nếu trùng cho chắc.
function safeSheetName(name: string, used: Set<string>) {
  let base = name.replace(/[\\/:*?[\]]/g, "-").slice(0, 31);
  let candidate = base;
  let n = 2;
  while (used.has(candidate)) {
    candidate = `${base.slice(0, 28)}-${n}`;
    n += 1;
  }
  used.add(candidate);
  return candidate;
}

function buildAggregateSheet(wb: ExcelJS.Workbook, detailRows: DetailRow[], rangeLabel: string) {
  const byProduct = new Map<string, { unit: string; quantity: number; orderCodes: Set<string> }>();
  for (const r of detailRows) {
    const key = `${r.product}__${r.unit}`;
    const e = byProduct.get(key) || { unit: r.unit, quantity: 0, orderCodes: new Set<string>() };
    e.quantity += r.quantity;
    e.orderCodes.add(r.orderCode);
    byProduct.set(key, e);
  }
  const productRows = [...byProduct.entries()]
    .map(([key, v]) => ({ product: key.split("__")[0], ...v, orderCount: v.orderCodes.size }))
    .sort((a, b) => b.quantity - a.quantity);

  const s1 = wb.addWorksheet("Tổng hợp cần soạn", { views: [{ showGridLines: false }] });
  s1.columns = [{ width: 36 }, { width: 10 }, { width: 16 }, { width: 12 }];
  titleBlock(s1, "BẢNG TỔNG HỢP SOẠN HÀNG", rangeLabel, 4);
  styleHeaderRow(s1.addRow(["Tên sản phẩm", "ĐVT", "Tổng SL cần soạn", "Số đơn"]));
  productRows.forEach((p) => {
    const row = s1.addRow([p.product, p.unit, p.quantity, p.orderCount]);
    row.getCell(2).alignment = { horizontal: "center" };
    row.getCell(3).alignment = { horizontal: "center" };
    row.getCell(3).font = { bold: true, color: { argb: BRAND.primary } };
    row.getCell(4).alignment = { horizontal: "center" };
  });
  zebraStripe(s1, 6);

  const s2 = wb.addWorksheet("Danh sách đơn hàng", { views: [{ showGridLines: false }] });
  s2.columns = [{ width: 14 }, { width: 32 }, { width: 12 }];
  titleBlock(s2, "DANH SÁCH ĐƠN TRONG FILE NÀY", rangeLabel, 3);
  styleHeaderRow(s2.addRow(["Mã đơn", "Khách hàng", "Số mặt hàng"]));
  const byOrder = new Map<string, { customer: string; count: number }>();
  for (const r of detailRows) {
    const e = byOrder.get(r.orderCode) || { customer: r.customer, count: 0 };
    e.count += 1;
    byOrder.set(r.orderCode, e);
  }
  [...byOrder.entries()].forEach(([orderCode, v]) => {
    const row = s2.addRow([orderCode, v.customer, v.count]);
    row.getCell(3).alignment = { horizontal: "center" };
  });
  zebraStripe(s2, 6);
}

interface DetailRow { orderCode: string; customer: string; sku: string; product: string; unit: string; quantity: number }

// Xuất Excel "Xử lý đơn hàng" (soạn hàng) — 2 chế độ:
// 1) ?orderIds=id1,id2,... — nhân viên chọn đúng các đơn vừa "nhận soạn",
//    mỗi đơn có 1 sheet riêng để đóng gói đúng phần của từng khách (mục
//    brief 2026-09-11: "ra 1 file soạn hàng chi tiết cho tổng các đơn hàng
//    đó và có các sheet riêng cho từng đơn hàng").
// 2) ?from=&to= (không có orderIds) — chế độ cũ, xuất theo khoảng ngày.
export async function GET(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });

  const orderIdsParam = req.nextUrl.searchParams.get("orderIds");
  const orderIds = orderIdsParam ? orderIdsParam.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const fromStr = req.nextUrl.searchParams.get("from") || `${todayStr()}T00:00:00`;
  const toStr = req.nextUrl.searchParams.get("to") || undefined;

  try {
    const supabase = getCustomerSupabaseAdmin();
    let query = supabase
      .from("orders")
      .select("id, order_code, customer_name, customer_company, customer_phone, delivery_address, confirmed_at, order_items(sku, name, unit, quantity)")
      .order("order_code");
    if (orderIds.length) {
      query = query.in("id", orderIds);
    } else {
      query = query.in("status", PACKING_STATUSES).gte("confirmed_at", fromStr);
      if (toStr) query = query.lt("confirmed_at", toStr);
    }
    const { data: orders, error } = await query;
    if (error) throw error;
    if (orderIds.length && (orders || []).length === 0) {
      return NextResponse.json({ ok: false, error: "Không tìm thấy đơn hàng đã chọn" }, { status: 404 });
    }

    const detailRows: DetailRow[] = [];
    for (const o of orders || []) {
      const customer = o.customer_company ? `${o.customer_name} (${o.customer_company})` : o.customer_name || "Khách lẻ";
      for (const item of (o as any).order_items || []) {
        detailRows.push({
          orderCode: o.order_code,
          customer,
          sku: item.sku || "",
          product: item.name,
          unit: item.unit || "Kg",
          quantity: Number(item.quantity) || 0,
        });
      }
    }

    const wb = new ExcelJS.Workbook();
    wb.creator = "TPS1 Sale System";
    wb.created = new Date();
    const rangeLabel = orderIds.length
      ? `${(orders || []).length} đơn đã chọn`
      : toStr
        ? `${new Date(fromStr).toLocaleDateString("vi-VN")} – ${new Date(toStr).toLocaleDateString("vi-VN")}`
        : `Từ ${new Date(fromStr).toLocaleDateString("vi-VN")}`;

    buildAggregateSheet(wb, detailRows, rangeLabel);

    if (orderIds.length) {
      // Mỗi đơn 1 sheet riêng để đóng gói đúng phần từng khách.
      const usedNames = new Set<string>();
      for (const o of orders || []) {
        const items = (o as any).order_items || [];
        const sheetName = safeSheetName(o.order_code, usedNames);
        const sheet = wb.addWorksheet(sheetName, { views: [{ showGridLines: false }] });
        sheet.columns = [{ width: 16 }, { width: 32 }, { width: 10 }, { width: 12 }];
        const customerLine = o.customer_company ? `${o.customer_name} (${o.customer_company})` : o.customer_name || "Khách lẻ";
        titleBlock(sheet, `ĐƠN ${o.order_code}`, `${customerLine}${o.customer_phone ? ` · ${o.customer_phone}` : ""}${o.delivery_address ? ` · ${o.delivery_address}` : ""}`, 4);
        styleHeaderRow(sheet.addRow(["Mã hàng", "Tên hàng", "ĐVT", "Số lượng"]));
        let totalQty = 0;
        items.forEach((item: any) => {
          const qty = Number(item.quantity) || 0;
          totalQty += qty;
          const row = sheet.addRow([item.sku || "", item.name, item.unit || "Kg", qty]);
          row.getCell(3).alignment = { horizontal: "center" };
          row.getCell(4).alignment = { horizontal: "center" };
          row.getCell(4).font = { bold: true, color: { argb: BRAND.primary } };
        });
        zebraStripe(sheet, 6);
        const totalRow = sheet.addRow(["", "", "Tổng số lượng", totalQty]);
        totalRow.font = { bold: true };
        totalRow.getCell(3).alignment = { horizontal: "right" };
        totalRow.getCell(4).alignment = { horizontal: "center" };
        totalRow.eachCell((cell) => { cell.border = { top: { style: "medium", color: { argb: BRAND.gold } } }; });
      }
    } else {
      // Chế độ cũ theo khoảng ngày — giữ 1 sheet chi tiết gộp tất cả đơn.
      const s = wb.addWorksheet("Chi tiết theo đơn hàng", { views: [{ showGridLines: false }] });
      s.columns = [{ width: 14 }, { width: 32 }, { width: 16 }, { width: 32 }, { width: 10 }, { width: 12 }];
      titleBlock(s, "CHI TIẾT SOẠN HÀNG THEO ĐƠN", rangeLabel, 6);
      styleHeaderRow(s.addRow(["Mã đơn", "Khách hàng", "Mã hàng", "Tên hàng", "ĐVT", "Số lượng"]));
      detailRows
        .sort((a, b) => a.orderCode.localeCompare(b.orderCode))
        .forEach((d) => {
          const row = s.addRow([d.orderCode, d.customer, d.sku, d.product, d.unit, d.quantity]);
          row.getCell(5).alignment = { horizontal: "center" };
          row.getCell(6).alignment = { horizontal: "center" };
          row.getCell(6).font = { bold: true };
        });
      zebraStripe(s, 6);
    }

    const buffer = await wb.xlsx.writeBuffer();
    const filename = orderIds.length
      ? `soan-hang_${(orders || []).length}-don_${todayStr()}.xlsx`
      : `soan-hang_${fromStr.slice(0, 10)}.xlsx`;
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("GET /api/admin/reports/packing-list/export lỗi:", error);
    return NextResponse.json({ ok: false, error: "Không xuất được bảng soạn hàng" }, { status: 500 });
  }
}
