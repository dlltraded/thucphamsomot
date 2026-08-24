import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Order } from "@/types";
import { formatPrice } from "@/utils/format";
import { Button, Icon } from "zmp-ui";
import { downloadFile, openDocument, openWebview } from "zmp-sdk/apis";
import { useAtomValue } from "jotai";
import { customerAuthState } from "@/state";
import CONFIG from "@/config";
import toast from "react-hot-toast";

const STEPS = ["draft", "pending", "confirmed", "preparing", "shipping", "completed"] as const;
const LABELS = { draft: "Chờ xác nhận từ bạn", pending: "Chờ xử lý", confirmed: "Đã xác nhận", preparing: "Chuẩn bị", shipping: "Đang giao", completed: "Hoàn thành", canceled: "Đã hủy" };

export default function OrderDetailPage() {
  const navigate = useNavigate();
  const customer = useAtomValue(customerAuthState);
  const order = useLocation().state as Order | null;
  const [openingPdf, setOpeningPdf] = useState(false);
  if (!order) return <div className="flex min-h-full flex-col items-center justify-center gap-3 p-6 text-center"><Icon icon="zi-inbox" size={42} className="text-inactive" /><div className="text-sm font-bold">Không tìm thấy thông tin đơn hàng</div><Button size="small" onClick={() => navigate("/orders")}>Về danh sách đơn</Button></div>;
  const status = order.centralStatus || order.status;
  const currentStep = STEPS.indexOf(status as (typeof STEPS)[number]);

  const handleOpenConfirmationPdf = async () => {
    if (!customer?.orderSessionToken || !order.centralOrderId) {
      toast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tải PDF.");
      return;
    }

    const url = `${CONFIG.API_BASE}/api/customer/order-confirmation?orderId=${encodeURIComponent(order.centralOrderId)}&sessionToken=${encodeURIComponent(customer.orderSessionToken)}`;
    const title = `Xác nhận đơn hàng ${order.id}`;
    const isInsideZalo = Boolean(window.ZJSBridge || window.APP_ID);

    setOpeningPdf(true);
    try {
      if (!isInsideZalo) {
        const popup = window.open(url, "_blank", "noopener,noreferrer");
        if (!popup) window.location.assign(url);
        return;
      }

      try {
        await downloadFile({ url });
        toast.success("Đã tải PDF xác nhận về thiết bị.");
        return;
      } catch (downloadError) {
        console.warn("Zalo downloadFile failed, trying document viewer", downloadError);
      }

      try {
        await openDocument({ url, title, download: true, share: true, edit: false });
        return;
      } catch (documentError) {
        console.warn("Zalo openDocument failed, trying webview", documentError);
      }

      await openWebview({
        url,
        config: { style: "normal", leftButton: "back" },
      });
    } catch (error) {
      console.error("Unable to open order confirmation PDF", error);
      toast.error("Không mở được PDF. Vui lòng cập nhật Zalo hoặc thử lại sau.");
    } finally {
      setOpeningPdf(false);
    }
  };

  return <div className="min-h-full space-y-3 bg-background p-4 pb-8">
    <section className="rounded-2xl bg-gradient-to-br from-[#0d6545] to-[#16905f] p-4 text-white shadow-lg"><div className="text-2xs text-white/60">Mã đơn hàng</div><div className="mt-1 text-lg font-bold">{order.id}</div><div className="mt-2 text-xs text-white/70">Đặt lúc {new Date(order.createdAt).toLocaleString("vi-VN")}</div><div className="mt-4 flex items-end justify-between"><span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-bold">{order.pricingStatus === "finalized" ? "Giá đã xác nhận" : "Chờ xác nhận giá"}</span><div className="text-right"><div className="text-2xs text-white/60">{order.pricingStatus === "finalized" ? "Tổng thanh toán" : "Tổng tạm tính"}</div><div className="text-lg font-bold text-amber-200">{formatPrice(order.total)}</div></div></div></section>
    {order.pricingStatus !== "finalized" && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">Nhân viên TPS1 đang kiểm tra phân loại khách hàng và đơn giá. Tổng cuối cùng sẽ được cập nhật tại đây sau khi xác nhận.</div>}
    {status === "canceled" ? <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-xs font-medium text-red-600">Đơn hàng này đã được hủy.</div> : <section className="rounded-2xl bg-section p-4 shadow-sm border-[0.5px] border-black/10"><div className="flex justify-between">{STEPS.map((step,index)=><div key={step} className="relative flex flex-1 flex-col items-center text-center"><div className={`z-10 flex h-7 w-7 items-center justify-center rounded-full text-2xs font-bold ${index<=currentStep?"bg-primary text-white":"bg-skeleton text-subtitle"}`}>{index<currentStep?<Icon icon="zi-check" size={13}/>:index+1}</div><div className={`mt-1 text-[8px] leading-3 ${index<=currentStep?"text-primary":"text-subtitle"}`}>{LABELS[step]}</div></div>)}</div></section>}
    <section className="overflow-hidden rounded-2xl bg-section shadow-sm border-[0.5px] border-black/10"><div className="flex items-center gap-2 border-b border-black/5 p-4 text-sm font-bold"><Icon icon="zi-inbox" size={18} className="text-primary" />Sản phẩm ({order.items.length})</div>{order.items.map((item,index)=><div key={`${item.product.id}-${index}`} className="flex items-center gap-3 border-b border-black/5 p-4 last:border-0"><img src={item.product.image} className="h-12 w-12 rounded-xl bg-background object-cover"/><div className="min-w-0 flex-1"><div className="truncate text-xs font-medium">{item.product.name}</div><div className="mt-1 text-2xs text-subtitle">{item.quantity} × {formatPrice(item.product.price)}</div>{item.product.detail && <div className="mt-1 text-2xs leading-4 text-subtitle">Quy cách: {item.product.detail}</div>}</div><div className="text-xs font-bold text-primary">{formatPrice(item.product.price*item.quantity)}</div></div>)}</section>
    <section className="rounded-2xl bg-section p-4 shadow-sm border-[0.5px] border-black/10"><div className="flex items-center gap-2 text-sm font-bold"><Icon icon="zi-location" size={18} className="text-primary" />Thông tin giao nhận</div><div className="mt-3 rounded-xl bg-background p-3"><div className="text-xs font-bold">{order.delivery.type === "shipping" ? order.delivery.alias : order.delivery.name}</div><div className="mt-1 text-xs leading-5 text-subtitle">{order.delivery.address}</div>{order.delivery.type === "shipping" && <div className="mt-2 text-2xs text-subtitle">{order.delivery.name} · {order.delivery.phone}</div>}</div></section>
    <section className="rounded-2xl bg-section p-4 shadow-sm border-[0.5px] border-black/10 space-y-2 text-xs"><div className="flex justify-between"><span className="text-subtitle">Tạm tính</span><strong>{formatPrice(order.subtotal ?? order.total)}</strong></div>{!!order.discountAmount&&<div className="flex justify-between"><span className="text-subtitle">Giảm/điều chỉnh</span><strong className="text-primary">-{formatPrice(order.discountAmount)}</strong></div>}<div className="flex justify-between border-t border-black/5 pt-3 text-sm"><span className="font-bold">{order.pricingStatus === "finalized" ? "Tổng thanh toán" : "Tổng tạm tính"}</span><strong className="text-primary">{formatPrice(order.total)}</strong></div></section>
    {order.pricingStatus === "finalized" && order.confirmationDocumentId && customer?.orderSessionToken && order.centralOrderId && <Button fullWidth loading={openingPdf} disabled={openingPdf} onClick={handleOpenConfirmationPdf}>Tải PDF xác nhận đơn hàng</Button>}
    {status === "draft" && (
      <Button 
        fullWidth 
        loading={openingPdf} 
        onClick={async () => {
          if (!customer?.orderSessionToken || !order.centralOrderId) return;
          setOpeningPdf(true);
          try {
            const res = await fetch(`${CONFIG.API_BASE}/api/customer/order/confirm`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderSessionToken: customer.orderSessionToken,
                orderId: order.centralOrderId
              })
            });
            const data = await res.json();
            if (data.ok) {
              toast.success("Đã xác nhận đơn hàng thành công!");
              navigate("/orders/pending", { replace: true });
            } else {
              toast.error(data.error || "Có lỗi xảy ra");
            }
          } catch (e) {
            toast.error("Lỗi mạng, vui lòng thử lại sau.");
          } finally {
            setOpeningPdf(false);
          }
        }}
      >
        Xác nhận đặt hàng
      </Button>
    )}
  </div>;
}
