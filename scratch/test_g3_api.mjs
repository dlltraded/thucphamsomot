import assert from "node:assert";

console.log("=== KIỂM THỬ TÍNH NĂNG G3 — HOÀN THIỆN DỮ LIỆU KHÁCH HÀNG ===");

// 1. Phone validation logic
function cleanPhoneNumber(phone) {
  return String(phone || "").replace(/[\s.-]/g, "");
}

function isValidVietnamesePhone(phone) {
  const cleaned = cleanPhoneNumber(phone);
  if (!cleaned) return false;
  return /^(0|\+84)(([35789][0-9]{8})|(2[0-9]{9}))$/.test(cleaned);
}

function formatVietnamesePhone(phone) {
  if (!phone) return "—";
  const cleaned = cleanPhoneNumber(phone);
  if (/^0[35789][0-9]{8}$/.test(cleaned)) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }
  if (/^02[0-9]{9}$/.test(cleaned)) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 7)} ${cleaned.slice(7)}`;
  }
  return phone;
}

// Test SĐT di động chuẩn Việt Nam 10 số
assert.strictEqual(isValidVietnamesePhone("0901234567"), true, "0901234567 phải hợp lệ");
assert.strictEqual(isValidVietnamesePhone("0389998888"), true, "0389998888 phải hợp lệ");
assert.strictEqual(isValidVietnamesePhone("0701234567"), true, "0701234567 phải hợp lệ");
assert.strictEqual(isValidVietnamesePhone("0561234567"), true, "0561234567 phải hợp lệ");
assert.strictEqual(isValidVietnamesePhone("0861234567"), true, "0861234567 phải hợp lệ");

// Test SĐT cố định chuẩn Việt Nam 11 số (đầu 02)
assert.strictEqual(isValidVietnamesePhone("02838383838"), true, "02838383838 phải hợp lệ");
assert.strictEqual(isValidVietnamesePhone("02439999999"), true, "02439999999 phải hợp lệ");

// Test đầu +84
assert.strictEqual(isValidVietnamesePhone("+84901234567"), true, "+84901234567 phải hợp lệ");

// Test có dấu cách hoặc gạch ngang
assert.strictEqual(isValidVietnamesePhone("0901 234 567"), true, "0901 234 567 phải hợp lệ sau khi clean");
assert.strictEqual(isValidVietnamesePhone("090-123-4567"), true, "090-123-4567 phải hợp lệ sau khi clean");

// Test các trường hợp sai định dạng
assert.strictEqual(isValidVietnamesePhone(""), false, "Rỗng phải không hợp lệ");
assert.strictEqual(isValidVietnamesePhone("123456"), false, "Quá ngắn phải không hợp lệ");
assert.strictEqual(isValidVietnamesePhone("0123456789"), false, "Đầu 01 cũ 10 số phải không hợp lệ");
assert.strictEqual(isValidVietnamesePhone("0412345678"), false, "Đầu 04 không có");
assert.strictEqual(isValidVietnamesePhone("abc0901234"), false, "Chứa chữ phải không hợp lệ");

// Test formatVietnamesePhone
assert.strictEqual(formatVietnamesePhone("0901234567"), "0901 234 567", "Format di động đúng 0901 234 567");
assert.strictEqual(formatVietnamesePhone("02838383838"), "028 3838 3838", "Format cố định đúng 028 3838 3838");
assert.strictEqual(formatVietnamesePhone(null), "—", "Null trả về '—'");

console.log("✅ 1. Kiểm tra validation và formatting SĐT Việt Nam thành công!");

// 2. Kiểm tra logic phân loại hoàn thiện hồ sơ khách hàng
const sampleCustomers = [
  { id: "1", name: "Khách A", phone: "0901234567", address: "123 Lê Lợi, Q1" }, // Đầy đủ
  { id: "2", name: "Khách B", phone: "", address: "456 CMT8, Q3" },             // Thiếu SĐT
  { id: "3", name: "Khách C", phone: "0912345678", address: null },             // Thiếu Địa chỉ
  { id: "4", name: "Khách D", phone: null, address: "" },                       // Thiếu cả hai
  { id: "5", name: "Khách E", phone: "0987654321", address: "789 NTMK, Q1" }, // Đầy đủ
];

let missingPhoneCount = 0;
let missingAddressCount = 0;
let missingBothCount = 0;
let completeCount = 0;

for (const c of sampleCustomers) {
  const hasPhone = Boolean(c.phone && String(c.phone).trim());
  const hasAddress = Boolean(c.address && String(c.address).trim());
  if (!hasPhone) missingPhoneCount++;
  if (!hasAddress) missingAddressCount++;
  if (!hasPhone && !hasAddress) missingBothCount++;
  if (hasPhone && hasAddress) completeCount++;
}

assert.strictEqual(missingPhoneCount, 2, "Có đúng 2 khách thiếu SĐT (B, D)");
assert.strictEqual(missingAddressCount, 2, "Có đúng 2 khách thiếu địa chỉ (C, D)");
assert.strictEqual(missingBothCount, 1, "Có đúng 1 khách thiếu cả hai (D)");
assert.strictEqual(completeCount, 2, "Có đúng 2 khách đầy đủ (A, E)");

console.log("✅ 2. Kiểm tra tính toán 4 thẻ thống kê hoàn thiện hồ sơ thành công!");

// 3. Kiểm tra logic lọc
const filterMissingPhone = sampleCustomers.filter(c => !c.phone || !String(c.phone).trim());
assert.strictEqual(filterMissingPhone.length, 2);
assert.deepStrictEqual(filterMissingPhone.map(c => c.name), ["Khách B", "Khách D"]);

const filterMissingAddress = sampleCustomers.filter(c => !c.address || !String(c.address).trim());
assert.strictEqual(filterMissingAddress.length, 2);
assert.deepStrictEqual(filterMissingAddress.map(c => c.name), ["Khách C", "Khách D"]);

const filterMissingBoth = sampleCustomers.filter(c => (!c.phone || !String(c.phone).trim()) && (!c.address || !String(c.address).trim()));
assert.strictEqual(filterMissingBoth.length, 1);
assert.deepStrictEqual(filterMissingBoth.map(c => c.name), ["Khách D"]);

console.log("✅ 3. Kiểm tra lọc khách hàng theo tiêu chí hoàn thiện thành công!");

// 4. Kiểm tra validation payload PATCH API
function validateCustomerPatch(body) {
  if (body.phone !== undefined && body.phone !== null && String(body.phone).trim() !== "") {
    if (!isValidVietnamesePhone(body.phone)) {
      return "Số điện thoại không đúng định dạng Việt Nam";
    }
  }
  if (body.email !== undefined && body.email !== null && String(body.email).trim() !== "") {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.email).trim())) {
      return "Email không đúng định dạng";
    }
  }
  return null;
}

assert.strictEqual(validateCustomerPatch({ phone: "0901234567", email: "test@tps1.vn" }), null);
assert.ok(validateCustomerPatch({ phone: "999" })?.includes("Số điện thoại không đúng"), "Phải chặn SĐT sai");
assert.ok(validateCustomerPatch({ email: "invalid-email" })?.includes("Email không đúng"), "Phải chặn Email sai");
assert.strictEqual(validateCustomerPatch({ phone: "", email: "" }), null, "Cho phép xóa trắng");

console.log("✅ 4. Kiểm tra validation payload PATCH API thành công!");
console.log("=== TOÀN BỘ BÀI TEST G3 ĐÃ PASS 100% ===");
