import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Search, ShoppingCart, Plus, Minus, X, Upload, ImageOff, CheckCircle2, Trash2, ChevronRight,
} from 'lucide-react';

function money(v: number) { return new Intl.NumberFormat('vi-VN').format(Number(v) || 0) + 'đ'; }

interface Product {
  id: string; sku: string; name: string; category: string | null;
  unit: string; imageUrl: string | null; price: number; priceOnRequest?: boolean; available: boolean;
}
interface CartLine { product: Product; quantity: number }

// Giai đoạn E — trang "Đặt hàng" cho khách hàng tự lên đơn trực tiếp trong
// sale-webapp (thay vì chỉ xem lại đơn cũ như trước). Theo đúng theme thật
// của website TPS1 (xanh rêu đậm #0f6f4b, nền kem, font Be Vietnam Pro —
// xem sale-webapp/src/index.css) thay vì màu xanh generic trước đây.
export default function DatHangPage() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const apiBase = import.meta.env.VITE_API_BASE_URL || '';

  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const pageSize = 24;

  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [showCart, setShowCart] = useState(false);
  const [deliveryName, setDeliveryName] = useState(user?.name || '');
  const [deliveryPhone, setDeliveryPhone] = useState(user?.phone || '');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successCode, setSuccessCode] = useState('');

  useEffect(() => {
    fetch(`${apiBase}/api/customer/products?meta=1`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => { if (data.ok) setCategories(data.categories || []); });
  }, [apiBase, token]);

  // Trước đây lỗi (vd phiên hết hạn) bị nuốt âm thầm, chỉ hiện "không có sản
  // phẩm nào" khiến khách tưởng hệ thống trống hàng — giờ hiện rõ lỗi thật,
  // và tự đăng xuất nếu phiên hết hạn để khách đăng nhập lại ngay.
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (search.trim()) params.set('search', search.trim());
      if (category) params.set('category', category);
      const res = await fetch(`${apiBase}/api/customer/products?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.ok) {
        setProducts(data.products || []);
        setTotal(data.total || 0);
      } else if (res.status === 401) {
        alert(data.error || 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
        logout();
      } else {
        setLoadError(data.error || 'Không tải được sản phẩm');
      }
    } catch {
      setLoadError('Không kết nối được tới máy chủ, vui lòng thử lại');
    } finally { setLoading(false); }
  }, [apiBase, token, page, search, category, logout]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const addToCart = (p: Product) => {
    setCart((c) => {
      const existing = c[p.id];
      return { ...c, [p.id]: { product: p, quantity: (existing?.quantity || 0) + 1 } };
    });
  };
  const setQty = (productId: string, qty: number) => {
    setCart((c) => {
      if (qty <= 0) { const next = { ...c }; delete next[productId]; return next; }
      return { ...c, [productId]: { ...c[productId], quantity: qty } };
    });
  };

  const cartLines = Object.values(cart);
  const cartCount = cartLines.reduce((s, l) => s + l.quantity, 0);
  const cartTotal = useMemo(() => cartLines.reduce((s, l) => s + l.quantity * l.product.price, 0), [cartLines]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const submitOrder = async () => {
    if (!deliveryAddress.trim() || !deliveryName.trim() || !deliveryPhone.trim()) {
      alert('Vui lòng nhập đầy đủ tên, số điện thoại và địa chỉ giao hàng'); return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${apiBase}/api/customer/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'zalo_mini_app', // dùng chung đường token-trong-body, xem app/api/customer/order/route.ts
          orderSessionToken: token,
          items: cartLines.map((l) => ({ productId: l.product.id, name: l.product.name, quantity: l.quantity })),
          deliveryType: 'shipping',
          deliveryAlias: 'Địa chỉ giao hàng',
          deliveryName, deliveryPhone, deliveryAddress,
          note,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setSuccessCode(data.orderCode);
      setCart({});
    } catch (err: any) {
      alert('Lỗi: ' + (err.message || 'Không đặt được đơn hàng'));
    } finally { setSubmitting(false); }
  };

  if (successCode) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="bg-white rounded-3xl shadow-lg border border-[#14231c]/10 p-10 max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#0f6f4b]/10 text-[#0f6f4b] flex items-center justify-center mx-auto">
            <CheckCircle2 size={36} />
          </div>
          <h2 className="text-xl font-bold text-[#14231c]">Đặt hàng thành công!</h2>
          <p className="text-[#59665f]">Mã đơn <span className="font-semibold text-[#0f6f4b]">{successCode}</span> đã được gửi tới TPS1. Nhân viên sẽ liên hệ xác nhận giá và thời gian giao hàng.</p>
          <div className="flex gap-3 justify-center pt-2">
            <button onClick={() => setSuccessCode('')} className="px-5 py-2.5 rounded-xl border border-[#14231c]/15 text-[#14231c] font-medium hover:bg-[#f6f7f4]">
              Đặt thêm đơn khác
            </button>
            <button onClick={() => navigate('/don-hang-cua-toi')} className="px-5 py-2.5 rounded-xl bg-[#0f6f4b] text-white font-medium hover:bg-[#0b5a3c]">
              Xem đơn hàng của tôi
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-brand" style={{ fontFamily: 'var(--font-brand)' }}>
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#14231c]">Đặt hàng</h1>
          <p className="text-[#59665f] text-sm">
            Xin chào {user?.name}{user?.tier ? ` · Hạng ${user.tier}` : ''} — chọn sản phẩm để lên đơn
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate('/dat-hang/excel')}
            className="px-4 py-2.5 rounded-xl border border-[#0f6f4b]/30 text-[#0f6f4b] font-medium hover:bg-[#0f6f4b]/5 flex items-center gap-2 text-sm">
            <Upload size={16} /> Đặt hàng từ Excel
          </button>
          <button onClick={() => setShowCart(true)}
            className="relative px-4 py-2.5 rounded-xl bg-[#0f6f4b] text-white font-medium hover:bg-[#0b5a3c] flex items-center gap-2 text-sm shadow-sm">
            <ShoppingCart size={16} /> Giỏ hàng
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#c7372f] text-white text-[10px] font-bold flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Search + categories */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#59665f]" size={18} />
          <input
            type="text" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Tìm sản phẩm..."
            className="w-full pl-11 pr-4 py-3 rounded-2xl border border-[#14231c]/10 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0f6f4b]/20 focus:border-[#0f6f4b]"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          <button onClick={() => { setCategory(''); setPage(0); }}
            className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors ${category === '' ? 'bg-[#0f6f4b] text-white border-[#0f6f4b]' : 'bg-white text-[#59665f] border-[#14231c]/10 hover:border-[#0f6f4b]/40'}`}>
            Tất cả
          </button>
          {categories.map((c) => (
            <button key={c} onClick={() => { setCategory(c); setPage(0); }}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors ${category === c ? 'bg-[#0f6f4b] text-white border-[#0f6f4b]' : 'bg-white text-[#59665f] border-[#14231c]/10 hover:border-[#0f6f4b]/40'}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Product grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-[#14231c]/8 h-56 animate-pulse" />
          ))}
        </div>
      ) : loadError ? (
        <div className="bg-white rounded-2xl border border-[#c7372f]/20 py-16 text-center space-y-3">
          <p className="text-[#c7372f] text-sm">{loadError}</p>
          <button onClick={fetchProducts} className="px-4 py-2 rounded-xl bg-[#0f6f4b] text-white text-sm font-medium hover:bg-[#0b5a3c]">Thử lại</button>
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#14231c]/8 py-20 text-center text-[#59665f]">Không tìm thấy sản phẩm nào</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {products.map((p) => {
              const inCart = cart[p.id]?.quantity || 0;
              return (
                <div key={p.id} className="bg-white rounded-2xl border border-[#14231c]/8 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
                  <div className="aspect-square bg-[#f6f7f4] relative">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#59665f]/40"><ImageOff size={28} /></div>
                    )}
                    {!p.available && (
                      <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                        <span className="text-xs font-semibold text-[#c7372f] bg-white px-2.5 py-1 rounded-full border border-[#c7372f]/30">Hết hàng</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3 flex-1 flex flex-col gap-2">
                    <p className="text-sm font-medium text-[#14231c] line-clamp-2 leading-snug flex-1">{p.name}</p>
                    <p className="text-xs text-[#59665f]">{p.unit}</p>
                    {p.priceOnRequest ? (
                      <p className="font-bold text-[#f5c84c] bg-[#14231c] inline-block px-2 py-0.5 rounded-md text-xs w-fit">Liên hệ báo giá</p>
                    ) : (
                      <p className="font-bold text-[#0f6f4b]">{money(p.price)}</p>
                    )}
                    {inCart > 0 ? (
                      <div className="flex items-center gap-2 bg-[#f6f7f4] rounded-xl p-1">
                        <button onClick={() => setQty(p.id, inCart - 1)} className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-[#0f6f4b] shadow-sm"><Minus size={14} /></button>
                        <span className="flex-1 text-center text-sm font-semibold text-[#14231c]">{inCart}</span>
                        <button onClick={() => setQty(p.id, inCart + 1)} className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-[#0f6f4b] shadow-sm"><Plus size={14} /></button>
                      </div>
                    ) : (
                      <button onClick={() => addToCart(p)} disabled={!p.available}
                        className="w-full py-2 rounded-xl bg-[#0f6f4b] text-white text-sm font-medium hover:bg-[#0b5a3c] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5">
                        <Plus size={14} /> Thêm
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
                className="px-3 py-1.5 rounded-lg border border-[#14231c]/10 text-sm text-[#59665f] disabled:opacity-40">Trước</button>
              <span className="text-sm text-[#59665f]">Trang {page + 1}/{totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                className="px-3 py-1.5 rounded-lg border border-[#14231c]/10 text-sm text-[#59665f] disabled:opacity-40">Sau</button>
            </div>
          )}
        </>
      )}

      {/* Sticky mini cart bar (mobile-friendly) */}
      {cartCount > 0 && (
        <button onClick={() => setShowCart(true)}
          className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-30 bg-[#14231c] text-white rounded-full px-6 py-3.5 shadow-xl flex items-center gap-3 hover:bg-[#0f1a15] transition-colors">
          <ShoppingCart size={18} />
          <span className="text-sm font-medium">{cartCount} sản phẩm</span>
          <span className="w-px h-4 bg-white/20" />
          <span className="text-sm font-bold text-[#f5c84c]">{money(cartTotal)}</span>
        </button>
      )}

      {/* Cart drawer */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCart(false)} />
          <div className="relative w-full max-w-md bg-[#f6f7f4] h-full flex flex-col shadow-2xl" style={{ fontFamily: 'var(--font-brand)' }}>
            <div className="p-5 bg-white border-b border-[#14231c]/8 flex items-center justify-between">
              <h2 className="font-bold text-[#14231c] flex items-center gap-2"><ShoppingCart size={18} className="text-[#0f6f4b]" /> Giỏ hàng ({cartCount})</h2>
              <button onClick={() => setShowCart(false)} className="p-1 text-[#59665f] hover:text-[#14231c]"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cartLines.length === 0 ? (
                <p className="text-center text-[#59665f] py-16 text-sm">Giỏ hàng đang trống</p>
              ) : cartLines.map((l) => (
                <div key={l.product.id} className="bg-white rounded-xl p-3 flex items-center gap-3">
                  {l.product.imageUrl ? (
                    <img src={l.product.imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-[#f6f7f4] shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#14231c] truncate">{l.product.name}</p>
                    {l.product.priceOnRequest ? (
                      <p className="text-xs text-[#f5c84c] font-semibold">Liên hệ báo giá</p>
                    ) : (
                      <p className="text-xs text-[#0f6f4b] font-semibold">{money(l.product.price)}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => setQty(l.product.id, l.quantity - 1)} className="w-6 h-6 rounded-md bg-[#f6f7f4] flex items-center justify-center text-[#0f6f4b]"><Minus size={12} /></button>
                    <span className="w-6 text-center text-sm">{l.quantity}</span>
                    <button onClick={() => setQty(l.product.id, l.quantity + 1)} className="w-6 h-6 rounded-md bg-[#f6f7f4] flex items-center justify-center text-[#0f6f4b]"><Plus size={12} /></button>
                  </div>
                  <button onClick={() => setQty(l.product.id, 0)} className="text-[#c7372f]/60 hover:text-[#c7372f] shrink-0"><Trash2 size={16} /></button>
                </div>
              ))}

              {cartLines.length > 0 && (
                <div className="bg-white rounded-xl p-4 space-y-3 mt-4">
                  <p className="text-xs font-semibold text-[#59665f] uppercase">Thông tin giao hàng</p>
                  <input type="text" value={deliveryName} onChange={(e) => setDeliveryName(e.target.value)} placeholder="Tên người nhận *"
                    className="w-full border border-[#14231c]/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f6f4b]/20" />
                  <input type="text" value={deliveryPhone} onChange={(e) => setDeliveryPhone(e.target.value)} placeholder="Số điện thoại *"
                    className="w-full border border-[#14231c]/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f6f4b]/20" />
                  <textarea value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} placeholder="Địa chỉ giao hàng *" rows={2}
                    className="w-full border border-[#14231c]/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f6f4b]/20 resize-none" />
                  <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú (không bắt buộc)" rows={2}
                    className="w-full border border-[#14231c]/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f6f4b]/20 resize-none" />
                </div>
              )}
            </div>

            {cartLines.length > 0 && (
              <div className="p-4 bg-white border-t border-[#14231c]/8 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#59665f]">Tạm tính</span>
                  <span className="text-lg font-bold text-[#0f6f4b]">{money(cartTotal)}</span>
                </div>
                <button onClick={submitOrder} disabled={submitting}
                  className="w-full py-3.5 rounded-xl bg-[#0f6f4b] text-white font-semibold hover:bg-[#0b5a3c] disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm">
                  {submitting ? 'Đang gửi đơn...' : 'Đặt hàng'} <ChevronRight size={18} />
                </button>
                <p className="text-[10px] text-[#59665f] text-center">Giá tạm tính, sale sẽ xác nhận lại sau khi đặt hàng.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
