import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Search, RefreshCw, AlertTriangle, ChevronLeft, ChevronRight, Plus, ChevronRight as Arrow } from 'lucide-react';

function money(v: number) { return new Intl.NumberFormat('vi-VN').format(Number(v) || 0) + 'đ'; }

interface Product {
  id: string;
  sku: string | null;
  name: string;
  category: string | null;
  unit: string | null;
  image_url?: string | null;
  price_retail: number | null;
  price_wholesale: number | null;
  stock_qty: number | null;
  track_inventory: boolean;
  is_low_stock: boolean;
}

// Trang "Hàng hóa" (Giai đoạn B) — danh sách tìm/lọc; bấm vào 1 sản phẩm mở
// trang chi tiết (/hang-hoa/:id) để sửa TOÀN BỘ thông tin (ảnh, mô tả, giá
// theo hạng, tồn kho...). Chỉ admin/thu_mua sửa được, role khác chỉ xem.
export default function ProductsPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const apiBase = import.meta.env.VITE_API_BASE_URL || '';

  const [categories, setCategories] = useState<string[]>([]);
  const [canEdit, setCanEdit] = useState(false);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const pageSize = 40;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch(`${apiBase}/api/admin/products?meta=1`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => { if (data.ok) setCategories(data.categories || []); });
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

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Hàng hóa</h1>
          <p className="text-slate-500 text-sm">{total} mã hàng {!canEdit && '· chỉ xem (cần quyền Admin/Thu mua để sửa)'}</p>
        </div>
        <div className="flex gap-2 self-start">
          {canEdit && (
            <button onClick={() => navigate('/hang-hoa/moi')}
              className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-1.5">
              <Plus size={16} /> Thêm sản phẩm
            </button>
          )}
          <button onClick={fetchProducts} className="p-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50" title="Tải lại">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
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
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-50 overflow-hidden">
          {products.map((p) => {
            const base = Number(p.price_retail) || Number(p.price_wholesale) || 0;
            return (
              <button key={p.id} onClick={() => navigate(`/hang-hoa/${p.id}`)}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50 transition-colors">
                {p.image_url ? (
                  <img src={p.image_url} alt="" className="w-10 h-10 rounded-lg object-cover border border-slate-100 shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 shrink-0" />
                )}
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
                <Arrow size={16} className="text-slate-300 shrink-0" />
              </button>
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
