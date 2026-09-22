import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Order } from "@/types";
import { formatPrice } from "@/utils/format";
import { Button, Icon, Modal } from "zmp-ui";
import { downloadFile, openDocument, openWebview } from "zmp-sdk/apis";
import { useAtomValue } from "jotai";
import { customerAuthState } from "@/state";
import CONFIG from "@/config";
import toast from "react-hot-toast";
import { useReorder } from "@/hooks";

const STEPS = ["draft", "pending", "confirmed", "preparing", "shipping", "completed"] as const;
const LABELS = {
  draft: "Chờ xác nhận từ bạn",
  pending: "Chờ xử lý",
  confirmed: "Đã xác nhận",
  preparing: "Chuẩn bị",
  shipping: "Đang giao",
  completed: "Hoàn thành",
  canceled: "Đã hủy",
};

function formatDeliveryDate(val?: string) {
  if (!val) return "";
  const parts = val.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return val;
}

export default function OrderDetailPage() {
  const navigate = useNavigate();
  const customer = useAtomValue(customerAuthState);
  const initialOrder = useLocation().state as Order | null;
  const [order, setOrder] = useState<Order | null>(initialOrder);
  const [openingPdf, setOpeningPdf] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestType, setRequestType] = useState<"adjust" | "cancel">("adjust");
  const [requestMessage, setRequestMessage] = useState("");
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const reorder = useReorder();

  if (!order) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <Icon icon="zi-inbox" size={42} className="text-inactive" />
        <div className="text-sm font-bold">Không tìm thấy thông tin đơn hàng</div>
        <Button size="small" onClick={() => navigate("/orders")}>
          Về danh sách đơn
        </Button>
      </div>
    );
  }

  const status = order.centralStatus || order.status;
  const currentStep = STEPS.indexOf(status as (typeof STEPS)[number]);
  const hasOpenChangeRequest = order.changeRequest?.status === "open";

  const openPdfFromUrl = async (url: string, title: string) => {
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

  const handleOpenConfirmationPdf = () => {
    if (!customer?.orderSessionToken || !order.centralOrderId) {
      toast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tải PDF.");
      return;
    }
    const url = `${CONFIG.API_BASE}/api/customer/order-confirmation?orderId=${encodeURIComponent(
      order.centralOrderId
    )}&sessionToken=${encodeURIComponent(customer.orderSessionToken)}`;
    return openPdfFromUrl(url, `Xác nhận đơn hàng ${order.id}`);
  };

  const handleOpenInvoicePdf = () => {
    if (!customer?.orderSessionToken || !order.centralOrderId) {
      toast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tải hóa đơn.");
      return;
    }
    const url = `${CONFIG.API_BASE}/api/customer/order-invoice?orderId=${encodeURIComponent(
      order.centralOrderId
    )}&sessionToken=${encodeURIComponent(customer.orderSessionToken)}`;
    return openPdfFromUrl(url, `Hóa đơn ${order.id}`);
  };

  // Khách tự hủy đơn pending (trước giờ chốt)
  const handleCancelPendingOrder = async () => {
    if (!customer?.orderSessionToken || !order.centralOrderId) return;
    if (!window.confirm("Bạn có chắc chắn muốn hủy đơn hàng này không?")) return;

    setCanceling(true);
    try {
      const res = await fetch(`${CONFIG.API_BASE}/api/customer/orders/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.centralOrderId,
          sessionToken: customer.orderSessionToken,
          cancelReason: "Khách hàng tự hủy trên Mini App",
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success("Đã hủy đơn hàng thành công");
        setOrder((prev) => (prev ? { ...prev, status: "completed" as any, centralStatus: "canceled" } : null));
      } else {
        toast.error(data.error || "Không thể hủy đơn hàng");
      }
    } catch {
      toast.error("Lỗi mạng khi hủy đơn");
    } finally {
      setCanceling(false);
    }
  };

  // Khách gửi yêu cầu điều chỉnh / hủy cho đơn đã xác nhận
  const handleSubmitChangeRequest = async () => {
    if (!customer?.orderSessionToken || !order.centralOrderId) return;
    if (!requestMessage.trim() || requestMessage.trim().length < 3) {
      toast.error("Vui lòng nhập lý do/nội dung yêu cầu (tối thiểu 3 ký tự)");
      return;
    }

    setSubmittingRequest(true);
    try {
      const res = await fetch(`${CONFIG.API_BASE}/api/customer/orders/request-change`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.centralOrderId,
          type: requestType,
          message: requestMessage.trim(),
          sessionToken: customer.orderSessionToken,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(
          requestType === "cancel"
            ? "Đã gửi yêu cầu hủy đơn tới Vận hành TPS1"
            : "Đã gửi yêu cầu điều chỉnh tới Vận hành TPS1"
        );
        setOrder((prev) =>
          prev
            ? {
                ...prev,
                changeRequest: {
                  id: data.requestId || "new",
                  type: requestType,
                  status: "open",
                  message: requestMessage.trim(),
                },
              }
            : null
        );
        setRequestModalOpen(false);
        setRequestMessage("");
      } else {
        toast.error(data.error || "Không thể gửi yêu cầu");
      }
    } catch {
      toast.error("Lỗi kết nối khi gửi yêu cầu");
    } finally {
      setSubmittingRequest(false);
    }
  };

  return (
    <div className="min-h-full space-y-3 bg-background p-4 pb-8">
      {/* Header đơn hàng */}
      <section className="rounded-2xl bg-gradient-to-br from-[#0d6545] to-[#16905f] p-4 text-white shadow-lg">
        <div className="text-2xs text-white/60">Mã đơn hàng</div>
        <div className="mt-1 text-lg font-bold">{order.id}</div>
        <div className="mt-1 text-xs text-white/70">
          Đặt lúc {new Date(order.createdAt).toLocaleString("vi-VN")}
        </div>
        <div className="mt-3 flex items-end justify-between">
          <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-bold">
            {order.pricingStatus === "finalized" ? "Giá đã xác nhận" : "Chờ xác nhận giá"}
          </span>
          <div className="text-right">
            <div className="text-2xs text-white/60">
              {order.pricingStatus === "finalized" ? "Tổng thanh toán" : "Tổng tạm tính"}
            </div>
            <div className="text-lg font-bold text-amber-200">{formatPrice(order.total)}</div>
          </div>
        </div>
      </section>

      {/* Banner thông báo trạng thái yêu cầu của khách (WP6b) */}
      {hasOpenChangeRequest && order.changeRequest && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 flex items-start gap-2 shadow-xs">
          <Icon icon="zi-clock-1" className="text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="space-y-0.5">
            <strong>
              Đang chờ Vận hành xử lý yêu cầu {order.changeRequest.type === "cancel" ? "hủy đơn" : "điều chỉnh"}:
            </strong>
            <div className="italic text-amber-800">"{order.changeRequest.message}"</div>
          </div>
        </div>
      )}

      {order.changeRequest && order.changeRequest.status !== "open" && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 space-y-0.5">
          <div>
            <strong>Kết quả yêu cầu {order.changeRequest.type === "cancel" ? "hủy đơn" : "điều chỉnh"}: </strong>
            <span
              className={
                order.changeRequest.status === "approved"
                  ? "text-emerald-700 font-bold"
                  : order.changeRequest.status === "rejected"
                  ? "text-red-600 font-bold"
                  : "font-semibold"
              }
            >
              {order.changeRequest.status === "approved"
                ? "Đã duyệt"
                : order.changeRequest.status === "rejected"
                ? "Bị từ chối"
                : "Hoàn tất"}
            </span>
          </div>
          {order.changeRequest.handled_note && (
            <div className="text-slate-500">Phản hồi: {order.changeRequest.handled_note}</div>
          )}
        </div>
      )}

      {order.pricingStatus !== "finalized" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
          Nhân viên TPS1 đang kiểm tra phân loại khách hàng và đơn giá. Tổng cuối cùng sẽ được cập nhật tại đây sau khi xác nhận.
        </div>
      )}

      {status === "canceled" ? (
        <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-xs font-medium text-red-600">
          Đơn hàng này đã được hủy{order.cancelReason ? `: ${order.cancelReason}` : "."}
        </div>
      ) : (
        <section className="rounded-2xl bg-section p-4 shadow-sm border-[0.5px] border-black/10">
          <div className="flex justify-between">
            {STEPS.map((step, index) => (
              <div key={step} className="relative flex flex-1 flex-col items-center text-center">
                <div
                  className={`z-10 flex h-7 w-7 items-center justify-center rounded-full text-2xs font-bold ${
                    index <= currentStep ? "bg-primary text-white" : "bg-skeleton text-subtitle"
                  }`}
                >
                  {index < currentStep ? <Icon icon="zi-check" size={13} /> : index + 1}
                </div>
                <div
                  className={`mt-1 text-[8px] leading-3 ${
                    index <= currentStep ? "text-primary font-medium" : "text-subtitle"
                  }`}
                >
                  {LABELS[step]}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Danh sách sản phẩm */}
      <section className="overflow-hidden rounded-2xl bg-section shadow-sm border-[0.5px] border-black/10">
        <div className="flex items-center gap-2 border-b border-black/5 p-4 text-sm font-bold">
          <Icon icon="zi-inbox" size={18} className="text-primary" />
          Sản phẩm ({order.items.length})
        </div>
        {order.items.map((item, index) => (
          <div
            key={`${item.product.id}-${index}`}
            className="flex items-center gap-3 border-b border-black/5 p-4 last:border-0"
          >
            <img src={item.product.image} className="h-12 w-12 rounded-xl bg-background object-cover" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium">{item.product.name}</div>
              <div className="mt-1 text-2xs text-subtitle">
                {item.quantity} × {formatPrice(item.product.price)}
              </div>
              {item.note && (
                <div className="mt-0.5 text-2xs text-amber-700 italic">
                  Ghi chú: {item.note}
                </div>
              )}
            </div>
            <div className="text-xs font-bold text-primary">
              {formatPrice(item.product.price * item.quantity)}
            </div>
          </div>
        ))}
      </section>

      {/* Thông tin giao nhận kèm ngày giao & điểm giao */}
      <section className="rounded-2xl bg-section p-4 shadow-sm border-[0.5px] border-black/10 space-y-2">
        <div className="flex items-center gap-2 text-sm font-bold">
          <Icon icon="zi-location" size={18} className="text-primary" />
          Thông tin giao nhận
        </div>
        <div className="mt-2 rounded-xl bg-background p-3 space-y-1.5 text-xs">
          {order.deliveryDate && (
            <div className="flex items-center gap-2 font-semibold text-primary pb-1 border-b border-black/5">
              <Icon icon="zi-calendar" size={14} />
              <span>Ngày giao: {formatDeliveryDate(order.deliveryDate)}</span>
              {order.isLateOrder && (
                <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-medium">
                  Trễ giờ chốt
                </span>
              )}
            </div>
          )}
          <div className="font-bold text-black">
            {order.delivery.type === "shipping" ? order.delivery.alias : order.delivery.name}
          </div>
          <div className="leading-5 text-subtitle">{order.delivery.address}</div>
          {order.delivery.type === "shipping" && (
            <div className="text-2xs text-subtitle">
              {order.delivery.name} · {order.delivery.phone}
            </div>
          )}
        </div>
      </section>

      {/* Bảng giá */}
      <section className="rounded-2xl bg-section p-4 shadow-sm border-[0.5px] border-black/10 space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-subtitle">Tạm tính</span>
          <strong>{formatPrice(order.subtotal ?? order.total)}</strong>
        </div>
        {!!order.discountAmount && (
          <div className="flex justify-between">
            <span className="text-subtitle">Giảm/điều chỉnh</span>
            <strong className="text-primary">-{formatPrice(order.discountAmount)}</strong>
          </div>
        )}
        <div className="flex justify-between border-t border-black/5 pt-3 text-sm">
          <span className="font-bold">
            {order.pricingStatus === "finalized" ? "Tổng thanh toán" : "Tổng tạm tính"}
          </span>
          <strong className="text-primary">{formatPrice(order.total)}</strong>
        </div>
      </section>

      {/* Nút hành động */}
      {status === "completed" && order.invoiceDocumentId && customer?.orderSessionToken && order.centralOrderId && (
        <Button fullWidth loading={openingPdf} disabled={openingPdf} onClick={handleOpenInvoicePdf}>
          Tải hóa đơn
        </Button>
      )}

      {order.pricingStatus === "finalized" &&
        order.confirmationDocumentId &&
        customer?.orderSessionToken &&
        order.centralOrderId && (
          <Button
            fullWidth
            variant={status === "completed" ? "secondary" : "primary"}
            loading={openingPdf}
            disabled={openingPdf}
            onClick={handleOpenConfirmationPdf}
          >
            Tải PDF xác nhận đơn hàng
          </Button>
        )}

      {/* Tự hủy đơn khi pending */}
      {status === "pending" && !hasOpenChangeRequest && (
        <Button
          fullWidth
          variant="secondary"
          loading={canceling}
          disabled={canceling}
          className="!text-danger !border-danger/30"
          onClick={handleCancelPendingOrder}
        >
          Hủy đơn hàng
        </Button>
      )}

      {/* Yêu cầu hủy / điều chỉnh khi confirmed hoặc preparing (WP6b) */}
      {(status === "confirmed" || status === "preparing") && !hasOpenChangeRequest && (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setRequestType("adjust");
              setRequestModalOpen(true);
            }}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-primary/40 bg-primary/5 py-2.5 text-xs font-semibold text-primary"
          >
            <Icon icon="zi-edit-text" size={14} />
            Yêu cầu sửa
          </button>
          <button
            type="button"
            onClick={() => {
              setRequestType("cancel");
              setRequestModalOpen(true);
            }}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-red-300 bg-red-50 py-2.5 text-xs font-semibold text-red-600"
          >
            <Icon icon="zi-close-circle" size={14} />
            Yêu cầu hủy
          </button>
        </div>
      )}

      {/* Đặt lại đơn này */}
      <button
        type="button"
        disabled={reordering}
        onClick={async () => {
          setReordering(true);
          await reorder(order);
          setReordering(false);
        }}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-primary/30 bg-primary/5 py-3 text-sm font-semibold text-primary active:bg-primary/10 disabled:opacity-50"
      >
        {reordering ? (
          <span className="text-xs">Đang xử lý…</span>
        ) : (
          <>
            <Icon icon="zi-reorder-solid" size={16} />
            Đặt lại đơn này
          </>
        )}
      </button>

      {/* Modal gửi yêu cầu điều chỉnh / hủy đơn */}
      <Modal
        visible={requestModalOpen}
        title={requestType === "cancel" ? "Yêu cầu hủy đơn hàng" : "Yêu cầu điều chỉnh đơn hàng"}
        onClose={() => setRequestModalOpen(false)}
        actions={[
          {
            text: "Đóng",
            onClick: () => setRequestModalOpen(false),
          },
          {
            text: submittingRequest ? "Đang gửi..." : "Gửi yêu cầu",
            highLight: true,
            disabled: submittingRequest || requestMessage.trim().length < 3,
            onClick: handleSubmitChangeRequest,
          },
        ]}
      >
        <div className="space-y-3 p-2 text-xs">
          <p className="text-subtitle">
            {requestType === "cancel"
              ? "Đơn hàng đã được xác nhận. Vui lòng nhập lý do bạn muốn hủy để Vận hành TPS1 xử lý:"
              : "Vui lòng ghi rõ mặt hàng hoặc số lượng bạn muốn thay đổi:"}
          </p>
          <textarea
            rows={3}
            value={requestMessage}
            onChange={(e) => setRequestMessage(e.target.value)}
            placeholder={
              requestType === "cancel"
                ? "Nhập lý do hủy đơn (bắt buộc)..."
                : "Ví dụ: Đổi rau muống từ 5kg lên 8kg, bớt 1 nải chuối..."
            }
            className="w-full border border-black/15 rounded-xl p-2.5 text-xs text-black focus:outline-none focus:border-primary resize-none"
          />
        </div>
      </Modal>
    </div>
  );
}
