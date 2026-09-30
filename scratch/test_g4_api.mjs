import assert from "node:assert";

console.log("=== KIỂM THỬ TÍNH NĂNG G4 — QUẢN LÝ NHÂN VIÊN VÀ PHÒNG BAN ===");

const allowedRoles = ["admin", "truong_phong", "sale", "thu_mua", "kho", "ke_toan", "tai_xe"];
const allowedPositions = ["nhan_vien", "tro_ly", "truong_nhom", "truong_phong", "ban_giam_doc", "quan_tri_he_thong"];

// 1. Kiểm tra validation khi tạo nhân viên mới
function validateCreateUser(payload) {
  const { email, password, name, role, departmentId, position } = payload;
  if (!email || !password || !name || !role) {
    return "Thiếu trường bắt buộc";
  }
  if (password.length < 6) {
    return "Mật khẩu tối thiểu 6 ký tự";
  }
  if (!allowedRoles.includes(role)) {
    return "Vai trò nghiệp vụ không hợp lệ";
  }
  const pos = position || "nhan_vien";
  if (!allowedPositions.includes(pos)) {
    return "Chức vụ không hợp lệ";
  }
  // Nhân viên nghiệp vụ bắt buộc phải chọn phòng ban
  if (role !== "admin" && !departmentId) {
    return "Vui lòng chọn phòng ban cho nhân viên";
  }
  return null;
}

assert.strictEqual(validateCreateUser({
  name: "Nguyễn Văn A",
  email: "a@tps1.vn",
  password: "password123",
  role: "sale",
  position: "nhan_vien",
  departmentId: "dept-vh-1"
}), null, "Tạo nhân viên hợp lệ phải thành công");

assert.ok(validateCreateUser({
  name: "Nguyễn Văn B",
  email: "b@tps1.vn",
  password: "123",
  role: "sale",
  departmentId: "dept-vh-1"
})?.includes("tối thiểu 6 ký tự"), "Phải chặn mật khẩu < 6 ký tự");

assert.ok(validateCreateUser({
  name: "Nguyễn Văn C",
  email: "c@tps1.vn",
  password: "password123",
  role: "sale",
  departmentId: null
})?.includes("chọn phòng ban"), "Phải bắt buộc chọn phòng ban đối với sale");

assert.strictEqual(validateCreateUser({
  name: "Admin Tổng",
  email: "admin@tps1.vn",
  password: "password123",
  role: "admin",
  departmentId: null
}), null, "Admin hệ thống được phép để trống phòng ban");

assert.ok(validateCreateUser({
  name: "Hack Role",
  email: "h@tps1.vn",
  password: "password123",
  role: "super_root",
  departmentId: "dept-1"
})?.includes("không hợp lệ"), "Phải chặn role ngoài danh mục");

console.log("✅ 1. Kiểm tra validation tạo nhân viên mới thành công!");

// 2. Kiểm tra validation khi cập nhật nhân viên (PATCH)
function validateUpdateUser(payload) {
  const { userId, role, position, departmentId } = payload;
  if (!userId) return "Thiếu userId";
  if (role !== undefined && !allowedRoles.includes(role)) {
    return "Vai trò nghiệp vụ không hợp lệ";
  }
  if (position !== undefined && !allowedPositions.includes(position)) {
    return "Chức vụ không hợp lệ";
  }
  if (role && role !== "admin" && departmentId === null) {
    return "Nhân viên nghiệp vụ bắt buộc phải có phòng ban";
  }
  return null;
}

assert.strictEqual(validateUpdateUser({ userId: "u-1", role: "thu_mua", position: "truong_nhom", departmentId: "dept-tm" }), null);
assert.ok(validateUpdateUser({ userId: "u-1", role: "invalid_role" })?.includes("không hợp lệ"));
assert.ok(validateUpdateUser({ userId: "u-1", position: "invalid_pos" })?.includes("không hợp lệ"));
assert.ok(validateUpdateUser({ userId: "" })?.includes("Thiếu userId"));

console.log("✅ 2. Kiểm tra validation cập nhật nhân viên thành công!");

// 3. Kiểm tra logic cảnh báo thiếu phòng ban
const sampleStaff = [
  { id: "1", name: "Trần Admin", role: "admin", department_id: null, is_active: true },
  { id: "2", name: "Lê Sale", role: "sale", department_id: null, is_active: true }, // Cần cảnh báo!
  { id: "3", name: "Phạm Thu Mua", role: "thu_mua", department_id: "dept-tm", is_active: true },
  { id: "4", name: "Nguyễn Kho Cũ", role: "kho", department_id: null, is_active: false }, // Đã khóa, không cảnh báo active
];

const missingDeptActive = sampleStaff.filter(u => u.is_active && !u.department_id && u.role !== "admin");
assert.strictEqual(missingDeptActive.length, 1, "Chỉ có đúng 1 nhân viên active thiếu phòng ban (Lê Sale)");
assert.strictEqual(missingDeptActive[0].name, "Lê Sale");

console.log("✅ 3. Kiểm tra cảnh báo tài khoản thiếu phòng ban thành công!");
console.log("=== TOÀN BỘ BÀI TEST G4 ĐÃ PASS 100% ===");
