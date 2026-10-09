import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  ArrowLeft, User, Phone, MapPin, RefreshCw, CheckCircle2,
  Clock, Package, FileText, Plus, Trash2, Save, Search as SearchIcon, Wallet, Truck, Printer, FileSpreadsheet, ClipboardEdit, Receipt, RotateCcw, X,
  ClipboardCheck, Send, AlertCircle, Copy, Pencil
} from 'lucide-react';
import { printOrderSlip } from '../lib/printOrder';
import QuickAddProductModal from '../components/QuickAddProductModal';
import { can } from '../lib/permissions';

// Thực tế TPS1 chỉ có 2 hình thức thanh toán: COD (trả ngay khi giao) và
// công nợ (trả sau) — không dùng tiền mặt/chuyển khoản như 2 mục riêng.
const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cod: 'COD (trả ngay)', debt_collection: 'Thu công nợ (trả sau)',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Đơn nháp', pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận',
  preparing: 'Đang chuẩn bị', shipping: 'Đang giao', completed: 'Hoàn thành', canceled: 'Đã hủy',
};
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600', pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700', preparing: 'bg-purple-100 text-purple-700',
  shipping: 'bg-sky-100 text-sky-700', completed: 'bg-green-100 text-green-700', canceled: 'bg-red-100 text-red-700',
};
const PAYMENT_LABELS: Record<string, string> = {
  pending: 'Chờ xử lý', cod: 'COD', paid: 'Đã thanh toán', failed: 'Thất bại', refunded: 'Đã hoàn tiền',
};
const PRICING_MODES = [
  { value: 'price_book', label: 'Theo bảng giá áp dụng' },
  { value: 'manual_item_price', label: 'Điều chỉnh thủ công từng sản phẩm' },
];

function money(v: number | string) { return new Intl.NumberFormat('vi-VN').format(Math.round(Number(v) || 0)) + 'đ'; }
function dt(v: string) { return v ? new Date(v).toLocaleString('vi-VN') : '—'; }

interface LineItem {
  itemId?: string;
  productId?: string;
  name: string;
  sku?: string;
  unit: string;
  quantity: number;
  base_unit_price: number;
  unit_price: number;
  pricing_note?: string;
  official_price?: number | null;
  official_price_source?: string;
  official_price_book_name?: string | null;
  price_difference?: number | null;
  price_difference_percent?: number | null;
  vat_rate?: number;
  isNew?: boolean;
}

export default function OrderDetailPage() {
  const { id } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Pricing editor state
  const [pricingMode, setPricingMode] = useState('price_book');
  const [shippingAmount, setShippingAmount] = useState(0);
  const [lines, setLines] = useState<LineItem[]>([]);
  const [verificationNote, setVerificationNote] = useState('');
  const [pricingNote, setPricingNote] = useState('');

  // Product search for add item
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<any[]>([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  // Giao hàng tự vận chuyển (mục 14.2-1 KE_HOACH) — khối lượng/kích thước
  // kiện hàng, tài xế nội bộ, số tiền thu hộ khi giao. Cần migration
  // 20260910f_delivery_fulfillment_lastprice.sql đã chạy mới có cột này.
  const [deliveryForm, setDeliveryForm] = useState({ packageWeightG: '', packageDimensions: '', assignedDriver: '', codCollectAmount: '' });
  const [savingDelivery, setSavingDelivery] = useState(false);
  // Số lượng đã giao thực tế theo dòng (mục 14.2-2) — theo dõi giao thiếu/dư.
  const [itemDelivered, setItemDelivered] = useState<Record<string, string>>({});
  const [savingFulfillment, setSavingFulfillment] = useState(false);

  // Giai đoạn C: ghi nhận thanh toán tách 3 phần (order_payments — cần
  // migration 20260910d_order_payments.sql). Nếu migration CHƯA chạy, API
  // trả lỗi -> paymentsAvailable=false, ẩn cả khối này thay vì hiện lỗi vỡ
  // giao diện, để trang vẫn dùng tốt các phần khác trong lúc chờ.
  const [payments, setPayments] = useState<any[]>([]);
  const [paymentsAvailable, setPaymentsAvailable] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [salesReturns, setSalesReturns] = useState<any[]>([]);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnQuantities, setReturnQuantities] = useState<Record<string, string>>({});
  const [returnReason, setReturnReason] = useState('');
  const [submittingReturn, setSubmittingReturn] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(false);
  const [invoiceEditReason, setInvoiceEditReason] = useState('');
  const [invoiceDiscountAmount, setInvoiceDiscountAmount] = useState(0);
  const [invoiceNote, setInvoiceNote] = useState('');
  const [invoiceAdjustments, setInvoiceAdjustments] = useState<any[]>([]);
  const [savingInvoice, setSavingInvoice] = useState(false);

  const fetchInvoiceAdjustments = useCallback(async () => {
    if (!id || !token) return;
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${apiBase}/api/admin/invoices/adjustments?orderId=${id}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.ok) setInvoiceAdjustments(data.adjustments || []);
    } catch { /* người không có quyền sẽ không thấy nhật ký tài chính */ }
  }, [id, token]);

  const fetchSalesReturns = useCallback(async () => {
    if (!id || !token) return;
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${apiBase}/api/admin/invoices/returns?orderId=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok) setSalesReturns(data.returns || []);
    } catch { /* migration chưa chạy: không làm vỡ trang */ }
  }, [id, token]);

  const submitSalesReturn = async () => {
    const items = lines.map((line) => ({
      orderItemId: line.itemId,
      quantity: Number(returnQuantities[String(line.itemId)] || 0),
    })).filter((item) => item.orderItemId && item.quantity > 0);
    if (!items.length || returnReason.trim().length < 3) {
      alert('Chọn ít nhất một sản phẩm và nhập lý do đổi/trả.');
      return;
    }
    setSubmittingReturn(true);
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${apiBase}/api/admin/invoices/returns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId: id, items, reason: returnReason.trim() }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Không tạo được phiếu đổi/trả');
      setShowReturnModal(false);
      setReturnQuantities({});
      setReturnReason('');
      await Promise.all([fetchSalesReturns(), fetchOrder()]);
      alert(`Đã lập phiếu đổi/trả ${data.salesReturn?.return_number || ''}. Công nợ đã được điều chỉnh.`);
    } catch (error: any) {
      alert(error.message || 'Không tạo được phiếu đổi/trả');
    } finally {
      setSubmittingReturn(false);
    }
  };

  // Yêu cầu điều chỉnh/hủy của khách (WP6b) — khách gửi, nhân viên duyệt tại đây.
  const [changeRequests, setChangeRequests] = useState<any[]>([]);
  const [resolvingRequest, setResolvingRequest] = useState(false);
  const fetchChangeRequests = useCallback(async () => {
    if (!id) return;
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${apiBase}/api/admin/order-change-requests?orderId=${id}&status=all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok) setChangeRequests(data.requests || []);
    } catch { /* bảng chưa có — bỏ qua */ }
  }, [id, token]);
  useEffect(() => { fetchChangeRequests(); }, [fetchChangeRequests]);

  const resolveRequest = async (requestId: string, action: 'approve' | 'reject' | 'done', type: string) => {
    let note = '';
    if (action === 'reject') {
      note = prompt('Lý do từ chối (khách sẽ nhận được nội dung này):', '') || '';
      if (note.trim().length < 3) return;
    } else if (action === 'approve' && type === 'cancel') {
      if (!confirm('Duyệt HỦY đơn này? Đơn sẽ chuyển "Đã hủy", tồn kho (nếu có) được hoàn lại và khách nhận thông báo.')) return;
    } else if (action === 'done') {
      note = prompt('Ghi chú cho khách (không bắt buộc):', '') || '';
    }
    setResolvingRequest(true);
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${apiBase}/api/admin/order-change-requests/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ requestId, action, note }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      if (data.next === 'process_order') { navigate(`/tao-don-hang?processOrderId=${data.orderId}`); return; }
      if (data.canceled && data.zaloText) {
        try { await navigator.clipboard.writeText(data.zaloText); } catch { /* bỏ qua */ }
        const packingWarn = data.warnings?.includes('already_packing') ? '\n⚠️ Đơn đã/đang được soạn — nhớ báo Kho/Thu mua.' : '';
        alert(`✅ Đã hủy đơn.${packingWarn}\n\nĐã sao chép thông báo Zalo để dán vào nhóm:\n${data.zaloText}`);
      }
      await Promise.all([fetchChangeRequests(), fetchOrder()]);
    } catch (err: any) {
      alert('Lỗi: ' + (err.message || 'Không xử lý được yêu cầu'));
    } finally { setResolvingRequest(false); }
  };

  const fetchPayments = useCallback(async () => {
    if (!id) return;
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${apiBase}/api/admin/orders/payments?orderId=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.ok) { setPaymentsAvailable(false); return; }
      setPayments(data.payments || []);
      setPaymentsAvailable(true);
    } catch {
      setPaymentsAvailable(false);
    }
  }, [id, token]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const submitPayment = async () => {
    // Nếu ô trống → mặc định thu toàn bộ còn nợ
    const rawAmount = paymentAmount.trim();
    const debtAmount = Math.round(Number(order?.debt_amount ?? order?.grand_total) || 0);
    const amount = rawAmount ? Number(rawAmount.replace(/[^0-9]/g, '')) : debtAmount;
    if (!amount || amount <= 0) { alert('Nhập số tiền hợp lệ'); return; }
    setSubmittingPayment(true);
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${apiBase}/api/admin/orders/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId: id, method: paymentMethod, amount, note: paymentNote || undefined }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setPaymentAmount(''); setPaymentNote('');
      await Promise.all([fetchPayments(), fetchOrder()]);
      alert('✅ Đã ghi nhận thanh toán');
    } catch (err: any) {
      alert('Lỗi: ' + (err.message || 'Không ghi nhận được'));
    } finally { setSubmittingPayment(false); }
  };

  // Phân hệ Thu mua kiểm tra hàng (G3/G4)
  const [procurementReview, setProcurementReview] = useState<any>(null);
  const [requestingReview, setRequestingReview] = useState(false);
  const [respondingReview, setRespondingReview] = useState(false);
  const [bypassProcurement, setBypassProcurement] = useState(false);
  const [bypassReason, setBypassReason] = useState('');
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  const [revisionReasonText, setRevisionReasonText] = useState('');

  const fetchProcurementReview = useCallback(async () => {
    if (!id) return;
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${apiBase}/api/admin/procurement/reviews?search=${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.data) && data.data.length > 0) {
        const found = data.data.find((r: any) => r.order_id === id) || data.data[0];
        const detailRes = await fetch(`${apiBase}/api/admin/procurement/reviews/${found.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const detailData = await detailRes.json();
        if (detailData.ok) {
          setProcurementReview(detailData.data);
          return;
        }
      }
      setProcurementReview(null);
    } catch {
      setProcurementReview(null);
    }
  }, [id, token]);

  useEffect(() => { fetchProcurementReview(); }, [fetchProcurementReview]);

  const handleSendToProcurement = async () => {
    if (!order) return;
    setRequestingReview(true);
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${apiBase}/api/admin/procurement/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId: order.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Gửi yêu cầu thất bại');
      alert('✅ Đã gửi yêu cầu kiểm tra hàng cho phòng Thu mua');
      await Promise.all([fetchProcurementReview(), fetchOrder()]);
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    } finally {
      setRequestingReview(false);
    }
  };

  const handleAcceptProcurementReview = async () => {
    if (!procurementReview) return;
    setRespondingReview(true);
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${apiBase}/api/admin/procurement/reviews/${procurementReview.id}/operations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'accept' }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Thao tác thất bại');
      alert('✅ Đã chấp nhận kết quả kiểm tra. Đơn sẵn sàng để xác nhận!');
      await Promise.all([fetchProcurementReview(), fetchOrder()]);
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    } finally {
      setRespondingReview(false);
    }
  };

  const handleRequestProcurementRevision = async () => {
    if (!procurementReview) return;
    if (!revisionReasonText.trim()) {
      alert('Vui lòng nhập lý do yêu cầu kiểm tra lại');
      return;
    }
    setRespondingReview(true);
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${apiBase}/api/admin/procurement/reviews/${procurementReview.id}/operations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'request_revision', reason: revisionReasonText.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Thao tác thất bại');
      alert('✅ Đã gửi yêu cầu kiểm tra lại cho Thu mua');
      setRevisionModalOpen(false);
      setRevisionReasonText('');
      await Promise.all([fetchProcurementReview(), fetchOrder()]);
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    } finally {
      setRespondingReview(false);
    }
  };

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch from 'orders' table first (without order_history join to avoid 42501 permission error)
      let { data } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', id)
        .maybeSingle();

      // If not in orders, check if it is in 'quotes' table
      if (!data) {
        const { data: quoteData } = await supabase
          .from('quotes')
          .select('*, quote_items(*)')
          .eq('id', id)
          .maybeSingle();

        if (quoteData) {
          data = {
            id: quoteData.id,
            order_code: quoteData.quote_code || `BG-${quoteData.id.slice(0, 8).toUpperCase()}`,
            customer_name: quoteData.lead_name || quoteData.company || 'Khách hàng',
            customer_phone: quoteData.lead_phone || '',
            delivery_address: quoteData.delivery_address || quoteData.address || '',
            note: quoteData.note || '',
            status: quoteData.status === 'won' ? 'confirmed' : quoteData.status || 'pending',
            payment_status: 'pending',
            payment_method: 'COD',
            source: quoteData.source || 'admin',
            subtotal: Number(quoteData.subtotal || quoteData.total_amount || 0),
            discount_amount: Number(quoteData.discount_amount || 0),
            shipping_amount: Number(quoteData.shipping_fee || 0),
            grand_total: Number(quoteData.total_amount || quoteData.subtotal || 0),
            created_at: quoteData.created_at,
            pricing_mode: 'price_book',
            pricing_status: quoteData.status === 'won' ? 'finalized' : 'pending',
            order_items: (quoteData.quote_items || []).map((it: any) => ({
              id: it.id,
              product_id: it.product_id,
              name: it.product_name || it.name,
              unit: it.unit || 'Kg',
              quantity: Number(it.quantity || 1),
              base_unit_price: Number(it.unit_price || 0),
              unit_price: Number(it.unit_price || 0),
              pricing_note: it.note || '',
            })),
            order_history: [],
          };
        }
      }

      // API server là nguồn chính vì có quyền đọc bảng giá riêng và audit;
      // dữ liệu Supabase client phía trên chỉ là fallback tương thích.
      try {
        const apiBase = import.meta.env.VITE_API_BASE_URL || '';
        const res = await fetch(`${apiBase}/api/admin/orders?id=${id}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const jsonRes = await res.json();
        if (jsonRes.ok && jsonRes.order) data = jsonRes.order;
      } catch (e) {
        console.warn('API order detail fallback error:', e);
      }

      if (!data) {
        setOrder(null);
        return;
      }

      // 2. Fetch order_history safely
      let historyList: any[] = [];
      try {
        const { data: hist } = await supabase
          .from('order_history')
          .select('*')
          .eq('order_id', id)
          .order('created_at', { ascending: false });
        if (hist) historyList = hist;
      } catch (hErr) {
        console.warn('Cannot fetch order_history directly:', hErr);
      }
      data.order_history = data.order_history?.length ? data.order_history : historyList;

      setOrder(data);
      setLines((data.order_items || []).map((item: any) => ({
        itemId: item.id,
        productId: item.product_id,
        name: item.name,
        sku: item.sku,
        unit: item.unit || 'Kg',
        quantity: Number(item.quantity),
        base_unit_price: Number(item.base_unit_price),
        unit_price: Number(item.unit_price),
        pricing_note: item.pricing_note || '',
        official_price: item.official_price == null ? null : Number(item.official_price),
        official_price_source: item.official_price_source,
        official_price_book_name: item.official_price_book_name,
        price_difference: item.price_difference == null ? null : Number(item.price_difference),
        price_difference_percent: item.price_difference_percent == null ? null : Number(item.price_difference_percent),
        vat_rate: Number(item.vat_rate || 0),
      })));

      // Giá hiển thị là snapshot bảng giá do API server trả về; chỉ các dòng
      // có lý do mới được điều chỉnh thủ công.
      setPricingMode(data.pricing_mode === 'manual_item_price' ? 'manual_item_price' : 'price_book');

      setShippingAmount(Number(data.shipping_amount || 0));
      setInvoiceDiscountAmount(Number(data.discount_amount || 0));
      setInvoiceNote(data.note || '');
      setPricingNote(data.pricing_note || '');
      setDeliveryForm({
        packageWeightG: data.package_weight_g != null ? String(data.package_weight_g) : '',
        packageDimensions: data.package_dimensions || '',
        assignedDriver: data.assigned_driver || '',
        codCollectAmount: data.cod_collect_amount != null ? String(data.cod_collect_amount) : '',
      });
      // Chưa xác nhận thực giao: mặc định = số đã chốt (giao đủ); đã xác nhận: hiện số thực giao đã lưu.
      setItemDelivered(Object.fromEntries((data.order_items || []).map((it: any) => [it.id, String(data.delivery_confirmed_at ? (it.quantity_delivered ?? it.quantity) : it.quantity)])));

    } catch (err) {
      console.error('Error fetching order:', err);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);
  useEffect(() => { if (order?.status === 'completed') fetchSalesReturns(); }, [order?.status, fetchSalesReturns]);
  useEffect(() => { if (order?.status === 'completed') fetchInvoiceAdjustments(); }, [order?.status, fetchInvoiceAdjustments]);

  // Giá trong dòng là snapshot do server resolve từ bảng giá; UI không tự suy giá.
  const calcTotals = useCallback(() => {
    let subtotal = 0, merchandise = 0, tax = 0;
    const priced = lines.map(line => {
      const up = Number(line.unit_price) || 0;
      subtotal += Math.round((line.base_unit_price || up) * line.quantity);
      const lineTotal = Math.round(up * line.quantity);
      merchandise += lineTotal;
      tax += Math.round(lineTotal * Number(line.vat_rate || 0) / 100);
      return { ...line, unit_price: up };
    });
    const discount = editingInvoice ? Math.max(0, invoiceDiscountAmount) : Math.max(0, Number(order?.discount_amount || 0));
    return { subtotal, merchandise, tax, discount, total: merchandise - discount + shippingAmount + tax, priced };
  }, [lines, shippingAmount, editingInvoice, invoiceDiscountAmount, order?.discount_amount]);

  const totals = calcTotals();

  const isLocked = order && (['shipping', 'completed', 'canceled'].includes(order.status) || ['paid', 'refunded'].includes(order.payment_status) || !!order.delivery_confirmed_at);
  const isAccountingUser = user?.role === 'ke_toan' || user?.department?.function_group === 'accounting';
  const isResponsibleOperationsHead = user?.position === 'truong_phong'
    && user?.department?.function_group === 'operations'
    && !!user.departmentId
    && user.departmentId === order?.operations_department_id;
  const canAdjustInvoice = order?.status === 'completed' && (user?.role === 'admin' || isAccountingUser || isResponsibleOperationsHead);
  const canCopyOrder = user?.userType === 'staff' && can(user.role, 'orders.copy');
  const canEditLines = !isLocked || (editingInvoice && canAdjustInvoice);
  const canFinalizePricing = user?.userType === 'staff' && can(user.role, 'orders.finalize_pricing');
  const canBypassReview = user?.userType === 'staff' && (user.role === 'admin' || can(user.role, 'orders.credit_override'));
  const isTerminalStatus = !!order && ['completed', 'canceled'].includes(order.status);
  // Cột delivery_confirmed_at chỉ có sau migration 20260920g — chưa chạy thì giữ luồng cũ.
  const reconcileAvailable = !!order && 'delivery_confirmed_at' in order && ['confirmed', 'preparing', 'shipping'].includes(order.status) && order.pricing_status === 'finalized';

  // Search products
  const searchProducts = async () => {
    if (productSearch.length < 2) return;
    setSearchingProducts(true);
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${apiBase}/api/admin/orders?productSearch=${encodeURIComponent(productSearch)}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      setProductResults(data.products || []);
    } catch { setProductResults([]); }
    finally { setSearchingProducts(false); }
  };

  // Dropdown gợi ý tự tìm khi gõ để thêm hàng nhanh — không
  // cần bấm "Tìm" hay Enter nữa (mục brief 2026-09-10).
  useEffect(() => {
    if (productSearch.trim().length < 2) { setProductResults([]); return; }
    const timer = setTimeout(() => { searchProducts(); }, 300);
    return () => clearTimeout(timer);
  }, [productSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const addProduct = (product: any) => {
    if (lines.some(l => l.productId === product.id)) return alert('Sản phẩm đã có trong đơn');
    setLines(prev => [...prev, {
      productId: product.id, name: product.name, sku: product.sku,
      unit: product.unit || 'Kg', quantity: 1,
      base_unit_price: Number(product.price), unit_price: Number(product.price),
      pricing_note: '', isNew: true,
    }]);
    setProductResults([]);
    setProductSearch('');
  };

  const removeLine = (idx: number) => {
    if (lines.length <= 1) return alert('Đơn phải có ít nhất một sản phẩm');
    setLines(prev => prev.filter((_, i) => i !== idx));
  };

  const updateLine = (idx: number, field: keyof LineItem, value: any) => {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  };

  const startInvoiceEdit = () => {
    setInvoiceEditReason('');
    setInvoiceDiscountAmount(Number(order.discount_amount || 0));
    setInvoiceNote(order.note || '');
    setEditingInvoice(true);
  };

  const cancelInvoiceEdit = async () => {
    if (!confirm('Hủy các thay đổi chưa lưu?')) return;
    setEditingInvoice(false);
    setInvoiceEditReason('');
    await fetchOrder();
  };

  const saveInvoiceAdjustment = async () => {
    if (invoiceEditReason.trim().length < 3) return alert('Bắt buộc nhập lý do điều chỉnh hóa đơn.');
    if (!lines.length || lines.some(line => Number(line.quantity) <= 0 || Number(line.unit_price) < 0 || ![0, 5, 8].includes(Number(line.vat_rate || 0)))) {
      return alert('Kiểm tra lại số lượng, đơn giá và VAT của từng sản phẩm.');
    }
    if (!confirm(`Lưu lần điều chỉnh hóa đơn ${order.invoice_number}? Công nợ sẽ được cập nhật tự động.`)) return;
    setSavingInvoice(true);
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${apiBase}/api/admin/invoices/adjustments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          orderId: order.id,
          expectedRevision: Number(order.invoice_revision || 1),
          reason: invoiceEditReason.trim(),
          discountAmount: invoiceDiscountAmount,
          shippingAmount,
          note: invoiceNote,
          items: lines.map(line => ({
            itemId: line.isNew ? null : line.itemId,
            productId: line.productId,
            quantity: line.quantity,
            unitPrice: line.unit_price,
            vatRate: Number(line.vat_rate || 0),
            note: line.pricing_note || '',
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Không lưu được điều chỉnh');
      setEditingInvoice(false);
      setInvoiceEditReason('');
      await Promise.all([fetchOrder(), fetchPayments(), fetchInvoiceAdjustments()]);
      alert(data.warning ? `Đã lưu điều chỉnh. ${data.warning}` : 'Đã lưu điều chỉnh và phát hành bản hóa đơn mới.');
    } catch (error: any) {
      alert(error.message || 'Không lưu được điều chỉnh hóa đơn');
    } finally { setSavingInvoice(false); }
  };

  const handleFinalize = async () => {
    if (!canFinalizePricing) {
      alert('Chỉ Admin, Trưởng phòng phụ trách hoặc Sale/Văn phòng Vận hành được chốt giá đơn hàng.');
      return;
    }

    if (['pending', 'processing'].includes(order?.status)) {
      if (!bypassProcurement && (!procurementReview || procurementReview.status !== 'accepted_by_operations')) {
        alert('⚠️ Đơn hàng cần được Thu mua kiểm tra và Vận hành chấp nhận kết quả trước khi xác nhận!\nNếu là trường hợp khẩn cấp, Quản trị viên có thể chọn "Bỏ qua kiểm tra Thu mua" ở mục bên dưới.');
        return;
      }
      if (bypassProcurement && !bypassReason.trim()) {
        alert('Bắt buộc phải nhập lý do khi chọn bỏ qua kiểm tra Thu mua!');
        return;
      }
    }

    if (!confirm(`Chốt đơn theo bảng giá áp dụng với tổng tiền ${money(totals.total)}?`)) return;
    setSaving(true);
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${apiBase}/api/admin/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          orderId: order.id,
          pricingMode,
          orderDiscountPercent: 0,
          shippingAmount,
          items: totals.priced.map(l => ({
            itemId: l.isNew ? undefined : l.itemId,
            productId: l.productId,
            quantity: l.quantity,
            finalUnitPrice: l.unit_price,
            note: l.pricing_note || '',
          })),
          verificationNote,
          pricingNote,
          actor: 'TPS1 Sale App',
          bypassProcurementReview: bypassProcurement,
          bypassReason: bypassReason.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || data.warning || 'Không chốt được đơn');
      alert(data.warning || `✅ Đã chốt giá ${order.order_code} thành công!`);
      await Promise.all([fetchProcurementReview(), fetchOrder()]);
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    } finally { setSaving(false); }
  };

  const changeStatus = async (newStatus: string) => {
    let confirmFullDelivery = false;
    // Hoàn thành phải qua bước xác nhận thực giao (hóa đơn tính theo số thực giao).
    if (newStatus === 'completed' && order && 'delivery_confirmed_at' in order && !order.delivery_confirmed_at) {
      if (!confirm('Xác nhận khách đã nhận ĐỦ 100% số lượng đã chốt?\n\nOK = giao đủ, tính hóa đơn theo số đã chốt.\nHủy = quay lại nhập số lượng thực giao từng dòng (cột "Đã giao") rồi bấm "Xác nhận thực giao".')) return;
      confirmFullDelivery = true;
    }
    const note = prompt(`Chuyển sang "${STATUS_LABELS[newStatus]}". Ghi chú:`, '') ?? null;
    if (note === null) return;
    setSaving(true);
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${apiBase}/api/admin/orders`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ orderId: order.id, status: newStatus, note, ...(confirmFullDelivery ? { confirmFullDelivery: true } : {}) }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      await fetchOrder();
    } catch (err: any) { alert('Lỗi: ' + err.message); }
    finally { setSaving(false); }
  };

  const saveDelivery = async () => {
    setSavingDelivery(true);
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${apiBase}/api/admin/orders`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          orderId: order.id,
          delivery: {
            packageWeightG: deliveryForm.packageWeightG === '' ? null : Number(deliveryForm.packageWeightG),
            packageDimensions: deliveryForm.packageDimensions,
            assignedDriver: deliveryForm.assignedDriver,
            codCollectAmount: deliveryForm.codCollectAmount === '' ? 0 : Number(deliveryForm.codCollectAmount),
          },
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      alert('✅ Đã lưu thông tin giao hàng');
      await fetchOrder();
    } catch (err: any) {
      alert('Lỗi: ' + (err.message || 'Không lưu được thông tin giao hàng'));
    } finally { setSavingDelivery(false); }
  };

  // Xác nhận THỰC GIAO → tính lại tiền theo số thực giao (API /reconcile-delivery). full=true: giao đủ 100%.
  const [reconciling, setReconciling] = useState(false);
  const reconcile = async (full: boolean) => {
    if (!order) return;
    if (!full && !confirm('Xác nhận số lượng thực giao đã nhập và TÍNH LẠI tiền đơn hàng?')) return;
    setReconciling(true);
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${apiBase}/api/admin/orders/reconcile-delivery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(full
          ? { orderId: order.id, full: true }
          : { orderId: order.id, items: Object.entries(itemDelivered).map(([itemId, qty]) => ({ itemId, quantityDelivered: Number(qty) })) }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      const diffNote = data.changes?.length ? `\n${data.changes.length} dòng lệch so với số đã chốt.` : '';
      const overpaidNote = data.warnings?.includes('overpaid') ? '\n⚠️ Đã thu nhiều hơn tổng mới — cần hoàn/đối trừ.' : '';
      alert(`✅ Đã xác nhận thực giao. Tổng tiền: ${money(data.preTotal)} → ${money(data.newTotal)}${diffNote}${overpaidNote}`);
      await fetchOrder();
    } catch (err: any) {
      alert('Lỗi: ' + (err.message || 'Không xác nhận được thực giao'));
    } finally { setReconciling(false); }
  };

  const saveFulfillment = async () => {
    setSavingFulfillment(true);
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${apiBase}/api/admin/orders`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          orderId: order.id,
          itemDeliveries: Object.entries(itemDelivered).map(([itemId, qty]) => ({ itemId, quantityDelivered: Number(qty) || 0 })),
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      alert('✅ Đã lưu số lượng đã giao');
      await fetchOrder();
    } catch (err: any) {
      alert('Lỗi: ' + (err.message || 'Không lưu được số lượng đã giao'));
    } finally { setSavingFulfillment(false); }
  };

  const exportExcelDetail = async () => {
    setExportingExcel(true);
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${apiBase}/api/admin/orders/export?orderId=${order.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Không xuất được file');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `chi-tiet-don-hang_${order.order_code}.xlsx`; a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Lỗi: ' + (err.message || 'Không xuất được file'));
    } finally { setExportingExcel(false); }
  };

  // Hóa đơn bán hàng — chỉ có khi đơn đã "Hoàn thành" giao hàng, khác với
  // phiếu tạm/phiếu xác nhận ở trên (có ngay khi chốt giá). Mục brief
  // 2026-09-11: "lúc xác nhận đơn hàng chỉ là phiếu tạm thôi".
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const downloadInvoice = async () => {
    setDownloadingInvoice(true);
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${apiBase}/api/admin/orders/document?orderId=${order.id}&type=invoice`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Chưa có hóa đơn cho đơn này');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `HOA-DON_${order.order_code}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Lỗi: ' + (err.message || 'Không tải được hóa đơn'));
    } finally { setDownloadingInvoice(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24 text-slate-500">
      <RefreshCw className="animate-spin mr-2" size={20} /> Đang tải đơn hàng...
    </div>
  );
  if (!order) return (
    <div className="text-center py-24 text-red-500">Không tìm thấy đơn hàng #{id}</div>
  );

  const history = [...(order.order_history || [])].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h1 className="text-xl font-bold text-slate-800">{order.order_code}</h1>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[order.status]}`}>
                {STATUS_LABELS[order.status]}
              </span>
              {order.pricing_status === 'finalized' ? (
                <span className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">✓ Đã chốt R{order.price_revision || 1}</span>
              ) : (
                <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">⏳ Chờ chốt giá</span>
              )}
            </div>
            <p className="text-xs text-slate-400">{dt(order.created_at)}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            value={order.status}
            onChange={e => changeStatus(e.target.value)}
            disabled={saving || isTerminalStatus}
            title={isTerminalStatus ? 'Đơn đã ở trạng thái kết thúc, không thể chuyển ngược' : 'Cập nhật trạng thái đơn hàng'}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20">
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          {order.pricing_status !== 'finalized' && (
            <button onClick={() => navigate(`/tao-don-hang?processOrderId=${order.id}`)}
              className="px-3 py-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-sm font-medium hover:bg-amber-100 flex items-center gap-1.5">
              <ClipboardEdit size={16} /> Xử lý đơn hàng
            </button>
          )}
          {order.status === 'completed' && (
            <button onClick={downloadInvoice} disabled={downloadingInvoice}
              className="px-3 py-2 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm font-medium hover:bg-green-100 disabled:opacity-50 flex items-center gap-1.5" title="Tải hóa đơn bán hàng">
              <Receipt size={16} /> {downloadingInvoice ? 'Đang tải...' : 'Tải hóa đơn'}
            </button>
          )}
          {order.status === 'completed' && canAdjustInvoice && !editingInvoice && (
            <button onClick={startInvoiceEdit}
              className="px-3 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 flex items-center gap-1.5">
              <Pencil size={16} /> Chỉnh sửa
            </button>
          )}
          {order.status === 'completed' && canCopyOrder && !editingInvoice && (
            <button onClick={() => navigate(`/tao-don-hang?copyOrderId=${order.id}`)}
              className="px-3 py-2 bg-white border border-blue-200 text-blue-700 rounded-xl text-sm font-medium hover:bg-blue-50 flex items-center gap-1.5">
              <Copy size={16} /> Sao chép
            </button>
          )}
          {order.status === 'completed' && canAdjustInvoice && !editingInvoice && (
            <button onClick={() => setShowReturnModal(true)}
              className="px-3 py-2 bg-orange-50 border border-orange-200 text-orange-700 rounded-xl text-sm font-medium hover:bg-orange-100 flex items-center gap-1.5">
              <RotateCcw size={16} /> Đổi/Trả hàng
            </button>
          )}
          <button onClick={exportExcelDetail} disabled={exportingExcel}
            className="p-2 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 disabled:opacity-50" title="Xuất file Excel">
            <FileSpreadsheet size={18} />
          </button>
          <button onClick={() => printOrderSlip(order)} className="p-2 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50" title="In phiếu tạm">
            <Printer size={18} />
          </button>
          <button onClick={fetchOrder} className="p-2 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50">
            <RefreshCw size={18} className={saving || loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {changeRequests.filter((r) => ['open', 'approved'].includes(r.status)).map((r) => (
        <div key={r.id} className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="font-bold text-amber-900 text-sm">
              {r.type === 'cancel' ? '🚫 Khách yêu cầu HỦY đơn' : '✏️ Khách yêu cầu ĐIỀU CHỈNH đơn'}
              {r.afterCutoff && <span className="ml-2 text-[11px] font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">Sau giờ chốt</span>}
              {r.status === 'approved' && <span className="ml-2 text-[11px] font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">Đã duyệt — đang điều chỉnh</span>}
            </p>
            <span className="text-xs text-amber-700">Gửi {dt(r.requestedAt)} · chờ {r.waitingMinutes} phút</span>
          </div>
          <p className="text-sm text-slate-800 bg-white border border-amber-100 rounded-lg px-3 py-2">“{r.message}”</p>
          {(r.packingStatus && r.packingStatus !== 'not_started') && (
            <p className="text-xs font-semibold text-red-700">⚠️ Đơn {r.packingStatus === 'done' ? 'đã soạn xong' : 'đang được soạn'} — nếu duyệt nhớ báo Kho/Thu mua.</p>
          )}
          {r.possiblyExported && <p className="text-xs text-amber-800">Đơn có thể đã nằm trong file tổng gửi Thu mua lúc {dt(r.lastExportedAt)} — cần báo lại.</p>}
          <div className="flex gap-2 flex-wrap pt-1">
            {r.status === 'open' && (
              <>
                <button disabled={resolvingRequest} onClick={() => resolveRequest(r.id, 'approve', r.type)}
                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 disabled:opacity-50">
                  {r.type === 'cancel' ? 'Duyệt hủy đơn' : 'Duyệt điều chỉnh (mở Xử lý đơn hàng)'}
                </button>
                <button disabled={resolvingRequest} onClick={() => resolveRequest(r.id, 'reject', r.type)}
                  className="px-3 py-1.5 bg-white border border-red-200 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-50 disabled:opacity-50">
                  Từ chối
                </button>
              </>
            )}
            {r.status === 'approved' && r.type === 'adjust' && (
              <>
                <button disabled={resolvingRequest} onClick={() => navigate(`/tao-don-hang?processOrderId=${r.orderId}`)}
                  className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50">
                  Mở Xử lý đơn hàng
                </button>
                <button disabled={resolvingRequest} onClick={() => resolveRequest(r.id, 'done', r.type)}
                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 disabled:opacity-50">
                  Đã điều chỉnh xong (báo khách)
                </button>
              </>
            )}
          </div>
        </div>
      ))}

      {editingInvoice && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="font-bold text-blue-900">Đang chỉnh sửa hóa đơn {order.invoice_number}</p>
              <p className="text-xs text-blue-700">Lần điều chỉnh hiện tại: {Number(order.invoice_revision || 1) + 1}. Tổng tiền và công nợ sẽ được tính lại khi lưu.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={cancelInvoiceEdit} disabled={savingInvoice} className="px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl text-sm font-medium">Bỏ qua</button>
              <button onClick={saveInvoiceAdjustment} disabled={savingInvoice} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold disabled:opacity-50 flex items-center gap-2">
                <Save size={16} /> {savingInvoice ? 'Đang lưu...' : 'Lưu điều chỉnh'}
              </button>
            </div>
          </div>
          <textarea value={invoiceEditReason} onChange={e => setInvoiceEditReason(e.target.value)} rows={2}
            placeholder="Lý do điều chỉnh (bắt buộc)" className="w-full border border-blue-300 rounded-xl px-3 py-2 text-sm bg-white" />
        </div>
      )}

      {salesReturns.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
          <p className="font-bold text-orange-900 text-sm mb-2">Phiếu đổi/trả đã xác nhận</p>
          <div className="space-y-2">
            {salesReturns.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 bg-white rounded-xl border border-orange-100 px-3 py-2 text-sm">
                <div><b>{item.return_number}</b><span className="text-slate-500"> · {item.reason}</span></div>
                <div className="text-right">
                  <b className="text-orange-700">-{money(item.total_amount)}</b>
                  {Number(item.receivable_reduction_amount || 0) > 0 && (
                    <p className="text-[11px] text-slate-500">Giảm công nợ: {money(item.receivable_reduction_amount)}</p>
                  )}
                  {Number(item.customer_credit_amount || 0) > 0 && (
                    <p className="text-[11px] text-emerald-700">Số dư có của khách: {money(item.customer_credit_amount)}</p>
                  )}
                  <p className="text-[11px] text-slate-400">Kho: Chờ xử lý</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Products + Pricing Editor */}
        <div className="lg:col-span-2 space-y-6">
          {/* Products Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-800 flex items-center gap-2"><Package size={18} className="text-green-600" />Sản phẩm trong đơn</h2>
              <span className="text-sm text-slate-500">{lines.length} sản phẩm</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3 text-left">Sản phẩm</th>
                    <th className="px-4 py-3 text-center">SL</th>
                    <th className="px-4 py-3 text-center">Đã giao</th>
                    <th className="px-4 py-3 text-right">Đơn giá</th>
                    <th className="px-4 py-3 text-center">VAT</th>
                    <th className="px-4 py-3 text-right">Thành tiền</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lines.map((line, idx) => {
                    const priced = totals.priced[idx];
                    const displayPrice = priced?.unit_price || line.unit_price;
                    const lineTotal = Math.round(displayPrice * line.quantity);
                    return (
                      <tr key={idx} className={`hover:bg-slate-50/50 ${isLocked && !editingInvoice ? 'opacity-70' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-slate-800">{line.name}</p>
                          </div>
                          <p className="text-xs text-slate-400">{line.sku ? `SKU: ${line.sku} · ` : ''}Giá gốc {money(line.base_unit_price)}</p>
                          {line.official_price != null && (
                            <div className="mt-1 flex items-center gap-2 flex-wrap text-[11px]">
                              <span className="text-emerald-700">
                                Giá TPS1: <b>{money(line.official_price)}</b>
                                {line.official_price_book_name ? ` · ${line.official_price_book_name}` : ''}
                              </span>
                              {line.price_difference != null && line.price_difference !== 0 && (
                                <span className={line.price_difference > 0 ? 'text-red-600' : 'text-blue-600'}>
                                  Chênh {line.price_difference > 0 ? '+' : ''}{money(line.price_difference)}
                                  {line.price_difference_percent != null ? ` (${line.price_difference_percent > 0 ? '+' : ''}${line.price_difference_percent}%)` : ''}
                                </span>
                              )}
                              {canEditLines && !editingInvoice && line.unit_price !== line.official_price && (
                                <button type="button" onClick={() => {
                                  setPricingMode('price_book');
                                  updateLine(idx, 'unit_price', Number(line.official_price));
                                }} className="font-semibold text-emerald-700 hover:underline">
                                  Áp giá TPS1
                                </button>
                              )}
                            </div>
                          )}
                          {canEditLines && (
                            <input type="text" value={line.pricing_note || ''} onChange={e => updateLine(idx, 'pricing_note', e.target.value)}
                              placeholder="Quy cách / ghi chú riêng..." className="mt-1 text-xs w-full border-0 border-b border-slate-200 focus:outline-none focus:border-green-500 bg-transparent text-slate-500" />
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {canEditLines ? (
                            <input type="number" min="0.001" step="0.001" value={line.quantity}
                              onChange={e => updateLine(idx, 'quantity', Number(e.target.value))}
                              className="w-20 text-center border border-slate-200 rounded-lg p-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20" />
                          ) : (
                            <span className="font-medium">{line.quantity} {line.unit}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {line.itemId ? (
                            <input type="number" min="0" step="0.001"
                              value={itemDelivered[line.itemId] ?? '0'}
                              onChange={e => setItemDelivered(prev => ({ ...prev, [line.itemId as string]: e.target.value }))}
                              className="w-20 text-center border border-slate-200 rounded-lg p-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20" />
                          ) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {canEditLines ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <input
                                type="number"
                                min="0"
                                step="1000"
                                value={line.unit_price || ''}
                                placeholder="Nhập giá (đ)..."
                                onChange={e => {
                                  setPricingMode('manual_item_price');
                                  updateLine(idx, 'unit_price', Number(e.target.value));
                                }}
                                className={`w-32 text-right border rounded-lg px-2.5 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 transition-all ${
                                  (line.unit_price || 0) <= 0
                                    ? 'border-amber-400 bg-amber-50 text-amber-900 focus:ring-amber-500/40 shadow-sm shadow-amber-200'
                                    : 'border-slate-300 text-slate-800 focus:ring-green-500/20'
                                }`}
                              />
                              {(line.unit_price || 0) <= 0 && (
                                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded shrink-0">
                                  Chưa có giá
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-600 font-medium">{money(priced?.unit_price || line.unit_price)}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {editingInvoice ? (
                            <select value={Number(line.vat_rate || 0)} onChange={e => updateLine(idx, 'vat_rate', Number(e.target.value))}
                              className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-white">
                              <option value={0}>Không</option><option value={5}>5%</option><option value={8}>8%</option>
                            </select>
                          ) : <span className="text-slate-600">{Number(line.vat_rate || 0) ? `${Number(line.vat_rate)}%` : '—'}</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800">{money(lineTotal)}</td>
                        <td className="px-4 py-3">
                          {canEditLines && (
                            <button onClick={() => removeLine(idx)} className="p-1 text-slate-300 hover:text-red-500 transition-colors">
                              <Trash2 size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {order.delivery_confirmed_at && (
              <div className="px-4 py-3 border-t border-green-100 bg-green-50 text-xs text-green-800">
                ✓ Đã xác nhận thực giao lúc {dt(order.delivery_confirmed_at)} bởi {order.delivery_confirmed_by || '—'}.
                {order.pre_delivery_grand_total != null && Number(order.pre_delivery_grand_total) !== Number(order.grand_total) && (
                  <> Tổng tiền: <b>{money(order.pre_delivery_grand_total)}</b> → <b>{money(order.grand_total)}</b>.</>
                )}
                {order.delivery_note ? ` Ghi chú: ${order.delivery_note}` : ''}
              </div>
            )}
            {reconcileAvailable && (
              <div className="px-4 py-3 border-t border-amber-100 bg-amber-50 flex items-center justify-between gap-3 flex-wrap">
                <p className="text-xs text-amber-800">Nhập <b>số lượng thực giao</b> ở cột "Đã giao" rồi bấm xác nhận — hóa đơn sẽ tính theo số thực giao.</p>
                <div className="flex gap-2">
                  <button onClick={() => reconcile(true)} disabled={reconciling}
                    className="px-3 py-1.5 bg-white border border-green-300 text-green-700 rounded-lg text-xs font-semibold hover:bg-green-50 disabled:opacity-50">
                    Giao đủ 100%
                  </button>
                  <button onClick={() => reconcile(false)} disabled={reconciling}
                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 disabled:opacity-50">
                    {reconciling ? 'Đang xử lý...' : 'Xác nhận thực giao & tính lại tiền'}
                  </button>
                </div>
              </div>
            )}
            {!('delivery_confirmed_at' in order) && (
            <div className="px-4 py-2 border-t border-slate-100 flex justify-end">
              <button onClick={saveFulfillment} disabled={savingFulfillment}
                className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-200 disabled:opacity-50">
                {savingFulfillment ? 'Đang lưu...' : 'Lưu số lượng đã giao'}
              </button>
            </div>
            )}

            {/* Add Product */}
            {canEditLines && (
              <div className="p-4 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Thêm sản phẩm vào đơn</p>
                <div className="relative">
                  <SearchIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" value={productSearch} onChange={e => setProductSearch(e.target.value)}
                    placeholder="Gõ tên sản phẩm để tìm (tự gợi ý)..." className="pl-8 pr-8 py-2 w-full border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20" />
                  {searchingProducts && <RefreshCw size={14} className="animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />}
                </div>
                {productSearch.trim().length >= 2 && (
                  <div className="mt-2 border border-slate-200 rounded-lg overflow-hidden">
                    {productResults.map(p => (
                      <button key={p.id} onClick={() => addProduct(p)}
                        className="w-full flex items-center justify-between px-3 py-2 hover:bg-green-50 text-left border-b border-slate-100 last:border-0 transition-colors">
                        <div>
                          <p className="text-sm font-medium text-slate-800">{p.name}</p>
                          <p className="text-xs text-slate-400">{p.categoryLabel || ''} · {p.unit || 'Kg'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-green-700">{money(p.price)}</span>
                          <Plus size={16} className="text-green-600" />
                        </div>
                      </button>
                    ))}
                    {!searchingProducts && productResults.length === 0 && (
                      <p className="px-3 py-2 text-xs text-slate-400">Không tìm thấy — có thể tạo mới bên dưới.</p>
                    )}
                    {!editingInvoice && <button onClick={() => setShowQuickAdd(true)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-green-700 hover:bg-green-50 border-t border-slate-100">
                      <Plus size={15} /> Thêm sản phẩm mới "{productSearch}"
                    </button>}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section: Kiểm tra từ Thu mua */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <ClipboardCheck size={18} className="text-teal-600" />
                Kiểm tra từ Thu mua
              </h2>
              {procurementReview ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-slate-100 text-slate-600 font-mono px-2 py-0.5 rounded">
                    v{procurementReview.version}
                  </span>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    procurementReview.status === 'accepted_by_operations'
                      ? 'bg-emerald-100 text-emerald-700'
                      : procurementReview.status === 'responded'
                      ? 'bg-purple-100 text-purple-700'
                      : procurementReview.status === 'needs_revision'
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {procurementReview.status === 'pending_acceptance' && 'Chờ Thu mua tiếp nhận'}
                    {procurementReview.status === 'in_review' && 'Thu mua đang kiểm tra'}
                    {procurementReview.status === 'responded' && 'Thu mua đã phản hồi'}
                    {procurementReview.status === 'needs_revision' && 'Cần kiểm tra lại'}
                    {procurementReview.status === 'accepted_by_operations' && 'Vận hành đã duyệt kết quả'}
                  </span>
                </div>
              ) : (
                <span className="text-xs text-slate-400">Chưa gửi yêu cầu</span>
              )}
            </div>

            <div className="p-5 space-y-4">
              {!procurementReview ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Đơn hàng chưa được gửi cho Thu mua kiểm tra</p>
                    <p className="text-xs text-slate-500 mt-0.5">Thu mua sẽ kiểm tra khả năng đáp ứng kho, bổ sung giá và đề xuất sản phẩm thay thế.</p>
                  </div>
                  {['pending', 'processing'].includes(order.status) && (
                    <button
                      onClick={handleSendToProcurement}
                      disabled={requestingReview}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm whitespace-nowrap disabled:opacity-50"
                    >
                      <Send size={14} />
                      <span>{requestingReview ? 'Đang gửi...' : 'Gửi Thu mua kiểm tra'}</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Staff & Timestamp summary */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div>
                      Thu mua phụ trách:{' '}
                      <span className="font-semibold text-slate-800">
                        {procurementReview.assigned_to_profile?.full_name || 'Chưa có nhân viên nhận'}
                      </span>
                    </div>
                    <div>
                      Tiếp nhận lúc:{' '}
                      <span className="font-medium text-slate-700">
                        {procurementReview.accepted_at ? dt(procurementReview.accepted_at) : '---'}
                      </span>
                    </div>
                    <div>
                      Phản hồi lúc:{' '}
                      <span className="font-medium text-slate-700">
                        {procurementReview.responded_at ? dt(procurementReview.responded_at) : '---'}
                      </span>
                    </div>
                  </div>

                  {/* Items comparison table */}
                  {Array.isArray(procurementReview.items) && procurementReview.items.length > 0 && (
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3">Sản phẩm</th>
                            <th className="py-2.5 px-2 text-center">Khách đặt</th>
                            <th className="py-2.5 px-2 text-center">Đáp ứng</th>
                            <th className="py-2.5 px-2 text-center">Thiếu</th>
                            <th className="py-2.5 px-3">Kết quả</th>
                            <th className="py-2.5 px-3">Đề xuất / Ghi chú</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {procurementReview.items.map((item: any) => {
                            const isShortage = Number(item.shortage_qty) > 0;
                            return (
                              <tr key={item.id} className={isShortage ? 'bg-amber-50/40' : ''}>
                                <td className="py-2.5 px-3">
                                  <div className="font-medium text-slate-800">{item.order_item?.product_name || '---'}</div>
                                  <div className="text-[11px] text-slate-400 font-mono">SKU: {item.order_item?.sku || '---'}</div>
                                </td>
                                <td className="py-2.5 px-2 text-center font-bold">{item.requested_qty}</td>
                                <td className="py-2.5 px-2 text-center font-semibold text-teal-700">{item.available_qty}</td>
                                <td className="py-2.5 px-2 text-center">
                                  <span className={isShortage ? 'text-rose-600 font-bold' : 'text-slate-400'}>
                                    {item.shortage_qty}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="px-2 py-0.5 rounded font-medium text-[11px] bg-slate-100 text-slate-700">
                                    {item.result_status}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-[11px] text-slate-600 space-y-0.5">
                                  {item.proposed_product && (
                                    <div className="font-medium text-teal-800">Đổi SP: {item.proposed_product.name}</div>
                                  )}
                                  {item.proposed_price != null && (
                                    <div className="font-semibold text-blue-700">Giá đề xuất: {money(item.proposed_price)}</div>
                                  )}
                                  {item.note && <div className="italic text-slate-500">Ghi chú: {item.note}</div>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Operations actions on review */}
                  {procurementReview.status === 'responded' && (
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-between gap-3 flex-wrap">
                      <div className="text-xs text-purple-900 font-medium">
                        Thu mua đã phản hồi kết quả kiểm tra. Vui lòng rà soát và chấp nhận kết quả để tiếp tục chốt đơn.
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setRevisionModalOpen(true)}
                          disabled={respondingReview}
                          className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-white border border-rose-200 rounded-lg hover:bg-rose-50 shadow-sm"
                        >
                          Yêu cầu kiểm tra lại
                        </button>
                        <button
                          onClick={handleAcceptProcurementReview}
                          disabled={respondingReview}
                          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm"
                        >
                          {respondingReview ? 'Đang duyệt...' : 'Chấp nhận kết quả'}
                        </button>
                      </div>
                    </div>
                  )}

                  {procurementReview.status === 'accepted_by_operations' && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                      <span>Kết quả kiểm tra đã được Vận hành chấp nhận. Bạn có thể chốt đơn và phát hành Phiếu xác nhận.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Pricing Editor */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-800 flex items-center gap-2"><CheckCircle2 size={18} className="text-blue-600" />Kiểm tra bảng giá &amp; Chốt đơn</h2>
              {order.pricing_status === 'finalized' ? (
                <span className="text-xs font-semibold text-green-700 bg-green-100 px-3 py-1 rounded-full">Đã chốt R{order.price_revision || 1}</span>
              ) : (
                <span className="text-xs text-amber-600 bg-amber-100 px-3 py-1 rounded-full">Giá tạm tính</span>
              )}
            </div>
            <div className="p-5 space-y-5">
              {isLocked && <div className="p-3 bg-slate-50 text-slate-500 text-sm rounded-lg border border-slate-200">⚠️ Đơn đã thanh toán/đang giao/hoàn thành nên không thể chỉnh giá.</div>}
              {!canFinalizePricing && !isLocked && <div className="p-3 bg-amber-50 text-amber-800 text-sm rounded-lg border border-amber-200">🔒 Tài khoản này chỉ được theo dõi/bổ sung thông tin. Sale, Trưởng phòng phụ trách hoặc Admin sẽ chốt giá cuối.</div>}

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm">
                <p className="font-semibold text-emerald-800">Bảng giá áp dụng</p>
                <p className="text-emerald-700 mt-1">
                  {order.price_book?.name || (order.price_resolution_status === 'manual' ? 'Có điều chỉnh thủ công' : 'Chưa xác định bảng giá')}
                  {order.price_book?.version ? ` · Phiên bản ${order.price_book.version}` : ''}
                </p>
                {order.customer_price_source && <p className="text-xs text-emerald-600 mt-1">Nguồn giá: {order.customer_price_source}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Cách chốt giá</label>
                  <select value={pricingMode} onChange={e => setPricingMode(e.target.value)} disabled={isLocked || !canFinalizePricing}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 disabled:opacity-60">
                    {PRICING_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Phí giao hàng</label>
                  <input type="number" min="0" step="1000" value={shippingAmount} onChange={e => setShippingAmount(Number(e.target.value))} disabled={isLocked || !canFinalizePricing}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 disabled:opacity-60" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Ghi chú kiểm tra bảng giá</label>
                  <textarea value={verificationNote} onChange={e => setVerificationNote(e.target.value)} disabled={isLocked || !canFinalizePricing} rows={2}
                    placeholder="Nguồn bảng giá, nội dung đã trao đổi với Thu mua..."
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 resize-none disabled:opacity-60" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Ghi chú xác nhận giá</label>
                  <textarea value={pricingNote} onChange={e => setPricingNote(e.target.value)} disabled={isLocked || !canFinalizePricing} rows={2}
                    placeholder="Lý do điều chỉnh giá..."
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 resize-none disabled:opacity-60" />
                </div>
              </div>

              {/* Totals Preview */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm border border-slate-100">
                <div className="flex justify-between text-slate-500"><span>Giá trị gốc</span><span>{money(totals.subtotal)}</span></div>
                <div className="flex justify-between text-slate-500">
                  <span>Giảm/điều chỉnh</span>
                  <span className="text-red-600">-{money(Math.max(0, totals.subtotal - totals.merchandise))}</span>
                </div>
                <div className="flex justify-between text-slate-500"><span>Phí giao hàng</span><span>{money(shippingAmount)}</span></div>
                <div className="flex justify-between font-bold text-base text-slate-800 pt-2 border-t border-slate-200">
                  <span>Tổng sau xác nhận</span><span className="text-green-700">{money(totals.total)}</span>
                </div>
              </div>

              {!isLocked && canFinalizePricing && ['pending', 'processing'].includes(order?.status) && procurementReview?.status !== 'accepted_by_operations' && (
                <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      id="bypassProcurement"
                      checked={bypassProcurement}
                      onChange={(e) => setBypassProcurement(e.target.checked)}
                      disabled={!canBypassReview}
                      className="w-4 h-4 mt-0.5 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                    />
                    <div>
                      <label htmlFor="bypassProcurement" className="text-xs font-bold text-amber-900 cursor-pointer block">
                        Duyệt khẩn cấp / Bỏ qua kiểm tra Thu mua
                      </label>
                      <p className="text-[11px] text-amber-700">
                        {canBypassReview
                          ? 'Dành riêng cho Quản lý / Đơn hỏa tốc không cần chờ phòng Thu mua phản hồi kho.'
                          : 'Yêu cầu quyền Quản trị hoặc Phê duyệt vượt hạn mức để sử dụng tính năng này.'}
                      </p>
                    </div>
                  </div>
                  {bypassProcurement && (
                    <div className="pt-1">
                      <label className="block text-[11px] font-semibold text-amber-800 mb-1">
                        Lý do bỏ qua bước kiểm tra <span className="text-rose-600">*</span>:
                      </label>
                      <textarea
                        value={bypassReason}
                        onChange={(e) => setBypassReason(e.target.value)}
                        rows={2}
                        placeholder="Bắt buộc nhập lý do (VD: Hàng có sẵn tại cửa hàng, Giám đốc duyệt xuất nóng)..."
                        className="w-full text-xs border border-amber-300 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      />
                    </div>
                  )}
                </div>
              )}

              {!isLocked && canFinalizePricing && (
                <button onClick={handleFinalize} disabled={saving}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-60 transition-colors shadow-lg shadow-green-900/20">
                  <Save size={18} />
                  {saving ? 'Đang lưu...' : order.pricing_status === 'finalized' ? 'Chốt lại & tạo PDF mới' : 'Xác nhận khách & Chốt giá'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right: Info + History */}
        <div className="space-y-6">
          {/* Customer Info */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4">
            <h2 className="font-bold text-slate-800 flex items-center gap-2"><User size={18} className="text-green-600" />Khách hàng</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <User size={16} className="text-slate-400 mt-0.5 shrink-0" />
                <div><p className="font-semibold text-slate-800">{order.customer_name}</p><p className="text-slate-400">{order.customer_code} · {order.price_book?.name || 'Bảng giá chung'}</p></div>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <Phone size={16} className="text-slate-400 shrink-0" />{order.customer_phone || '—'}
              </div>
              {order.sales_rep_name && (
                <p className="text-xs text-slate-400">Sale phụ trách: <span className="text-slate-600 font-medium">{order.sales_rep_name}</span></p>
              )}
              <p className="text-xs text-slate-400">
                Nhân viên xử lý:{' '}
                <span className={`font-medium ${order.processing_by_name ? 'text-blue-700' : 'text-amber-700'}`}>
                  {order.processing_by_name || 'Chưa có người tiếp nhận'}
                </span>
              </p>
              {order.note && <div className="p-3 bg-amber-50 text-amber-800 rounded-lg text-xs border border-amber-100">{order.note}</div>}
            </dl>
          </div>

          {/* Giao hàng — hoàn thiện Giai đoạn C: hiện rõ người nhận khi khác
              chủ tài khoản (đơn tạo qua POS cho phép nhập người nhận riêng),
              trước đây chỉ hiện địa chỉ, không hiện tên/SĐT người nhận. */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-3">
            <h2 className="font-bold text-slate-800 flex items-center gap-2"><Truck size={18} className="text-green-600" />Giao hàng</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                {order.delivery_type === 'pickup' ? 'Nhận tại điểm' : 'Giao tận nơi'}
              </span>
            </div>
            {order.delivery_type !== 'pickup' && (
              <dl className="space-y-2 text-sm">
                {(order.delivery_name && order.delivery_name !== order.customer_name) || (order.delivery_phone && order.delivery_phone !== order.customer_phone) ? (
                  <div className="flex items-start gap-3">
                    <User size={16} className="text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-slate-800">{order.delivery_name || order.customer_name}</p>
                      <p className="text-xs text-amber-600">Người nhận khác chủ tài khoản</p>
                    </div>
                  </div>
                ) : null}
                {order.delivery_phone && order.delivery_phone !== order.customer_phone && (
                  <div className="flex items-center gap-3 text-slate-600">
                    <Phone size={16} className="text-slate-400 shrink-0" />{order.delivery_phone}
                  </div>
                )}
                <div className="flex items-start gap-3 text-slate-600">
                  <MapPin size={16} className="text-slate-400 mt-0.5 shrink-0" />
                  <span>{order.delivery_address || 'Chưa có địa chỉ'}{order.delivery_alias ? ` (${order.delivery_alias})` : ''}</span>
                </div>
              </dl>
            )}

            {/* Kiện hàng tự vận chuyển (mục 14.2-1 KE_HOACH) */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase">Kiện hàng &amp; người giao</p>
              <div className="grid grid-cols-2 gap-2">
                <input type="number" min="0" value={deliveryForm.packageWeightG}
                  onChange={e => setDeliveryForm(f => ({ ...f, packageWeightG: e.target.value }))}
                  placeholder="Khối lượng (gram)" className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm" />
                <input type="text" value={deliveryForm.packageDimensions}
                  onChange={e => setDeliveryForm(f => ({ ...f, packageDimensions: e.target.value }))}
                  placeholder="Kích thước DxRxC (cm)" className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm" />
                <input type="text" value={deliveryForm.assignedDriver}
                  onChange={e => setDeliveryForm(f => ({ ...f, assignedDriver: e.target.value }))}
                  placeholder="Người giao hàng" className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm" />
                <input type="number" min="0" step="1000" value={deliveryForm.codCollectAmount}
                  onChange={e => setDeliveryForm(f => ({ ...f, codCollectAmount: e.target.value }))}
                  placeholder="Thu hộ COD (đ)" className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm" />
              </div>
              <button onClick={saveDelivery} disabled={savingDelivery}
                className="w-full py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-200 disabled:opacity-50">
                {savingDelivery ? 'Đang lưu...' : 'Lưu thông tin giao hàng'}
              </button>
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4">
            <h2 className="font-bold text-slate-800 flex items-center gap-2"><FileText size={18} className="text-green-600" />Tổng kết đơn</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Tạm tính</span><span className="font-medium">{money(order.subtotal)}</span></div>
              <div className="flex justify-between items-center gap-2"><span className="text-slate-500">Chiết khấu</span>{editingInvoice ? <input type="number" min="0" value={invoiceDiscountAmount} onChange={e => setInvoiceDiscountAmount(Number(e.target.value))} className="w-28 border border-slate-200 rounded-lg px-2 py-1 text-right" /> : <span className="text-red-600 font-medium">-{money(order.discount_amount)}</span>}</div>
              <div className="flex justify-between items-center gap-2"><span className="text-slate-500">Phí giao hàng</span>{editingInvoice ? <input type="number" min="0" value={shippingAmount} onChange={e => setShippingAmount(Number(e.target.value))} className="w-28 border border-slate-200 rounded-lg px-2 py-1 text-right" /> : <span className="font-medium">{money(order.shipping_amount || 0)}</span>}</div>
              <div className="flex justify-between"><span className="text-slate-500">VAT</span><span className="font-medium">{money(editingInvoice ? totals.tax : Number(order.tax_amount || 0))}</span></div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t border-slate-100">
                <span>Tổng thanh toán</span><span className="text-green-700">{money(editingInvoice ? totals.total : order.grand_total)}</span>
              </div>
              {order.status === 'completed' && Number(order.return_credit_amount || 0) > 0 && (
                <>
                  <div className="flex justify-between text-orange-700"><span>Đã đổi/trả</span><span>-{money(order.return_credit_amount)}</span></div>
                  <div className="flex justify-between font-bold"><span>Còn phải thu</span><span>{money(Math.max(0, Number(order.grand_total) - Number(order.return_credit_amount || 0) - Number(order.paid_amount || 0)))}</span></div>
                </>
              )}
            </dl>
            {editingInvoice && (
              <textarea value={invoiceNote} onChange={e => setInvoiceNote(e.target.value)} rows={2} placeholder="Ghi chú hóa đơn"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            )}
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">Thanh toán</p>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                order.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
                order.payment_status === 'cod' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
              }`}>{PAYMENT_LABELS[order.payment_status] || order.payment_status}</span>
            </div>
          </div>

          {/* Payments (Giai đoạn C) */}
          {paymentsAvailable && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4">
              <h2 className="font-bold text-slate-800 flex items-center gap-2"><Wallet size={18} className="text-green-600" />Thanh toán</h2>

              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Đã thu</span><span className="font-semibold text-green-700">{money(order.paid_amount || 0)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Còn nợ</span><span className="font-semibold text-red-600">{money(order.debt_amount ?? order.grand_total)}</span></div>
              </dl>

              {Number(order.debt_amount ?? order.grand_total) > 0 && (
                <div className="space-y-2 pt-3 border-t border-slate-50">
                  <div className="grid grid-cols-2 gap-2">
                    <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
                      className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm">
                      {Object.entries(PAYMENT_METHOD_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={paymentAmount}
                      onChange={e => setPaymentAmount(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder={String(Math.round(Number(order.debt_amount ?? order.grand_total)))}
                      className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-right font-medium"
                    />
                  </div>
                  <input type="text" value={paymentNote} onChange={e => setPaymentNote(e.target.value)}
                    placeholder="Ghi chú (không bắt buộc)" className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm" />
                  <button onClick={submitPayment} disabled={submittingPayment}
                    className="w-full py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900 disabled:opacity-50">
                    {submittingPayment ? 'Đang lưu...' : 'Ghi nhận thanh toán'}
                  </button>
                </div>
              )}

              {payments.length > 0 && (
                <div className="pt-3 border-t border-slate-50 space-y-1.5 max-h-48 overflow-y-auto">
                  {payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-xs text-slate-500">
                      <span>{p.methodLabel} {p.note ? `— ${p.note}` : ''}</span>
                      <span className="font-semibold text-slate-700 shrink-0 ml-2">{money(p.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* History */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <h2 className="font-bold text-slate-800 flex items-center gap-2 mb-4"><Clock size={18} className="text-green-600" />Lịch sử xử lý</h2>
            {history.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">Chưa có lịch sử cập nhật.</p>
            ) : (
              <div className="space-y-3">
                {history.map((h: any, i: number) => (
                  <div key={i} className="flex gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-green-400 mt-1.5 shrink-0"></div>
                    <div>
                      <p className="font-medium text-slate-700">{STATUS_LABELS[h.to_status] || h.action || 'Cập nhật'}</p>
                      <p className="text-xs text-slate-400">{dt(h.created_at)} · {h.actor || 'Hệ thống'}{h.note ? ` · ${h.note}` : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {invoiceAdjustments.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <h2 className="font-bold text-slate-800 flex items-center gap-2 mb-4"><ClipboardEdit size={18} className="text-blue-600" />Lịch sử can thiệp hóa đơn</h2>
              <div className="space-y-3">
                {invoiceAdjustments.map((item: any) => (
                  <div key={item.id} className="border border-slate-200 rounded-xl p-3 text-sm space-y-1">
                    <div className="flex justify-between gap-2"><b>{item.adjustment_number}</b><span className="text-xs text-slate-400">{dt(item.created_at)}</span></div>
                    <p className="text-slate-700">{item.reason}</p>
                    <p className="text-xs text-slate-500">Người thực hiện: <b>{item.created_by_name}</b> · Lần {item.revision_from} → {item.revision_to}</p>
                    <div className="text-xs flex flex-wrap gap-x-4 gap-y-1">
                      <span>Tổng tiền: <b>{money(item.total_before)}</b> → <b>{money(item.total_after)}</b></span>
                      <span>Công nợ: <b>{money(item.debt_before)}</b> → <b>{money(item.debt_after)}</b></span>
                      {Number(item.customer_credit_amount || 0) > 0 && <span className="text-emerald-700">Số dư có: <b>{money(item.customer_credit_amount)}</b></span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showReturnModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/45 flex items-center justify-center p-4" onMouseDown={() => setShowReturnModal(false)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div><h3 className="font-bold text-lg">Đổi/Trả hàng</h3><p className="text-xs text-slate-500">Hóa đơn {order.invoice_number || order.order_code} · Hóa đơn gốc không bị sửa</p></div>
              <button onClick={() => setShowReturnModal(false)} className="p-2 rounded-lg hover:bg-slate-100"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-2">
                {lines.map((line) => (
                  <div key={line.itemId} className="grid grid-cols-[1fr_120px] gap-3 items-center border border-slate-200 rounded-xl p-3">
                    <div><p className="font-semibold text-sm">{line.name}</p><p className="text-xs text-slate-500">Đã giao: {line.quantity} {line.unit} · {money(line.unit_price)}</p></div>
                    <input type="number" min="0" max={line.quantity} step="0.001" value={returnQuantities[String(line.itemId)] || ''}
                      onChange={(e) => setReturnQuantities((prev) => ({ ...prev, [String(line.itemId)]: e.target.value }))}
                      placeholder="SL trả" className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                ))}
              </div>
              <textarea value={returnReason} onChange={(e) => setReturnReason(e.target.value)} rows={3}
                placeholder="Lý do đổi/trả (bắt buộc)" className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm" />
              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl p-3">Phiếu sẽ điều chỉnh công nợ ngay. Hàng trả được ghi nhận “Chờ xử lý kho”, chưa tự cộng tồn.</div>
              <button onClick={submitSalesReturn} disabled={submittingReturn}
                className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold disabled:opacity-50">
                {submittingReturn ? 'Đang xác nhận...' : 'Xác nhận đổi/trả'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showQuickAdd && (
        <QuickAddProductModal
          apiBase={import.meta.env.VITE_API_BASE_URL || ''}
          token={token}
          initialName={productSearch}
          onClose={() => setShowQuickAdd(false)}
          onCreated={(product) => {
            addProduct({ id: product.id, name: product.name, sku: product.sku, unit: product.unit, price: product.price_retail });
            setShowQuickAdd(false);
          }}
        />
      )}

      {revisionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/45 flex items-center justify-center p-4" onMouseDown={() => setRevisionModalOpen(false)}>
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-5 space-y-4" onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                <AlertCircle size={18} className="text-rose-500" />
                Yêu cầu Thu mua kiểm tra lại
              </h3>
              <button onClick={() => setRevisionModalOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
                <X size={16} />
              </button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Lý do yêu cầu kiểm tra lại <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={revisionReasonText}
                onChange={(e) => setRevisionReasonText(e.target.value)}
                rows={3}
                placeholder="VD: Khách không đồng ý đổi sản phẩm, đề xuất kiểm tra nhà cung cấp khác..."
                className="w-full text-xs border border-slate-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRevisionModalOpen(false)}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Hủy
              </button>
              <button
                onClick={handleRequestProcurementRevision}
                disabled={respondingReview || !revisionReasonText.trim()}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl disabled:opacity-50"
              >
                {respondingReview ? 'Đang gửi...' : 'Gửi yêu cầu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
