import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  ArrowLeft, User, Phone, MapPin, RefreshCw, CheckCircle2,
  Clock, Package, FileText, Plus, Trash2, Save, Search as SearchIcon, Wallet
} from 'lucide-react';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Tiền mặt', transfer: 'Chuyển khoản', cod: 'Thu hộ COD', debt_collection: 'Thu công nợ',
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
  { value: 'tier', label: 'Theo hạng khách hàng' },
  { value: 'order_discount', label: 'Chiết khấu riêng toàn đơn' },
  { value: 'manual_item_price', label: 'Đơn giá thủ công từng sản phẩm' },
];

function money(v: number | string) { return new Intl.NumberFormat('vi-VN').format(Number(v) || 0) + 'đ'; }
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
  isNew?: boolean;
}

export default function OrderDetailPage() {
  const { id } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tiers, setTiers] = useState<any[]>([]);

  // Pricing editor state
  const [selectedTier, setSelectedTier] = useState('VIP0');
  const [pricingMode, setPricingMode] = useState('tier');
  const [orderDiscountPercent, setOrderDiscountPercent] = useState(0);
  const [shippingAmount, setShippingAmount] = useState(0);
  const [lines, setLines] = useState<LineItem[]>([]);
  const [verificationNote, setVerificationNote] = useState('');
  const [pricingNote, setPricingNote] = useState('');

  // Product search for add item
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<any[]>([]);
  const [searchingProducts, setSearchingProducts] = useState(false);

  // Giai đoạn C: ghi nhận thanh toán tách 3 phần (order_payments — cần
  // migration 20260910d_order_payments.sql). Nếu migration CHƯA chạy, API
  // trả lỗi -> paymentsAvailable=false, ẩn cả khối này thay vì hiện lỗi vỡ
  // giao diện, để trang vẫn dùng tốt các phần khác trong lúc chờ.
  const [payments, setPayments] = useState<any[]>([]);
  const [paymentsAvailable, setPaymentsAvailable] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

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
    const amount = Number(paymentAmount);
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
            customer_tier: quoteData.customer_tier || 'VIP0',
            pricing_mode: 'tier',
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

      if (!data) {
        // Try fallback via backend API if available
        try {
          const apiBase = import.meta.env.VITE_API_BASE_URL || '';
          const res = await fetch(`${apiBase}/api/admin/orders?id=${id}`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          const jsonRes = await res.json();
          if (jsonRes.ok && jsonRes.order) {
            data = jsonRes.order;
          }
        } catch (e) {
          console.warn('API fallback error:', e);
        }
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
      })));
      setSelectedTier(data.customer_tier || 'VIP0');
      setPricingMode(data.pricing_mode || 'tier');
      setOrderDiscountPercent(Number(data.manual_discount_percent || 0));
      setShippingAmount(Number(data.shipping_amount || 0));
      setPricingNote(data.pricing_note || '');

      const { data: tiersData } = await supabase.from('customer_tiers').select('*').order('code');
      setTiers(tiersData || []);
    } catch (err) {
      console.error('Error fetching order:', err);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  // Realtime price calculation
  const calcTotals = useCallback(() => {
    const tierDiscount = tiers.find(t => t.code === selectedTier)?.discount_percent || 0;
    let subtotal = 0, merchandise = 0;
    const priced = lines.map(line => {
      let up = line.base_unit_price;
      if (pricingMode === 'tier') up = Math.round(line.base_unit_price * (1 - tierDiscount / 100));
      else if (pricingMode === 'order_discount') up = Math.round(line.base_unit_price * (1 - orderDiscountPercent / 100));
      else up = line.unit_price;
      subtotal += Math.round(line.base_unit_price * line.quantity);
      merchandise += Math.round(up * line.quantity);
      return { ...line, unit_price: pricingMode === 'manual_item_price' ? line.unit_price : up };
    });
    return { subtotal, merchandise, total: merchandise + shippingAmount, priced };
  }, [lines, pricingMode, selectedTier, orderDiscountPercent, shippingAmount, tiers]);

  const totals = calcTotals();

  const isLocked = order && (['shipping', 'completed', 'canceled'].includes(order.status) || ['paid', 'refunded'].includes(order.payment_status));

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

  const handleFinalize = async () => {
    if (!confirm(`Xác nhận khách ở hạng ${selectedTier} và chốt tổng đơn ${money(totals.total)}?`)) return;
    setSaving(true);
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${apiBase}/api/admin/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          orderId: order.id,
          customerTier: selectedTier,
          pricingMode,
          orderDiscountPercent,
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
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || data.warning || 'Không chốt được đơn');
      alert(data.warning || `✅ Đã chốt giá ${order.order_code} thành công!`);
      await fetchOrder();
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    } finally { setSaving(false); }
  };

  const changeStatus = async (newStatus: string) => {
    const note = prompt(`Chuyển sang "${STATUS_LABELS[newStatus]}". Ghi chú:`, '') ?? null;
    if (note === null) return;
    setSaving(true);
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${apiBase}/api/admin/orders`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ orderId: order.id, status: newStatus, note }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      await fetchOrder();
    } catch (err: any) { alert('Lỗi: ' + err.message); }
    finally { setSaving(false); }
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
            disabled={saving}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20">
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <button onClick={fetchOrder} className="p-2 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50">
            <RefreshCw size={18} className={saving || loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

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
                    <th className="px-4 py-3 text-right">Đơn giá</th>
                    <th className="px-4 py-3 text-right">Thành tiền</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lines.map((line, idx) => {
                    const priced = totals.priced[idx];
                    const lineTotal = Math.round((priced?.unit_price || line.unit_price) * line.quantity);
                    return (
                      <tr key={idx} className={`hover:bg-slate-50/50 ${isLocked ? 'opacity-70' : ''}`}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{line.name}</p>
                          <p className="text-xs text-slate-400">{line.sku ? `SKU: ${line.sku} · ` : ''}Giá gốc {money(line.base_unit_price)}</p>
                          {!isLocked && (
                            <input type="text" value={line.pricing_note || ''} onChange={e => updateLine(idx, 'pricing_note', e.target.value)}
                              placeholder="Quy cách / ghi chú riêng..." className="mt-1 text-xs w-full border-0 border-b border-slate-200 focus:outline-none focus:border-green-500 bg-transparent text-slate-500" />
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {!isLocked ? (
                            <input type="number" min="0.001" step="0.001" value={line.quantity}
                              onChange={e => updateLine(idx, 'quantity', Number(e.target.value))}
                              className="w-20 text-center border border-slate-200 rounded-lg p-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20" />
                          ) : (
                            <span className="font-medium">{line.quantity} {line.unit}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {!isLocked && pricingMode === 'manual_item_price' ? (
                            <input type="number" min="0" step="1000" value={line.unit_price}
                              onChange={e => updateLine(idx, 'unit_price', Number(e.target.value))}
                              className="w-28 text-right border border-slate-200 rounded-lg p-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20" />
                          ) : (
                            <span className="text-slate-600">{money(priced?.unit_price || line.unit_price)}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800">{money(lineTotal)}</td>
                        <td className="px-4 py-3">
                          {!isLocked && (
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

            {/* Add Product */}
            {!isLocked && (
              <div className="p-4 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Thêm sản phẩm vào đơn</p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <SearchIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" value={productSearch} onChange={e => setProductSearch(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && searchProducts()}
                      placeholder="Nhập tên sản phẩm để tìm..." className="pl-8 pr-3 py-2 w-full border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20" />
                  </div>
                  <button onClick={searchProducts} disabled={searchingProducts}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
                    {searchingProducts ? <RefreshCw size={14} className="animate-spin" /> : 'Tìm'}
                  </button>
                </div>
                {productResults.length > 0 && (
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
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Pricing Editor */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-800 flex items-center gap-2"><CheckCircle2 size={18} className="text-blue-600" />Phân loại khách & Chốt giá</h2>
              {order.pricing_status === 'finalized' ? (
                <span className="text-xs font-semibold text-green-700 bg-green-100 px-3 py-1 rounded-full">Đã chốt R{order.price_revision || 1}</span>
              ) : (
                <span className="text-xs text-amber-600 bg-amber-100 px-3 py-1 rounded-full">Giá tạm tính</span>
              )}
            </div>
            <div className="p-5 space-y-5">
              {isLocked && <div className="p-3 bg-slate-50 text-slate-500 text-sm rounded-lg border border-slate-200">⚠️ Đơn đã thanh toán/đang giao/hoàn thành nên không thể chỉnh giá.</div>}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Hạng khách hàng</label>
                  <select value={selectedTier} onChange={e => setSelectedTier(e.target.value)} disabled={isLocked}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 disabled:opacity-60">
                    {(tiers.length ? tiers : [
                      { code: 'VIP0', name: 'VIP0 - Không chiết khấu', discount_percent: 0 },
                      { code: 'VIP1', name: 'VIP1', discount_percent: 5 },
                      { code: 'VIP2', name: 'VIP2', discount_percent: 10 },
                      { code: 'VIP3', name: 'VIP3', discount_percent: 15 },
                    ]).map(t => <option key={t.code} value={t.code}>{t.name || t.code} ({t.discount_percent || 0}%)</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Chế độ tính giá</label>
                  <select value={pricingMode} onChange={e => setPricingMode(e.target.value)} disabled={isLocked}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 disabled:opacity-60">
                    {PRICING_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                {pricingMode === 'order_discount' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Chiết khấu riêng (%)</label>
                    <input type="number" min="0" max="100" value={orderDiscountPercent} onChange={e => setOrderDiscountPercent(Number(e.target.value))} disabled={isLocked}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 disabled:opacity-60" />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Phí giao hàng</label>
                  <input type="number" min="0" step="1000" value={shippingAmount} onChange={e => setShippingAmount(Number(e.target.value))} disabled={isLocked}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 disabled:opacity-60" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Ghi chú phân loại khách</label>
                  <textarea value={verificationNote} onChange={e => setVerificationNote(e.target.value)} disabled={isLocked} rows={2}
                    placeholder="Lý do giữ VIP0 hoặc nâng hạng..."
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 resize-none disabled:opacity-60" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Ghi chú xác nhận giá</label>
                  <textarea value={pricingNote} onChange={e => setPricingNote(e.target.value)} disabled={isLocked} rows={2}
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

              {!isLocked && (
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
                <div><p className="font-semibold text-slate-800">{order.customer_name}</p><p className="text-slate-400">{order.customer_code} · {order.customer_tier || 'VIP0'}</p></div>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <Phone size={16} className="text-slate-400 shrink-0" />{order.customer_phone || '—'}
              </div>
              <div className="flex items-start gap-3 text-slate-600">
                <MapPin size={16} className="text-slate-400 mt-0.5 shrink-0" />{order.delivery_address || 'Nhận tại điểm'}
              </div>
              {order.note && <div className="p-3 bg-amber-50 text-amber-800 rounded-lg text-xs border border-amber-100">{order.note}</div>}
            </dl>
          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4">
            <h2 className="font-bold text-slate-800 flex items-center gap-2"><FileText size={18} className="text-green-600" />Tổng kết đơn</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Tạm tính</span><span className="font-medium">{money(order.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Chiết khấu ({order.discount_percent || 0}%)</span><span className="text-red-600 font-medium">-{money(order.discount_amount)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Phí giao hàng</span><span className="font-medium">{money(order.shipping_amount || 0)}</span></div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t border-slate-100">
                <span>Tổng thanh toán</span><span className="text-green-700">{money(order.grand_total)}</span>
              </div>
            </dl>
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
                    <input type="number" min="0" step="1000" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)}
                      placeholder="Số tiền" className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm" />
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
                      <p className="text-xs text-slate-400">{dt(h.created_at)}{h.note ? ` · ${h.note}` : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
