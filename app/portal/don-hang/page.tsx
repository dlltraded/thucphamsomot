import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { makeMetadata } from "@/lib/seo";
import { CUSTOMER_SESSION_COOKIE, parseSessionCookieValue } from "@/lib/customer-session";
import { getCustomerSupabase } from "@/lib/customer-supabase-server";

export const metadata = makeMetadata({
  title: "Đơn hàng đã đặt",
  description: "Danh sách đơn hàng đã đặt của tài khoản khách hàng VIP TPS1.",
  path: "/portal/don-hang",
});

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  preparing: "Đang chuẩn bị hàng",
  shipping: "Đang giao",
  completed: "Hoàn thành",
  canceled: "Đã hủy",
};

const fmtMoney = (n: number) => new Intl.NumberFormat("vi-VN").format(n) + "đ";
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

export default async function CustomerOrdersPage() {
  const cookieStore = await cookies();
  const session = parseSessionCookieValue(cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value);
  if (!session) {
    redirect("/portal/dang-nhap");
  }

  const supabase = getCustomerSupabase();
  const { data, error } = session.orderSessionToken
    ? await supabase.rpc("customer_list_orders", {
        p_session_token: session.orderSessionToken,
      })
    : { data: null, error: new Error("Phiên đơn hàng cũ") };

  const orders = error ? [] : data || [];

  return (
    <PageShell eyebrow="Portal báo giá" title="Đơn hàng đã đặt" compact>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {error && (
          <p className="lead-form__error">Không tải được danh sách đơn hàng, vui lòng thử lại sau.</p>
        )}

        {!error && orders.length === 0 && (
          <p style={{ color: "#666" }}>
            Chưa có đơn hàng nào. Vào{" "}
            <a href="/portal/gio-hang" style={{ color: "#1B7A3D", fontWeight: 600 }}>
              giỏ hàng
            </a>{" "}
            để đặt hàng.
          </p>
        )}

        <div style={{ display: "grid", gap: 12 }}>
          {orders.map((order: any) => (
            <div
              key={order.id}
              style={{
                background: "#fff",
                border: "1px solid #eee",
                borderRadius: 12,
                padding: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <strong>{order.order_code || order.id}</strong>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    background: "rgba(27,122,61,0.1)",
                    color: "#1B7A3D",
                    borderRadius: 999,
                    padding: "3px 10px",
                  }}
                >
                  {STATUS_LABEL[order.status] || order.status || "—"}
                </span>
              </div>
              <div style={{ fontSize: 13, color: "#666", marginBottom: 8 }}>
                {fmtDate(order.created_at)}
              </div>
              {Array.isArray(order.items) && order.items.length > 0 && (
                <ul style={{ margin: "0 0 8px", paddingLeft: 18, fontSize: 13, color: "#333" }}>
                  {order.items.map((item: any, idx: number) => (
                    <li key={idx}>
                      {item.name} x{item.qty ?? item.quantity ?? 1}
                    </li>
                  ))}
                </ul>
              )}
              <div style={{ fontWeight: 700 }}>
                Tổng tiền: {fmtMoney(Number(order.grand_total || order.subtotal || 0))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
