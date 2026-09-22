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
  'orders.bulk_confirm': ['admin', 'sale'],
  /** Sale/Văn phòng vận hành phân loại khách, chốt giá và chuyển Thu mua */
  'orders.finalize_pricing': ['admin', 'sale'],
  /** Sửa thông tin đơn trước khi chốt, bổ sung giá tham khảo/ghi chú */
  'orders.edit': ['admin', 'sale', 'thu_mua'],
  /** Duyệt đơn vượt hạn mức công nợ */
  'orders.credit_override': ['admin', 'truong_phong'],
  /** Xem/Cập nhật trạng thái soạn hàng (nhận/hoàn tất/trả đơn) */
  'orders.packing': ['admin', 'sale', 'thu_mua', 'kho'],

  // ─── Thu mua / Đơn tổng ─────────────────────────────────────────
  /** Xem màn đơn tổng, xuất Excel đơn tổng */
  'procurement.view': ['admin', 'truong_phong', 'sale', 'thu_mua', 'kho'],
  /** Xuất file Excel đơn tổng / tuyến */
  'procurement.export': ['admin', 'truong_phong', 'sale', 'thu_mua', 'kho'],

  // ─── Hàng hóa ───────────────────────────────────────────────────
  /** Xem danh sách hàng hóa */
  'products.view': ['admin', 'truong_phong', 'sale', 'thu_mua', 'kho', 'ke_toan'],
  /** Tạo sản phẩm mới */
  'products.create': ['admin', 'thu_mua', 'sale'],
  /** Sửa thông tin sản phẩm (giá, mô tả, danh mục…) */
  'products.edit': ['admin', 'thu_mua'],
  /** Nhập kho (tăng tồn kho qua inventory_transactions) */
  'products.stock_in': ['admin', 'thu_mua'],

  // ─── Bảng giá ───────────────────────────────────────────────────
  /** Áp giá hàng ngày / sửa bảng giá */
  'pricing.edit': ['admin', 'sale', 'thu_mua', 'ke_toan'],

  // ─── Khách hàng ─────────────────────────────────────────────────
  /** Xem danh sách khách hàng */
  'customers.view': ['admin', 'truong_phong', 'sale', 'thu_mua', 'ke_toan'],
  /** Tạo/sửa khách hàng, địa chỉ, xác thực tài khoản khách */
  'customers.edit': ['admin', 'sale'],

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
