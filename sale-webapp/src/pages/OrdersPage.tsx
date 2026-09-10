import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  RefreshCw, Search, Eye, Printer, Clock, Truck, CheckCircle,
  ShoppingBag, TrendingUp, User, MapPin, Package
} from 'lucide-react';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Đơn nháp',
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  preparing: 'Đang chuẩn bị',
  shipping: 'Đang giao',
  completed: 'Hoàn thành',
  canceled: 'Đã hủy',
};

const PAYMENT_LABELS: Record<string, string> = {
  pending: 'Chờ xử lý',
  cod: 'COD',
  paid: 'Đã thanh toán',
  failed: 'Thất bại',
  refunded: 'Đã hoàn tiền',
};

const SOURCE_LABELS: Record<string, string> = {
  website: 'Website',
  miniapp: 'Mini App',
  zalo_mini_app: 'Zalo',
  admin: 'Admin',
};

function money(val: number | string) {
  return new Intl.NumberFormat('vi-VN').format(Number(val) || 0) + 'đ';
}

function dt(val: string) {
  return val ? new Date(val).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  preparing: 'bg-purple-100 text-purple-700',
  shipping: 'bg-sky-100 text-sky-700',
  completed: 'bg-green-100 text-green-700',
  canceled: 'bg-red-100 text-red-700',
};

const PAYMENT_COLORS: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-600',
  cod: 'bg-amber-100 text-amber-700',
  paid: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  refunded: 'bg-pink-100 text-pink-700',
};

export default function OrdersPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPayment, setFilterPayment] = useState('');
  const [, setTiers] = useState<any[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('orders')
        .select(`
          id, order_code, status, payment_status, payment_method, source,
          subtotal, discount_amount, discount_percent, shipping_amount, grand_total,
          voucher_code, voucher_discount, manual_discount_percent,
          note, pricing_note, created_at, updated_at, confirmed_at,
          customer_id, customer_code, customer_name, customer_phone, customer_company,
          customer_tier, pricing_status, price_revision, confirmation_document_status,
          delivery_type, delivery_address, delivery_name, delivery_phone, delivery_alias,
          sales_rep_id, item_count,
          order_items ( id, product_id, name, sku, unit, quantity, base_unit_price, unit_price, discount_percent, line_total, pricing_note )
        `)
        .order('created_at', { ascending: false })
        .limit(200);

      // Sale chỉ thấy đơn hàng của KH được giao cho mình
      if (user?.role === 'sale' && user.id && user.id !== 'legacy-admin') {
        const { data: myCustomers } = await supabase
          .from('vip_accounts')
          .select('id, partner_code')
          .eq('sales_rep_id', user.id);
        const myCodes = (myCustomers || []).map((c: any) => c.partner_code).filter(Boolean);
        if (myCodes.length > 0) {
          query = query.in('customer_code', myCodes);
        } else {
          setOrders([]); setLoading(false); return;
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      setOrders((data || []).map((o: any) => ({ ...o, order_items: o.order_items || [] })));

      const { data: tiersData } = await supabase.from('customer_tiers').select('*');
      setTiers(tiersData || []);
    } catch (err) {
      console.error('Lỗi tải đơn hàng:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const filteredOrders = orders.filter(order => {
    const hay = [order.order_code, order.customer_code, order.customer_name, order.customer_phone, order.customer_company, order.delivery_address].join(' ').toLowerCase();
    return (!searchTerm || hay.includes(searchTerm.toLowerCase()))
      && (!filterStatus || order.status === filterStatus)
      && (!filterPayment || order.payment_status === filterPayment);
  });

  // Stats
  const stats = {
    pending: orders.filter(o => o.status === 'pending').length,
    preparing: orders.filter(o => o.status === 'preparing').length,
    shipping: orders.filter(o => o.status === 'shipping').length,
    completed: orders.filter(o => o.status === 'completed').length,
    revenue: orders.filter(o => o.status !== 'canceled').reduce((s, o) => s + (Number(o.grand_total) || 0), 0),
  };

  const changeStatus = async (order: any, newStatus: string) => {
    const note = prompt(`Chuyển ${order.order_code} sang "${STATUS_LABELS[newStatus]}". Ghi chú (không bắt buộc):`, '') ?? null;
    if (note === null) return;
    setUpdatingId(order.id);
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${apiBase}/api/admin/orders`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ orderId: order.id, status: newStatus, note }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      await fetchOrders();
    } catch (err: any) {
      alert('Lỗi: ' + (err.message || 'Không thể cập nhật trạng thái'));
    } finally {
      setUpdatingId(null);
    }
  };

  const changePayment = async (order: any, newPayment: string) => {
    setUpdatingId(order.id);
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${apiBase}/api/admin/orders`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ orderId: order.id, status: order.status, paymentStatus: newPayment, note: `Cập nhật thanh toán: ${PAYMENT_LABELS[newPayment]}` }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      await fetchOrders();
    } catch (err: any) {
      alert('Lỗi: ' + (err.message || 'Không thể cập nhật thanh toán'));
    } finally {
      setUpdatingId(null);
    }
  };

  const handlePrint = (order: any) => {
    const win = window.open('', '', 'width=800,height=600');
    if (!win) return;
    win.document.write(`
      <html><head><title>Phiếu đặt hàng ${order.order_code}</title>
      <style>body{font-family:Arial,sans-serif;padding:24px;font-size:13px}h2{text-align:center}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}tfoot strong{color:#e00}.total{text-align:right;font-weight:bold;font-size:15px;margin-top:12px}</style></head><body>
      <h2>PHIẾU ĐẶT HÀNG</h2>
      <p><b>Mã đơn:</b> ${order.order_code}</p>
      <p><b>Khách hàng:</b> ${order.customer_name} - ${order.customer_phone}</p>
      <p><b>Địa chỉ giao:</b> ${order.delivery_address || 'Nhận tại cửa hàng'}</p>
      <p><b>Ngày đặt:</b> ${dt(order.created_at)}</p>
      <table><thead><tr><th>Sản phẩm</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead>
      <tbody>${(order.order_items || []).map((i: any) => `<tr><td>${i.name}</td><td>${i.quantity} ${i.unit || ''}</td><td>${money(i.unit_price)}</td><td>${money(i.line_total)}</td></tr>`).join('')}</tbody></table>
      <p class="total">Tổng thanh toán: ${money(order.grand_total)}</p>
      <script>window.onload=()=>{window.print();setTimeout(window.close,600)}<\/script></body></html>
    `);
    win.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Quản lý Đơn hàng</h1>
          <p className="text-slate-500 text-sm">{orders.length} đơn hàng · đang hiển thị {filteredOrders.length}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              placeholder="Tìm mã đơn, khách, SĐT..." 
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 w-56" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20">
            <option value="">Tất cả trạng thái</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select value={filterPayment} onChange={e => setFilterPayment(e.target.value)}
            className="px-3 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20">
            <option value="">Tất cả thanh toán</option>
            {Object.entries(PAYMENT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <button onClick={fetchOrders} className="p-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors" title="Tải lại">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Chờ xác nhận', value: stats.pending, icon: <Clock size={18} />, color: 'text-amber-600 bg-amber-50' },
          { label: 'Đang chuẩn bị', value: stats.preparing, icon: <Package size={18} />, color: 'text-purple-600 bg-purple-50' },
          { label: 'Đang giao', value: stats.shipping, icon: <Truck size={18} />, color: 'text-sky-600 bg-sky-50' },
          { label: 'Hoàn thành', value: stats.completed, icon: <CheckCircle size={18} />, color: 'text-green-600 bg-green-50' },
          { label: 'Doanh thu', value: money(stats.revenue), icon: <TrendingUp size={18} />, color: 'text-red-600 bg-red-50' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${s.color}`}>{s.icon}</div>
            <div className="font-bold text-slate-800 text-xl leading-tight">{s.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Order Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500">
          <RefreshCw className="animate-spin mr-2" size={20} /> Đang tải đơn hàng...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 py-16 text-center text-slate-400">
          <ShoppingBag size={40} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">Không tìm thấy đơn hàng phù hợp</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredOrders.map(order => (
            <article key={order.id} className={`bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden transition-shadow hover:shadow-md ${updatingId === order.id ? 'opacity-60 pointer-events-none' : ''}`}>
              {/* Card Top */}
              <div className="flex items-start justify-between p-4 border-b border-slate-50">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                      {SOURCE_LABELS[order.source] || order.source || 'Admin'}
                    </span>
                    {order.pricing_status === 'finalized' ? (
                      <span className="text-[10px] font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">✓ Đã chốt R{order.price_revision || 1}</span>
                    ) : (
                      <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">⏳ Chờ chốt giá</span>
                    )}
                  </div>
                  <h3 className="font-bold text-slate-800">{order.order_code}</h3>
                  <p className="text-xs text-slate-400">{dt(order.created_at)}</p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[order.status] || 'bg-slate-100 text-slate-600'}`}>
                  {STATUS_LABELS[order.status] || order.status}
                </span>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <User size={15} className="text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-slate-800 text-sm leading-tight">{order.customer_name}</p>
                    <p className="text-xs text-slate-500">{order.customer_code} · {order.customer_phone}</p>
                    {order.customer_company && <p className="text-xs text-slate-400">{order.customer_company}</p>}
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin size={15} className="text-slate-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-slate-500">{order.delivery_address || 'Nhận tại điểm'}</p>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-50">
                  <div>
                    <p className="text-xs text-slate-400">{order.pricing_status === 'finalized' ? 'Giá trị đã chốt' : 'Giá trị tạm tính'}</p>
                    <p className="font-bold text-lg text-red-600">{money(order.grand_total)}</p>
                    <p className="text-xs text-slate-400">{(order.item_count || (order.order_items || []).length)} món · CK {order.discount_percent || 0}%</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => navigate(`/don-hang/${order.id}`)}
                      className="p-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-colors" title="Xem chi tiết">
                      <Eye size={18} />
                    </button>
                    <button onClick={() => handlePrint(order)}
                      className="p-2 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100 transition-colors" title="In phiếu">
                      <Printer size={18} />
                    </button>
                  </div>
                </div>

                {/* Inline Controls */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-50">
                  <div>
                    <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Thanh toán</label>
                    <select
                      value={order.payment_status}
                      onChange={e => changePayment(order, e.target.value)}
                      className={`w-full text-xs px-2 py-1.5 rounded-lg border focus:outline-none ${PAYMENT_COLORS[order.payment_status] || 'bg-slate-50 text-slate-600'} border-transparent`}>
                      {Object.entries(PAYMENT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Trạng thái xử lý</label>
                    <select
                      value={order.status}
                      onChange={e => changeStatus(order, e.target.value)}
                      className={`w-full text-xs px-2 py-1.5 rounded-lg border focus:outline-none ${STATUS_COLORS[order.status] || 'bg-slate-50 text-slate-600'} border-transparent`}>
                      {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
