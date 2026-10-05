// ============================================================================
// Module: Receivables Statement Excel Exporter (ExcelJS)
// ============================================================================

import ExcelJS from "exceljs";
import { StatementData } from "./receivables-statement";

const BRAND = {
  primary: "FF0F6F4B",
  primaryDark: "FF0B5A3C",
  cream: "FFF8FAF9",
  ink: "FF14231C",
  gold: "FFF5C84C",
  red: "FFDC2626",
  white: "FFFFFFFF",
  slateHeader: "FFF1F5F9",
  borderLight: "FFE2E8F0",
};

export async function exportStatementToExcel(data: StatementData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "TPS1 Enterprise System";
  wb.created = new Date();

  const ws = wb.addWorksheet("Đối Chiếu Công Nợ", {
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    views: [{ showGridLines: true }],
  });

  const COLS = 11;

  // Title Block
  ws.mergeCells(1, 1, 1, COLS);
  const title1 = ws.getCell(1, 1);
  title1.value = `${data.company.name.toUpperCase()} — ${data.company.brand}`;
  title1.font = { bold: true, size: 12, color: { argb: BRAND.primary } };

  ws.mergeCells(2, 1, 2, COLS);
  const title2 = ws.getCell(2, 1);
  title2.value = "BIÊN BẢN ĐỐI CHIẾU VÀ XÁC NHẬN CÔNG NỢ";
  title2.font = { bold: true, size: 16, color: { argb: BRAND.ink } };
  title2.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(2).height = 28;

  ws.mergeCells(3, 1, 3, COLS);
  const title3 = ws.getCell(3, 1);
  title3.value = `Kỳ đối chiếu: Từ ngày ${data.period.fromDateStr} đến ngày ${data.period.toDateStr}`;
  title3.font = { italic: true, size: 11, color: { argb: "FF475569" } };
  title3.alignment = { horizontal: "center", vertical: "middle" };

  // Divider
  ws.mergeCells(4, 1, 4, COLS);
  ws.getCell(4, 1).border = { bottom: { style: "medium", color: { argb: BRAND.gold } } };
  ws.getRow(4).height = 6;

  // Thông tin 2 bên
  ws.getCell(6, 1).value = "Bên A (Bên bán):";
  ws.getCell(6, 1).font = { bold: true };
  ws.getCell(6, 2).value = data.company.name;
  ws.getCell(6, 6).value = "Bên B (Bên mua):";
  ws.getCell(6, 6).font = { bold: true };
  ws.getCell(6, 7).value = data.customer.name;

  ws.getCell(7, 1).value = "Mã số thuế:";
  ws.getCell(7, 2).value = data.company.taxCode;
  ws.getCell(7, 6).value = "Mã đối tác:";
  ws.getCell(7, 7).value = data.customer.partnerCode;

  ws.getCell(8, 1).value = "Địa chỉ:";
  ws.getCell(8, 2).value = data.company.address;
  ws.getCell(8, 6).value = "Công ty/Đơn vị:";
  ws.getCell(8, 7).value = data.customer.company || "Cá nhân";

  ws.getCell(9, 1).value = "Hotline / Email:";
  ws.getCell(9, 2).value = `${data.company.hotline} · ${data.company.email}`;
  ws.getCell(9, 6).value = "Hạn mức / Hạn nợ:";
  ws.getCell(9, 7).value = `${data.customer.creditLimit.toLocaleString('vi-VN')}đ (${data.customer.paymentTermsDays} ngày)`;

  // Summary box
  ws.getRow(11).height = 24;
  ws.mergeCells(11, 1, 11, 2);
  ws.getCell(11, 1).value = "Số dư đầu kỳ:";
  ws.getCell(11, 1).font = { bold: true };
  ws.getCell(11, 3).value = data.summary.openingBalance;
  ws.getCell(11, 3).numFmt = '#,##0"đ"';
  ws.getCell(11, 3).font = { bold: true };

  ws.mergeCells(11, 4, 11, 5);
  ws.getCell(11, 4).value = "Tổng phát sinh tăng:";
  ws.getCell(11, 4).font = { bold: true };
  ws.getCell(11, 6).value = data.summary.totalDebit;
  ws.getCell(11, 6).numFmt = '#,##0"đ"';
  ws.getCell(11, 6).font = { bold: true, color: { argb: BRAND.primaryDark } };

  ws.mergeCells(11, 7, 11, 8);
  ws.getCell(11, 7).value = "Tổng phát sinh giảm:";
  ws.getCell(11, 7).font = { bold: true };
  ws.getCell(11, 9).value = data.summary.totalCredit;
  ws.getCell(11, 9).numFmt = '#,##0"đ"';
  ws.getCell(11, 9).font = { bold: true, color: { argb: "FF2563EB" } };

  ws.getCell(11, 10).value = "Số dư cuối kỳ:";
  ws.getCell(11, 10).font = { bold: true };
  ws.getCell(11, 11).value = data.summary.closingBalance;
  ws.getCell(11, 11).numFmt = '#,##0"đ"';
  ws.getCell(11, 11).font = { bold: true, color: { argb: BRAND.red }, size: 12 };

  // Headers table
  const startRow = 13;
  const headers = [
    "STT", "Ngày ghi sổ", "Loại chứng từ", "Số chứng từ", "Số hóa đơn/Ref",
    "Diễn giải nội dung", "Ngày đến hạn", "Quá hạn", "Phát sinh Tăng (Nợ)", "Phát sinh Giảm (Có)", "Số dư lũy kế"
  ];

  const headerRow = ws.getRow(startRow);
  headerRow.values = headers;
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND.primary } };
    cell.font = { color: { argb: BRAND.white }, bold: true, size: 10 };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: BRAND.primaryDark } },
      bottom: { style: "medium", color: { argb: BRAND.primaryDark } },
      left: { style: "thin", color: { argb: BRAND.borderLight } },
      right: { style: "thin", color: { argb: BRAND.borderLight } },
    };
  });

  // Data rows
  let rIdx = startRow + 1;
  for (const r of data.rows) {
    const row = ws.getRow(rIdx);
    row.values = [
      r.stt,
      r.date,
      r.typeLabel,
      r.documentNumber,
      r.referenceNumber || "",
      r.description,
      r.dueDate || "—",
      r.isOverdue ? `${r.daysOverdue} ngày` : "—",
      r.debit || 0,
      r.credit || 0,
      r.runningBalance || 0,
    ];

    row.getCell(1).alignment = { horizontal: "center" };
    row.getCell(2).alignment = { horizontal: "center" };
    row.getCell(7).alignment = { horizontal: "center" };
    row.getCell(8).alignment = { horizontal: "center" };
    if (r.isOverdue) row.getCell(8).font = { color: { argb: BRAND.red }, bold: true };

    row.getCell(9).numFmt = '#,##0"đ"';
    row.getCell(10).numFmt = '#,##0"đ"';
    row.getCell(11).numFmt = '#,##0"đ"';
    row.getCell(11).font = { bold: true };

    if (rIdx % 2 === 1) {
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND.cream } };
      });
    }

    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = {
        bottom: { style: "thin", color: { argb: BRAND.borderLight } },
        left: { style: "thin", color: { argb: BRAND.borderLight } },
        right: { style: "thin", color: { argb: BRAND.borderLight } },
      };
    });

    rIdx++;
  }

  // Totals Row
  const totalRow = ws.getRow(rIdx);
  totalRow.values = [
    "", "", "", "", "", "TỔNG CỘNG PHÁT SINH TRONG KỲ", "", "",
    data.summary.totalDebit, data.summary.totalCredit, data.summary.closingBalance
  ];
  totalRow.height = 24;
  totalRow.font = { bold: true };
  totalRow.getCell(6).alignment = { horizontal: "right" };
  totalRow.getCell(9).numFmt = '#,##0"đ"';
  totalRow.getCell(10).numFmt = '#,##0"đ"';
  totalRow.getCell(11).numFmt = '#,##0"đ"';
  totalRow.getCell(11).font = { bold: true, color: { argb: BRAND.red }, size: 11 };

  totalRow.eachCell({ includeEmpty: true }, (cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
    cell.border = {
      top: { style: "medium", color: { argb: BRAND.primaryDark } },
      bottom: { style: "medium", color: { argb: BRAND.primaryDark } },
    };
  });

  // Signatures
  rIdx += 3;
  ws.getCell(rIdx, 2).value = "ĐẠI DIỆN KHÁCH HÀNG";
  ws.getCell(rIdx, 2).font = { bold: true };
  ws.getCell(rIdx, 2).alignment = { horizontal: "center" };

  ws.getCell(rIdx, 6).value = "KẾ TOÁN CÔNG NỢ";
  ws.getCell(rIdx, 6).font = { bold: true };
  ws.getCell(rIdx, 6).alignment = { horizontal: "center" };

  ws.getCell(rIdx, 10).value = "GIÁM ĐỐC / ĐẠI DIỆN TPS1";
  ws.getCell(rIdx, 10).font = { bold: true };
  ws.getCell(rIdx, 10).alignment = { horizontal: "center" };

  rIdx += 1;
  ws.getCell(rIdx, 2).value = "(Ký, ghi rõ họ tên & đóng dấu)";
  ws.getCell(rIdx, 2).font = { italic: true, size: 9 };
  ws.getCell(rIdx, 2).alignment = { horizontal: "center" };

  ws.getCell(rIdx, 6).value = "(Ký, ghi rõ họ tên)";
  ws.getCell(rIdx, 6).font = { italic: true, size: 9 };
  ws.getCell(rIdx, 6).alignment = { horizontal: "center" };

  ws.getCell(rIdx, 10).value = "(Ký, ghi rõ họ tên & đóng dấu)";
  ws.getCell(rIdx, 10).font = { italic: true, size: 9 };
  ws.getCell(rIdx, 10).alignment = { horizontal: "center" };

  // Set column widths
  ws.columns = [
    { width: 6 },  // STT
    { width: 13 }, // Ngày
    { width: 18 }, // Loại CT
    { width: 22 }, // Số CT
    { width: 18 }, // Ref
    { width: 34 }, // Diễn giải
    { width: 14 }, // Hạn nợ
    { width: 12 }, // Quá hạn
    { width: 18 }, // Nợ
    { width: 18 }, // Có
    { width: 20 }, // Lũy kế
  ];

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
