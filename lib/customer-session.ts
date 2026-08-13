import { createHmac, timingSafeEqual } from "crypto";

export interface CustomerSession {
  id: string;
  code: string;
  name: string;
  phone: string;
  company: string;
  email?: string;
  taxCode?: string;
  address?: string;
  defaultShippingAddress?: {
    alias: string;
    address: string;
    name: string;
    phone: string;
  };
  tier: string;
  discountPercent: number;
  verificationStatus?: "pending" | "verified" | "rejected";
  mustChangePassword: boolean;
  orderSessionToken?: string;
}

export const CUSTOMER_SESSION_COOKIE = "tps1_customer_session";

function getSecret() {
  const secret = process.env.CUSTOMER_SESSION_SECRET;
  if (!secret) {
    throw new Error("Thiếu biến môi trường CUSTOMER_SESSION_SECRET");
  }
  return secret;
}

function sign(payload: string) {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

/** Đóng gói session thành chuỗi "payload.signature" để lưu vào cookie httpOnly. */
export function createSessionCookieValue(session: CustomerSession): string {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

/**
 * Giải mã + xác thực chữ ký cookie. Trả về null nếu thiếu, sai định dạng,
 * hoặc chữ ký không khớp (cookie bị sửa tay) — không bao giờ throw ra ngoài.
 */
export function parseSessionCookieValue(
  value: string | undefined | null
): CustomerSession | null {
  if (!value) return null;
  const dotIndex = value.lastIndexOf(".");
  if (dotIndex <= 0) return null;

  const payload = value.slice(0, dotIndex);
  const signature = value.slice(dotIndex + 1);

  let expected: string;
  try {
    expected = sign(payload);
  } catch {
    return null;
  }

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as CustomerSession;
  } catch {
    return null;
  }
}
