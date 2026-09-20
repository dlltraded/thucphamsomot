import type { NextRequest } from "next/server";
import { getCustomerSupabaseAdmin } from "./customer-supabase-server";

// Giới hạn số lần đăng nhập SAI (yêu cầu 2026-09-20): mã khách là dạng viết tắt dễ đoán nên
// không được để dò mật khẩu. Đếm lần sai trong 15 phút theo (a) mã/email và (b) địa chỉ IP.
// Bảng auth_attempts (migration 20260920h). Bảng chưa có/lỗi DB => KHÔNG chặn (fail-open) để
// không làm hỏng đăng nhập, chỉ ghi log.
const WINDOW_MINUTES = 15;
const MAX_FAILS_PER_IDENTIFIER = 8;
const MAX_FAILS_PER_IP = 40;

export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd ? fwd.split(",")[0].trim() : req.headers.get("x-real-ip") || "unknown").slice(0, 64);
}

export function identifierKey(identifier: string): string {
  return "id:" + identifier.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "").toUpperCase().slice(0, 80);
}

async function countFails(key: string): Promise<number> {
  const supabase = getCustomerSupabaseAdmin();
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
  const { count, error } = await supabase
    .from("auth_attempts")
    .select("id", { count: "exact", head: true })
    .eq("key", key)
    .gte("at", since);
  if (error) throw error;
  return count || 0;
}

/** true = đang bị khóa tạm (quá nhiều lần sai). */
export async function isLoginBlocked(req: NextRequest, identifier: string): Promise<boolean> {
  try {
    const [byId, byIp] = await Promise.all([countFails(identifierKey(identifier)), countFails("ip:" + clientIp(req))]);
    return byId >= MAX_FAILS_PER_IDENTIFIER || byIp >= MAX_FAILS_PER_IP;
  } catch (err) {
    console.warn("rate-limit: không kiểm tra được (bảng auth_attempts chưa có?)", (err as Error)?.message);
    return false;
  }
}

export async function recordLoginFailure(req: NextRequest, identifier: string): Promise<void> {
  try {
    const supabase = getCustomerSupabaseAdmin();
    await supabase.from("auth_attempts").insert([{ key: identifierKey(identifier) }, { key: "ip:" + clientIp(req) }]);
    // Dọn dần bản ghi cũ (ngẫu nhiên ~2% lần) để bảng không phình
    if (Math.random() < 0.02) {
      await supabase.from("auth_attempts").delete().lt("at", new Date(Date.now() - 24 * 3600_000).toISOString());
    }
  } catch (err) {
    console.warn("rate-limit: không ghi được lần sai:", (err as Error)?.message);
  }
}

/** Đăng nhập đúng => xóa bộ đếm theo mã/email để khách không bị phạt oan. */
export async function clearLoginFailures(identifier: string): Promise<void> {
  try {
    await getCustomerSupabaseAdmin().from("auth_attempts").delete().eq("key", identifierKey(identifier));
  } catch {
    /* bỏ qua */
  }
}

export const LOGIN_BLOCKED_MESSAGE = "Bạn đã thử đăng nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút hoặc liên hệ TPS1.";
