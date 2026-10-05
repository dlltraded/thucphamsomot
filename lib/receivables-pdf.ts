// ============================================================================
// Module: Receivables Statement PDF Exporter (pdfmake)
// ============================================================================

import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { StatementData } from "./receivables-statement";

const money = (v: number | string | null | undefined) =>
  `${new Intl.NumberFormat("vi-VN").format(Math.round(Number(v) || 0))} đ`;

export async function exportStatementToPdf(data: StatementData): Promise<Buffer> {
  pdfMake.addVirtualFileSystem(pdfFonts);

  let logoDataUrl = "";
  const logoPath = path.join(process.cwd(), "public", "images", "tps1-logo-vertical.png");
  if (existsSync(logoPath)) {
    logoDataUrl = `data:image/png;base64,${readFileSync(logoPath).toString("base64")}`;
  }

  // Header rows for table
  const tableRows: Content[][] = [
    [
      { text: "STT", style: "tableHeader", alignment: "center" },
      { text: "Ngày", style: "tableHeader", alignment: "center" },
      { text: "Số CT / Hóa đơn", style: "tableHeader" },
      { text: "Nội dung diễn giải", style: "tableHeader" },
      { text: "Hạn nợ", style: "tableHeader", alignment: "center" },
      { text: "Phát sinh Tăng", style: "tableHeader", alignment: "right" },
      { text: "Phát sinh Giảm", style: "tableHeader", alignment: "right" },
      { text: "Dư nợ lũy kế", style: "tableHeader", alignment: "right" },
    ],
  ];

  // Data rows
  data.rows.forEach((r, idx) => {
    tableRows.push([
      { text: String(r.stt), alignment: "center", fontSize: 8 },
      { text: r.date, alignment: "center", fontSize: 8 },
      {
        stack: [
          { text: r.documentNumber, bold: true, fontSize: 8 },
          r.referenceNumber ? { text: `Ref: ${r.referenceNumber}`, color: "#64748b", fontSize: 7 } : { text: "" },
        ],
      },
      { text: r.description, fontSize: 8 },
      {
        text: r.dueDate ? `${r.dueDate}${r.isOverdue ? `\n(Quá hạn ${r.daysOverdue} ngày)` : ''}` : "—",
        alignment: "center",
        fontSize: 7,
        color: r.isOverdue ? "#dc2626" : "#475569",
        bold: !!r.isOverdue,
      },
      { text: r.debit > 0 ? money(r.debit) : "—", alignment: "right", fontSize: 8 },
      { text: r.credit > 0 ? money(r.credit) : "—", alignment: "right", fontSize: 8, color: "#2563eb" },
      { text: money(r.runningBalance), alignment: "right", bold: true, fontSize: 8 },
    ]);
  });

  // Total summary row
  tableRows.push([
    { text: "TỔNG CỘNG", colSpan: 5, bold: true, alignment: "right", fontSize: 9 } as any,
    { text: "" } as any,
    { text: "" } as any,
    { text: "" } as any,
    { text: "" } as any,
    { text: money(data.summary.totalDebit), bold: true, alignment: "right", fontSize: 9, color: "#0f6f4b" },
    { text: money(data.summary.totalCredit), bold: true, alignment: "right", fontSize: 9, color: "#2563eb" },
    { text: money(data.summary.closingBalance), bold: true, alignment: "right", fontSize: 9, color: "#dc2626" },
  ]);

  const docDefinition: TDocumentDefinitions = {
    pageSize: "A4",
    pageOrientation: "portrait",
    pageMargins: [30, 30, 30, 30],
    content: [
      // Top header with logo
      {
        columns: [
          logoDataUrl ? { image: logoDataUrl, width: 60 } : { text: "TPS1", bold: true, fontSize: 18, color: "#0f6f4b" },
          {
            stack: [
              { text: data.company.name.toUpperCase(), bold: true, fontSize: 11, color: "#0f6f4b" },
              { text: `MST: ${data.company.taxCode} · Hotline: ${data.company.hotline}`, fontSize: 8, color: "#64748b" },
              { text: `Địa chỉ: ${data.company.address}`, fontSize: 8, color: "#64748b" },
              { text: `Email: ${data.company.email}`, fontSize: 8, color: "#64748b" },
            ],
            margin: [10, 0, 0, 0],
          },
        ],
      },
      { canvas: [{ type: "line", x1: 0, y1: 10, x2: 535, y2: 10, lineWidth: 1.5, lineColor: "#f5c84c" }], margin: [0, 5, 0, 15] },

      // Document Title
      { text: "BIÊN BẢN ĐỐI CHIẾU CÔNG NỢ", style: "docTitle" },
      { text: `Kỳ đối chiếu: Từ ngày ${data.period.fromDateStr} đến ngày ${data.period.toDateStr}`, style: "docSubtitle" },

      // Customer Info Box
      {
        table: {
          widths: ["25%", "75%"],
          body: [
            [{ text: "Đơn vị mua hàng:", bold: true, fontSize: 9 }, { text: `${data.customer.name} ${data.customer.company ? `(${data.customer.company})` : ''}`, bold: true, fontSize: 9 }],
            [{ text: "Mã khách hàng:", fontSize: 8 }, { text: data.customer.partnerCode, bold: true, fontSize: 8 }],
            [{ text: "Mã số thuế:", fontSize: 8 }, { text: data.customer.taxCode || "—", fontSize: 8 }],
            [{ text: "Điện thoại / Địa chỉ:", fontSize: 8 }, { text: `${data.customer.phone || '—'} · ${data.customer.address || '—'}`, fontSize: 8 }],
            [{ text: "Điều khoản thanh toán:", fontSize: 8 }, { text: `Hạn nợ mặc định ${data.customer.paymentTermsDays} ngày · Hạn mức ${money(data.customer.creditLimit)}`, fontSize: 8 }],
          ],
        },
        layout: "noBorders",
        margin: [0, 10, 0, 10],
      },

      // Summary KPIs
      {
        columns: [
          {
            style: "kpiBox",
            stack: [
              { text: "Số dư đầu kỳ", fontSize: 8, color: "#64748b" },
              { text: money(data.summary.openingBalance), bold: true, fontSize: 11 },
            ],
          },
          {
            style: "kpiBox",
            stack: [
              { text: "Tổng phát sinh tăng (+)", fontSize: 8, color: "#0f6f4b" },
              { text: money(data.summary.totalDebit), bold: true, fontSize: 11, color: "#0f6f4b" },
            ],
          },
          {
            style: "kpiBox",
            stack: [
              { text: "Tổng phát sinh giảm (-)", fontSize: 8, color: "#2563eb" },
              { text: money(data.summary.totalCredit), bold: true, fontSize: 11, color: "#2563eb" },
            ],
          },
          {
            style: "kpiBoxHighlight",
            stack: [
              { text: "Số dư nợ cuối kỳ", fontSize: 8, color: "#dc2626", bold: true },
              { text: money(data.summary.closingBalance), bold: true, fontSize: 12, color: "#dc2626" },
            ],
          },
        ],
        margin: [0, 0, 0, 15],
      },

      // Main Ledger Table
      {
        table: {
          headerRows: 1,
          widths: [20, 48, 65, "*", 62, 55, 55, 60],
          body: tableRows,
        },
        layout: {
          hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length ? 1 : 0.5),
          vLineWidth: () => 0.5,
          hLineColor: (i: number, node: any) => (i === 1 || i === node.table.body.length ? "#0b5a3c" : "#e2e8f0"),
          vLineColor: () => "#e2e8f0",
          fillColor: (i: number) => (i === 0 ? "#0f6f4b" : i % 2 === 1 ? "#f8faf9" : null),
        },
      },

      // Confirmation Text
      {
        text: "Hai bên đã cùng nhau kiểm tra, đối chiếu số liệu và thống nhất xác nhận số dư công nợ tính đến ngày kết thúc kỳ đối chiếu như trên.",
        fontSize: 8,
        italics: true,
        color: "#475569",
        margin: [0, 15, 0, 15],
      },

      // Signatures
      {
        columns: [
          {
            stack: [
              { text: "ĐẠI DIỆN KHÁCH HÀNG", bold: true, fontSize: 9 },
              { text: "(Ký, ghi rõ họ tên & đóng dấu)", italics: true, fontSize: 7, color: "#64748b" },
            ],
            alignment: "center",
          },
          {
            stack: [
              { text: "KẾ TOÁN CÔNG NỢ", bold: true, fontSize: 9 },
              { text: "(Ký, ghi rõ họ tên)", italics: true, fontSize: 7, color: "#64748b" },
            ],
            alignment: "center",
          },
          {
            stack: [
              { text: "GIÁM ĐỐC / ĐẠI DIỆN BÊN BÁN", bold: true, fontSize: 9 },
              { text: "(Ký, ghi rõ họ tên & đóng dấu)", italics: true, fontSize: 7, color: "#64748b" },
            ],
            alignment: "center",
          },
        ],
        margin: [0, 10, 0, 0],
      },
    ],
    styles: {
      docTitle: { fontSize: 14, bold: true, alignment: "center", color: "#0f172a" },
      docSubtitle: { fontSize: 9, italics: true, alignment: "center", color: "#64748b", margin: [0, 2, 0, 5] },
      tableHeader: { fontSize: 8, bold: true, color: "#ffffff" },
      kpiBox: { margin: [2, 0, 2, 0] },
      kpiBoxHighlight: { margin: [2, 0, 2, 0] },
    },
    defaultStyle: {
      font: "Roboto",
    },
  };

  return new Promise<Buffer>((resolve, reject) => {
    try {
      const browserPdf = pdfMake.createPdf(docDefinition) as unknown as {
        getBuffer: (callback: (buffer: Uint8Array) => void) => void;
      };
      browserPdf.getBuffer((buf) => resolve(Buffer.from(buf)));
    } catch (err) {
      reject(err);
    }
  });
}
