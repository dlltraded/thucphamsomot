// ============================================================================
// Module: Nghiệp vụ Quản lý Công nợ TPS1 (Receivables Engine)
// Quy tắc nghiệp vụ chuẩn hóa cho toàn hệ thống:
//   - Mọi hóa đơn completed chưa thu đủ đều là khoản phải thu.
//   - Không lọc cứng payment_method=CREDIT.
//   - Completed + debt_amount > 0 phải xuất hiện.
//   - Hóa đơn COD chưa thu đủ xuất hiện với cảnh báo “COD chưa thu”.
//   - Công nợ đầu kỳ KiotViet được cộng vào tổng phải thu.
//   - Điều khoản khách hàng mặc định 30 ngày.
//   - Tuổi nợ và ngày đến hạn phân loại chính xác.
//   - Tuyệt đối không sử dụng hoặc hiển thị VIP / discount_tier.
// ============================================================================

export interface CustomerDebtInfo {
  id: string;
  partner_code: string;
  name: string;
  company?: string | null;
  phone?: string | null;
  tax_code?: string | null;
  address?: string | null;
  sales_rep_id?: string | null;
  sales_rep_name?: string | null;
  credit_limit: number;
  payment_terms_days: number;
  kiotviet_opening_debt?: number | null;
}

export interface InvoiceDebtItem {
  id: string;
  order_code: string;
  invoice_number?: string | null;
  customer_id: string;
  customer_name?: string | null;
  customer_company?: string | null;
  status: string;
  payment_method: string;
  payment_status: string;
  grand_total: number;
  paid_amount: number;
  debt_amount: number;
  return_credit_amount: number;
  effective_debt: number;
  created_at: string;
  completed_at?: string | null;
  delivery_date?: string | null;
  due_date: string;
  is_overdue: boolean;
  days_overdue: number;
  warning?: 'cod_uncollected' | null;
  warning_label?: string | null;
  aging_bucket: 'not_due' | 'days_1_30' | 'days_31_60' | 'days_61_90' | 'days_over_90';
}

export interface AgingSummary {
  notDue: number;
  days1_30: number;
  days31_60: number;
  days61_90: number;
  daysOver90: number;
}

export interface CustomerReceivablesSummary {
  customer: CustomerDebtInfo;
  totalReceivables: number;
  openingDebt: number;
  invoiceDebt: number;
  notDueDebt: number;
  overdueDebt: number;
  codUncollectedDebt: number;
  customerAdvance: number;
  openInvoiceCount: number;
  codUncollectedCount: number;
  overdueCount: number;
  creditLimit: number;
  remainingCreditLimit: number;
  isOverLimit: boolean;
  creditUsagePercent: number | null;
  oldestDueDate: string | null;
  aging: AgingSummary;
  invoices: InvoiceDebtItem[];
}

export interface GlobalReceivablesSummary {
  totalReceivables: number;
  openingDebtTotal: number;
  currentReceivables: number;
  overdueReceivables: number;
  codUncollected: number;
  customerAdvanceTotal: number;
  aging: AgingSummary;
  totalCustomersWithDebt: number;
  customers: CustomerReceivablesSummary[];
}

/**
 * Tính ngày đến hạn chuẩn hóa cho một hóa đơn:
 * Ưu tiên order.due_date nếu đã có.
 * Nếu chưa có, cộng payment_terms_days (mặc định 30 ngày) vào completed_at hoặc created_at.
 */
export function resolveOrderDueDate(
  order: { due_date?: string | null; completed_at?: string | null; created_at?: string | null },
  termsDays: number = 30
): string {
  if (order.due_date) return order.due_date;
  const baseDateStr = order.completed_at || order.created_at || new Date().toISOString();
  const baseDate = new Date(baseDateStr);
  const due = new Date(baseDate.getTime() + (termsDays || 30) * 24 * 60 * 60 * 1000);
  return due.toISOString();
}

/**
 * Phân loại tuổi nợ (aging bucket) dựa vào số ngày quá hạn
 */
export function classifyAging(daysOverdue: number, isOverdue: boolean): InvoiceDebtItem['aging_bucket'] {
  if (!isOverdue || daysOverdue <= 0) return 'not_due';
  if (daysOverdue <= 30) return 'days_1_30';
  if (daysOverdue <= 60) return 'days_31_60';
  if (daysOverdue <= 90) return 'days_61_90';
  return 'days_over_90';
}

/**
 * Chuẩn hóa một đơn hàng thành mục công nợ hóa đơn (InvoiceDebtItem).
 */
export function processOrderDebtItem(order: any, customerTermsDays: number = 30, referenceDate: Date = new Date()): InvoiceDebtItem {
  const grandTotal = Math.round(Number(order.grand_total) || 0);
  const paidAmount = Math.round(Number(order.paid_amount) || 0);
  const returnCreditAmount = Math.round(Number(order.return_credit_amount) || 0);

  // Nợ thực tế còn lại = grandTotal - paidAmount - returnCreditAmount
  const effectiveDebt = Math.max(0, grandTotal - paidAmount - returnCreditAmount);

  const dueDateStr = resolveOrderDueDate(order, customerTermsDays);
  const dueDate = new Date(dueDateStr);

  // So sánh ngày đến hạn với referenceDate
  const isOverdue = effectiveDebt > 0 && referenceDate.getTime() > dueDate.getTime();
  let daysOverdue = 0;
  if (isOverdue) {
    const diffMs = referenceDate.getTime() - dueDate.getTime();
    daysOverdue = Math.max(1, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
  }

  const paymentMethod = String(order.payment_method || 'CREDIT').toUpperCase();
  const isCod = paymentMethod === 'COD';
  const warning = (isCod && effectiveDebt > 0) ? 'cod_uncollected' : null;
  const warningLabel = warning === 'cod_uncollected' ? 'COD chưa thu' : null;

  const agingBucket = classifyAging(daysOverdue, isOverdue);

  return {
    id: order.id,
    order_code: order.order_code,
    invoice_number: order.invoice_number || null,
    customer_id: order.customer_id,
    customer_name: order.customer_name || null,
    customer_company: order.customer_company || null,
    status: order.status,
    payment_method: paymentMethod,
    payment_status: order.payment_status || 'pending',
    grand_total: grandTotal,
    paid_amount: paidAmount,
    debt_amount: Math.max(0, grandTotal - paidAmount),
    return_credit_amount: returnCreditAmount,
    effective_debt: effectiveDebt,
    created_at: order.created_at,
    completed_at: order.completed_at || null,
    delivery_date: order.delivery_date || null,
    due_date: dueDateStr,
    is_overdue: isOverdue,
    days_overdue: daysOverdue,
    warning,
    warning_label: warningLabel,
    aging_bucket: agingBucket,
  };
}

/**
 * HÀM TÍNH TOÁN CÔNG NỢ DÙNG CHUNG (CANONICAL RECEIVABLES CALCULATION)
 * Được dùng đồng nhất giữa:
 *   - /api/admin/receivables/summary
 *   - /api/admin/receivables/customers/[id]
 *   - /api/admin/receivables/statement
 *   - Dashboard tổng quan hệ thống
 * Đảm bảo 100% dữ liệu đồng bộ và chính xác.
 */
export function calculateReceivablesSummary(params: {
  customers: CustomerDebtInfo[];
  orders: any[];
  adjustments?: any[];
  receipts?: any[];
  referenceDate?: Date;
}): GlobalReceivablesSummary {
  const refDate = params.referenceDate || new Date();

  // Gom orders theo customer_id
  const ordersByCustomer = new Map<string, any[]>();
  for (const o of params.orders || []) {
    if (!o.customer_id) continue;
    // Chỉ tính hóa đơn completed (không tính draft, pending, confirmed, preparing, shipping, canceled, merged)
    if (o.status !== 'completed') continue;
    const list = ordersByCustomer.get(o.customer_id) || [];
    list.push(o);
    ordersByCustomer.set(o.customer_id, list);
  }

  // Gom adjustments theo customer_id (ví dụ số dư đầu kỳ hoặc điều chỉnh nợ)
  const adjustmentsByCustomer = new Map<string, any[]>();
  for (const a of params.adjustments || []) {
    if (!a.customer_id) continue;
    const list = adjustmentsByCustomer.get(a.customer_id) || [];
    list.push(a);
    adjustmentsByCustomer.set(a.customer_id, list);
  }

  // Gom unallocated receipts theo customer_id (tiền khách trả trước từ phiếu thu)
  // và gom tổng phân bổ nợ đầu kỳ từ các phiếu thu posted (chưa bị đảo)
  const unallocatedReceiptsByCustomer = new Map<string, number>();
  const allocatedOpeningDebtByCustomer = new Map<string, number>();

  for (const r of params.receipts || []) {
    if (!r.customer_id || r.status === 'reversed' || r.original_receipt_id || r.receipt_number?.startsWith('PT-DAO-')) {
      continue;
    }
    const unalloc = Math.round(Number(r.unallocated_amount) || 0);
    if (unalloc > 0) {
      const cur = unallocatedReceiptsByCustomer.get(r.customer_id) || 0;
      unallocatedReceiptsByCustomer.set(r.customer_id, cur + unalloc);
    }

    for (const al of r.receipt_allocations || []) {
      if (al.allocation_type === 'opening_debt') {
        const curAlloc = allocatedOpeningDebtByCustomer.get(r.customer_id) || 0;
        allocatedOpeningDebtByCustomer.set(r.customer_id, curAlloc + (Math.round(Number(al.amount)) || 0));
      }
    }
  }

  const customerSummaries: CustomerReceivablesSummary[] = [];

  for (const cust of params.customers) {
    const rawOrders = ordersByCustomer.get(cust.id) || [];
    const termsDays = (cust.payment_terms_days && cust.payment_terms_days > 0) ? cust.payment_terms_days : 30;

    // Tính từng hóa đơn nợ
    const invoiceItems: InvoiceDebtItem[] = rawOrders
      .map((o) => processOrderDebtItem(o, termsDays, refDate))
      .filter((item) => item.effective_debt > 0);

    // Tính số dư đầu kỳ KiotViet chính xác (chống double-counting):
    // Ưu tiên lấy từ receivable_adjustments nếu có.
    // Nếu chưa có adjustment riêng mà lấy từ cust.kiotviet_opening_debt, phải trừ đi phần đã cấn trừ qua các phiếu thu posted.
    const custAdjs = adjustmentsByCustomer.get(cust.id) || [];
    const openingAdj = custAdjs.find((a) => a.adjustment_type === 'opening_balance');
    const allocatedOpeningDebt = allocatedOpeningDebtByCustomer.get(cust.id) || 0;

    let positiveOpeningDebt = 0;
    let negativeOpeningDebt = 0;

    if (openingAdj != null && openingAdj.remaining_amount != null) {
      const rem = Math.round(Number(openingAdj.remaining_amount) || 0);
      if (rem >= 0) positiveOpeningDebt = rem;
      else negativeOpeningDebt = Math.abs(rem);
    } else {
      const initialDebt = Math.round(Number(cust.kiotviet_opening_debt) || 0);
      if (initialDebt > 0) {
        positiveOpeningDebt = Math.max(0, initialDebt - allocatedOpeningDebt);
      } else if (initialDebt < 0) {
        negativeOpeningDebt = Math.abs(initialDebt);
      }
    }

    // Tiền khách trả trước (Customer Advance / Số dư có):
    // Gồm: số dư âm đầu kỳ + tiền thừa từ các phiếu thu (unallocated)
    const unallocatedReceipts = unallocatedReceiptsByCustomer.get(cust.id) || 0;
    const totalCustomerAdvance = negativeOpeningDebt + unallocatedReceipts;

    // Tổng nợ hóa đơn
    const totalInvoiceDebt = invoiceItems.reduce((sum, item) => sum + item.effective_debt, 0);

    // Tổng phải thu = Nợ hóa đơn + Nợ đầu kỳ dương còn lại
    const totalReceivables = totalInvoiceDebt + positiveOpeningDebt;

    // Phân loại nợ hóa đơn: Chưa đến hạn, Đã quá hạn, COD chưa thu
    let notDueDebt = 0;
    let overdueDebt = 0;
    let codUncollectedDebt = 0;
    let codUncollectedCount = 0;
    let overdueCount = 0;
    let oldestDueDate: string | null = null;

    const aging: AgingSummary = {
      notDue: 0,
      days1_30: 0,
      days31_60: 0,
      days61_90: 0,
      daysOver90: 0,
    };

    // Nếu có nợ đầu kỳ chưa cấn trừ -> xếp vào quá hạn lâu nhất (>90 ngày)
    if (positiveOpeningDebt > 0) {
      aging.daysOver90 += positiveOpeningDebt;
      overdueDebt += positiveOpeningDebt;
    }

    for (const item of invoiceItems) {
      if (item.warning === 'cod_uncollected') {
        codUncollectedDebt += item.effective_debt;
        codUncollectedCount += 1;
      }

      if (item.is_overdue) {
        overdueDebt += item.effective_debt;
        overdueCount += 1;
      } else {
        notDueDebt += item.effective_debt;
      }

      // Tuổi nợ
      switch (item.aging_bucket) {
        case 'not_due':
          aging.notDue += item.effective_debt;
          break;
        case 'days_1_30':
          aging.days1_30 += item.effective_debt;
          break;
        case 'days_31_60':
          aging.days31_60 += item.effective_debt;
          break;
        case 'days_61_90':
          aging.days61_90 += item.effective_debt;
          break;
        case 'days_over_90':
          aging.daysOver90 += item.effective_debt;
          break;
      }

      if (!oldestDueDate || new Date(item.due_date).getTime() < new Date(oldestDueDate).getTime()) {
        oldestDueDate = item.due_date;
      }
    }

    const creditLimit = Math.round(Number(cust.credit_limit) || 0);
    const isOverLimit = creditLimit > 0 && totalReceivables > creditLimit;
    const remainingCreditLimit = creditLimit > 0 ? Math.max(0, creditLimit - totalReceivables) : creditLimit;
    const creditUsagePercent = creditLimit > 0 ? Math.round((totalReceivables / creditLimit) * 100) : null;

    // Sắp xếp hóa đơn: quá hạn lâu nhất lên đầu, tiếp đến đến hạn sớm nhất
    invoiceItems.sort((a, b) => {
      if (a.is_overdue && !b.is_overdue) return -1;
      if (!a.is_overdue && b.is_overdue) return 1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });

    customerSummaries.push({
      customer: cust,
      totalReceivables,
      openingDebt: positiveOpeningDebt,
      invoiceDebt: totalInvoiceDebt,
      notDueDebt,
      overdueDebt,
      codUncollectedDebt,
      customerAdvance: totalCustomerAdvance,
      openInvoiceCount: invoiceItems.length,
      codUncollectedCount,
      overdueCount,
      creditLimit,
      remainingCreditLimit,
      isOverLimit,
      creditUsagePercent,
      oldestDueDate,
      aging,
      invoices: invoiceItems,
    });
  }

  // Sắp xếp khách hàng: tổng nợ giảm dần
  customerSummaries.sort((a, b) => b.totalReceivables - a.totalReceivables);

  // Tính tổng toàn hệ thống
  const globalSummary: GlobalReceivablesSummary = {
    totalReceivables: customerSummaries.reduce((sum, c) => sum + c.totalReceivables, 0),
    openingDebtTotal: customerSummaries.reduce((sum, c) => sum + c.openingDebt, 0),
    currentReceivables: customerSummaries.reduce((sum, c) => sum + c.notDueDebt, 0),
    overdueReceivables: customerSummaries.reduce((sum, c) => sum + c.overdueDebt, 0),
    codUncollected: customerSummaries.reduce((sum, c) => sum + c.codUncollectedDebt, 0),
    customerAdvanceTotal: customerSummaries.reduce((sum, c) => sum + c.customerAdvance, 0),
    aging: {
      notDue: customerSummaries.reduce((sum, c) => sum + c.aging.notDue, 0),
      days1_30: customerSummaries.reduce((sum, c) => sum + c.aging.days1_30, 0),
      days31_60: customerSummaries.reduce((sum, c) => sum + c.aging.days31_60, 0),
      days61_90: customerSummaries.reduce((sum, c) => sum + c.aging.days61_90, 0),
      daysOver90: customerSummaries.reduce((sum, c) => sum + c.aging.daysOver90, 0),
    },
    totalCustomersWithDebt: customerSummaries.filter((c) => c.totalReceivables > 0).length,
    customers: customerSummaries,
  };

  return globalSummary;
}

/**
 * Đề xuất phân bổ thanh toán tự động theo nguyên tắc FIFO:
 *   1. Nợ đầu kỳ KiotViet trước.
 *   2. Hóa đơn quá hạn lâu nhất.
 *   3. Hóa đơn đến hạn sớm nhất.
 *   4. Tiền thừa trở thành số dư có (unallocated_amount).
 */
export function proposeFifoAllocation(params: {
  amount: number;
  openingDebt: number;
  openingAdjustmentId?: string | null;
  invoices: InvoiceDebtItem[];
}): {
  allocations: {
    allocationType: 'opening_debt' | 'order';
    orderId?: string;
    adjustmentId?: string;
    orderCode?: string;
    amount: number;
    debtRemainingBefore: number;
  }[];
  totalAllocated: number;
  unallocatedAmount: number;
} {
  let remainingPayment = Math.max(0, Math.round(params.amount));
  const allocations: {
    allocationType: 'opening_debt' | 'order';
    orderId?: string;
    adjustmentId?: string;
    orderCode?: string;
    amount: number;
    debtRemainingBefore: number;
  }[] = [];

  // 1. Cấn trừ nợ đầu kỳ trước nếu có
  if (params.openingDebt > 0 && remainingPayment > 0) {
    const allocOpening = Math.min(params.openingDebt, remainingPayment);
    if (allocOpening > 0) {
      allocations.push({
        allocationType: 'opening_debt',
        adjustmentId: params.openingAdjustmentId || undefined,
        amount: allocOpening,
        debtRemainingBefore: params.openingDebt,
      });
      remainingPayment -= allocOpening;
    }
  }

  // 2. Sắp xếp hóa đơn: quá hạn lâu nhất -> đến hạn sớm nhất
  const sortedInvoices = [...(params.invoices || [])].filter((inv) => inv.effective_debt > 0);
  sortedInvoices.sort((a, b) => {
    if (a.is_overdue && !b.is_overdue) return -1;
    if (!a.is_overdue && b.is_overdue) return 1;
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });

  // 3. Phân bổ lần lượt cho từng hóa đơn
  for (const inv of sortedInvoices) {
    if (remainingPayment <= 0) break;
    const alloc = Math.min(inv.effective_debt, remainingPayment);
    if (alloc > 0) {
      allocations.push({
        allocationType: 'order',
        orderId: inv.id,
        orderCode: inv.order_code,
        amount: alloc,
        debtRemainingBefore: inv.effective_debt,
      });
      remainingPayment -= alloc;
    }
  }

  const totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0);
  const unallocatedAmount = Math.max(0, Math.round(params.amount) - totalAllocated);

  return {
    allocations,
    totalAllocated,
    unallocatedAmount,
  };
}
