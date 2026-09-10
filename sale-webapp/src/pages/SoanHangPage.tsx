import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PackageOpen, AlertCircle } from 'lucide-react';

export default function SoanHangPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConfirmedOrders();
  }, []);

  const fetchConfirmedOrders = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data: quotes } = await supabase
        .from('quotes')
        .select('*')
        .eq('status', 'won')
        .gte('updated_at', today.toISOString());
      
      if (quotes) {
        // Aggregate items
        const itemMap: Record<string, any> = {};
        quotes.forEach(quote => {
          const customerName = quote.lead_name || 'Khách lẻ';
          (quote.items || []).forEach((item: any) => {
            if (!itemMap[item.name]) {
              itemMap[item.name] = { name: item.name, qty: 0, unit: item.unit || 'Kg', customers: [] };
            }
            itemMap[item.name].qty += Number(item.qty);
            
            const existingCust = itemMap[item.name].customers.find((c: any) => c.name === customerName);
            if (existingCust) {
              existingCust.qty += Number(item.qty);
            } else {
              itemMap[item.name].customers.push({ name: customerName, qty: Number(item.qty) });
            }
          });
        });

        const sorted = Object.values(itemMap).sort((a: any, b: any) => b.qty - a.qty);
        setData(sorted);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-800">Bảng Soạn Hàng</h1>
        <p className="text-slate-500">Tổng hợp số lượng cần chuẩn bị cho các đơn Đã Chốt trong ngày</p>
      </header>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 text-amber-800 text-sm">
        <AlertCircle className="shrink-0 mt-0.5" size={18} />
        <div>
          <strong className="block mb-1">Lưu ý khi soạn hàng:</strong>
          Bảng dưới đây tự động gom số lượng từ tất cả các báo giá đang ở trạng thái <b>Đã chốt (Won)</b>. Các đơn Nháp hoặc Đang báo giá sẽ không được tính vào đây để tránh xuất dư kho.
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
                        {item.customers.map((c: any, cIdx: number) => (
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
