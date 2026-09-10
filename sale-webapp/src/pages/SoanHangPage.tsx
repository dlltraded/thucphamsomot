import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { PackageOpen, AlertCircle, RefreshCw, ChevronDown, ChevronUp, BarChart3, ListChecks, FileSpreadsheet } from 'lucide-react';

// LƯU Ý (Giai đoạn C, 2026-09-10): trang này trước đây chỉ gom từ bảng
// "quotes" (status='won') — bỏ sót toàn bộ đơn tạo qua orders/order_items
// (POS, khách tự đặt qua Mini App). Theo đúng kế hoạch mục 13.5: đọc từ
// orders/order_items với status đã xác nhận trở lên (confirmed/preparing/
// shipping — completed thì đã giao xong, không cần soạn nữa).
const PACKING_STATUSES = ['confirmed', 'preparing', 'shipping'];

interface AggregatedItem {
  name: string;
  unit: string;
  qty: number;
  customers: { name: string; qty: number }[];
}

function money(v: number) { return new Intl.NumberFormat('vi-VN').format(Number(v) || 0) + 'đ'; }

export default function SoanHangPage() {
  const [mode, setMode] = useState<'pack' | 'report'>('pack');

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Soạn hàng</h1>
          <p className="text-slate-500 text-sm">Chuẩn bị hàng cho đơn hôm nay, hoặc xem báo cáo đã bán theo khoảng thời gian</p>
        </div>
        <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm self-start">
          <button onClick={() => setMode('pack')} className={`px-4 py-2 flex items-center gap-1.5 ${mode === 'pack' ? 'bg-green-600 text-white' : 'bg-white text-slate-600'}`}>
            <ListChecks size={15} /> Soạn hàng hôm nay
          </button>
          <button onClick={() => setMode('report')} className={`px-4 py-2 flex items-center gap-1.5 border-l border-slate-200 ${mode === 'report' ? 'bg-green-600 text-white' : 'bg-white text-slate-600'}`}>
            <BarChart3 size={15} /> Báo cáo đã bán
          </button>
        </div>
      </header>

      {mode === 'pack' ? <PackingList /> : <SalesReport />}
    </div>
  );
}

function PackingList() {
  const [data, setData] = useState<AggregatedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderCount, setOrderCount] = useState(0);

  useEffect(() => { fetchConfirmedOrders(); }, []);

  const fetchConfirmedOrders = async () => {
    setLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, customer_name, customer_company, status, confirmed_at, order_items(name, quantity, unit)')
        .in('status', PACKING_STATUSES)
        .gte('confirmed_at', today.toISOString());
      if (error) throw error;

      setOrderCount((orders || []).length);

      const itemMap: Record<string, AggregatedItem> = {};
      (orders || []).forEach((order: any) => {
        const customerName = order.customer_company ? `${order.customer_name} (${order.customer_company})` : order.customer_name || 'Khách lẻ';
        (order.order_items || []).forEach((item: any) => {
          const key = `${item.name}__${item.unit || 'Kg'}`;
          if (!itemMap[key]) {
            itemMap[key] = { name: item.name, unit: item.unit || 'Kg', qty: 0, customers: [] };
          }
          const qty = Number(item.quantity) || 0;
          itemMap[key].qty += qty;

          const existingCust = itemMap[key].customers.find((c) => c.name === customerName);
          if (existingCust) existingCust.qty += qty;
          else itemMap[key].customers.push({ name: customerName, qty });
        });
      });

      setData(Object.values(itemMap).sort((a, b) => b.qty - a.qty));
    } catch (err) {
      console.error('Lỗi tải bảng soạn hàng:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={fetchConfirmedOrders} className="p-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50" title="Tải lại">
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 text-amber-800 text-sm">
        <AlertCircle className="shrink-0 mt-0.5" size={18} />
        <div>
          <strong className="block mb-1">Lưu ý khi soạn hàng:</strong>
          Bảng dưới đây tự động gom số lượng từ {orderCount} đơn hàng đã <b>xác nhận</b> (đã chốt giá) trong hôm nay — gồm cả đơn tạo qua POS và đơn khách tự đặt. Đơn Nháp, Chờ xác nhận, Đã hủy hoặc Đã hoàn thành sẽ không được tính vào đây.
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-12 text-slate-500">Đang tải dữ liệu...</div>
          ) : (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider">
                <tr>
                  <th className="px-5 py-4 w-16 text-center">STT</th>
                  <th className="px-5 py-4">Tên Sản Phẩm</th>
                  <th className="px-5 py-4">Chi tiết phân bổ cho Khách hàng</th>
                  <th className="px-5 py-4 text-right bg-green-50/50 text-green-700">Tổng cần soạn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4 text-center font-medium text-slate-400">{idx + 1}</td>
                    <td className="px-5 py-4 font-bold text-slate-800">
                      <div className="flex items-center gap-2">
                        <PackageOpen size={16} className="text-green-600" />
                        {item.name}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        {item.customers.map((c, cIdx) => (
                          <span key={cIdx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-700">
                            <span className="font-medium">{c.name}:</span>
                            <span className="font-bold text-green-700">{c.qty} {item.unit}</span>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right font-bold text-lg text-green-700 bg-green-50/20">
                      {item.qty} <span className="text-sm font-medium">{item.unit}</span>
                    </td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center text-slate-400">
                      Chưa có mặt hàng nào cần soạn.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function fmt(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

type RangePreset = 'day' | 'month' | 'year' | 'custom';

// Khối "Báo cáo đã bán" (yêu cầu 2026-09-10): chọn khoảng ngày/tháng/năm,
// xem theo nhóm hàng -> mặt hàng -> bán cho ai/đơn nào, phục vụ thu mua điều
// chỉnh nhập hàng. Khác PackingList ở chỗ tính CẢ đơn đã hoàn thành (không
// chỉ đơn đang chờ soạn), vì đây là báo cáo lịch sử chứ không phải việc cần
// làm ngay hôm nay.
function SalesReport() {
  const { token } = useAuth();
  const apiBase = import.meta.env.VITE_API_BASE_URL || '';

  const [preset, setPreset] = useState<RangePreset>('day');
  const [anchor, setAnchor] = useState(todayStr()); // ngày mốc để suy ra khoảng theo preset
  const [customFrom, setCustomFrom] = useState(todayStr());
  const [customTo, setCustomTo] = useState(todayStr());

  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  const computeRange = useCallback((): [string, string] => {
    if (preset === 'custom') return [customFrom, `${customTo}T23:59:59.999`];
    const a = new Date(anchor + 'T00:00:00');
    if (preset === 'day') {
      const to = new Date(a); to.setDate(to.getDate() + 1);
      return [fmt(a), fmt(to)];
    }
    if (preset === 'month') {
      const from = new Date(a.getFullYear(), a.getMonth(), 1);
      const to = new Date(a.getFullYear(), a.getMonth() + 1, 1);
      return [fmt(from), fmt(to)];
    }
    // year
    const from = new Date(a.getFullYear(), 0, 1);
    const to = new Date(a.getFullYear() + 1, 0, 1);
    return [fmt(from), fmt(to)];
  }, [preset, anchor, customFrom, customTo]);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const [from, to] = computeRange();
      const res = await fetch(`${apiBase}/api/admin/reports/sales-detail?from=${from}&to=${to}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok) setReport(data);
    } finally { setLoading(false); }
  }, [apiBase, token, computeRange]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const [from, to] = computeRange();
  const [exporting, setExporting] = useState(false);
  const exportExcel = async () => {
    setExporting(true);
    try {
      const res = await fetch(`${apiBase}/api/admin/reports/sales-detail/export?from=${from}&to=${to}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Không xuất được báo cáo');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `bao-cao-ban-hang-chi-tiet_${from}_${to}.xlsx`; a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Lỗi: ' + (err.message || 'Không xuất được báo cáo'));
    } finally { setExporting(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
          {(['day', 'month', 'year', 'custom'] as RangePreset[]).map((p) => (
            <button key={p} onClick={() => setPreset(p)}
              className={`px-3 py-2 border-l border-slate-200 first:border-l-0 ${preset === p ? 'bg-slate-800 text-white' : 'bg-white text-slate-600'}`}>
              {p === 'day' ? 'Theo ngày' : p === 'month' ? 'Theo tháng' : p === 'year' ? 'Theo năm' : 'Tùy chỉnh'}
            </button>
          ))}
        </div>
        {preset !== 'custom' ? (
          <input type="date" value={anchor} onChange={(e) => setAnchor(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
        ) : (
          <>
            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            <span className="text-slate-400 text-sm">đến</span>
            <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </>
        )}
        <button onClick={exportExcel} disabled={exporting}
          className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-1.5">
          <FileSpreadsheet size={16} /> {exporting ? 'Đang xuất...' : 'Xuất Excel'}
        </button>
        <button onClick={fetchReport} className="p-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50" title="Tải lại">
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
        <span className="text-xs text-slate-400">
          {new Date(from).toLocaleDateString('vi-VN')} – {new Date(to.replace('T23:59:59.999', '')).toLocaleDateString('vi-VN')}
        </span>
      </div>

      {report && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <p className="text-xl font-bold text-slate-800">{money(report.totalRevenue)}</p>
            <p className="text-xs text-slate-500">Doanh thu</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <p className="text-xl font-bold text-slate-800">{report.totalQuantity}</p>
            <p className="text-xs text-slate-500">Tổng số lượng bán</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <p className="text-xl font-bold text-slate-800">{report.orderCount}</p>
            <p className="text-xs text-slate-500">Số đơn</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500">
          <RefreshCw className="animate-spin mr-2" size={20} /> Đang tải...
        </div>
      ) : !report || report.categories.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 py-16 text-center text-slate-400">Không có dữ liệu trong khoảng này</div>
      ) : (
        <div className="space-y-2">
          {report.categories.map((cat: any) => {
            const catOpen = expandedCategory === cat.category;
            return (
              <article key={cat.category} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <button onClick={() => setExpandedCategory(catOpen ? null : cat.category)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50">
                  <div className="flex-1">
                    <p className="font-bold text-slate-800">{cat.category}</p>
                    <p className="text-xs text-slate-400">{cat.products.length} mặt hàng</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-700">{money(cat.revenue)}</p>
                    <p className="text-xs text-slate-400">{cat.quantity} đơn vị</p>
                  </div>
                  {catOpen ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                </button>

                {catOpen && (
                  <div className="border-t border-slate-50 divide-y divide-slate-50">
                    {cat.products.map((p: any) => {
                      const key = `${cat.category}__${p.name}`;
                      const prodOpen = expandedProduct === key;
                      return (
                        <div key={key}>
                          <button onClick={() => setExpandedProduct(prodOpen ? null : key)}
                            className="w-full flex items-center gap-3 px-4 py-3 pl-8 text-left hover:bg-slate-50/50">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-slate-700">{p.name}</p>
                              <p className="text-xs text-slate-400">{p.orders.length} lượt bán</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-slate-700">{money(p.revenue)}</p>
                              <p className="text-xs text-slate-400">{p.quantity} {p.unit}</p>
                            </div>
                            {prodOpen ? <ChevronUp size={15} className="text-slate-300" /> : <ChevronDown size={15} className="text-slate-300" />}
                          </button>
                          {prodOpen && (
                            <div className="pl-12 pr-4 pb-3">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-left text-slate-400 uppercase">
                                    <th className="pb-1">Đơn hàng</th>
                                    <th className="pb-1">Khách hàng</th>
                                    <th className="pb-1 text-right">Số lượng</th>
                                    <th className="pb-1 text-right">Thành tiền</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {p.orders.map((o: any, i: number) => (
                                    <tr key={i} className="border-t border-slate-50">
                                      <td className="py-1.5 font-medium text-slate-600">{o.orderCode}</td>
                                      <td className="py-1.5 text-slate-500">{o.customerName}{o.customerCompany ? ` (${o.customerCompany})` : ''}</td>
                                      <td className="py-1.5 text-right text-slate-600">{o.quantity} {p.unit}</td>
                                      <td className="py-1.5 text-right text-slate-600">{money(o.revenue)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
