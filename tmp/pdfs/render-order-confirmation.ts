import { mkdir, writeFile } from "fs/promises";
import { generateOrderConfirmationPdf } from "../../lib/order-confirmation-pdf";

const pdf = await generateOrderConfirmationPdf({
  id: "f4b6c79d-1c75-4d16-9c86-4df0e798a911",
  order_code: "DH-20260813-000048",
  source: "zalo_mini_app",
  customer_code: "TPS1-100048",
  customer_name: "Nguyễn Thái Hoà",
  customer_phone: "0898902222",
  customer_company: "Công ty TNHH Thực Phẩm Số Một",
  customer_tier: "VIP0",
  delivery_name: "Nguyễn Thái Hoà",
  delivery_phone: "0898902222",
  delivery_address: "B19 KP15, Tam Hiệp, Biên Hòa, Đồng Nai",
  note: "Giao trong giờ hành chính, vui lòng gọi trước khi giao.",
  pricing_mode: "manual_item_price",
  pricing_note: "Khách đã xác thực, giữ VIP0; hỗ trợ riêng một số mặt hàng trong đơn đầu tiên.",
  subtotal: 1850000,
  discount_amount: 92500,
  pricing_adjustment_amount: 92500,
  shipping_amount: 30000,
  grand_total: 1787500,
  price_revision: 1,
  priced_at: new Date().toISOString(),
  priced_by: "Nguyễn Văn Sale",
  order_items: [
    { name: "Rau cải xanh loại 1", sku: "RAU-001", unit: "Kg", quantity: 20, base_unit_price: 22000, discount_percent: 4.55, unit_price: 21000, line_total: 420000, item_note: "Cắt khúc 5 cm, đóng túi 5 kg" },
    { name: "Thịt heo nạc vai", sku: "THIT-014", unit: "Kg", quantity: 8, base_unit_price: 118000, discount_percent: 5.08, unit_price: 112000, line_total: 896000 },
    { name: "Gạo thơm Jasmine", sku: "GAO-006", unit: "Bao", quantity: 2, base_unit_price: 233000, discount_percent: 5.47, unit_price: 220250, line_total: 440500 },
  ],
});

await mkdir("tmp/pdfs", { recursive: true });
await writeFile("tmp/pdfs/order-confirmation-sample.pdf", pdf);
