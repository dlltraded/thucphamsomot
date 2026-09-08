import { getAdminSession } from "@/lib/admin-session";
import { getAdminSupabase } from "@/lib/supabase-server";
import { PackageOpen, Download, AlertCircle } from "lucide-react";
import SoanHangClient from "./client-page";

export default async function SoanHangPage() {
  const session = await getAdminSession();
  if (!session) return null;

  const supabase = getAdminSupabase();

  // Lấy đơn hàng của ngày hôm nay (hoặc tất cả đơn chưa completed/canceled)
  // Trong thực tế, nên có Date picker. Ở đây mockup lấy đơn trong 3 ngày gần nhất.
  const today = new Date();
  today.setDate(today.getDate() - 3);

  const { data: orders } = await supabase.rpc("sale_get_orders", {
    p_admin_id: session.id,
    p_role: session.role,
  });

  // Lọc đơn hàng: status IN ('confirmed', 'shipping') và created_at >= 3 ngày trước
  const validOrders = orders?.filter((o: any) => 
    ["confirmed", "shipping"].includes(o.status) && 
    new Date(o.created_at) >= today
  ) || [];

  // Lấy chi tiết món của các đơn này
  const orderIds = validOrders.map((o: any) => o.id);
  
  let orderItems: any[] = [];
  if (orderIds.length > 0) {
    const { data: items } = await supabase
      .from("order_items")
      .select("*, orders!inner(customer_name, order_code, status)")
      .in("order_id", orderIds);
    orderItems = items || [];
  }

  // Gom nhóm dữ liệu: Sản phẩm -> Khách hàng -> Số lượng
  // Dữ liệu đầu ra mong muốn: 
  // [
  //   { 
  //     productName: "Thịt Bò", 
  //     totalQty: 8, 
  //     customers: [{ name: "Khách A", qty: 5 }, { name: "Khách B", qty: 3 }] 
  //   }
  // ]

  const productMap = new Map();

  orderItems.forEach((item: any) => {
    const pName = item.name;
    const cName = item.orders.customer_name;
    const qty = Number(item.quantity);

    if (!productMap.has(pName)) {
      productMap.set(pName, { productName: pName, totalQty: 0, customersMap: new Map() });
    }

    const pData = productMap.get(pName);
    pData.totalQty += qty;
    
    const cQty = pData.customersMap.get(cName) || 0;
    pData.customersMap.set(cName, cQty + qty);
  });

  const aggregatedData = Array.from(productMap.values()).map(p => ({
    productName: p.productName,
    totalQty: p.totalQty,
    customers: Array.from(p.customersMap.entries()).map(([name, qty]) => ({ name, qty }))
  })).sort((a, b) => b.totalQty - a.totalQty);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Soạn hàng xuất kho</h2>
          <p className="text-slate-500">Tổng hợp mặt hàng từ các đơn Đã xác nhận / Đang giao</p>
        </div>
        
        <SoanHangClient data={aggregatedData} rawOrders={validOrders} />
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 text-amber-800 text-sm">
        <AlertCircle className="shrink-0 mt-0.5" size={18} />
        <div>
          <strong className="block mb-1">Lưu ý khi soạn hàng:</strong>
          Bảng dưới đây tự động gom số lượng từ tất cả các đơn hàng đang ở trạng thái <b>Đã xác nhận</b> hoặc <b>Đang giao</b>. Các đơn Tạm tính sẽ không được tính vào đây để tránh xuất dư.
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-600">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider">
              <tr>
                <th className="px-5 py-4 w-16 text-center">STT</th>
                <th className="px-5 py-4">Tên Sản Phẩm</th>
                <th className="px-5 py-4">Chi tiết phân bổ cho Khách hàng</th>
                <th className="px-5 py-4 text-right bg-green-50/50 text-green-700">Tổng cần soạn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {aggregatedData.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4 text-center font-medium text-slate-400">{idx + 1}</td>
                  <td className="px-5 py-4 font-bold text-slate-800">
                    <div className="flex items-center gap-2">
                      <PackageOpen size={16} className="text-green-600" />
                      {item.productName}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      {item.customers.map((c: any, cIdx: number) => (
                        <span key={cIdx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-700">
                          <span className="font-medium">{c.name}:</span>
                          <span className="font-bold text-green-700">{c.qty}</span>
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right font-bold text-lg text-green-700 bg-green-50/20">
                    {item.totalQty}
                  </td>
                </tr>
              ))}
              {aggregatedData.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-slate-400">
                    Chưa có mặt hàng nào cần soạn.
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
