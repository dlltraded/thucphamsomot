// ============================================================================
// Module: Receivables Database Layer & Atomic Transaction Handler
// Phiên bản G4.1a: Xóa bỏ 100% fallback file JSON và direct-DB fallbacks.
// Mọi nghiệp vụ hạch toán được thực hiện DUY NHẤT qua RPC PostgreSQL nguyên tử.
// Báo lỗi rõ ràng ở các hàm đọc CSDL, tuyệt đối không nuốt lỗi trả mảng rỗng.
// Hỗ trợ idempotency_key chống trùng lặp khi client retry mạng.
// ============================================================================

import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";

export interface RecordReceiptInput {
  customerId: string;
  amount: number;
  paymentMethod: 'bank_transfer' | 'cash';
  referenceCode?: string;
  note?: string;
  receiptDate?: string;
  idempotencyKey?: string;
  allocations?: {
    allocationType: 'order' | 'opening_debt';
    orderId?: string;
    adjustmentId?: string;
    amount: number;
  }[];
  createdBy: string;
}

export interface ReverseReceiptInput {
  receiptId: string;
  reason: string;
  actor: string;
}

/**
 * Ghi nhận phiếu thu và phân bổ nợ nguyên tử.
 * Chỉ cho phép hạch toán qua RPC PostgreSQL nguyên tử record_customer_receipt.
 * Xóa toàn bộ direct-DB fallback để đảm bảo tính toàn vẹn và nhất quán của sổ cái kế toán.
 * Hỗ trợ idempotencyKey chống ghi đúp phiếu thu khi retry.
 */
export async function recordCustomerReceipt(input: RecordReceiptInput) {
  const supabase = getCustomerSupabaseAdmin();
  const amount = Math.round(Number(input.amount));
  if (amount <= 0) throw new Error("Số tiền phiếu thu phải lớn hơn 0");
  if (!["bank_transfer", "cash"].includes(input.paymentMethod)) {
    throw new Error("Phương thức thanh toán phải là bank_transfer hoặc cash");
  }

  const { data: rpcResult, error: rpcErr } = await supabase.rpc("record_customer_receipt", {
    p_customer_id: input.customerId,
    p_amount: amount,
    p_payment_method: input.paymentMethod,
    p_reference_code: input.referenceCode || null,
    p_note: input.note || null,
    p_receipt_date: input.receiptDate || new Date().toISOString().split("T")[0],
    p_allocations: input.allocations || [],
    p_created_by: input.createdBy,
    p_idempotency_key: input.idempotencyKey || null,
  });

  if (rpcErr) {
    throw new Error(rpcErr.message || "Ghi nhận phiếu thu qua RPC thất bại");
  }

  return rpcResult;
}

/**
 * Đảo phiếu thu (reverse_customer_receipt)
 * Chỉ cho phép hạch toán qua RPC PostgreSQL nguyên tử reverse_customer_receipt.
 * Xóa toàn bộ direct-DB fallback để đảm bảo tính toàn vẹn và nhất quán của sổ cái kế toán.
 */
export async function reverseCustomerReceipt(input: ReverseReceiptInput) {
  const supabase = getCustomerSupabaseAdmin();
  if (!input.reason || input.reason.trim().length < 3) {
    throw new Error("Bắt buộc phải nhập lý do lập phiếu đảo (tối thiểu 3 ký tự)");
  }

  const { data: rpcResult, error: rpcErr } = await supabase.rpc("reverse_customer_receipt", {
    p_receipt_id: input.receiptId,
    p_reason: input.reason.trim(),
    p_actor: input.actor,
  });

  if (rpcErr) {
    throw new Error(rpcErr.message || "Đảo phiếu thu qua RPC thất bại");
  }

  return rpcResult;
}

/**
 * Cập nhật ngày đến hạn hóa đơn (update_invoice_due_date)
 * Chỉ cho phép cập nhật qua RPC PostgreSQL nguyên tử update_invoice_due_date.
 */
export async function updateInvoiceDueDate(orderId: string, dueDate: string, actor: string) {
  const supabase = getCustomerSupabaseAdmin();

  const { data: rpcRes, error: rpcErr } = await supabase.rpc("update_invoice_due_date", {
    p_order_id: orderId,
    p_due_date: dueDate,
    p_actor: actor,
  });

  if (rpcErr) {
    throw new Error(rpcErr.message || "Cập nhật ngày đến hạn qua RPC thất bại");
  }

  return rpcRes;
}

/**
 * Lấy danh sách phiếu thu của khách hàng trực tiếp từ CSDL.
 * Báo lỗi rõ ràng nếu truy vấn CSDL thất bại, tuyệt đối không nuốt lỗi trả mảng rỗng để tránh sai lệch số liệu tài chính.
 */
export async function getCustomerReceipts(customerId?: string) {
  const supabase = getCustomerSupabaseAdmin();
  let query = supabase.from("customer_receipts").select("*, receipt_allocations(*)");
  if (customerId) query = query.eq("customer_id", customerId);
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) {
    throw new Error(`Lỗi truy vấn danh sách phiếu thu: ${error.message}`);
  }
  return data || [];
}

/**
 * Lấy danh sách điều chỉnh / số dư đầu kỳ của khách hàng trực tiếp từ CSDL.
 * Báo lỗi rõ ràng nếu truy vấn CSDL thất bại, tuyệt đối không nuốt lỗi trả mảng rỗng để tránh sai lệch số liệu tài chính.
 */
export async function getCustomerAdjustments(customerId?: string) {
  const supabase = getCustomerSupabaseAdmin();
  let query = supabase.from("receivable_adjustments").select("*");
  if (customerId) query = query.eq("customer_id", customerId);
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) {
    throw new Error(`Lỗi truy vấn danh sách điều chỉnh công nợ: ${error.message}`);
  }
  return data || [];
}
