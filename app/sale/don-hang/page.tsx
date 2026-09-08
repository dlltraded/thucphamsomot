import { getAdminSession } from "@/lib/admin-session";
import { getCustomerSupabaseAdmin as getAdminSupabase } from "@/lib/customer-supabase-server";
import { fmtDate, fmtMoney } from "@/lib/utils";
import Link from "next/link";
import { Search, Filter, ReceiptText, CalendarDays } from "lucide-react";

export default async function SaleOrdersPage() {
  const session = await getAdminSession();
  if (!session) return null;

  const supabase = getAdminSupabase();
  const { data: orders } = await supabase.rpc("sale_get_orders", {
    p_admin_id: session.id,
    p_role: session.role,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Quản lý Đơn hàng</h2>
          <p className="text-slate-500">Danh sách đơn hàng của khách hàng bạn quản lý</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 shadow-sm transition-colors">
            <Filter size={18} /> Lọc
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Tìm mã đơn, tên khách..." 
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 bg-white w-full md:w-64"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-600">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-semibold tracking-wider">
              <tr>
                <th className="px-5 py-4">Mã đơn / Ngày</th>
                <th className="px-5 py-4">Khách hàng</th>
                <th className="px-5 py-4">Trạng thái</th>
                <th className="px-5 py-4">Chốt giá</th>
                <th className="px-5 py-4 text-right">Tổng tiền</th>
                <th className="px-5 py-4 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders?.map((order: any) => (
                <tr key={order.id} className="hover:bg-green-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <ReceiptText className="text-slate-400" size={16} />
                      <Link href={`/sale/don-hang/${order.id}`} className="font-bold text-green-700 hover:underline">
                        {order.order_code || "N/A"}
                      </Link>
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                      <CalendarDays size={12} /> {fmtDate(order.created_at)}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-medium text-slate-800">{order.customer_name}</div>
                    <div className="text-xs text-slate-500">{order.customer_phone}</div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      order.status === 'pending' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                      order.status === 'confirmed' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                      order.status === 'shipping' ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                      order.status === 'completed' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                      'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {order.pricing_status === 'finalized' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium border border-green-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Đã chốt (R{order.price_revision || 1})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium border border-slate-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Tạm tính
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="font-bold text-slate-800">{fmtMoney(order.grand_total)}</div>
                    <div className="text-[10px] text-slate-400">{order.item_count} SP</div>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <Link href={`/sale/don-hang/${order.id}`} className="inline-flex items-center justify-center px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors shadow-sm">
                      Chi tiết
                    </Link>
                  </td>
                </tr>
              ))}
              {(!orders || orders.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-3">
                      <ReceiptText size={48} className="text-slate-200" />
                      <p>Bạn chưa quản lý đơn hàng nào.</p>
                    </div>
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
