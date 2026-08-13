import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";
import { readFileSync } from "node:fs";
import path from "node:path";

export interface ConfirmationOrderItem {
  id?: string;
  sku?: string | null;
  name: string;
  unit?: string | null;
  quantity: number;
  base_unit_price: number;
  discount_percent?: number;
  unit_price: number;
  line_total: number;
  item_note?: string | null;
  pricing_note?: string | null;
}

export interface ConfirmationOrderSnapshot {
  id: string;
  order_code: string;
  source: string;
  customer_code: string;
  customer_name: string;
  customer_phone: string;
  customer_company?: string | null;
  customer_tier?: string | null;
  delivery_name?: string | null;
  delivery_phone?: string | null;
  delivery_address?: string | null;
  note?: string | null;
  pricing_mode?: string | null;
  pricing_note?: string | null;
  subtotal: number;
  discount_amount: number;
  pricing_adjustment_amount?: number;
  shipping_amount: number;
  grand_total: number;
  price_revision: number;
  priced_at?: string | null;
  priced_by?: string | null;
  order_items: ConfirmationOrderItem[];
}

const money = (value: number | string | null | undefined) =>
  `${new Intl.NumberFormat("vi-VN").format(Number(value) || 0)} đ`;

const sourceLabel: Record<string, string> = {
  website: "Website",
  zalo_mini_app: "Zalo Mini App",
  admin: "Quản trị",
};

const pricingLabel: Record<string, string> = {
  tier: "Chính sách theo hạng khách hàng",
  order_discount: "Chiết khấu riêng toàn đơn",
  manual_item_price: "Đơn giá chốt riêng từng sản phẩm",
};

export async function generateOrderConfirmationPdf(
  order: ConfirmationOrderSnapshot
): Promise<Buffer> {
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
        item.item_note || item.pricing_note ? { text: `Quy cách: ${item.item_note || item.pricing_note}`, color: "#475569", italics: true, fontSize: 8, margin: [0, 2, 0, 0] } : { text: "" },
      ],
    },
    { text: `${Number(item.quantity)} ${item.unit || ""}`.trim(), alignment: "right" },
    { text: money(item.base_unit_price), alignment: "right" },
    { text: `${Number(item.discount_percent || 0).toLocaleString("vi-VN")}%`, alignment: "right" },
    { text: money(item.unit_price), alignment: "right" },
    { text: money(item.line_total), alignment: "right", bold: true },
  ]) as unknown as Content[][];

  const infoRow = (label: string, value: string): Content => ({
    columns: [
      { text: label, width: 95, color: "#64748b", fontSize: 9 },
      { text: value || "-", bold: true, fontSize: 9 },
    ],
    margin: [0, 2, 0, 2],
  });

  const pricedAt = order.priced_at
    ? new Date(order.priced_at).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })
    : new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  const adjustment = Number(order.pricing_adjustment_amount || 0);

  const definition: TDocumentDefinitions = {
    pageSize: "A4",
    pageMargins: [34, 38, 34, 48],
    defaultStyle: { font: "Roboto", fontSize: 9, color: "#17231d" },
    footer: (page, pages) => ({
      columns: [
        { text: "Phiếu xác nhận đơn hàng - không thay thế hóa đơn GTGT", color: "#64748b", fontSize: 8 },
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
              { text: "PHIẾU XÁC NHẬN ĐƠN HÀNG", alignment: "right", bold: true, fontSize: 15 },
              { text: `${order.order_code} - R${order.price_revision}`, alignment: "right", color: "#087348", bold: true, margin: [0, 4, 0, 0] },
              { text: `Xác nhận: ${pricedAt}`, alignment: "right", color: "#64748b", fontSize: 8 },
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
              infoRow("Phân loại", order.customer_tier || "VIP0"),
            ],
          },
          {
            width: "50%",
            stack: [
              { text: "THÔNG TIN GIAO NHẬN", style: "sectionTitle" },
              infoRow("Nguồn đơn", sourceLabel[order.source] || order.source),
              infoRow("Người nhận", order.delivery_name || order.customer_name),
              infoRow("Điện thoại", order.delivery_phone || order.customer_phone),
              infoRow("Địa chỉ", order.delivery_address || "Nhận tại điểm"),
              infoRow("Chính sách giá", pricingLabel[order.pricing_mode || "tier"] || order.pricing_mode || "Theo thỏa thuận"),
            ],
          },
        ],
        columnGap: 20,
        margin: [0, 0, 0, 16],
      },
      { text: "CHI TIẾT SẢN PHẨM", style: "sectionTitle", margin: [0, 0, 0, 7] },
      {
        table: {
          headerRows: 1,
          widths: [20, "*", 48, 62, 35, 62, 67],
          body: [
            [
              { text: "STT", style: "tableHeader", alignment: "center" },
              { text: "Sản phẩm", style: "tableHeader" },
              { text: "SL", style: "tableHeader", alignment: "right" },
              { text: "Giá gốc", style: "tableHeader", alignment: "right" },
              { text: "Điều chỉnh", style: "tableHeader", alignment: "right" },
              { text: "Đơn giá chốt", style: "tableHeader", alignment: "right" },
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
              { text: order.note || "Không có ghi chú giao nhận.", color: "#475569", margin: [0, 4, 14, 8] },
              order.pricing_note
                ? { text: `Ghi chú xác nhận giá: ${order.pricing_note}`, color: "#475569", italics: true }
                : { text: "" },
            ],
          },
          {
            width: 225,
            table: {
              widths: ["*", 85],
              body: [
                [{ text: "Tạm tính", color: "#64748b" }, { text: money(order.subtotal), alignment: "right", bold: true }],
                [{ text: adjustment >= 0 ? "Giảm/điều chỉnh" : "Điều chỉnh tăng", color: "#64748b" }, { text: adjustment >= 0 ? `-${money(adjustment)}` : money(Math.abs(adjustment)), alignment: "right", color: adjustment >= 0 ? "#087348" : "#b45309", bold: true }],
                [{ text: "Phí giao hàng", color: "#64748b" }, { text: money(order.shipping_amount), alignment: "right", bold: true }],
                [{ text: "TỔNG THANH TOÁN", bold: true, color: "#087348", fontSize: 10 }, { text: money(order.grand_total), alignment: "right", bold: true, color: "#087348", fontSize: 12 }],
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
          { width: "50%", stack: [{ text: "ĐẠI DIỆN KHÁCH HÀNG", alignment: "center", bold: true }, { text: "Ký và ghi rõ họ tên", alignment: "center", color: "#64748b", fontSize: 8, margin: [0, 3, 0, 45] }] },
          { width: "50%", stack: [{ text: "ĐẠI DIỆN TPS1", alignment: "center", bold: true }, { text: order.priced_by || "Nhân viên phụ trách", alignment: "center", color: "#64748b", fontSize: 8, margin: [0, 3, 0, 45] }] },
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
