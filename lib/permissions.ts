/**
 * Nguồn sự thật duy nhất cho phân quyền Phase 1.
 * Giữ đồng bộ với sale-webapp/src/lib/permissions.ts (yêu cầu 2026-09-20).
 *
 * Cách dùng phía server (API route):
 *   import { can } from '@/lib/permissions';
 *   if (!can(auth.profile.role, 'orders.bulk_confirm')) return json({...}, 403);
 */

export type Role =
  | 'admin'
  | 'truong_phong'
  | 'sale'
  | 'thu_mua'
  | 'kho'
  | 'ke_toan'
  | 'tai_xe';

/** Nhãn hiển thị cho từng role — dùng trong UI và thông báo lỗi. */
export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Quản trị / BGĐ',
  truong_phong: 'Trưởng phòng',
  sale: 'NV Vận hành',
  thu_mua: 'Thu mua',
  kho: 'Kho / Soạn hàng',
  ke_toan: 'Kế toán',
  tai_xe: 'Tài xế',
};

/**
 * Ma trận quyền — mỗi key là 1 permission, value là danh sách role được phép.
 * Thêm permission mới ở đây, không rải Set([...]) rải rác trong các route.
 */
const PERMISSIONS: Record<string, Role[]> = {
  // ─── Đơn hàng ───────────────────────────────────────────────────
  /** Xem danh sách đơn hàng (mọi đơn) */
  'orders.view': ['admin', 'truong_phong', 'sale', 'thu_mua', 'kho', 'ke_toan'],
  /** Tạo đơn hàng mới (POS) */
  'orders.create': ['admin', 'truong_phong', 'sale'],
  /** Xác nhận/chốt đơn hàng hàng loạt của phòng Vận hành */
  'orders.bulk_confirm': ['admin', 'truong_phong', 'sale'],
  /** Sale/Văn phòng vận hành phân loại khách, chốt giá và chuyển Thu mua */
  'orders.finalize_pricing': ['admin', 'truong_phong', 'sale'],
  /** Sửa thông tin đơn trước khi chốt, bổ sung giá tham khảo/ghi chú */
  'orders.edit': ['admin', 'truong_phong', 'sale', 'thu_mua'],
  /** Duyệt yêu cầu điều chỉnh sau khi đơn đã xác nhận */
  'orders.approve_adjustment': ['admin', 'truong_phong'],
  /** Duyệt đơn vượt hạn mức công nợ */
  'orders.credit_override': ['admin'],
  /** Xem/Cập nhật trạng thái soạn hàng (nhận/hoàn tất/trả đơn) */
  'orders.packing': ['admin', 'truong_phong', 'sale', 'thu_mua', 'kho'],
  /** Gộp đơn hàng đủ điều kiện trước xác nhận */
  'orders.merge': ['admin', 'truong_phong', 'sale'],
  /** Gộp/điều chỉnh đơn hàng đã xác nhận hoặc đã khóa */
  'orders.merge_locked': ['admin', 'truong_phong'],
  /** Xuất danh sách, phiếu tạm, chi tiết đơn */
  'orders.export': ['admin', 'truong_phong', 'sale', 'thu_mua', 'kho', 'ke_toan'],
  /** Xuất phiếu giao hàng, danh sách giao theo xe/tuyến */
  'orders.export_delivery': ['admin', 'truong_phong', 'sale', 'kho', 'tai_xe'],
  /** Xuất hóa đơn bán hàng, báo cáo công nợ */
  'orders.export_invoice': ['admin', 'truong_phong', 'ke_toan'],
  'orders.returns': ['admin', 'truong_phong', 'ke_toan'],

  // ─── Thu mua / Đơn tổng ─────────────────────────────────────────
  /** Xem màn đơn tổng, xuất Excel đơn tổng */
  'procurement.view': ['admin', 'truong_phong', 'sale', 'thu_mua', 'kho'],
  /** Xuất file Excel đơn tổng / tuyến */
  'procurement.export': ['admin', 'truong_phong', 'sale', 'thu_mua', 'kho'],

  // ─── Thu mua Kiểm tra hàng ──────────────────────────────────────
  /** Xem danh sách/chi tiết kiểm tra hàng */
  'procurement.review_view': ['admin', 'truong_phong', 'sale', 'thu_mua', 'kho'],
  /** Vận hành gửi yêu cầu Thu mua kiểm tra */
  'procurement.review_request': ['admin', 'truong_phong', 'sale'],
  /** Nhân viên Thu mua tiếp nhận yêu cầu */
  'procurement.review_claim': ['admin', 'truong_phong', 'thu_mua'],
  /** Thu mua lưu nháp / gửi kết quả kiểm tra cho Vận hành */
  'procurement.review_submit': ['admin', 'truong_phong', 'thu_mua'],
  /** Vận hành chấp nhận kết quả hoặc yêu cầu kiểm tra lại */
  'procurement.review_accept': ['admin', 'truong_phong', 'sale'],

  // ─── Soạn hàng & Ngoại lệ ───────────────────────────────────────
  /** Xem danh sách soạn hàng */
  'picking.view': ['admin', 'truong_phong', 'sale', 'thu_mua', 'kho'],
  /** Nhận tác vụ soạn hàng */
  'picking.claim': ['admin', 'truong_phong', 'thu_mua', 'kho'],
  /** Cập nhật số lượng thực soạn / hoàn tất soạn */
  'picking.update': ['admin', 'truong_phong', 'thu_mua', 'kho'],
  /** Báo cáo ngoại lệ khi soạn hàng */
  'picking.exception': ['admin', 'truong_phong', 'thu_mua', 'kho'],
  /** Vận hành giải quyết / duyệt ngoại lệ soạn hàng */
  'picking.exception_resolve': ['admin', 'truong_phong', 'sale'],

  // ─── Hàng hóa ───────────────────────────────────────────────────
  /** Xem danh sách hàng hóa */
  'products.view': ['admin', 'truong_phong', 'sale', 'thu_mua', 'kho', 'ke_toan'],
  /** Tạo sản phẩm mới */
  'products.create': ['admin', 'truong_phong', 'sale', 'thu_mua', 'ke_toan'],
  /** Sửa thông tin sản phẩm (giá, mô tả, danh mục…) */
  'products.edit': ['admin', 'truong_phong', 'thu_mua', 'ke_toan'],
  /** Nhập kho (tăng tồn kho qua inventory_transactions) */
  'products.stock_in': ['admin', 'thu_mua'],

  // ─── Bảng giá ───────────────────────────────────────────────────
  /** Áp giá hàng ngày / sửa bảng giá */
  'pricing.view': ['admin', 'truong_phong', 'sale', 'thu_mua', 'kho', 'ke_toan'],
  'pricing.edit': ['admin', 'ke_toan'],

  // ─── Khách hàng ─────────────────────────────────────────────────
  /** Xem danh sách khách hàng */
  'customers.view': ['admin', 'truong_phong', 'sale', 'thu_mua', 'ke_toan'],
  /** Tạo/sửa khách hàng, địa chỉ, xác thực tài khoản khách */
  'customers.edit': ['admin', 'truong_phong', 'sale'],

  // ─── Công nợ / Thanh toán ───────────────────────────────────────
  /** Xem công nợ */
  'finance.view': ['admin', 'truong_phong', 'sale', 'ke_toan'],
  /** Ghi nhận thanh toán, xuất hóa đơn, báo cáo */
  'finance.edit': ['admin', 'ke_toan'],

  // ─── Báo cáo ────────────────────────────────────────────────────
  /** Xem báo cáo doanh thu */
  'reports.view': ['admin', 'truong_phong', 'sale', 'ke_toan'],

  // ─── Quản trị hệ thống ──────────────────────────────────────────
  /** Quản lý tài khoản nhân viên (tạo/sửa/vô hiệu hóa) */
  'admin.manage_staff': ['admin'],
};

/**
 * Kiểm tra xem `role` có quyền `perm` không.
 * Dùng cả phía server (API route) và phía client (SaleLayout, route guard).
 */
export function can(role: string | undefined | null, perm: string): boolean {
  if (!role) return false;
  const allowed = PERMISSIONS[perm];
  if (!allowed) return false;
  return (allowed as string[]).includes(role);
}

export type StaffPermissionProfile = {
  role?: string | null;
  position?: string | null;
  department?: { function_group?: string | null } | { function_group?: string | null }[] | null;
  departments?: { function_group?: string | null } | { function_group?: string | null }[] | null;
};

/**
 * Kiểm tra quyền theo hồ sơ đầy đủ. Nhân viên dùng role nghiệp vụ; Trưởng
 * phòng kế thừa quyền cao nhất của đúng function_group mình phụ trách.
 * Giữ `can(role, perm)` để tương thích các màn cũ trong lúc chuyển đổi.
 */
export function canForProfile(profile: StaffPermissionProfile | null | undefined, perm: string): boolean {
  if (!profile) return false;
  if (profile.role === 'admin') return can('admin', perm);

  const rawDepartment = profile.department ?? profile.departments;
  const department = Array.isArray(rawDepartment) ? rawDepartment[0] : rawDepartment;
  const group = department?.function_group || null;
  if (profile.position === 'truong_phong' && group) {
    if (perm === 'orders.approve_adjustment') {
      return group === 'operations' || group === 'procurement';
    }
    const inheritedRole = group === 'operations' ? 'sale' : group === 'procurement' ? 'thu_mua' : 'ke_toan';
    return can(inheritedRole, perm);
  }

  // Tài khoản Trưởng phòng cũ chưa gán department vẫn dùng role legacy.
  return can(profile.role, perm);
}
