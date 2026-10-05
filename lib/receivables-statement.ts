// ============================================================================
// Module: Receivables Statement Ledger & Reconciliation Data Engine
// Lập bảng đối chiếu công nợ chi tiết theo kỳ [from, to]
// ============================================================================

import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";
import { getCustomerReceipts, getCustomerAdjustments } from "@/lib/receivables-db";

export interface StatementLedgerRow {
  stt: number;
  date: string;
  type: 'opening' | 'invoice' | 'receipt' | 'reversal' | 'return' | 'adjustment';
  typeLabel: string;
  documentNumber: string;
  referenceNumber?: string | null;
  description: string;
  dueDate?: string | null;
  daysOverdue?: number;
  isOverdue?: boolean;
  debit: number; // Phát sinh tăng (Nợ)
  credit: number; // Phát sinh giảm (Có)
  runningBalance: number; // Số dư nợ lũy kế
}

export interface StatementData {
  company: {
    name: string;
    brand: string;
    taxCode: string;
    address: string;
    hotline: string;
    email: string;
  };
  customer: {
    id: string;
    partnerCode: string;
    name: string;
    company?: string | null;
    taxCode?: string | null;
    phone?: string | null;
    address?: string | null;
    salesRepName?: string | null;
    paymentTermsDays: number;
    creditLimit: number;
  };
  period: {
    from: string;
    to: string;
    fromDateStr: string;
    toDateStr: string;
  };
  summary: {
    openingBalance: number;
    totalDebit: number;
    totalCredit: number;
    closingBalance: number;
    closingOverdue: number;
    closingNotDue: number;
  };
  rows: StatementLedgerRow[];
}

export async function generateCustomerStatement(params: {
  customerId: string;
  from?: string;
  to?: string;
  referenceDate?: Date;
}): Promise<StatementData> {
  const supabase = getCustomerSupabaseAdmin();
  const refDate = params.referenceDate || new Date();

  // 1. Lấy thông tin khách hàng (kèm payment_terms_days an toàn)
  let custRaw: any = null;
  const { data: c1, error: e1 } = await supabase
    .from("vip_accounts")
    .select("id, partner_code, name, company, phone, tax_code, address, credit_limit, sales_rep_id, kiotviet_opening_debt, payment_terms_days")
    .eq("id", params.customerId)
    .maybeSingle();

  if (e1 && /payment_terms_days|schema cache/i.test(e1.message)) {
    const { data: c2, error: e2 } = await supabase
      .from("vip_accounts")
      .select("id, partner_code, name, company, phone, tax_code, address, credit_limit, sales_rep_id, kiotviet_opening_debt")
      .eq("id", params.customerId)
      .single();
    if (e2 || !c2) throw new Error("Không tìm thấy khách hàng");
    custRaw = c2;
  } else {
    if (e1 || !c1) throw new Error("Không tìm thấy khách hàng");
    custRaw = c1;
  }

  let salesRepName = null;
  if (custRaw.sales_rep_id) {
    const { data: rep } = await supabase.from("admin_profiles").select("name").eq("id", custRaw.sales_rep_id).maybeSingle();
    salesRepName = rep?.name || null;
  }

  const termsDays = (custRaw.payment_terms_days && custRaw.payment_terms_days > 0) ? custRaw.payment_terms_days : 30;

  // 2. Xác định mốc thời gian kỳ đối chiếu
  const fromIso = params.from ? new Date(params.from).toISOString() : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const toIso = params.to ? new Date(params.to).toISOString() : new Date().toISOString();

  const fromDate = new Date(fromIso);
  const toDate = new Date(toIso);

  // 3. Lấy dữ liệu lịch sử hóa đơn hoàn thành (kèm due_date an toàn)
  let allOrders: any[] = [];
  const { data: o1, error: eo1 } = await supabase
    .from("orders")
    .select("id, order_code, invoice_number, status, payment_method, grand_total, paid_amount, return_credit_amount, completed_at, created_at, due_date")
    .eq("customer_id", params.customerId)
    .eq("status", "completed");

  if (eo1 && /due_date|schema cache/i.test(eo1.message)) {
    const { data: o2 } = await supabase
      .from("orders")
      .select("id, order_code, invoice_number, status, payment_method, grand_total, paid_amount, return_credit_amount, completed_at, created_at")
      .eq("customer_id", params.customerId)
      .eq("status", "completed");
    allOrders = o2 || [];
  } else {
    allOrders = o1 || [];
  }

  const receipts = await getCustomerReceipts(params.customerId);
  const adjustments = await getCustomerAdjustments(params.customerId);

  // Lấy thêm sales_returns nếu có
  let salesReturns: any[] = [];
  try {
    const { data: sr } = await supabase
      .from("sales_returns")
      .select("id, return_number, invoice_number, total_amount, receivable_reduction_amount, customer_credit_amount, created_at, reason")
      .eq("customer_id", params.customerId)
      .eq("status", "confirmed");
    if (sr) salesReturns = sr;
  } catch {
    // Không lỗi nếu bảng chưa có
  }

  // 4. Tính số dư đầu kỳ (tại thời điểm fromDate)
  // Bắt đầu từ số dư KiotViet ban đầu
  let openingBalance = Math.round(Number(custRaw.kiotviet_opening_debt) || 0);

  // Cộng hóa đơn hoàn thành trước fromDate
  for (const o of allOrders || []) {
    const orderDate = new Date(o.completed_at || o.created_at);
    if (orderDate.getTime() < fromDate.getTime()) {
      openingBalance += Math.round(Number(o.grand_total) || 0);
    }
  }

  // Trừ giá trị trả hàng trước fromDate
  for (const ret of salesReturns) {
    const retDate = new Date(ret.created_at);
    if (retDate.getTime() < fromDate.getTime()) {
      openingBalance -= Math.round(Number(ret.receivable_reduction_amount || ret.total_amount) || 0);
    }
  }

  // 5. Gom các phát sinh TRONG KỲ [fromDate, toDate] & tính tác động của phiếu thu/đảo vào đầu kỳ
  interface EventItem {
    date: Date;
    type: 'invoice' | 'receipt' | 'reversal' | 'return';
    typeLabel: string;
    documentNumber: string;
    referenceNumber?: string | null;
    description: string;
    dueDate?: string | null;
    debit: number;
    credit: number;
  }

  const events: EventItem[] = [];

  // Hóa đơn trong kỳ
  for (const o of allOrders || []) {
    const orderDate = new Date(o.completed_at || o.created_at);
    if (orderDate.getTime() >= fromDate.getTime() && orderDate.getTime() <= toDate.getTime()) {
      const grandTotal = Math.round(Number(o.grand_total) || 0);
      const dueDateStr = o.due_date || new Date(orderDate.getTime() + termsDays * 24 * 60 * 60 * 1000).toISOString();

      events.push({
        date: orderDate,
        type: 'invoice',
        typeLabel: 'Hóa đơn bán hàng',
        documentNumber: o.order_code,
        referenceNumber: o.invoice_number || null,
        description: `Hóa đơn bán hàng ${o.order_code}${o.payment_method ? ` (${o.payment_method})` : ''}`,
        dueDate: dueDateStr,
        debit: grandTotal,
        credit: 0,
      });
    }
  }

  // Hạch toán phiếu thu và phiếu đảo (Chuẩn mực kế toán VAS - đối soát đối xứng)
  // Chỉ duyệt qua phiếu thu gốc để tránh nhân đôi chứng từ đảo
  const baseReceipts = (receipts || []).filter(
    (r: any) => !r.original_receipt_id && !r.receipt_number?.startsWith('PT-DAO-')
  );

  for (const r of baseReceipts) {
    const amount = Math.round(Number(r.amount) || 0);
    if (amount <= 0) continue;
    const rDate = new Date(r.created_at || r.receipt_date);
    const methodLabel = r.payment_method === 'cash' ? 'Tiền mặt' : 'Chuyển khoản';

    if (r.status === 'posted') {
      // Phiếu thu hợp lệ
      if (rDate.getTime() < fromDate.getTime()) {
        openingBalance -= amount;
      } else if (rDate.getTime() <= toDate.getTime()) {
        events.push({
          date: rDate,
          type: 'receipt',
          typeLabel: 'Phiếu thu',
          documentNumber: r.receipt_number,
          referenceNumber: r.reference_code || null,
          description: `Thu tiền (${methodLabel})${r.note ? `: ${r.note}` : ''}`,
          debit: 0,
          credit: amount,
        });
      }
    } else if (r.status === 'reversed') {
      // Phiếu thu đã bị đảo
      const revDate = new Date(r.reversed_at || r.updated_at || rDate);

      // Trường hợp 1: Cả thu và đảo đều diễn ra trước kỳ -> Triệt tiêu hoàn toàn
      if (rDate.getTime() < fromDate.getTime() && revDate.getTime() < fromDate.getTime()) {
        // -amount + amount = 0, openingBalance giữ nguyên
      }
      // Trường hợp 2: Thu tiền trước kỳ, nhưng đảo tiền TRONG KỲ
      else if (rDate.getTime() < fromDate.getTime() && revDate.getTime() >= fromDate.getTime() && revDate.getTime() <= toDate.getTime()) {
        openingBalance -= amount;
        events.push({
          date: revDate,
          type: 'reversal',
          typeLabel: 'Phiếu đảo',
          documentNumber: `PT-DAO-${r.receipt_number}`,
          referenceNumber: r.reference_code || null,
          description: `Đảo phiếu thu ${r.receipt_number}: ${r.reversal_reason || r.note || 'Hủy do nhập sai'}`,
          debit: amount,
          credit: 0,
        });
      }
      // Trường hợp 3: Cả thu tiền và đảo tiền đều diễn ra TRONG KỲ
      else if (rDate.getTime() >= fromDate.getTime() && rDate.getTime() <= toDate.getTime()) {
        events.push({
          date: rDate,
          type: 'receipt',
          typeLabel: 'Phiếu thu (Đã đảo)',
          documentNumber: r.receipt_number,
          referenceNumber: r.reference_code || null,
          description: `Thu tiền (${methodLabel}) (Đã bị đảo)${r.note ? `: ${r.note}` : ''}`,
          debit: 0,
          credit: amount,
        });

        if (revDate.getTime() <= toDate.getTime()) {
          events.push({
            date: revDate,
            type: 'reversal',
            typeLabel: 'Phiếu đảo',
            documentNumber: `PT-DAO-${r.receipt_number}`,
            referenceNumber: r.reference_code || null,
            description: `Đảo phiếu thu ${r.receipt_number}: ${r.reversal_reason || r.note || 'Hủy do nhập sai'}`,
            debit: amount,
            credit: 0,
          });
        }
      }
    }
  }

  // Đổi trả hàng trong kỳ
  for (const ret of salesReturns) {
    const retDate = new Date(ret.created_at);
    if (retDate.getTime() >= fromDate.getTime() && retDate.getTime() <= toDate.getTime()) {
      const reduction = Math.round(Number(ret.receivable_reduction_amount || ret.total_amount) || 0);
      events.push({
        date: retDate,
        type: 'return',
        typeLabel: 'Phiếu đổi/trả',
        documentNumber: ret.return_number,
        referenceNumber: ret.invoice_number || null,
        description: `Giảm trừ hàng trả lại (${ret.reason || 'Đổi trả hàng'})`,
        debit: 0,
        credit: reduction,
      });
    }
  }

  // Sắp xếp chứng từ theo thời gian tăng dần
  events.sort((a, b) => a.date.getTime() - b.date.getTime());

  // 6. Tính số dư lũy kế
  let running = openingBalance;
  let totalDebit = 0;
  let totalCredit = 0;

  const rows: StatementLedgerRow[] = [];
  let index = 1;

  for (const ev of events) {
    running = running + ev.debit - ev.credit;
    totalDebit += ev.debit;
    totalCredit += ev.credit;

    let isOverdue = false;
    let daysOverdue = 0;
    if (ev.dueDate) {
      const due = new Date(ev.dueDate);
      if (refDate.getTime() > due.getTime()) {
        isOverdue = true;
        daysOverdue = Math.max(1, Math.floor((refDate.getTime() - due.getTime()) / (24 * 60 * 60 * 1000)));
      }
    }

    rows.push({
      stt: index++,
      date: ev.date.toLocaleDateString('vi-VN'),
      type: ev.type,
      typeLabel: ev.typeLabel,
      documentNumber: ev.documentNumber,
      referenceNumber: ev.referenceNumber,
      description: ev.description,
      dueDate: ev.dueDate ? new Date(ev.dueDate).toLocaleDateString('vi-VN') : null,
      daysOverdue: isOverdue ? daysOverdue : 0,
      isOverdue,
      debit: ev.debit,
      credit: ev.credit,
      runningBalance: running,
    });
  }

  const closingBalance = openingBalance + totalDebit - totalCredit;

  return {
    company: {
      name: "CÔNG TY TNHH THỰC PHẨM SỐ 1",
      brand: "TPS1 FOODS",
      taxCode: "0316492812",
      address: "Số 1 Đường số 9, KDC Him Lam, Phường Tân Hưng, Quận 7, TP. Hồ Chí Minh",
      hotline: "0901.888.777",
      email: "ketoan@thucphamsomot.vn",
    },
    customer: {
      id: custRaw.id,
      partnerCode: custRaw.partner_code || "CHƯA_CÓ_MÃ",
      name: custRaw.name || "Khách hàng",
      company: custRaw.company || null,
      taxCode: custRaw.tax_code || null,
      phone: custRaw.phone || null,
      address: custRaw.address || null,
      salesRepName,
      paymentTermsDays: termsDays,
      creditLimit: Math.round(Number(custRaw.credit_limit) || 0),
    },
    period: {
      from: fromIso,
      to: toIso,
      fromDateStr: fromDate.toLocaleDateString('vi-VN'),
      toDateStr: toDate.toLocaleDateString('vi-VN'),
    },
    summary: {
      openingBalance,
      totalDebit,
      totalCredit,
      closingBalance,
      closingOverdue: Math.max(0, closingBalance),
      closingNotDue: 0,
    },
    rows,
  };
}
