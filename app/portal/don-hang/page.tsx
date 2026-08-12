import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowLeft, CalendarDays, Check, ChevronDown, CircleDollarSign, MapPin, PackageOpen, Phone, ReceiptText, ShoppingCart, Truck } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { makeMetadata } from "@/lib/seo";
import { CUSTOMER_SESSION_COOKIE, parseSessionCookieValue } from "@/lib/customer-session";
import { getCustomerSupabase } from "@/lib/customer-supabase-server";

export const metadata = makeMetadata({ title: "Đơn hàng đã đặt", description: "Danh sách đơn hàng đã đặt của tài khoản khách hàng VIP TPS1.", path: "/portal/don-hang" });
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = { pending: "Chờ xác nhận", confirmed: "Đã xác nhận", preparing: "Đang chuẩn bị", shipping: "Đang giao", completed: "Hoàn thành", canceled: "Đã hủy" };
const PAYMENT_LABEL: Record<string, string> = { pending: "Chờ xử lý", cod: "Thanh toán khi nhận hàng", paid: "Đã thanh toán", failed: "Thanh toán thất bại", refunded: "Đã hoàn tiền" };
const STEPS = ["pending", "confirmed", "preparing", "shipping", "completed"];

type OrderItem = { id?: string; name?: string; sku?: string; unit?: string; quantity?: number; qty?: number; price?: number; unitPrice?: number; lineTotal?: number };
type CustomerOrder = { id: string; order_code?: string; status?: string; payment_status?: string; payment_method?: string; delivery_alias?: string; delivery_address?: string; delivery_name?: string; delivery_phone?: string; note?: string; subtotal?: number; discount_amount?: number; grand_total?: number; created_at: string; items?: OrderItem[] };
const fmtMoney = (n?: number) => new Intl.NumberFormat("vi-VN").format(Number(n) || 0) + "đ";
const fmtDate = (iso: string) => new Date(iso).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });

export default async function CustomerOrdersPage() {
  const session = parseSessionCookieValue((await cookies()).get(CUSTOMER_SESSION_COOKIE)?.value);
  if (!session) redirect("/portal/dang-nhap");
  const supabase = getCustomerSupabase();
  const { data, error } = session.orderSessionToken ? await supabase.rpc("customer_list_orders", { p_session_token: session.orderSessionToken }) : { data: null, error: new Error("Phiên đơn hàng cũ") };
  const orders = (error ? [] : data || []) as CustomerOrder[];
  const activeCount = orders.filter((order) => !["completed", "canceled"].includes(order.status || "")).length;

  return (
    <PageShell eyebrow="Cổng đối tác VIP" title="Đơn hàng của tôi" compact>
      <div className="customer-orders-page">
        <div className="customer-orders-toolbar">
          <div><Link href="/portal" className="customer-back-link"><ArrowLeft size={16} /> Tài khoản của tôi</Link><p>Theo dõi tiến độ, thông tin giao nhận và giá trị từng đơn hàng.</p></div>
          <Link href="/portal/gio-hang" className="customer-new-order"><ShoppingCart size={18} /> Đặt đơn mới</Link>
        </div>

        <div className="customer-order-stats">
          <div><span>Tổng đơn hàng</span><strong>{orders.length}</strong><ReceiptText /></div>
          <div><span>Đơn đang xử lý</span><strong>{activeCount}</strong><Truck /></div>
          <div><span>Đơn hoàn thành</span><strong>{orders.filter((o) => o.status === "completed").length}</strong><PackageOpen /></div>
        </div>

        {error && <div className="customer-orders-message customer-orders-message--error">Không tải được danh sách đơn hàng, vui lòng thử lại sau hoặc liên hệ 089.890.2222.</div>}
        {!error && orders.length === 0 && <div className="customer-orders-empty"><PackageOpen /><h3>Chưa có đơn hàng nào</h3><p>Sản phẩm anh/chị đặt sẽ được lưu và theo dõi tại đây.</p><Link href="/portal/gio-hang">Đi tới giỏ hàng <ShoppingCart size={17} /></Link></div>}

        <div className="customer-order-list">
          {orders.map((order, index) => {
            const items = Array.isArray(order.items) ? order.items : [];
            const currentStep = STEPS.indexOf(order.status || "pending");
            return (
              <details className="customer-order-card" key={order.id} open={index === 0}>
                <summary>
                  <div className="customer-order-summary__main"><span className="customer-order-icon"><ReceiptText /></span><div><span>Mã đơn hàng</span><strong>{order.order_code || order.id}</strong><small><CalendarDays size={13} /> {fmtDate(order.created_at)}</small></div></div>
                  <div className="customer-order-summary__meta"><span className={`customer-order-status status-${order.status || "pending"}`}>{STATUS_LABEL[order.status || ""] || order.status || "—"}</span><div><strong>{fmtMoney(order.grand_total || order.subtotal)}</strong><small>{items.length} sản phẩm</small></div><ChevronDown className="customer-order-chevron" /></div>
                </summary>
                <div className="customer-order-detail">
                  {order.status === "canceled" ? <div className="customer-order-canceled">Đơn hàng này đã được hủy.</div> : <div className="customer-order-progress">{STEPS.map((step, stepIndex) => <div className={`customer-order-step${stepIndex <= currentStep ? " is-done" : ""}${stepIndex === currentStep ? " is-current" : ""}`} key={step}><span>{stepIndex < currentStep ? <Check /> : stepIndex + 1}</span><small>{STATUS_LABEL[step]}</small></div>)}</div>}
                  <div className="customer-order-detail-grid">
                    <section className="customer-order-products"><h4><PackageOpen size={18} /> Sản phẩm trong đơn</h4><div className="customer-order-items">{items.map((item, itemIndex) => { const qty = Number(item.quantity ?? item.qty ?? 1); const lineTotal = Number(item.lineTotal ?? 0); const unitPrice = Number(item.price ?? item.unitPrice ?? (lineTotal && qty ? lineTotal / qty : 0)); return <div className="customer-order-item" key={item.id || itemIndex}><div><strong>{item.name || "Sản phẩm"}</strong><span>{item.sku ? `Mã: ${item.sku} · ` : ""}{qty} {item.unit || "phần"} × {fmtMoney(unitPrice)}</span></div><strong>{fmtMoney(lineTotal || unitPrice * qty)}</strong></div>; })}</div></section>
                    <aside className="customer-order-info">
                      <div><span><MapPin /> Giao hàng</span><strong>{order.delivery_alias || "Địa chỉ nhận hàng"}</strong><p>{order.delivery_address || "Nhận tại điểm"}</p><small><Phone /> {order.delivery_name || session.name} · {order.delivery_phone || session.phone}</small></div>
                      <div><span><CircleDollarSign /> Thanh toán</span><strong>{PAYMENT_LABEL[order.payment_status || "pending"] || order.payment_status}</strong><p>{order.payment_method?.toUpperCase() || "Theo thỏa thuận"}</p></div>
                    </aside>
                  </div>
                  {order.note && <div className="customer-order-note"><strong>Ghi chú đơn hàng:</strong> {order.note}</div>}
                  <div className="customer-order-totals"><div><span>Tạm tính</span><strong>{fmtMoney(order.subtotal)}</strong></div><div><span>Chiết khấu</span><strong>-{fmtMoney(order.discount_amount)}</strong></div><div className="customer-order-grand-total"><span>Tổng thanh toán</span><strong>{fmtMoney(order.grand_total || order.subtotal)}</strong></div></div>
                </div>
              </details>
            );
          })}
        </div>
      </div>
    </PageShell>
  );
}
