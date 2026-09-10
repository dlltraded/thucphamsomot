import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Search, RefreshCw, ChevronDown, ChevronUp, AlertTriangle, PackagePlus, PackageMinus, Wrench, ChevronLeft, ChevronRight } from 'lucide-react';

function money(v: number) { return new Intl.NumberFormat('vi-VN').format(Number(v) || 0) + 'đ'; }

interface Product {
  id: string;
  sku: string | null;
  name: string;
  category: string | null;
  unit: string | null;
  price_retail: number | null;
  price_wholesale: number | null;
  cost_price: number | null;
  stock_qty: number | null;
  min_stock: number | null;
  track_inventory: boolean;
  is_low_stock: boolean;
  tierPrices: Record<string, number>;
}

// Trang "Hàng hóa" (Giai đoạn B) — phòng thu mua tự sửa giá theo hạng khách
// và điều chỉnh tồn kho. Chỉ admin/thu_mua sửa được (canEdit từ API), các
// role khác (sale, trưởng phòng) chỉ xem để tra cứu khi tư vấn khách.
export default function ProductsPage() {
  const { token } = useAuth();
  const apiBase = import.meta.env.VITE_API_BASE_URL || '';

  const [categories, setCategories] = useState<string[]>([]);
  const [tiers, setTiers] = useState<{ code: string; name: string }[]>([]);
  const [canEdit, setCanEdit] = useState(false);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const pageSize = 40;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [tierDrafts, setTierDrafts] = useState<Record<string, string>>({});
  const [invType, setInvType] = useState<'in' | 'out' | 'adjust'>('in');
  const [invQty, setInvQty] = useState('');
  const [invNote, setInvNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`${apiBase}/api/admin/products?meta=1`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setCategories(data.categories || []);
          setTiers(data.tiers || []);
        }
      });
  }, [token, apiBase]);

  const fetchProducts = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (search.trim()) params.set('search', search.trim());
      if (category) params.set('category', category);
      if (lowStockOnly) params.set('lowStockOnly', '1');
      const res = await fetch(`${apiBase}/api/admin/products?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok) {
        setProducts(data.products || []);
        setTotal(data.total || 0);
        setCanEdit(!!data.canEdit);
      }
    } finally {
      setLoading(false);
    }
  }, [token, apiBase, page, search, category, lowStockOnly]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const openRow = (p: Product) => {
    if (expandedId === p.id) { setExpandedId(null); return; }
    setExpandedId(p.id);
    const drafts: Record<string, string> = {};
    for (const t of tiers) drafts[t.code] = p.tierPrices[t.code] != null ? String(p.tierPrices[t.code]) : '';
    setTierDrafts(drafts);
    setInvType('in'); setInvQty(''); setInvNote('');
  };

  const saveTierPrices = async (product: Product) => {
    setSaving(true);
    try {
      const tierPrices: Record<string, number | null> = {};
      for (const t of tiers) {
        const raw = tierDrafts[t.code];
        tierPrices[t.code] = raw === '' || raw === undefined ? null : Number(raw);
      }
      const res = await fetch(`${apiBase}/api/admin/products`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ productId: product.id, tierPrices }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      await fetchProducts();
      alert('✅ Đã lưu giá theo hạng');
    } catch (err: any) {
      alert('Lỗi: ' + (err.message || 'Không lưu được'));
    } finally { setSaving(false); }
  };

  const submitInventoryAdjustment = async (product: Product) => {
    const qty = Number(invQty);
    // 'in'/'out': luôn nhập số dương (độ lớn) — chiều +/- do "type" quyết
    // định, DB tự trừ khi type='out'. 'adjust': cho phép âm để chỉnh giảm khi
    // kiểm kê lệch (vd kiểm thực tế ít hơn sổ sách -> nhập số âm).
    if (!qty || (invType !== 'adjust' && qty <= 0)) { alert('Nhập số lượng hợp lệ' + (invType !== 'adjust' ? ' (> 0)' : '')); return; }
    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/api/admin/products`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          productId: product.id,
          inventoryAdjustment: { type: invType, quantity: qty, note: invNote || undefined },
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setInvQty(''); setInvNote('');
      await fetchProducts();
      alert('✅ Đã ghi nhận điều chỉnh tồn kho');
    } catch (err: any) {
      alert('Lỗi: ' + (err.message || 'Không lưu được'));
    } finally { setSaving(false); }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Hàng hóa</h1>
          <p className="text-slate-500 text-sm">{total} mã hàng {!canEdit && '· chỉ xem (cần quyền Admin/Thu mua để sửa)'}</p>
        </div>
        <button onClick={fetchProducts} className="p-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 self-start" title="Tải lại">
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </header>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Tìm theo tên, mã hàng..."
            className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
          />
        </div>
        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(0); }}
          className="px-3 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20"
        >
          <option value="">Tất cả nhóm hàng</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <label className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 cursor-pointer">
          <input type="checkbox" checked={lowStockOnly} onChange={(e) => { setLowStockOnly(e.target.checked); setPage(0); }} />
          Sắp hết hàng
        </label>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500">
          <RefreshCw className="animate-spin mr-2" size={20} /> Đang tải...
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 py-16 text-center text-slate-400">Không tìm thấy mã hàng nào</div>
      ) : (
        <div className="space-y-2">
          {products.map((p) => {
            const isOpen = expandedId === p.id;
            const base = Number(p.price_retail) || Number(p.price_wholesale) || 0;
            return (
              <article key={p.id} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <button onClick={() => openRow(p)} className="w-full flex items-center gap-3 p-3 text-left">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 text-sm truncate">{p.name}</p>
                    <p className="text-xs text-slate-400">{p.sku || '—'} · {p.category || 'Chưa phân loại'} · {p.unit || 'Kg'}</p>
                  </div>
                  {p.track_inventory ? (
                    <div className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${p.is_low_stock ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-500'}`}>
                      {p.is_low_stock && <AlertTriangle size={12} className="inline mr-1 -mt-0.5" />}
                      Tồn {p.stock_qty ?? 0}
                    </div>
                  ) : (
                    <div className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-600 shrink-0">Theo ngày</div>
                  )}
                  <div className="text-right shrink-0 w-24">
                    <p className="font-semibold text-slate-700 text-sm">{money(base)}</p>
                  </div>
                  {isOpen ? <ChevronUp size={18} className="text-slate-400 shrink-0" /> : <ChevronDown size={18} className="text-slate-400 shrink-0" />}
                </button>

                {isOpen && (
                  <div className="border-t border-slate-50 p-4 space-y-4 bg-slate-50/50">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Giá theo hạng khách</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {tiers.map((t) => (
                          <div key={t.code}>
                            <label className="text-[10px] text-slate-400">{t.name}</label>
                            <input
                              type="number" min="0" step="1000"
                              disabled={!canEdit}
                              value={tierDrafts[t.code] ?? ''}
                              onChange={(e) => setTierDrafts((d) => ({ ...d, [t.code]: e.target.value }))}
                              placeholder={money(base)}
                              className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm disabled:bg-slate-100"
                            />
                          </div>
                        ))}
                      </div>
                      {canEdit && (
                        <button onClick={() => saveTierPrices(p)} disabled={saving}
                          className="mt-2 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-50">
                          Lưu giá theo hạng
                        </button>
                      )}
                    </div>

                    {p.track_inventory && canEdit && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Điều chỉnh tồn kho (hiện: {p.stock_qty ?? 0})</p>
                        <div className="flex flex-wrap gap-2 items-center">
                          <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs">
                            <button onClick={() => setInvType('in')} className={`px-3 py-1.5 flex items-center gap-1 ${invType === 'in' ? 'bg-green-600 text-white' : 'bg-white text-slate-600'}`}>
                              <PackagePlus size={14} /> Nhập
                            </button>
                            <button onClick={() => setInvType('out')} className={`px-3 py-1.5 flex items-center gap-1 border-l border-slate-200 ${invType === 'out' ? 'bg-red-600 text-white' : 'bg-white text-slate-600'}`}>
                              <PackageMinus size={14} /> Xuất
                            </button>
                            <button onClick={() => setInvType('adjust')} className={`px-3 py-1.5 flex items-center gap-1 border-l border-slate-200 ${invType === 'adjust' ? 'bg-slate-700 text-white' : 'bg-white text-slate-600'}`}>
                              <Wrench size={14} /> Điều chỉnh
                            </button>
                          </div>
                          <input type="number" min={invType === 'adjust' ? undefined : 0} step="0.001" value={invQty} onChange={(e) => setInvQty(e.target.value)}
                            placeholder={invType === 'adjust' ? 'vd: -5 hoặc 5' : 'Số lượng'} className="w-28 border border-slate-200 rounded-lg px-2 py-1.5 text-sm" />
                          <input type="text" value={invNote} onChange={(e) => setInvNote(e.target.value)}
                            placeholder="Ghi chú (vd: kiểm kê 10/09)" className="flex-1 min-w-[160px] border border-slate-200 rounded-lg px-2 py-1.5 text-sm" />
                          <button onClick={() => submitInventoryAdjustment(p)} disabled={saving}
                            className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-medium hover:bg-slate-900 disabled:opacity-50">
                            Ghi nhận
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
            className="p-2 border border-slate-200 rounded-lg disabled:opacity-40"><ChevronLeft size={16} /></button>
          <span className="text-sm text-slate-500">Trang {page + 1}/{totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
            className="p-2 border border-slate-200 rounded-lg disabled:opacity-40"><ChevronRight size={16} /></button>
        </div>
      )}
    </div>
  );
}
