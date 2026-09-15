import webpush from "web-push";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";

/**
 * Gửi Web Push cho khách hàng (order-webapp cài PWA trên điện thoại) —
 * thông báo khi đơn được xác nhận/đang giao/hoàn thành, không cần khách mở
 * app mới thấy. Phía sale/admin đã có kênh Telegram riêng
 * (app/api/webhook/new-order), route này chỉ phục vụ chiều khách hàng.
 */

let configured = false;
function ensureVapid() {
  if (configured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:contact@thucphamsomot.vn";
  if (!publicKey || !privateKey) {
    console.warn("Web Push chưa cấu hình VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY — bỏ qua gửi thông báo.");
    return false;
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/** Gửi push cho toàn bộ thiết bị khách đã đăng ký, tự dọn subscription hết hạn (404/410). */
export async function sendPushToCustomer(customerId: string, payload: PushPayload) {
  if (!ensureVapid()) return;
  const supabase = getCustomerSupabaseAdmin();
  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("customer_id", customerId);
  if (error) {
    console.error("Không tải được push_subscriptions:", error.message);
    return;
  }
  if (!subs || subs.length === 0) return;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload)
        );
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
          console.error("Gửi push lỗi:", err instanceof Error ? err.message : err);
        }
      }
    })
  );
}
