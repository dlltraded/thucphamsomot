import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Search, Plus, Tag, Truck, RefreshCw, ShoppingCart, User, X, CheckCircle2
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

export default function PosCreatePage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [deliveryName, setDeliveryName] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [note, setNote] = useState('');

  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherDiscount, setVoucherDiscount] = useState(0);
  const [shippingAmount, setShippingAmount] = useState(0);

  // Custom product
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
        const { data } = await supabase
          .from('vip_accounts')
          .select('id, name, phone, partner_code, company_name, default_shipping_address, default_shipping_name, default_shipping_phone')
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
    setSelectedCustomerId(id);
    const cust = customers.find(c => c.id === id);
    if (cust) {
      setDeliveryName(cust.name || cust.default_shipping_name || '');
      setDeliveryPhone(cust.phone || cust.default_shipping_phone || '');
      setDeliveryAddress(cust.default_shipping_address || '');
    } else {
      setDeliveryName(''); setDeliveryPhone(''); setDeliveryAddress('');
    }
  };

  const searchProducts = async () => {
    if (searchTerm.length < 2) return;
    setSearching(true);
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const customerParam = selectedCustomerId ? `&customerId=${encodeURIComponent(selectedCustomerId)}` : '';
      const res = await fetch(`${apiBase}/api/admin/orders?productSearch=${encodeURIComponent(searchTerm)}${customerParam}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      setSearchResults(data.products || []);
    } catch { setSearchResults([]); }
    finally { setSearching(false); }
  };

  const addFromSearch = (p: any) => {
    if (cart.some(i => i.productId === p.id)) {
      alert('Sản phẩm đã có trong giỏ, hãy tăng số lượng!'); return;
    }
    setCart(prev => [...prev, { productId: p.id, name: p.name, unit: p.unit || 'Kg', quantity: 1, price: Number(p.price), image_url: p.image_url }]);
    setSearchResults([]);
    setSearchTerm('');
  };

  const addCustom = () => {
    if (!customName.trim()) { alert('Vui lòng nhập tên sản phẩm!'); return; }
    setCart(prev => [...prev, { productId: null, name: customName.trim(), unit: customUnit, quantity: customQty, price: customPrice }]);
    setCustomName(''); setCustomPrice(0); setCustomQty(1);
  };

  const updateQty = (idx: number, qty: number) => setCart(prev => prev.map((i, n) => n === idx ? { ...i, quantity: Math.max(0.001, qty) } : i));
  const updatePrice = (idx: number, price: number) => setCart(prev => prev.map((i, n) => n === idx ? { ...i, price: Math.max(0, price) } : i));
  const removeItem = (idx: number) => setCart(prev => prev.filter((_, n) => n !== idx));

  const subtotal = cart.reduce((s, i) => s + i.quantity * i.price, 0);
  const total = Math.max(0, subtotal - voucherDiscount - discountAmount + shippingAmount);

  const applyVoucher = async () => {
    const code = voucherCode.trim().toUpperCase();
    if (!code) { setVoucherDiscount(0); return; }
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
      setVoucherDiscount(Math.round(discount));
      setVoucherCode(code);
      alert(`✅ Áp dụng thành công! Giảm ${money(Math.round(discount))}`);
    } catch (err: any) {
      setVoucherDiscount(0);
      alert('❌ ' + err.message);
    } finally { setApplyingVoucher(false); }
  };

  const submitOrder = async () => {
    if (!selectedCustomerId) { alert('Vui lòng chọn khách hàng!'); return; }
    if (cart.length === 0) { alert('Giỏ hàng đang trống!'); return; }
    if (!confirm(`Xác nhận tạo đơn nháp cho ${customers.find(c => c.id === selectedCustomerId)?.name || 'khách hàng'}?`)) return;
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
      const orderCode = data?.[0]?.order_code || data?.order_code || '';
      alert(`✅ Đã tạo đơn nháp ${orderCode} thành công! Khách hàng vào Mini App xác nhận.`);
      // Reset form
      setCart([]); setSelectedCustomerId(''); setDeliveryName(''); setDeliveryPhone('');
      setDeliveryAddress(''); setNote(''); setVoucherCode(''); setVoucherDiscount(0);
      setDiscountAmount(0); setShippingAmount(0);
      navigate('/don-hang');
    } catch (err: any) {
      alert('❌ Lỗi tạo đơn: ' + (err.message || 'Không xác định'));
    } finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-800">Tạo đơn hàng (POS)</h1>
        <p className="text-slate-500 text-sm">Tạo đơn nháp cho khách hàng, khách sẽ vào Mini App xác nhận.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Customer + Products */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Selection */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4">
            <h2 className="font-bold text-slate-800 flex items-center gap-2"><User size={18} className="text-green-600" />Thông tin khách hàng</h2>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Chọn khách hàng *</label>
              <select value={selectedCustomerId} onChange={e => handleSelectCustomer(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20">
                <option value="">-- Chọn Khách Hàng --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.phone || ''})</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Người nhận hàng</label>
                <input type="text" value={deliveryName} onChange={e => setDeliveryName(e.target.value)}
                  placeholder="Tên người nhận..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">SĐT người nhận</label>
                <input type="text" value={deliveryPhone} onChange={e => setDeliveryPhone(e.target.value)}
                  placeholder="Số điện thoại..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block"><Truck size={13} className="inline mr-1" />Địa chỉ giao hàng</label>
              <input type="text" value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)}
                placeholder="Để trống = khách nhận tại điểm..."
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Ghi chú đơn hàng</label>
              <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
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
              <span className="text-sm text-slate-500">{cart.length} sản phẩm</span>
            </div>

            {/* Cart Items */}
            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {cart.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-sm">
                  <ShoppingCart size={32} className="mx-auto mb-2 opacity-30" />Giỏ hàng đang trống
                </div>
              ) : cart.map((item, idx) => (
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
                  <input type="text" value={voucherCode} onChange={e => setVoucherCode(e.target.value.toUpperCase())}
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
                  <input type="number" min="0" step="1000" value={discountAmount || ''} onChange={e => setDiscountAmount(Number(e.target.value))}
                    placeholder="0đ" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block flex items-center gap-1"><Truck size={11} />Phí ship (đ)</label>
                  <input type="number" min="0" step="1000" value={shippingAmount || ''} onChange={e => setShippingAmount(Number(e.target.value))}
                    placeholder="0đ" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-2 text-sm">
              <div className="flex justify-between text-slate-500"><span>Tạm tính</span><span>{money(subtotal)}</span></div>
              {voucherDiscount > 0 && <div className="flex justify-between text-green-600"><span>Voucher</span><span>-{money(voucherDiscount)}</span></div>}
              {discountAmount > 0 && <div className="flex justify-between text-green-600"><span>Chiết khấu</span><span>-{money(discountAmount)}</span></div>}
              {shippingAmount > 0 && <div className="flex justify-between text-slate-500"><span>Phí giao hàng</span><span>+{money(shippingAmount)}</span></div>}
              <div className="flex justify-between font-bold text-lg text-slate-800 pt-2 border-t border-slate-200">
                <span>Tổng đơn</span><span className="text-red-600">{money(total)}</span>
              </div>
            </div>

            {/* Submit */}
            <div className="p-4 border-t border-slate-100">
              <button onClick={submitOrder} disabled={submitting || cart.length === 0 || !selectedCustomerId}
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
