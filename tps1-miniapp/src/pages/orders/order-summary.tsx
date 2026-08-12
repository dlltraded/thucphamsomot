import { Order } from "@/types";
import { formatPrice } from "@/utils/format";
import { useNavigate } from "react-router-dom";
import { Icon } from "zmp-ui";

const STATUS_LABEL = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  preparing: "Đang chuẩn bị",
  shipping: "Đang giao",
  completed: "Hoàn thành",
  canceled: "Đã hủy",
};

function OrderSummary({ order, full }: { order: Order; full?: boolean }) {
  const navigate = useNavigate();
  const status = order.centralStatus || order.status;
  return (
    <article
      className="overflow-hidden rounded-2xl border-[0.5px] border-black/10 bg-section shadow-sm"
      onClick={() => !full && navigate(`/order/${order.id}`, { state: order, viewTransition: true })}
    >
      <div className="flex items-start justify-between gap-3 border-b border-black/5 p-4">
        <div className="min-w-0">
          <div className="text-2xs text-subtitle">Mã đơn hàng</div>
          <div className="mt-0.5 truncate text-sm font-bold text-foreground">{order.id}</div>
          <div className="mt-1 flex items-center gap-1 text-2xs text-subtitle"><Icon icon="zi-clock-1" size={12} />{new Date(order.createdAt).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-1 text-2xs font-bold ${status === "canceled" ? "bg-red-50 text-red-600" : status === "completed" ? "bg-green-50 text-green-700" : status === "shipping" ? "bg-cyan-50 text-cyan-700" : "bg-amber-50 text-amber-700"}`}>{STATUS_LABEL[status] || status}</span>
      </div>
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon icon="zi-inbox" size={21} /></div>
          <div className="flex-1"><div className="text-xs font-medium">{order.items[0]?.product.name || "Đơn hàng TPS1"}</div><div className="mt-1 text-2xs text-subtitle">{order.items.length} sản phẩm{order.items.length > 1 ? ` · và ${order.items.length - 1} món khác` : ""}</div></div>
          {!full && <Icon icon="zi-chevron-right" size={18} className="text-inactive" />}
        </div>
        <div className="mt-4 flex items-end justify-between border-t border-black/5 pt-3"><div><div className="text-2xs text-subtitle">Giao đến</div><div className="mt-1 max-w-[190px] truncate text-xs">{order.delivery.address || "Nhận tại điểm"}</div></div><div className="text-right"><div className="text-2xs text-subtitle">Tổng thanh toán</div><div className="mt-1 text-sm font-bold text-primary">{formatPrice(order.total)}</div></div></div>
      </div>
    </article>
  );
}

export default OrderSummary;
