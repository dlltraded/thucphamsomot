import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PackageOpen, AlertCircle, RefreshCw } from 'lucide-react';

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

export default function SoanHangPage() {
  const [data, setData] = useState<AggregatedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderCount, setOrderCount] = useState(0);

  useEffect(() => {
    fetchConfirmedOrders();
  }, []);

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
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Bảng Soạn Hàng</h1>
          <p className="text-slate-500">Tổng hợp số lượng cần chuẩn bị từ {orderCount} đơn hàng đã xác nhận hôm nay</p>
        </div>
        <button onClick={fetchConfirmedOrders} className="p-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50" title="Tải lại">
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </header>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 text-amber-800 text-sm">
        <AlertCircle className="shrink-0 mt-0.5" size={18} />
        <div>
          <strong className="block mb-1">Lưu ý khi soạn hàng:</strong>
          Bảng dưới đây tự động gom số lượng từ các đơn hàng đã <b>xác nhận</b> (đã chốt giá) trong hôm nay — gồm cả đơn tạo qua POS và đơn khách tự đặt. Đơn Nháp, Chờ xác nhận, Đã hủy hoặc Đã hoàn thành sẽ không được tính vào đây.
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
