import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Search, Plus, Tag, Truck, RefreshCw, ShoppingCart, User, X, CheckCircle2, AlertTriangle, PlusCircle
} from 'lucide-react';

function money(v: number) { return new Intl.NumberFormat('vi-VN').format(Number(v) || 0) + 'đ'; }

function getImgUrl(url?: string) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `https://yntgxollwjemyidizhnn.supabase.co/storage/v1/object/public/products/${url}`;
}

interface CartItem {
  productId: string | null;
  name: string;
  unit: string;
  quantity: number;
  price: number;
  image_url?: string;
}

// Giai đoạn C (bổ sung 2026-09-10) — "mở nhiều đơn cùng lúc" như màn Bán
// Hàng KiotViet thật: sale phục vụ nhiều khách/đơn song song bằng các tab
// riêng, chuyển qua lại không mất dữ liệu. Mỗi tab là 1 OrderTab độc lập,
// lưu tạm vào sessionStorage để không mất trắng nếu lỡ F5.
interface OrderTab {
  id: string;
  selectedCustomerId: string;
  customerDebt: number | null;
  deliveryName: string;
  deliveryPhone: string;
  deliveryAddress: string;
  note: string;
  cart: CartItem[];
  discountAmount: number;
  voucherCode: string;
  voucherDiscount: number;
  shippingAmount: number;
}

function newTab(): OrderTab {
  return {
    id: (crypto as any).randomUUID ? crypto.randomUUID() : `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    selectedCustomerId: '', customerDebt: null,
    deliveryName: '', deliveryPhone: '', deliveryAddress: '', note: '',
    cart: [], discountAmount: 0, voucherCode: '', voucherDiscount: 0, shippingAmount: 0,
  };
}

const TABS_STORAGE_KEY = 'tps1_pos_tabs';

export default function PosCreatePage() {
  const { user, token } = useAuth();

  const [customers, setCustomers] = useState<any[]>([]);
  const [loadingDebt, setLoadingDebt] = useState(false);

  const [tabs, setTabs] = useState<OrderTab[]>(() => {
    try {
      const saved = sessionStorage.getItem(TABS_STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : null;
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch { /* ignore */ }
    return [newTab()];
  });
  const [activeTabId, setActiveTabId] = useState(() => tabs[0].id);
  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  useEffect(() => {
    sessionStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(tabs));
  }, [tabs]);

  const updateActiveTab = useCallback((patch: Partial<OrderTab> | ((t: OrderTab) => Partial<OrderTab>)) => {
    setTabs(prev => prev.map(t => t.id !== activeTabId ? t : { ...t, ...(typeof patch === 'function' ? patch(t) : patch) }));
  }, [activeTabId]);

  const addTab = () => {
    const t = newTab();
    setTabs(prev => [...prev, t]);
    setActiveTabId(t.id);
  };
  const closeTab = (id: string) => {
    const tab = tabs.find(t => t.id === id);
    if (tab && (tab.cart.length > 0 || tab.selectedCustomerId) && !confirm('Đóng đơn này? Dữ liệu chưa gửi sẽ bị mất.')) return;
    setTabs(prev => {
      const next = prev.filter(t => t.id !== id);
      if (next.length === 0) { const t = newTab(); return [t]; }
      return next;
    });
    setActiveTabId(prev => {
      if (prev !== id) return prev;
      const remaining = tabs.filter(t => t.id !== id);
      return remaining.length ? remaining[0].id : tabs[0].id;
    });
  };

  // Custom product (staging trước khi thêm vào giỏ — dùng chung, không cần tách theo tab)
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState(0);
  const [customQty, setCustomQty] = useState(1);
  const [customUnit, setCustomUnit] = useState('Kg');

  // Search
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [applyingVoucher, setApplyingVoucher] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadCustomers = useCallback(async () => {
    try {
      if (user?.role === 'sale' && user.id && user.id !== 'legacy-admin') {
        // LƯU Ý: cột đúng là "company", không phải "company_name" — trước đây
        // sai tên cột khiến query này lỗi 400 im lặng, sale KHÔNG chọn được
        // khách hàng nào cả (bug Giai đoạn C, 2026-09-10).
        const { data } = await supabase
          .from('vip_accounts')
          .select('id, name, phone, partner_code, company, discount_tier, credit_limit, default_shipping_address, default_shipping_name, default_shipping_phone')
          .eq('sales_rep_id', user.id)
          .eq('is_active', true);
        setCustomers(data || []);
      } else {
        const { data } = await supabase.rpc('admin_list_customers');
        setCustomers(data || []);
      }
    } catch (err) {
      console.error('Lỗi tải khách hàng:', err);
    }
  }, [user]);

  useEffect(() => { loadCustomers(); }, [loadCustomers]);

  const handleSelectCustomer = (id: string) => {
    const cust = customers.find(c => c.id === id);
    if (cust) {
      updateActiveTab({
        selectedCustomerId: id,
        deliveryName: cust.name || cust.default_shipping_name || '',
        deliveryPhone: cust.phone || cust.default_shipping_phone || '',
        deliveryAddress: cust.default_shipping_address || '',
        customerDebt: null,
      });
      fetchCustomerDebt(id);
    } else {
      updateActiveTab({ selectedCustomerId: '', deliveryName: '', deliveryPhone: '', deliveryAddress: '', customerDebt: null });
    }
  };

  // Giai đoạn C: hiện công nợ hiện tại của khách khi chọn (mục 13.5). Chưa có
  // bảng order_payments (Giai đoạn C phần thanh toán tách 3 phần — cần chạy
  // migration riêng), nên đây là số TẠM TÍNH: cộng dồn grand_total của các
  // đơn chưa hủy và chưa đánh dấu "đã thanh toán đủ" (payment_status != 'paid').
  // Sẽ chính xác hơn khi order_payments/debt_amount đi vào hoạt động.
  const fetchCustomerDebt = async (customerId: string) => {
    setLoadingDebt(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('grand_total')
        .eq('customer_id', customerId)
        .neq('status', 'canceled')
        .neq('payment_status', 'paid');
      if (error) throw error;
      const total = (data || []).reduce((s, o: any) => s + (Number(o.grand_total) || 0), 0);
      updateActiveTab({ customerDebt: total });
    } catch (err) {
      console.error('Lỗi tải công nợ khách hàng:', err);
      updateActiveTab({ customerDebt: null });
    } finally {
      setLoadingDebt(false);
    }
  };

  const searchProducts = async () => {
    if (searchTerm.length < 2) return;
    setSearching(true);
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const customerParam = activeTab.selectedCustomerId ? `&customerId=${encodeURIComponent(activeTab.selectedCustomerId)}` : '';
      const res = await fetch(`${apiBase}/api/admin/orders?productSearch=${encodeURIComponent(searchTerm)}${customerParam}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      setSearchResults(data.products || []);
    } catch { setSearchResults([]); }
    finally { setSearching(false); }
  };

  const addFromSearch = (p: any) => {
    if (activeTab.cart.some(i => i.productId === p.id)) {
      alert('Sản phẩm đã có trong giỏ, hãy tăng số lượng!'); return;
    }
    updateActiveTab(t => ({ cart: [...t.cart, { productId: p.id, name: p.name, unit: p.unit || 'Kg', quantity: 1, price: Number(p.price), image_url: p.image_url }] }));
    setSearchResults([]);
    setSearchTerm('');
  };

  const addCustom = () => {
    if (!customName.trim()) { alert('Vui lòng nhập tên sản phẩm!'); return; }
    updateActiveTab(t => ({ cart: [...t.cart, { productId: null, name: customName.trim(), unit: customUnit, quantity: customQty, price: customPrice }] }));
    setCustomName(''); setCustomPrice(0); setCustomQty(1);
  };

  const updateQty = (idx: number, qty: number) => updateActiveTab(t => ({ cart: t.cart.map((i, n) => n === idx ? { ...i, quantity: Math.max(0.001, qty) } : i) }));
  const updatePrice = (idx: number, price: number) => updateActiveTab(t => ({ cart: t.cart.map((i, n) => n === idx ? { ...i, price: Math.max(0, price) } : i) }));
  const removeItem = (idx: number) => updateActiveTab(t => ({ cart: t.cart.filter((_, n) => n !== idx) }));

  const subtotal = activeTab.cart.reduce((s, i) => s + i.quantity * i.price, 0);
  const total = Math.max(0, subtotal - activeTab.voucherDiscount - activeTab.discountAmount + activeTab.shippingAmount);

  const applyVoucher = async () => {
    const code = activeTab.voucherCode.trim().toUpperCase();
    if (!code) { updateActiveTab({ voucherDiscount: 0 }); return; }
    if (subtotal === 0) { alert('Vui lòng thêm sản phẩm trước khi áp dụng voucher!'); return; }
    setApplyingVoucher(true);
    try {
      const { data: voucher, error } = await supabase
        .from('vouchers')
        .select('*')
        .eq('code', code)
        .eq('is_active', true)
        .single();
      if (error || !voucher) throw new Error('Mã voucher không hợp lệ hoặc đã hết hạn.');
      if (voucher.expires_at && new Date(voucher.expires_at) < new Date()) throw new Error('Mã voucher đã hết hạn.');
      if (subtotal < (voucher.min_order_value || 0)) throw new Error(`Đơn hàng phải từ ${money(voucher.min_order_value)} để áp dụng mã này.`);
      if (voucher.max_uses_total > 0 && voucher.current_uses_total >= voucher.max_uses_total) throw new Error('Voucher đã hết lượt sử dụng.');
      let discount = 0;
      if (voucher.discount_amount > 0) discount = voucher.discount_amount;
      else if (voucher.discount_percent > 0) {
        discount = (subtotal * voucher.discount_percent) / 100;
        if (voucher.max_discount_value > 0 && discount > voucher.max_discount_value) discount = voucher.max_discount_value;
      }
      if (discount > subtotal) discount = subtotal;
      updateActiveTab({ voucherDiscount: Math.round(discount), voucherCode: code });
      alert(`✅ Áp dụng thành công! Giảm ${money(Math.round(discount))}`);
    } catch (err: any) {
      updateActiveTab({ voucherDiscount: 0 });
      alert('❌ ' + err.message);
    } finally { setApplyingVoucher(false); }
  };

  const submitOrder = async () => {
    const { selectedCustomerId, cart, customerDebt, deliveryAddress, deliveryName, deliveryPhone, note, voucherCode } = activeTab;
    if (!selectedCustomerId) { alert('Vui lòng chọn khách hàng!'); return; }
    if (cart.length === 0) { alert('Giỏ hàng đang trống!'); return; }

    // Giai đoạn C: chặn vượt hạn mức công nợ, trừ khi Trưởng phòng/Admin
    // duyệt (ghi log vào order_history sau khi tạo đơn thành công).
    const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
    const creditLimit = Number(selectedCustomer?.credit_limit) || 0;
    const projectedDebt = (customerDebt || 0) + total;
    const overLimit = creditLimit > 0 && projectedDebt > creditLimit;
    const canOverride = user?.role === 'admin' || user?.role === 'truong_phong';
    let overrideNote = '';

    if (overLimit && !canOverride) {
      alert(`❌ Đơn này sẽ khiến công nợ khách vượt hạn mức (hạn mức ${money(creditLimit)}, dự kiến công nợ sau đơn ${money(projectedDebt)}). Liên hệ Trưởng phòng để duyệt.`);
      return;
    }
    if (overLimit && canOverride) {
      overrideNote = prompt(`⚠️ Đơn này vượt hạn mức công nợ (hạn mức ${money(creditLimit)}, dự kiến ${money(projectedDebt)}). Nhập lý do để duyệt vượt hạn mức:`, '') || '';
      if (!overrideNote.trim()) { alert('Cần nhập lý do để duyệt vượt hạn mức.'); return; }
    }

    if (!confirm(`Xác nhận tạo đơn nháp cho ${selectedCustomer?.name || 'khách hàng'}?`)) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('admin_create_order', {
        p_customer_id: selectedCustomerId,
        p_items: cart.map(i => ({
          product_id: i.productId,
          name: i.name,
          unit: i.unit || 'kg',
          quantity: i.quantity,
          base_unit_price: i.price,
        })),
        p_delivery_type: deliveryAddress ? 'shipping' : 'pickup',
        p_delivery_alias: 'Địa chỉ giao hàng',
        p_delivery_name: deliveryName || null,
        p_delivery_phone: deliveryPhone || null,
        p_delivery_address: deliveryAddress || null,
        p_note: note || null,
        p_idempotency_key: `sale-${Date.now()}-${selectedCustomerId}`,
        p_voucher_code: voucherCode || null,
        p_admin_id: user?.id !== 'legacy-admin' ? user?.id : null,
      });
      if (error) throw error;
      const createdOrder = Array.isArray(data) ? data[0] : data;
      const orderCode = createdOrder?.order_code || '';

      if (overLimit && canOverride && createdOrder?.id) {
        // Ghi log duyệt vượt hạn mức qua API (service-role) — order_history
        // chỉ có policy SELECT cho client, không insert thẳng được. Không
        // chặn tạo đơn nếu bước log lỗi.
        try {
          const apiBase = import.meta.env.VITE_API_BASE_URL || '';
          await fetch(`${apiBase}/api/admin/orders/credit-override`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              orderId: createdOrder.id,
              note: `Duyệt vượt hạn mức công nợ (hạn mức ${money(creditLimit)}, dự kiến ${money(projectedDebt)}). Lý do: ${overrideNote}`,
            }),
          });
        } catch (logErr) {
          console.error('Lỗi ghi log duyệt vượt hạn mức:', logErr);
        }
      }

      alert(`✅ Đã tạo đơn nháp ${orderCode} thành công! Khách hàng vào Mini App xác nhận.`);
      // Đơn xong -> đóng tab này (giống KiotViet đóng tab khi hoàn tất), mở
      // tab mới nếu đây là tab cuối cùng.
      closeTab(activeTab.id);
    } catch (err: any) {
      alert('❌ Lỗi tạo đơn: ' + (err.message || 'Không xác định'));
    } finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-slate-800">Tạo đơn hàng (POS)</h1>
        <p className="text-slate-500 text-sm">Tạo đơn nháp cho khách hàng, khách sẽ vào Mini App xác nhận. Mở nhiều tab để phục vụ nhiều khách cùng lúc.</p>
      </header>

      {/* Tabs — giống nguyên lý mở nhiều đơn của KiotViet */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {tabs.map((t, idx) => {
          const cust = customers.find(c => c.id === t.selectedCustomerId);
          const label = cust?.name || `Đơn ${idx + 1}`;
          const isActive = t.id === activeTabId;
          return (
            <button key={t.id} onClick={() => setActiveTabId(t.id)}
              className={`shrink-0 flex items-center gap-2 pl-3.5 pr-2 py-2 rounded-xl text-sm font-medium border transition-colors ${isActive ? 'bg-green-600 border-green-600 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:border-green-300'}`}>
              <span className="max-w-[120px] truncate">{label}</span>
              {t.cart.length > 0 && (
                <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 ${isActive ? 'bg-white/20' : 'bg-green-100 text-green-700'}`}>{t.cart.length}</span>
              )}
              <span onClick={(e) => { e.stopPropagation(); closeTab(t.id); }}
                className={`rounded-full p-0.5 ${isActive ? 'hover:bg-white/20' : 'hover:bg-slate-100'}`}>
                <X size={13} />
              </span>
            </button>
          );
        })}
        <button onClick={addTab} className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border border-dashed border-slate-300 text-slate-500 hover:border-green-400 hover:text-green-600 transition-colors">
          <PlusCircle size={16} /> Đơn mới
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Customer + Products */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Selection */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4">
            <h2 className="font-bold text-slate-800 flex items-center gap-2"><User size={18} className="text-green-600" />Thông tin khách hàng</h2>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Chọn khách hàng *</label>
              <select value={activeTab.selectedCustomerId} onChange={e => handleSelectCustomer(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20">
                <option value="">-- Chọn Khách Hàng --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.phone || ''})</option>
                ))}
              </select>
            </div>

            {activeTab.selectedCustomerId && (() => {
              const cust = customers.find(c => c.id === activeTab.selectedCustomerId);
              const creditLimit = Number(cust?.credit_limit) || 0;
              const projectedTotal = (activeTab.customerDebt || 0) + total;
              const overLimit = creditLimit > 0 && projectedTotal > creditLimit;
              return (
                <div className={`rounded-xl p-3 text-sm flex flex-wrap gap-x-6 gap-y-1 ${overLimit ? 'bg-red-50 border border-red-200' : 'bg-slate-50 border border-slate-100'}`}>
                  {cust?.discount_tier && (
                    <span className="text-slate-600">Hạng: <b className="text-slate-800">{cust.discount_tier}</b></span>
                  )}
                  <span className="text-slate-600">
                    Hạn mức công nợ: <b className="text-slate-800">{creditLimit > 0 ? money(creditLimit) : 'Không giới hạn'}</b>
                  </span>
                  <span className="text-slate-600">
                    Công nợ hiện tại: <b className="text-slate-800">{loadingDebt ? '...' : money(activeTab.customerDebt || 0)}</b>
                  </span>
                  {overLimit && (
                    <span className="text-red-600 font-semibold flex items-center gap-1 w-full">
                      <AlertTriangle size={14} /> Đơn này sẽ vượt hạn mức (dự kiến {money(projectedTotal)})
                    </span>
                  )}
                </div>
              );
            })()}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Người nhận hàng</label>
                <input type="text" value={activeTab.deliveryName} onChange={e => updateActiveTab({ deliveryName: e.target.value })}
                  placeholder="Tên người nhận..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">SĐT người nhận</label>
                <input type="text" value={activeTab.deliveryPhone} onChange={e => updateActiveTab({ deliveryPhone: e.target.value })}
                  placeholder="Số điện thoại..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block"><Truck size={13} className="inline mr-1" />Địa chỉ giao hàng</label>
              <input type="text" value={activeTab.deliveryAddress} onChange={e => updateActiveTab({ deliveryAddress: e.target.value })}
                placeholder="Để trống = khách nhận tại điểm..."
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Ghi chú đơn hàng</label>
              <textarea value={activeTab.note} onChange={e => updateActiveTab({ note: e.target.value })} rows={2}
                placeholder="Ghi chú giao hàng, yêu cầu đặc biệt..."
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 resize-none" />
            </div>
          </div>

          {/* Product Search */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4">
            <h2 className="font-bold text-slate-800 flex items-center gap-2"><Search size={18} className="text-green-600" />Tìm & thêm sản phẩm</h2>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchProducts()}
                  placeholder="Nhập tên sản phẩm (ít nhất 2 ký tự)..."
                  className="pl-9 pr-3 py-2.5 w-full border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20" />
              </div>
              <button onClick={searchProducts} disabled={searching || searchTerm.length < 2}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 flex items-center gap-1.5">
                {searching ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />} Tìm
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                {searchResults.map(p => (
                  <button key={p.id} onClick={() => addFromSearch(p)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-green-50 text-left border-b border-slate-100 last:border-0 transition-colors">
                    {getImgUrl(p.image_url) && <img src={getImgUrl(p.image_url)!} alt="" className="w-10 h-10 rounded-lg object-cover border border-slate-100" />}
                    <div className="flex-1">
                      <p className="font-medium text-slate-800 text-sm">{p.name}</p>
                      <p className="text-xs text-slate-400 flex items-center gap-1.5">
                        {p.categoryLabel || ''} · {p.unit || 'Kg'}
                        {p.trackInventory && (
                          <span className={p.lowStock ? 'text-red-500 font-semibold' : 'text-slate-400'}>
                            · Tồn {p.stockQty ?? 0}{p.lowStock ? ' (sắp hết)' : ''}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${p.basePrice != null && p.price !== p.basePrice ? 'text-red-600' : 'text-green-700'}`}>
                        {money(p.price)}
                      </p>
                      <Plus size={16} className="text-green-500 ml-auto" />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Custom Product */}
            <div className="border border-dashed border-slate-200 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-slate-500 uppercase">Thêm sản phẩm ngoài hệ thống</p>
              <div className="grid grid-cols-2 gap-3">
                <input type="text" value={customName} onChange={e => setCustomName(e.target.value)}
                  placeholder="Tên sản phẩm *" className="col-span-2 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20" />
                <input type="number" min="0" step="1000" value={customPrice || ''} onChange={e => setCustomPrice(Number(e.target.value))}
                  placeholder="Đơn giá (đ)" className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20" />
                <div className="flex gap-2">
                  <input type="number" min="0.001" step="0.001" value={customQty} onChange={e => setCustomQty(Number(e.target.value))}
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20" />
                  <input type="text" value={customUnit} onChange={e => setCustomUnit(e.target.value)}
                    placeholder="ĐVT" className="w-20 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20" />
                </div>
              </div>
              <button onClick={addCustom} className="w-full flex items-center justify-center gap-2 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm hover:bg-slate-200 transition-colors">
                <Plus size={16} /> Thêm vào giỏ
              </button>
            </div>
          </div>
        </div>

        {/* Right: Cart */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden sticky top-4">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-800 flex items-center gap-2"><ShoppingCart size={18} className="text-green-600" />Giỏ hàng</h2>
              <span className="text-sm text-slate-500">{activeTab.cart.length} sản phẩm</span>
            </div>

            {/* Cart Items */}
            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {activeTab.cart.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-sm">
                  <ShoppingCart size={32} className="mx-auto mb-2 opacity-30" />Giỏ hàng đang trống
                </div>
              ) : activeTab.cart.map((item, idx) => (
                <div key={idx} className="p-3 text-sm">
                  <div className="flex items-start gap-2 mb-2">
                    <div className="flex-1">
                      <p className="font-medium text-slate-800 leading-tight">{item.name}</p>
                      <p className="text-xs text-slate-400">{item.productId ? item.productId.substring(0, 8) : 'Tùy chỉnh'} | {item.unit}</p>
                    </div>
                    <button onClick={() => removeItem(idx)} className="text-slate-300 hover:text-red-500 transition-colors mt-0.5">
                      <X size={15} />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input type="number" min="0.001" step="0.001" value={item.quantity} onChange={e => updateQty(idx, Number(e.target.value))}
                      className="w-20 border border-slate-200 rounded-lg px-2 py-1 text-xs text-center focus:outline-none" />
                    <input type="number" min="0" step="1000" value={item.price} onChange={e => updatePrice(idx, Number(e.target.value))}
                      className="flex-1 border border-slate-200 rounded-lg px-2 py-1 text-xs text-right focus:outline-none" />
                    <span className="text-xs font-semibold text-slate-700 py-1 min-w-[60px] text-right">{money(item.quantity * item.price)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Voucher */}
            <div className="p-4 border-t border-slate-100 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1"><Tag size={12} />Mã Voucher</label>
                <div className="flex gap-2">
                  <input type="text" value={activeTab.voucherCode} onChange={e => updateActiveTab({ voucherCode: e.target.value.toUpperCase() })}
                    placeholder="Nhập mã..." className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 uppercase" />
                  <button onClick={applyVoucher} disabled={applyingVoucher}
                    className="px-3 py-2 bg-slate-100 text-slate-700 text-sm rounded-lg hover:bg-slate-200 disabled:opacity-50 transition-colors">
                    {applyingVoucher ? <RefreshCw size={14} className="animate-spin" /> : 'Áp dụng'}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Chiết khấu (đ)</label>
                  <input type="number" min="0" step="1000" value={activeTab.discountAmount || ''} onChange={e => updateActiveTab({ discountAmount: Number(e.target.value) })}
                    placeholder="0đ" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block flex items-center gap-1"><Truck size={11} />Phí ship (đ)</label>
                  <input type="number" min="0" step="1000" value={activeTab.shippingAmount || ''} onChange={e => updateActiveTab({ shippingAmount: Number(e.target.value) })}
                    placeholder="0đ" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-2 text-sm">
              <div className="flex justify-between text-slate-500"><span>Tạm tính</span><span>{money(subtotal)}</span></div>
              {activeTab.voucherDiscount > 0 && <div className="flex justify-between text-green-600"><span>Voucher</span><span>-{money(activeTab.voucherDiscount)}</span></div>}
              {activeTab.discountAmount > 0 && <div className="flex justify-between text-green-600"><span>Chiết khấu</span><span>-{money(activeTab.discountAmount)}</span></div>}
              {activeTab.shippingAmount > 0 && <div className="flex justify-between text-slate-500"><span>Phí giao hàng</span><span>+{money(activeTab.shippingAmount)}</span></div>}
              <div className="flex justify-between font-bold text-lg text-slate-800 pt-2 border-t border-slate-200">
                <span>Tổng đơn</span><span className="text-red-600">{money(total)}</span>
              </div>
            </div>

            {/* Submit */}
            <div className="p-4 border-t border-slate-100">
              <button onClick={submitOrder} disabled={submitting || activeTab.cart.length === 0 || !activeTab.selectedCustomerId}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-green-900/20">
                <CheckCircle2 size={20} />
                {submitting ? 'Đang tạo đơn...' : 'TẠO ĐƠN HÀNG (NHÁP)'}
              </button>
              <p className="text-center text-xs text-slate-400 mt-2">Đơn nháp sẽ được gửi cho khách xác nhận qua Mini App</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
