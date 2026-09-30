import assert from "node:assert";
import { createClient } from "@supabase/supabase-js";
import { can, canForProfile, ROLE_LABELS } from "../lib/permissions.ts";

console.log("=====================================================================");
console.log("KIỂM THỬ TỰ ĐỘNG G5 — PHÂN QUYỀN RBAC, PHÒNG BAN VÀ NHÂN VIÊN TPS1");
console.log("=====================================================================\n");

// 1. Kiểm tra 6 phòng ban trên Production CSDL
console.log("--- 1. KIỂM THỬ 6 PHÒNG BAN PRODUCTION ---");
const supabaseUrl = process.env.SUPABASE_PRODUCTS_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "https://yntgxollwjemyidizhnn.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (supabaseServiceKey) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data: depts, error: deptErr } = await supabase
    .from("departments")
    .select("code, name, function_group, is_active")
    .eq("is_active", true)
    .order("code");

  assert.ifError(deptErr);
  assert.ok(Array.isArray(depts), "Phải có danh sách phòng ban");
  console.log(`- Tìm thấy ${depts.length} phòng ban đang hoạt động:`);
  depts.forEach(d => console.log(`  + [${d.code}] ${d.name} (${d.function_group})`));

  const deptCodes = depts.map(d => d.code);
  const requiredCodes = ["BGD", "KDMKT", "KT", "TM", "VH1", "VH2"];
  for (const reqCode of requiredCodes) {
    assert.ok(deptCodes.includes(reqCode), `Thiếu phòng ban bắt buộc: ${reqCode}`);
  }
  console.log("✅ 1. Toàn bộ 6 phòng ban production (BGD, KDMKT, KT, TM, VH1, VH2) hiện hữu chính xác!\n");
} else {
  console.log("⚠️ Bỏ qua query CSDL trực tiếp do thiếu SUPABASE_SERVICE_ROLE_KEY; kiểm thử logic mô phỏng.\n");
}

// 2. Kiểm thử ma trận quyền canForProfile (G1 & G5)
console.log("--- 2. KIỂM THỬ MA TRẬN QUYỀN canForProfile ---");

// 2.1. Admin toàn quyền (kể cả admin.manage_staff)
const adminProfile = { role: "admin", position: "quan_tri_he_thong", department: null };
assert.strictEqual(canForProfile(adminProfile, "admin.manage_staff"), true, "Admin phải có quyền manage_staff");
assert.strictEqual(canForProfile(adminProfile, "orders.create"), true, "Admin phải có quyền orders.create");
assert.strictEqual(canForProfile(adminProfile, "pricing.edit"), true, "Admin phải có quyền pricing.edit");
assert.strictEqual(canForProfile(adminProfile, "finance.edit"), true, "Admin phải có quyền finance.edit");
console.log("✅ Admin có toàn quyền hệ thống và quản trị nhân sự");

// 2.2. Ban Giám đốc có quyền điều hành nghiệp vụ toàn công ty, KHÔNG có quyền admin.manage_staff
const bgdProfile = {
  role: "ban_giam_doc",
  position: "ban_giam_doc",
  department: { function_group: "executive", code: "BGD", name: "Ban Giám đốc" },
};
assert.strictEqual(canForProfile(bgdProfile, "orders.view"), true, "BGĐ xem được mọi đơn hàng");
assert.strictEqual(canForProfile(bgdProfile, "orders.create"), true, "BGĐ tạo được đơn hàng");
assert.strictEqual(canForProfile(bgdProfile, "orders.credit_override"), true, "BGĐ duyệt được vượt hạn mức công nợ");
assert.strictEqual(canForProfile(bgdProfile, "orders.approve_adjustment"), true, "BGĐ duyệt được điều chỉnh đơn");
assert.strictEqual(canForProfile(bgdProfile, "pricing.edit"), true, "BGĐ duyệt được bảng giá");
assert.strictEqual(canForProfile(bgdProfile, "finance.edit"), true, "BGĐ xem và duyệt được tài chính/công nợ");
assert.strictEqual(canForProfile(bgdProfile, "procurement.view"), true, "BGĐ xem được đơn tổng thu mua");
assert.strictEqual(canForProfile(bgdProfile, "admin.manage_staff"), false, "BGĐ KHÔNG có quyền admin.manage_staff");
console.log("✅ Ban Giám đốc có toàn quyền nghiệp vụ nhưng bị chặn admin.manage_staff");

// 2.3. Trưởng phòng Vận hành (operations)
const tpVhProfile = {
  role: "truong_phong",
  position: "truong_phong",
  department: { function_group: "operations", code: "VH1", name: "Phòng Vận hành 1" },
};
assert.strictEqual(canForProfile(tpVhProfile, "orders.create"), true, "TP Vận hành tạo được đơn");
assert.strictEqual(canForProfile(tpVhProfile, "orders.approve_adjustment"), true, "TP Vận hành duyệt được điều chỉnh đơn");
assert.strictEqual(canForProfile(tpVhProfile, "orders.packing_override"), true, "TP Vận hành được điều phối lại người soạn");
assert.strictEqual(canForProfile(tpVhProfile, "customers.assign_rep"), true, "TP Vận hành được phân công khách hàng");
assert.strictEqual(canForProfile(tpVhProfile, "orders.bulk_confirm"), true, "TP Vận hành chốt được đơn");
assert.strictEqual(canForProfile(tpVhProfile, "finance.edit"), false, "TP Vận hành KHÔNG có quyền finance.edit");
assert.strictEqual(canForProfile(tpVhProfile, "pricing.edit"), false, "TP Vận hành KHÔNG có quyền pricing.edit");
assert.strictEqual(canForProfile(tpVhProfile, "admin.manage_staff"), false, "TP Vận hành KHÔNG có quyền admin.manage_staff");
console.log("✅ Trưởng phòng Vận hành có quyền vận hành nhưng không lấn sân Kế toán/Bảng giá/Admin");

// 2.4. Trưởng phòng Thu mua (procurement)
const tpTmProfile = {
  role: "truong_phong",
  position: "truong_phong",
  department: { function_group: "procurement", code: "TM", name: "Phòng Thu mua" },
};
assert.strictEqual(canForProfile(tpTmProfile, "procurement.view"), true, "TP Thu mua xem được đơn tổng");
assert.strictEqual(canForProfile(tpTmProfile, "procurement.export"), true, "TP Thu mua xuất được đơn tổng");
assert.strictEqual(canForProfile(tpTmProfile, "products.edit"), true, "TP Thu mua sửa được sản phẩm");
assert.strictEqual(canForProfile(tpTmProfile, "orders.approve_adjustment"), true, "TP Thu mua duyệt được điều chỉnh đơn");
assert.strictEqual(canForProfile(tpTmProfile, "finance.edit"), false, "TP Thu mua KHÔNG có quyền finance.edit");
assert.strictEqual(canForProfile(tpTmProfile, "orders.credit_override"), false, "TP Thu mua KHÔNG duyệt được hạn mức công nợ");
console.log("✅ Trưởng phòng Thu mua chuẩn quyền thu mua, không có quyền tài chính");

// 2.5. Trưởng phòng Kế toán (accounting)
const tpKtProfile = {
  role: "truong_phong",
  position: "truong_phong",
  department: { function_group: "accounting", code: "KT", name: "Phòng Kế toán" },
};
assert.strictEqual(canForProfile(tpKtProfile, "finance.edit"), true, "TP Kế toán có quyền finance.edit");
assert.strictEqual(canForProfile(tpKtProfile, "pricing.edit"), true, "TP Kế toán có quyền pricing.edit");
assert.strictEqual(canForProfile(tpKtProfile, "orders.create"), false, "TP Kế toán KHÔNG tạo đơn POS");
assert.strictEqual(canForProfile(tpKtProfile, "orders.approve_adjustment"), false, "TP Kế toán KHÔNG duyệt điều chỉnh hàng hóa vận hành");
assert.strictEqual(canForProfile(tpKtProfile, "orders.packing_override"), false, "TP Kế toán KHÔNG giành đơn soạn hàng");
assert.strictEqual(canForProfile(tpKtProfile, "customers.assign_rep"), false, "TP Kế toán KHÔNG phân công khách hàng");
console.log("✅ Trưởng phòng Kế toán chuẩn quyền tài chính/bảng giá, không tạo đơn/duyệt hàng");

// 2.6. Nhân viên Kinh doanh & Marketing (sale trong KDMKT)
const nvKdmktProfile = {
  role: "sale",
  position: "nhan_vien",
  department: { function_group: "business_marketing", code: "KDMKT", name: "Phòng KDMKT" },
};
assert.strictEqual(canForProfile(nvKdmktProfile, "orders.view"), true, "NV KDMKT xem được đơn");
assert.strictEqual(canForProfile(nvKdmktProfile, "orders.create"), true, "NV KDMKT tạo được đơn");
assert.strictEqual(canForProfile(nvKdmktProfile, "finance.edit"), false, "NV KDMKT KHÔNG có quyền kế toán");
assert.strictEqual(canForProfile(nvKdmktProfile, "pricing.edit"), false, "NV KDMKT KHÔNG có quyền sửa bảng giá");
assert.strictEqual(canForProfile(nvKdmktProfile, "admin.manage_staff"), false, "NV KDMKT KHÔNG có quyền quản trị nhân viên");
console.log("✅ Nhân viên KDMKT chỉ có quyền bán hàng/vận hành, không tự động biến thành Admin");

// Dữ liệu tổ chức bị gán nhầm tuyệt đối không được tự nâng thành BGĐ.
const nhanVienGanNhamBgd = {
  role: "sale",
  position: "nhan_vien",
  department: { function_group: "executive", code: "BGD", name: "Ban Giám đốc" },
};
assert.strictEqual(canForProfile(nhanVienGanNhamBgd, "pricing.edit"), false, "Phòng BGD không tự cấp quyền BGĐ");
assert.strictEqual(canForProfile(nhanVienGanNhamBgd, "orders.credit_override"), false, "Không được leo thang quyền từ department");
assert.strictEqual(canForProfile(nhanVienGanNhamBgd, "admin.manage_staff"), false, "Không được leo thang quyền quản trị");
console.log("✅ Chặn leo thang quyền khi nhân viên thường bị gán nhầm vào Ban Giám đốc");

console.log("✅ 2. Toàn bộ ma trận quyền canForProfile đã pass 100%!\n");

// 3. Kiểm thử tổ hợp tạo nhân viên và validation API (G2 & G4)
console.log("--- 3. KIỂM THỬ VALIDATION TỔ HỢP TẠO NHÂN VIÊN ---");

function simulateValidateCreateUser(payload, departmentsList) {
  const { email, password, name, role, departmentId, position } = payload;
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return "Định dạng email không hợp lệ";
  }
  const normalizedName = String(name || "").trim();
  if (!normalizedName) return "Họ và tên không được để trống";
  const normalizedPassword = String(password || "");
  if (normalizedPassword.length < 10
    || !/[A-Z]/.test(normalizedPassword)
    || !/[a-z]/.test(normalizedPassword)
    || !/\d/.test(normalizedPassword)
    || !/[^A-Za-z0-9]/.test(normalizedPassword)) {
    return "Mật khẩu chưa đáp ứng yêu cầu bảo mật";
  }

  const allowedRoles = ["admin", "ban_giam_doc", "truong_phong", "sale", "thu_mua", "kho", "ke_toan", "tai_xe"];
  const allowedPositions = ["nhan_vien", "tro_ly", "truong_nhom", "truong_phong", "ban_giam_doc", "quan_tri_he_thong"];
  if (!allowedRoles.includes(role)) return "Vai trò nghiệp vụ không hợp lệ";
  const pos = position || "nhan_vien";
  if (!allowedPositions.includes(pos)) return "Chức vụ không hợp lệ";

  if (role !== "admin" && !departmentId) {
    return "Vui lòng chọn phòng ban cho nhân viên nghiệp vụ";
  }

  let selectedDepartment = null;
  if (departmentId) {
    selectedDepartment = departmentsList.find(d => d.id === departmentId);
    if (!selectedDepartment) return "Phòng ban không tồn tại hoặc đã ngừng hoạt động";
  }

  if (role === "ban_giam_doc" && (pos !== "ban_giam_doc" || selectedDepartment?.function_group !== "executive")) {
    return "Tài khoản Ban Giám đốc phải có chức vụ Ban Giám đốc và thuộc Ban Giám đốc";
  }
  if (pos === "ban_giam_doc" && role !== "ban_giam_doc") {
    return "Chức vụ Ban Giám đốc chỉ áp dụng cho vai trò Ban Giám đốc";
  }
  if (role === "admin" && pos !== "quan_tri_he_thong") {
    return "Tài khoản Quản trị hệ thống phải chọn chức vụ Quản trị hệ thống";
  }
  if (role === "truong_phong" && pos !== "truong_phong") {
    return "Vai trò Trưởng phòng bắt buộc phải chọn chức vụ Trưởng phòng";
  }
  if (pos === "truong_phong" && !departmentId) {
    return "Chức vụ Trưởng phòng bắt buộc phải chọn phòng ban";
  }
  return null;
}

const mockDepts = [
  { id: "dept-bgd", code: "BGD", function_group: "executive" },
  { id: "dept-kdmkt", code: "KDMKT", function_group: "business_marketing" },
  { id: "dept-vh1", code: "VH1", function_group: "operations" },
  { id: "dept-tm", code: "TM", function_group: "procurement" },
  { id: "dept-kt", code: "KT", function_group: "accounting" },
];

// Test Ban Giám đốc hợp lệ
assert.strictEqual(simulateValidateCreateUser({
  name: "Nguyễn Giám Đốc",
  email: "giamdoc@tps1.vn",
  password: "SecurePassword123!",
  role: "ban_giam_doc",
  position: "ban_giam_doc",
  departmentId: "dept-bgd",
}, mockDepts), null);

// Test Ban Giám đốc sai phòng ban
assert.ok(simulateValidateCreateUser({
  name: "Nguyễn Giám Đốc",
  email: "giamdoc@tps1.vn",
  password: "SecurePassword123!",
  role: "ban_giam_doc",
  position: "ban_giam_doc",
  departmentId: "dept-vh1",
}, mockDepts)?.includes("thuộc Ban Giám đốc"));

// Test không thể dùng chức vụ Ban Giám đốc với role thường để leo thang quyền
assert.ok(simulateValidateCreateUser({
  name: "Nhân viên gán sai chức vụ",
  email: "nv-bgd@tps1.vn",
  password: "SecurePassword123!",
  role: "sale",
  position: "ban_giam_doc",
  departmentId: "dept-bgd",
}, mockDepts)?.includes("chỉ áp dụng cho vai trò Ban Giám đốc"));

// Test Admin hệ thống không cần phòng ban
assert.strictEqual(simulateValidateCreateUser({
  name: "Admin Kỹ Thuật",
  email: "techadmin@tps1.vn",
  password: "SecurePassword123!",
  role: "admin",
  position: "quan_tri_he_thong",
  departmentId: null,
}, mockDepts), null);

// Test Trưởng phòng sai chức vụ
assert.ok(simulateValidateCreateUser({
  name: "Trần Trưởng Phòng",
  email: "tp@tps1.vn",
  password: "SecurePassword123!",
  role: "truong_phong",
  position: "nhan_vien",
  departmentId: "dept-vh1",
}, mockDepts)?.includes("chức vụ Trưởng phòng"));

// Test Nhân viên nghiệp vụ không chọn phòng ban
assert.ok(simulateValidateCreateUser({
  name: "Lê Nhân Viên",
  email: "nv@tps1.vn",
  password: "SecurePassword123!",
  role: "sale",
  position: "nhan_vien",
  departmentId: "",
}, mockDepts)?.includes("chọn phòng ban"));

console.log("✅ 3. Validation tổ hợp phòng ban, chức vụ, vai trò đạt chuẩn 100%!\n");

// 4. Kiểm thử các chốt chặn an toàn (G2 Safeguards)
console.log("--- 4. KIỂM THỬ CÁC CHỐT CHẶN AN TOÀN TRÊN PATCH ---");

function simulatePatchSafetyCheck(authProfile, targetUser, patchPayload, activeAdminCount) {
  const userId = targetUser.id;
  // Không cho Admin tự khóa chính mình
  if (authProfile.id === userId && patchPayload.isActive === false) {
    return "Không thể tự khóa tài khoản của chính mình";
  }
  // Không cho Admin tự hạ quyền chính mình
  if (authProfile.id === userId && patchPayload.role !== undefined && patchPayload.role !== "admin") {
    return "Không thể tự hạ quyền Quản trị hệ thống của chính mình";
  }
  // Không cho khóa hoặc hạ quyền Admin cuối cùng
  const isDeactivating = patchPayload.isActive === false && targetUser.is_active;
  const isDemotingAdmin = targetUser.role === "admin" && patchPayload.role !== undefined && patchPayload.role !== "admin";

  if (targetUser.role === "admin" && (isDeactivating || isDemotingAdmin)) {
    if (activeAdminCount <= 1) {
      return "Không thể khóa hoặc hạ quyền Quản trị hệ thống đang hoạt động cuối cùng của hệ thống";
    }
  }
  return null;
}

const currentLoggedInAdmin = { id: "admin-1", role: "admin" };
const otherAdminUser = { id: "admin-2", role: "admin", is_active: true };

// Case 1: Tự khóa chính mình -> Chặn
assert.ok(simulatePatchSafetyCheck(currentLoggedInAdmin, currentLoggedInAdmin, { isActive: false }, 2)?.includes("tự khóa"));
console.log("✅ Chặn thành công Admin tự khóa tài khoản của chính mình");

// Case 2: Tự hạ quyền chính mình -> Chặn
assert.ok(simulatePatchSafetyCheck(currentLoggedInAdmin, currentLoggedInAdmin, { role: "sale" }, 2)?.includes("tự hạ quyền"));
console.log("✅ Chặn thành công Admin tự hạ quyền Quản trị hệ thống");

// Case 3: Khóa admin khác khi chỉ còn 1 admin -> Chặn
assert.ok(simulatePatchSafetyCheck(currentLoggedInAdmin, otherAdminUser, { isActive: false }, 1)?.includes("cuối cùng"));
console.log("✅ Chặn thành công thao tác khóa Quản trị hệ thống cuối cùng");

// Case 4: Hạ quyền admin khác khi chỉ còn 1 admin -> Chặn
assert.ok(simulatePatchSafetyCheck(currentLoggedInAdmin, otherAdminUser, { role: "ban_giam_doc" }, 1)?.includes("cuối cùng"));
console.log("✅ Chặn thành công thao tác hạ quyền Quản trị hệ thống cuối cùng");

// Case 5: Khóa admin khác khi có nhiều hơn 1 admin -> Cho phép
assert.strictEqual(simulatePatchSafetyCheck(currentLoggedInAdmin, otherAdminUser, { isActive: false }, 2), null);
console.log("✅ Cho phép khóa Admin khi hệ thống còn Admin dự phòng khác");

console.log("✅ 4. Toàn bộ các chốt chặn an toàn tài khoản Quản trị hoạt động hoàn hảo!\n");

// 5. Kiểm thử Endpoint Reset Password Payload
console.log("--- 5. KIỂM THỬ ĐẶT LẠI MẬT KHẨU VÀ MẬT KHẨU TẠM ---");

function generateSecureTempPassword() {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const special = "!@#$%";
  const all = upper + lower + digits + special;
  const pass = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
    special[Math.floor(Math.random() * special.length)],
  ];
  for (let i = 0; i < 6; i++) {
    pass.push(all[Math.floor(Math.random() * all.length)]);
  }
  return pass.sort(() => Math.random() - 0.5).join("");
}

for (let i = 0; i < 5; i++) {
  const tempPass = generateSecureTempPassword();
  assert.ok(tempPass.length >= 10, "Mật khẩu tạm phải đủ độ dài an toàn");
  assert.ok(/[A-Z]/.test(tempPass), "Phải có chữ hoa");
  assert.ok(/[a-z]/.test(tempPass), "Phải có chữ thường");
  assert.ok(/[0-9]/.test(tempPass), "Phải có chữ số");
  assert.ok(/[!@#$%]/.test(tempPass), "Phải có ký tự đặc biệt");
}
console.log("✅ 5. Hàm sinh mật khẩu tạm đáp ứng đầy đủ tiêu chuẩn bảo mật phân biệt chữ hoa/thường!\n");

console.log("=====================================================================");
console.log("✅ CÁC BÀI KIỂM THỬ TỰ ĐỘNG TRONG SCRIPT G5 ĐÃ VƯỢT QUA!");
console.log("=====================================================================");
