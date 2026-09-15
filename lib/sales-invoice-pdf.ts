import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { ConfirmationOrderItem } from "./order-confirmation-pdf";

// Hóa đơn bán hàng nội bộ — phát hành khi đơn HOÀN THÀNH GIAO HÀNG, khác với
// "Phiếu xác nhận đơn hàng" (order-confirmation-pdf.ts, phát hành lúc chốt
// giá, vẫn là phiếu tạm). KHÔNG phải hóa đơn giá trị gia tăng (GTGT) — hệ
// thống chưa tích hợp nhà cung cấp hóa đơn điện tử (MISA/VNPT/Viettel...),
// ghi rõ trong footer để không gây hiểu nhầm là chứng từ thuế hợp lệ.
export interface SalesInvoiceSnapshot {
  id: string;
  order_code: string;
  customer_code: string;
  customer_name: string;
  customer_phone: string;
  customer_company?: string | null;
  customer_tax_code?: string | null;
  delivery_name?: string | null;
  delivery_phone?: string | null;
  delivery_address?: string | null;
  note?: string | null;
  subtotal: number;
  discount_amount: number;
  shipping_amount: number;
  grand_total: number;
  paid_amount?: number | null;
  debt_amount?: number | null;
  completed_at?: string | null;
  sales_rep_name?: string | null;
  order_items: ConfirmationOrderItem[];
}

const money = (value: number | string | null | undefined) =>
  `${new Intl.NumberFormat("vi-VN").format(Number(value) || 0)} đ`;

export async function generateSalesInvoicePdf(order: SalesInvoiceSnapshot): Promise<Buffer> {
  pdfMake.addVirtualFileSystem(pdfFonts);
  const logoDataUrl = `data:image/png;base64,${readFileSync(
    path.join(process.cwd(), "public", "images", "tps1-logo-vertical.png")
  ).toString("base64")}`;

  const itemRows = (order.order_items || []).map((item, index) => [
    { text: String(index + 1), alignment: "center" },
    {
      stack: [
        { text: item.name, bold: true },
        item.sku ? { text: `SKU: ${item.sku}`, color: "#64748b", fontSize: 8 } : { text: "" },
      ],
    },
    { text: `${Number(item.quantity)} ${item.unit || ""}`.trim(), alignment: "right" },
    { text: money(item.unit_price), alignment: "right" },
    { text: money(item.line_total), alignment: "right", bold: true },
  ]) as unknown as Content[][];

  const infoRow = (label: string, value: string): Content => ({
    columns: [
      { text: label, width: 100, color: "#64748b", fontSize: 9 },
      { text: value || "-", bold: true, fontSize: 9 },
    ],
    margin: [0, 2, 0, 2],
  });

  const completedAt = order.completed_at
    ? new Date(order.completed_at).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })
    : new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  const paid = Number(order.paid_amount) || 0;
  const debt = order.debt_amount != null ? Number(order.debt_amount) : Math.max(0, Number(order.grand_total) - paid);

  const definition: TDocumentDefinitions = {
    pageSize: "A4",
    pageMargins: [34, 38, 34, 48],
    defaultStyle: { font: "Roboto", fontSize: 9, color: "#17231d" },
    footer: (page, pages) => ({
      columns: [
        { text: "Hóa đơn bán hàng nội bộ — không phải hóa đơn giá trị gia tăng (GTGT)", color: "#64748b", fontSize: 8 },
        { text: `Trang ${page}/${pages}`, alignment: "right", color: "#64748b", fontSize: 8 },
      ],
      margin: [34, 10, 34, 0],
    }),
    content: [
      {
        columns: [
          {
            width: "*",
            stack: [
              { image: logoDataUrl, width: 112, margin: [0, 0, 0, 5] },
              { text: "B19 KP15, Tam Hiệp, Biên Hòa, Đồng Nai", color: "#64748b", fontSize: 8, margin: [0, 3, 0, 0] },
              { text: "Hotline/Zalo: 089.890.2222", color: "#64748b", fontSize: 8 },
            ],
          },
          {
            width: 235,
            stack: [
              { text: "HÓA ĐƠN BÁN HÀNG", alignment: "right", bold: true, fontSize: 15 },
              { text: order.order_code, alignment: "right", color: "#087348", bold: true, margin: [0, 4, 0, 0] },
              { text: `Hoàn thành giao hàng: ${completedAt}`, alignment: "right", color: "#64748b", fontSize: 8 },
            ],
          },
        ],
        margin: [0, 0, 0, 18],
      },
      {
        canvas: [{ type: "line", x1: 0, y1: 0, x2: 527, y2: 0, lineWidth: 1.5, lineColor: "#087348" }],
        margin: [0, 0, 0, 14],
      },
      {
        columns: [
          {
            width: "50%",
            stack: [
              { text: "THÔNG TIN KHÁCH HÀNG", style: "sectionTitle" },
              infoRow("Mã khách hàng", order.customer_code),
              infoRow("Khách hàng", order.customer_name),
              infoRow("Điện thoại", order.customer_phone),
              infoRow("Công ty/đơn vị", order.customer_company || "Khách hàng cá nhân"),
              infoRow("Mã số thuế", order.customer_tax_code || "-"),
            ],
          },
          {
            width: "50%",
            stack: [
              { text: "THÔNG TIN GIAO NHẬN", style: "sectionTitle" },
              infoRow("Người nhận", order.delivery_name || order.customer_name),
              infoRow("Điện thoại", order.delivery_phone || order.customer_phone),
              infoRow("Địa chỉ", order.delivery_address || "Nhận tại điểm"),
              infoRow("Nhân viên phụ trách", order.sales_rep_name || "-"),
            ],
          },
        ],
        columnGap: 20,
        margin: [0, 0, 0, 16],
      },
      { text: "CHI TIẾT SẢN PHẨM ĐÃ GIAO", style: "sectionTitle", margin: [0, 0, 0, 7] },
      {
        table: {
          headerRows: 1,
          widths: [20, "*", 60, 75, 85],
          body: [
            [
              { text: "STT", style: "tableHeader", alignment: "center" },
              { text: "Sản phẩm", style: "tableHeader" },
              { text: "SL", style: "tableHeader", alignment: "right" },
              { text: "Đơn giá", style: "tableHeader", alignment: "right" },
              { text: "Thành tiền", style: "tableHeader", alignment: "right" },
            ],
            ...itemRows,
          ],
        },
        layout: {
          fillColor: (rowIndex) => (rowIndex === 0 ? "#e9f6ef" : rowIndex % 2 === 0 ? "#f8faf9" : null),
          hLineColor: "#dce7e1",
          vLineColor: "#dce7e1",
          paddingTop: () => 7,
          paddingBottom: () => 7,
          paddingLeft: () => 5,
          paddingRight: () => 5,
        },
        margin: [0, 0, 0, 14],
      },
      {
        columns: [
          {
            width: "*",
            stack: [
              { text: "GHI CHÚ", style: "sectionTitle" },
              { text: order.note || "Không có ghi chú.", color: "#475569", margin: [0, 4, 14, 8] },
            ],
          },
          {
            width: 225,
            table: {
              widths: ["*", 85],
              body: [
                [{ text: "Tạm tính", color: "#64748b" }, { text: money(order.subtotal), alignment: "right", bold: true }],
                [{ text: "Giảm giá", color: "#64748b" }, { text: `-${money(order.discount_amount)}`, alignment: "right", color: "#087348", bold: true }],
                [{ text: "Phí giao hàng", color: "#64748b" }, { text: money(order.shipping_amount), alignment: "right", bold: true }],
                [{ text: "TỔNG CỘNG", bold: true, color: "#087348", fontSize: 10 }, { text: money(order.grand_total), alignment: "right", bold: true, color: "#087348", fontSize: 12 }],
                [{ text: "Đã thanh toán", color: "#64748b" }, { text: money(paid), alignment: "right", bold: true }],
                [{ text: "Còn lại", color: debt > 0 ? "#b91c1c" : "#64748b" }, { text: money(debt), alignment: "right", bold: true, color: debt > 0 ? "#b91c1c" : "#087348" }],
              ],
            },
            layout: {
              hLineColor: "#dce7e1",
              vLineColor: "#dce7e1",
              paddingTop: () => 6,
              paddingBottom: () => 6,
              paddingLeft: () => 7,
              paddingRight: () => 7,
            },
          },
        ],
        margin: [0, 0, 0, 25],
      },
      {
        columns: [
          { width: "50%", stack: [{ text: "KHÁCH HÀNG", alignment: "center", bold: true }, { text: "Đã nhận đủ hàng", alignment: "center", color: "#64748b", fontSize: 8, margin: [0, 3, 0, 45] }] },
          { width: "50%", stack: [{ text: "TPS1", alignment: "center", bold: true }, { text: order.sales_rep_name || "Nhân viên phụ trách", alignment: "center", color: "#64748b", fontSize: 8, margin: [0, 3, 0, 45] }] },
        ],
      },
    ],
    styles: {
      sectionTitle: { bold: true, color: "#087348", fontSize: 10 },
      tableHeader: { bold: true, color: "#075c3b", fontSize: 8 },
    },
  };

  return await new Promise<Buffer>((resolve, reject) => {
    try {
      const browserPdf = pdfMake.createPdf(definition) as unknown as {
        getBuffer: (callback: (buffer: Uint8Array) => void) => void;
      };
      browserPdf.getBuffer((buffer) => resolve(Buffer.from(buffer)));
    } catch (error) {
      reject(error);
    }
  });
}
