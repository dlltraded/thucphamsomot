import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ShoppingCart, Clock, Users, CheckCircle2 } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    todayOrders: 0,
    pendingOrders: 0,
    customers: 0,
    confirmedOrders: 0
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Orders today
      const { count: todayOrders } = await supabase
        .from('quotes')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

      // Pending (draft/quoted)
      const { count: pendingOrders } = await supabase
        .from('quotes')
        .select('*', { count: 'exact', head: true })
        .in('status', ['draft', 'quoted', 'negotiating']);

      // Confirmed
      const { count: confirmedOrders } = await supabase
        .from('quotes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'won');

      // Customers
      const { count: customers } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true });

      setStats({
        todayOrders: todayOrders || 0,
        pendingOrders: pendingOrders || 0,
        customers: customers || 0,
        confirmedOrders: confirmedOrders || 0
      });

      // Recent Orders
      const { data: recent } = await supabase
        .from('quotes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (recent) setRecentOrders(recent);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h1 className="text-2xl font-bold text-slate-800">Xin chào, {user?.name}!</h1>
        <p className="text-slate-500">Tổng quan tình hình kinh doanh hôm nay.</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Stat Cards */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShoppingCart size={20} />
            </div>
            <span className="text-sm font-medium text-slate-500">Đơn hôm nay</span>
          </div>
          <div className="text-3xl font-bold text-slate-800">{stats.todayOrders}</div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock size={20} />
            </div>
            <span className="text-sm font-medium text-slate-500">Đang chờ xử lý</span>
          </div>
          <div className="text-3xl font-bold text-slate-800">{stats.pendingOrders}</div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
              <CheckCircle2 size={20} />
            </div>
            <span className="text-sm font-medium text-slate-500">Đã chốt (Won)</span>
          </div>
          <div className="text-3xl font-bold text-slate-800">{stats.confirmedOrders}</div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users size={20} />
            </div>
            <span className="text-sm font-medium text-slate-500">Khách hàng</span>
          </div>
          <div className="text-3xl font-bold text-slate-800">{stats.customers}</div>
        </div>
      </div>
      
      {/* Recent Orders Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Đơn hàng gần đây</h2>
          <a href="/don-hang" className="text-sm font-medium text-green-600 hover:text-green-700">Xem tất cả →</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
              <tr>
                <th className="px-4 py-3">Mã đơn</th>
                <th className="px-4 py-3">Khách hàng</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3 text-right">Tổng tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentOrders.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-6 text-slate-500">Chưa có đơn hàng nào.</td></tr>
              ) : recentOrders.map(order => (
                <tr key={order.id || order.local_quote_id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-green-700">{order.quote_code || order.local_quote_id}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{order.lead_name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      order.status === 'won' ? 'bg-green-100 text-green-700' :
                      order.status === 'draft' ? 'bg-slate-100 text-slate-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {order.status === 'won' ? 'Đã chốt' : order.status === 'draft' ? 'Nháp' : 'Đã báo giá'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-red-600">
                    {Number(order.grand_total).toLocaleString('vi-VN')}đ
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

