import { getAdminSession } from "@/lib/admin-session";
import { getAdminSupabase } from "@/lib/supabase-server";
import { PackageOpen, Users, CircleDollarSign, TrendingUp } from "lucide-react";
import Link from "next/link";
import { fmtMoney } from "@/lib/utils";

export default async function SaleDashboardPage() {
  const session = await getAdminSession();
  if (!session) return null;

  const supabase = getAdminSupabase();
  const isAdmin = session.role === "admin";

  // Lấy danh sách khách hàng
  const { data: customers } = await supabase.rpc("sale_get_customers", {
    p_admin_id: session.id,
    p_role: session.role,
  });

  // Lấy đơn hàng
  const { data: orders } = await supabase.rpc("sale_get_orders", {
    p_admin_id: session.id,
    p_role: session.role,
  });

  const totalCustomers = customers?.length || 0;
  const activeOrders = orders?.filter((o: any) => !["completed", "canceled"].includes(o.status)) || [];
  const pendingOrders = orders?.filter((o: any) => o.status === "pending") || [];
  const totalRevenue = orders?.reduce((acc: number, o: any) => acc + (o.status !== "canceled" ? Number(o.grand_total) : 0), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Xin chào, {session.name}!</h2>
          <p className="text-slate-500">Tổng quan hoạt động hôm nay</p>
        </div>
        <Link 
          href="/sale/pos" 
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-medium shadow-sm transition-colors"
        >
          + Tạo đơn POS
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
          <div className="flex justify-between items-start mb-2">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <PackageOpen size={20} />
            </div>
            <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded-full">Tất cả</span>
          </div>
          <p className="text-slate-500 text-sm font-medium">Đơn đang xử lý</p>
          <h3 className="text-2xl font-bold text-slate-800">{activeOrders.length}</h3>
        </div>
        
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
          <div className="flex justify-between items-start mb-2">
            <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
            <span className="text-xs font-medium text-red-500 bg-red-50 px-2 py-1 rounded-full">Cần xử lý</span>
          </div>
          <p className="text-slate-500 text-sm font-medium">Chờ xác nhận</p>
          <h3 className="text-2xl font-bold text-slate-800">{pendingOrders.length}</h3>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
          <div className="flex justify-between items-start mb-2">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CircleDollarSign size={20} />
            </div>
            <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded-full">Toàn thời gian</span>
          </div>
          <p className="text-slate-500 text-sm font-medium">Doanh số</p>
          <h3 className="text-xl font-bold text-slate-800 truncate" title={fmtMoney(totalRevenue)}>{fmtMoney(totalRevenue)}</h3>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
          <div className="flex justify-between items-start mb-2">
            <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users size={20} />
            </div>
            <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded-full">{isAdmin ? "Hệ thống" : "Phụ trách"}</span>
          </div>
          <p className="text-slate-500 text-sm font-medium">Khách hàng</p>
          <h3 className="text-2xl font-bold text-slate-800">{totalCustomers}</h3>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">Đơn hàng mới nhất</h3>
          <Link href="/sale/don-hang" className="text-green-600 text-sm font-medium hover:underline">
            Xem tất cả
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-600">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
              <tr>
                <th className="px-5 py-3 font-medium">Mã đơn</th>
                <th className="px-5 py-3 font-medium">Khách hàng</th>
                <th className="px-5 py-3 font-medium">Trạng thái</th>
                <th className="px-5 py-3 font-medium">Giá / Chốt giá</th>
                <th className="px-5 py-3 font-medium text-right">Tổng tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders?.slice(0, 5).map((order: any) => (
                <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4 font-medium text-slate-800">
                    <Link href={`/sale/don-hang/${order.id}`} className="hover:text-green-600 transition-colors">
                      {order.order_code || "N/A"}
                    </Link>
                  </td>
                  <td className="px-5 py-4">
                    <div>{order.customer_name}</div>
                    <div className="text-xs text-slate-400">{order.customer_phone}</div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      order.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      order.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                      order.status === 'shipping' ? 'bg-purple-100 text-purple-700' :
                      order.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                     <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      order.pricing_status === 'finalized' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {order.pricing_status === 'finalized' ? `Đã chốt (R${order.price_revision || 1})` : "Tạm tính"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right font-bold text-slate-800">
                    {fmtMoney(order.grand_total)}
                  </td>
                </tr>
              ))}
              {(!orders || orders.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                    Chưa có đơn hàng nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
