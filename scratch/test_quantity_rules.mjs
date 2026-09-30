import { validateOrderQuantity, getValidQuantityExamples } from "../lib/quantity-rules.ts";
import assert from "node:assert";

console.log("=== KIỂM THỬ UTILITY QUANTITY RULES ===");

// 1. min 0,5 / step 0,5, enforce = true
assert.strictEqual(validateOrderQuantity(0.5, 0.5, 0.5, true), null, "0.5 phải hợp lệ");
assert.strictEqual(validateOrderQuantity(1.0, 0.5, 0.5, true), null, "1.0 phải hợp lệ");
assert.strictEqual(validateOrderQuantity(1.5, 0.5, 0.5, true), null, "1.5 phải hợp lệ");
assert.ok(validateOrderQuantity(0.2, 0.5, 0.5, true)?.includes("tối thiểu là 0.5"), "0.2 phải bị từ chối tối thiểu");
assert.ok(validateOrderQuantity(0.7, 0.5, 0.5, true)?.includes("bước 0.5"), "0.7 phải bị từ chối bước nhảy");

// 2. min 1 / step 1, enforce = true
assert.strictEqual(validateOrderQuantity(1, 1, 1, true), null, "1 phải hợp lệ");
assert.strictEqual(validateOrderQuantity(2, 1, 1, true), null, "2 phải hợp lệ");
assert.ok(validateOrderQuantity(0.25, 1, 1, true)?.includes("tối thiểu là 1"), "0.25 phải bị từ chối tối thiểu");
assert.ok(validateOrderQuantity(1.25, 1, 1, true)?.includes("bước 1"), "1.25 phải bị từ chối bước nhảy");

// 3. không bật kiểm tra (enforce = false)
assert.strictEqual(validateOrderQuantity(0.2, 0.5, 0.5, false), null, "Khi enforce=false nhận 0.2");
assert.strictEqual(validateOrderQuantity(0.7, 0.5, 0.5, false), null, "Khi enforce=false nhận 0.7");
assert.strictEqual(validateOrderQuantity(0.25, 1, 1, false), null, "Khi enforce=false nhận 0.25");
assert.strictEqual(validateOrderQuantity(12.345, 1, 1, false), null, "Khi enforce=false nhận 12.345");
assert.ok(validateOrderQuantity(0, 1, 1, false)?.includes("lớn hơn 0"), "0 phải bị từ chối");
assert.ok(validateOrderQuantity(-5, 1, 1, false)?.includes("lớn hơn 0"), "Số âm phải bị từ chối");

// 4. Ví dụ hợp lệ
const example = getValidQuantityExamples(0.5, 0.5, "kg");
console.log("Ví dụ hợp lệ (0.5/0.5/kg):", example);
assert.strictEqual(example, "0,5 · 1 · 1,5 kg");

console.log("✅ TẤT CẢ TEST CASES QUANTITY RULES ĐÃ PASS 100%!");
