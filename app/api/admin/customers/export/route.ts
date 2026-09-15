import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { verifyAdminAuth } from "@/lib/admin-auth";
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

// Xuất danh sách khách hàng kèm thống kê (số đơn/doanh thu/công nợ) — để
// BGD/thu mua nắm được khách nào mua nhiều, khách nào đang nợ nhiều (mục
// brief 2026-09-10: "nên có xuất file thống kê để chúng ta có thể dễ dàng
// nắm bắt"). Không sửa admin_list_customers (RPC tạo trực tiếp qua Dashboard,
// không có migration) — đọc trực tiếp bảng vip_accounts bằng service-role.
export async function GET(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });

  try {
    const supabase = getCustomerSupabaseAdmin();
    let customerQuery = supabase
      .from("vip_accounts")
      .select("id, partner_code, name, phone, company, email, tax_code, discount_tier, credit_limit, sales_rep_id, is_active, created_at")
      .order("name");
    const isSale = auth.profile?.role === "sale" && auth.profile?.id !== "legacy-admin";
    if (isSale) customerQuery = customerQuery.eq("sales_rep_id", auth.profile!.id);
    const { data: customers, error } = await customerQuery;
    if (error) throw error;

    const customerIds = (customers || []).map((c) => c.id);
    const { data: orders } = customerIds.length
      ? await supabase.from("orders").select("customer_id, grand_total, paid_amount, debt_amount, status").in("customer_id", customerIds)
      : { data: [] as any[] };

    const salesRepIds = [...new Set((customers || []).map((c) => c.sales_rep_id).filter(Boolean))];
    const { data: reps } = salesRepIds.length
      ? await supabase.from("admin_profiles").select("id, name").in("id", salesRepIds)
      : { data: [] as { id: string; name: string }[] };
    const repMap = new Map((reps || []).map((r) => [r.id, r.name]));

    const statsByCustomer = new Map<string, { orderCount: number; revenue: number; debt: number }>();
    for (const o of orders || []) {
      if (o.status === "canceled") continue;
      const e = statsByCustomer.get(o.customer_id) || { orderCount: 0, revenue: 0, debt: 0 };
      e.orderCount += 1;
      e.revenue += Number(o.grand_total) || 0;
      e.debt += o.debt_amount != null ? Number(o.debt_amount) : Math.max(0, Number(o.grand_total) - Number(o.paid_amount || 0));
      statsByCustomer.set(o.customer_id, e);
    }

    const wb = new ExcelJS.Workbook();
    wb.creator = "TPS1 Sale System";
    wb.created = new Date();
    const sheet = wb.addWorksheet("Danh sách khách hàng", { views: [{ showGridLines: false }] });
    sheet.columns = [
      { width: 12 }, { width: 28 }, { width: 14 }, { width: 26 }, { width: 16 },
      { width: 10 }, { width: 16 }, { width: 18 }, { width: 10 }, { width: 14 }, { width: 14 }, { width: 14 },
    ];
    titleBlock(sheet, "DANH SÁCH KHÁCH HÀNG", `${(customers || []).length} khách hàng`, 12);
    styleHeaderRow(sheet.addRow([
      "Mã KH", "Tên khách hàng", "SĐT", "Công ty", "Mã số thuế",
      "Hạng", "Hạn mức nợ", "Sale phụ trách", "Trạng thái", "Số đơn", "Doanh thu", "Công nợ",
    ]));

    (customers || [])
      .sort((a, b) => (statsByCustomer.get(b.id)?.revenue || 0) - (statsByCustomer.get(a.id)?.revenue || 0))
      .forEach((c) => {
        const s = statsByCustomer.get(c.id) || { orderCount: 0, revenue: 0, debt: 0 };
        const row = sheet.addRow([
          c.partner_code, c.name, c.phone, c.company || "", c.tax_code || "",
          c.discount_tier || "VIP0", Number(c.credit_limit) || 0, repMap.get(c.sales_rep_id) || "—",
          c.is_active ? "Hoạt động" : "Đã khóa", s.orderCount, s.revenue, s.debt,
        ]);
        [7, 11, 12].forEach((n) => { row.getCell(n).numFmt = '#,##0"đ"'; });
        row.getCell(6).alignment = { horizontal: "center" };
        row.getCell(9).alignment = { horizontal: "center" };
        row.getCell(10).alignment = { horizontal: "center" };
        row.getCell(11).font = { bold: true, color: { argb: BRAND.primary } };
        if (s.debt > 0) row.getCell(12).font = { bold: true, color: { argb: BRAND.red } };
      });
    zebraStripe(sheet, 6);

    const buffer = await wb.xlsx.writeBuffer();
    const filename = `danh-sach-khach-hang_${new Date().toISOString().slice(0, 10)}.xlsx`;
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("GET /api/admin/customers/export lỗi:", error);
    return NextResponse.json({ ok: false, error: "Không xuất được danh sách khách hàng" }, { status: 500 });
  }
}
