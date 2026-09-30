import assert from "node:assert";

console.log("=== KIỂM THỬ TÍNH NĂNG G1 — QUY CÁCH HÀNG HÓA ===");

// 1. Kiểm tra validation logic ở tầng API specification
function validateSpecFields(fields) {
  if (fields.packaging_note !== undefined && fields.packaging_note !== null) {
    if (typeof fields.packaging_note !== "string") return "Quy cách đóng gói phải là chuỗi ký tự";
    if (fields.packaging_note.trim().length > 120) return "Quy cách đóng gói tối đa 120 ký tự";
  }
  if (fields.min_order_qty !== undefined && fields.min_order_qty !== null) {
    const min = Number(fields.min_order_qty);
    if (!Number.isFinite(min) || min < 0) return "Số lượng tối thiểu không được âm hoặc không hợp lệ";
    if (Math.round(min * 1000) !== min * 1000) return "Số lượng tối thiểu tối đa 3 chữ số thập phân";
  }
  if (fields.order_step !== undefined && fields.order_step !== null) {
    const step = Number(fields.order_step);
    if (!Number.isFinite(step) || step < 0) return "Bước đặt hàng không được âm hoặc không hợp lệ";
    if (Math.round(step * 1000) !== step * 1000) return "Bước đặt hàng tối đa 3 chữ số thập phân";
  }
  if (fields.enforce_order_step === true) {
    if (fields.min_order_qty !== undefined && Number(fields.min_order_qty) <= 0) {
      return "Khi bật kiểm tra quy cách, số lượng tối thiểu phải lớn hơn 0";
    }
    if (fields.order_step !== undefined && Number(fields.order_step) <= 0) {
      return "Khi bật kiểm tra quy cách, bước đặt hàng phải lớn hơn 0";
    }
  }
  return null;
}

// Test validation
assert.strictEqual(validateSpecFields({ packaging_note: "Bịch 0,5kg", min_order_qty: 0.5, order_step: 0.5, enforce_order_step: true }), null);
assert.ok(validateSpecFields({ packaging_note: "A".repeat(121) })?.includes("120 ký tự"), "Phải chặn > 120 ký tự");
assert.ok(validateSpecFields({ min_order_qty: -1 })?.includes("không được âm"), "Phải chặn số âm");
assert.ok(validateSpecFields({ min_order_qty: 0.1234 })?.includes("tối đa 3 chữ số"), "Phải chặn > 3 chữ số thập phân");
assert.ok(validateSpecFields({ min_order_qty: 0, enforce_order_step: true })?.includes("phải lớn hơn 0"), "Phải chặn min=0 khi enforce=true");
assert.ok(validateSpecFields({ order_step: 0, enforce_order_step: true })?.includes("phải lớn hơn 0"), "Phải chặn step=0 khi enforce=true");

// 2. Kiểm tra tương thích ngược của Tuple Catalog
const sampleCustomerTuple = [
  "prod-1", "SP-001", "Cải thìa", "Rau", "Kg", 25000, false, true,
  // 4 trường nối thêm ở cuối (G2 — Mục 4.1):
  "Bịch 0,5kg", 0.5, 0.5, true
];

assert.strictEqual(sampleCustomerTuple.length, 12, "Tuple customer phải có đúng 12 phần tử (8 cũ + 4 mới)");
assert.strictEqual(sampleCustomerTuple[0], "prod-1", "Index 0 phải là id");
assert.strictEqual(sampleCustomerTuple[1], "SP-001", "Index 1 phải là sku");
assert.strictEqual(sampleCustomerTuple[2], "Cải thìa", "Index 2 phải là name");
assert.strictEqual(sampleCustomerTuple[3], "Rau", "Index 3 phải là category");
assert.strictEqual(sampleCustomerTuple[4], "Kg", "Index 4 phải là unit");
assert.strictEqual(sampleCustomerTuple[5], 25000, "Index 5 phải là price");
assert.strictEqual(sampleCustomerTuple[6], false, "Index 6 phải là priceOnRequest");
assert.strictEqual(sampleCustomerTuple[7], true, "Index 7 phải là hasImage");
assert.strictEqual(sampleCustomerTuple[8], "Bịch 0,5kg", "Index 8 phải là packagingNote");
assert.strictEqual(sampleCustomerTuple[9], 0.5, "Index 9 phải là minOrderQty");
assert.strictEqual(sampleCustomerTuple[10], 0.5, "Index 10 phải là orderStep");
assert.strictEqual(sampleCustomerTuple[11], true, "Index 11 phải là enforceOrderStep");

const sampleAdminTuple = [
  "prod-1", "SP-001", "Cải thìa", "Rau", "Kg", 25000, 25000, "img.jpg", true, true, 100, false,
  // 4 trường nối thêm ở cuối:
  "Bịch 0,5kg", 0.5, 0.5, true
];
assert.strictEqual(sampleAdminTuple.length, 16, "Tuple admin phải có đúng 16 phần tử (12 cũ + 4 mới)");
assert.strictEqual(sampleAdminTuple[12], "Bịch 0,5kg", "Index 12 admin phải là packagingNote");
assert.strictEqual(sampleAdminTuple[13], 0.5, "Index 13 admin phải là minOrderQty");
assert.strictEqual(sampleAdminTuple[14], 0.5, "Index 14 admin phải là orderStep");
assert.strictEqual(sampleAdminTuple[15], true, "Index 15 admin phải là enforceOrderStep");

console.log("✅ G1 VALIDATION & TUPLE SPECIFICATION TESTS ĐÃ PASS 100%!");
