"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fmtDate, fmtMoney } from "@/lib/utils";
import { ChevronLeft, Save, Plus, Trash2, Printer, CheckCircle, PackageOpen, Info, Clock } from "lucide-react";
import Link from "next/link";

export default function OrderDetailClient({ initialOrder, initialItems, customer, isAdmin }: any) {
  const router = useRouter();
  const [order, setOrder] = useState(initialOrder);
  const [items, setItems] = useState<any[]>(initialItems);
  const [status, setStatus] = useState(initialOrder.status);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleUpdateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleAddItem = () => {
    // Để thêm sản phẩm mới cần có Search Product (Giản lược cho mockup, thực tế gọi API /api/products)
    // Hiện tại chỉ thêm 1 dòng trắng để gõ name/price (Thực tế là chọn từ danh sách)
    setItems([...items, { name: "Sản phẩm mới", quantity: 1, unit_price: 0, base_unit_price: 0, productId: null, isNew: true }]);
  };

  const handleSaveOrder = async (isFinalize: boolean = false) => {
    setLoading(true);
    try {
      const payload = {
        orderId: order.id,
        items: items,
        pricingStatus: isFinalize ? "finalized" : "provisional",
        shippingFee: order.shipping_fee || 0,
        otherDiscount: order.other_discount || 0,
        status: status,
      };

      const res = await fetch("/api/sale/order/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.ok) {
        alert("Lưu đơn hàng thành công!");
        router.refresh();
        setIsEditing(false);
        if (isFinalize) {
          setOrder({ ...order, pricing_status: "finalized", price_revision: (order.price_revision || 0) + 1 });
        }
      } else {
        alert("Lỗi: " + data.error);
      }
    } catch (err) {
      alert("Đã xảy ra lỗi khi lưu.");
    } finally {
      setLoading(false);
    }
  };

  const calculateSubtotal = () => {
    return items.reduce((acc, item) => acc + (Number(item.unit_price) * Number(item.quantity)), 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/sale/don-hang" className="p-2 bg-white rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors shadow-sm">
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Đơn hàng {order.order_code}</h2>
          <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
            <Clock size={14} /> {fmtDate(order.created_at)}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {order.pricing_status === 'finalized' && (
             <a href={`/api/customer/order-confirmation?orderId=${encodeURIComponent(order.id)}`} target="_blank" className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors shadow-sm">
               <Printer size={16} /> In PDF (R{order.price_revision || 1})
             </a>
          )}
          {!isEditing ? (
            <button 
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 border border-green-200 rounded-xl text-sm font-medium hover:bg-green-200 transition-colors"
            >
              <PackageOpen size={16} /> Chỉnh sửa Đơn
            </button>
          ) : (
            <>
              <button 
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button 
                onClick={() => handleSaveOrder(false)}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
              >
                <Save size={16} /> Lưu tạm
              </button>
              <button 
                onClick={() => {
                  if (confirm("Chốt giá sẽ khóa đơn hàng ở trạng thái Tạm tính, tạo ra bản PDF xác nhận cho khách hàng tải về. Bạn chắc chắn chứ?")) {
                    handleSaveOrder(true);
                  }
                }}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50"
              >
                <CheckCircle size={16} /> Hoàn tất & Chốt giá
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Items Table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><PackageOpen size={18} className="text-slate-400"/> Sản phẩm đặt mua</h3>
              <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                order.pricing_status === 'finalized' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {order.pricing_status === 'finalized' ? 'Đã chốt giá' : 'Tạm tính'}
              </span>
            </div>
            <div className="p-0">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                  <tr>
                    <th className="px-5 py-3">Sản phẩm</th>
                    <th className="px-5 py-3 w-24 text-right">Số lượng</th>
                    <th className="px-5 py-3 w-32 text-right">Đơn giá</th>
                    <th className="px-5 py-3 w-32 text-right">Thành tiền</th>
                    {isEditing && <th className="px-5 py-3 w-16 text-center"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, idx) => (
                    <tr key={idx} className={isEditing ? "bg-green-50/20" : ""}>
                      <td className="px-5 py-4 font-medium text-slate-800">
                        {isEditing && item.isNew ? (
                           <input type="text" className="w-full border rounded p-1" value={item.name} onChange={(e) => handleUpdateItem(idx, "name", e.target.value)} />
                        ) : item.name}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {isEditing ? (
                          <input 
                            type="number" 
                            className="w-full text-right border border-green-200 rounded p-1.5 focus:ring-1 focus:ring-green-500 outline-none" 
                            value={item.quantity} 
                            min="0"
                            step="0.1"
                            onChange={(e) => handleUpdateItem(idx, "quantity", e.target.value)} 
                          />
                        ) : (
                          <span className="font-semibold">{item.quantity}</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {isEditing ? (
                          <input 
                            type="number" 
                            className="w-full text-right border border-green-200 rounded p-1.5 focus:ring-1 focus:ring-green-500 outline-none" 
                            value={item.unit_price} 
                            onChange={(e) => handleUpdateItem(idx, "unit_price", e.target.value)} 
                          />
                        ) : (
                          <span className="text-slate-600">{fmtMoney(item.unit_price)}</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right font-bold text-slate-800">
                        {fmtMoney(Number(item.unit_price) * Number(item.quantity))}
                      </td>
                      {isEditing && (
                        <td className="px-5 py-4 text-center">
                          <button onClick={() => handleRemoveItem(idx)} className="text-red-400 hover:text-red-600 p-1 bg-red-50 rounded-lg">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {isEditing && (
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-center">
                  <button onClick={handleAddItem} className="flex items-center gap-2 text-sm font-medium text-green-600 hover:text-green-700 bg-green-50 px-4 py-2 rounded-xl transition-colors">
                    <Plus size={16} /> Thêm sản phẩm
                  </button>
                </div>
              )}
              
              <div className="p-5 border-t border-slate-100 bg-white">
                <div className="flex justify-end text-sm">
                  <div className="w-64 space-y-3">
                    <div className="flex justify-between text-slate-500">
                      <span>Tạm tính món</span>
                      <span className="font-medium text-slate-800">{fmtMoney(calculateSubtotal())}</span>
                    </div>
                    {/* Các loại phí khác như voucher, ship có thể add ở đây */}
                    <div className="flex justify-between font-bold text-lg text-green-700 border-t border-slate-100 pt-3">
                      <span>Tổng cộng</span>
                      <span>{fmtMoney(calculateSubtotal())}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Order Info */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2"><Info size={18} className="text-slate-400" /> Cài đặt đơn</h3>
            
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Trạng thái</label>
              <select 
                value={status} 
                onChange={(e) => setStatus(e.target.value)}
                disabled={!isEditing}
                className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-medium focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none disabled:bg-slate-50 disabled:text-slate-500"
              >
                <option value="pending">Chờ xác nhận</option>
                <option value="confirmed">Đã xác nhận</option>
                <option value="shipping">Đang giao</option>
                <option value="completed">Hoàn thành</option>
                <option value="canceled">Đã hủy</option>
              </select>
            </div>

            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Khách hàng</label>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="font-bold text-slate-800">{customer?.name}</p>
                <p className="text-sm text-slate-500 mt-1">{customer?.phone}</p>
                {customer?.company && <p className="text-xs text-slate-400 mt-1">{customer.company}</p>}
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Giao hàng</label>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="font-medium text-slate-800 text-sm">{order.delivery_alias || "Giao tận nơi"}</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{order.delivery_address}</p>
              </div>
            </div>

            {order.note && (
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Ghi chú từ khách</label>
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                  <p className="text-sm text-amber-800">{order.note}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
