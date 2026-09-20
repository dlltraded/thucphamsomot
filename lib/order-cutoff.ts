import { getCustomerSupabaseAdmin } from "./customer-supabase-server";

export interface OrderCutoffConfig {
  time: string; // "16:30"
  satTime: string; // "17:00"
  tz: string; // "Asia/Ho_Chi_Minh"
}

export interface OrderCutoffInfo {
  serverNow: string; // ISO timestamp
  deliveryDate: string; // YYYY-MM-DD
  earliestDate: string; // YYYY-MM-DD
  cutoffAt: string; // ISO timestamp
  cutoffTimeStr: string; // "16:30" or "17:00"
  minutesLeft: number;
  isLate: boolean;
}

const DEFAULT_CONFIG: OrderCutoffConfig = {
  time: "16:30",
  satTime: "17:00",
  tz: "Asia/Ho_Chi_Minh",
};

// Cache cấu hình cutoff 5 phút để tránh gọi DB liên tục
let cachedConfig: OrderCutoffConfig = DEFAULT_CONFIG;
let cacheExpiresAt = 0;

/**
 * Lấy cấu hình giờ chốt đơn từ app_settings (fallback về mặc định nếu chưa chạy migration).
 */
export async function fetchOrderCutoffConfig(): Promise<OrderCutoffConfig> {
  const now = Date.now();
  if (now < cacheExpiresAt) {
    return cachedConfig;
  }

  try {
    const supabase = getCustomerSupabaseAdmin();
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "order_cutoff")
      .maybeSingle();

    if (!error && data?.value) {
      const val = data.value as Partial<OrderCutoffConfig>;
      cachedConfig = {
        time: typeof val.time === "string" ? val.time : DEFAULT_CONFIG.time,
        satTime: typeof val.satTime === "string" ? val.satTime : DEFAULT_CONFIG.satTime,
        tz: typeof val.tz === "string" ? val.tz : DEFAULT_CONFIG.tz,
      };
      cacheExpiresAt = now + 5 * 60 * 1000;
      return cachedConfig;
    }
  } catch (err) {
    // Bảng chưa tạo hoặc lỗi mạng -> dùng cấu hình mặc định (yêu cầu 2026-09-20)
  }

  cachedConfig = DEFAULT_CONFIG;
  cacheExpiresAt = now + 60 * 1000; // thử lại sau 1 phút nếu lỗi
  return cachedConfig;
}

/**
 * Chuyển Date sang các trường ngày giờ theo múi giờ Việt Nam (UTC+7, không có DST).
 */
export function getVnDateParts(date: Date) {
  // Offset UTC+7 = 7 * 60 * 60 * 1000 ms
  const vnOffsetMs = 7 * 60 * 60 * 1000;
  const vnTime = new Date(date.getTime() + vnOffsetMs);

  const year = vnTime.getUTCFullYear();
  const month = vnTime.getUTCMonth() + 1;
  const day = vnTime.getUTCDate();
  const dayOfWeek = vnTime.getUTCDay(); // 0 = CN, 1 = T2, ..., 6 = T7
  const hours = vnTime.getUTCHours();
  const minutes = vnTime.getUTCMinutes();
  const seconds = vnTime.getUTCSeconds();

  const ymd = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return { year, month, day, dayOfWeek, hours, minutes, seconds, ymd };
}

/**
 * Chuyển chuỗi "YYYY-MM-DD" và giờ "HH:mm" theo giờ VN thành Date UTC tương ứng.
 */
function createVnDateTime(ymd: string, timeStr: string): Date {
  const [year, month, day] = ymd.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);

  // VN = UTC+7 => UTC hour = VN hour - 7
  return new Date(Date.UTC(year, month - 1, day, hour - 7, minute, 0, 0));
}

/**
 * Cộng/trừ số ngày vào chuỗi YYYY-MM-DD.
 */
function addDaysToYmd(ymd: string, days: number): string {
  const [year, month, day] = ymd.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day + days));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/**
 * Lấy thứ trong tuần của chuỗi YYYY-MM-DD (0: Chủ Nhật, 1: Thứ Hai, ..., 6: Thứ Bảy).
 */
function getDayOfWeekFromYmd(ymd: string): number {
  const [year, month, day] = ymd.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/**
 * Tính thời điểm cutoff cho một ngày giao hàng cụ thể (ymd: YYYY-MM-DD) theo quy tắc D4:
 * - Giao ngày D (Thứ Ba -> Thứ Bảy): chốt trước 16:30 ngày D-1.
 * - Giao Chủ Nhật hoặc Thứ Hai: chốt trước 17:00 Thứ Bảy liền trước.
 *   (Lý do nghiệp vụ: Chiều Thứ Bảy Vận hành & Thu mua chốt gộp hàng cho cả Chủ Nhật và Thứ Hai
 *   do Chủ Nhật nhà xe / kho hoạt động hạn chế — yêu cầu 2026-09-20).
 */
export function getCutoffForDeliveryDate(
  deliveryDateYmd: string,
  config: OrderCutoffConfig = DEFAULT_CONFIG
): { cutoffDate: Date; cutoffTimeStr: string } {
  const dayOfWeek = getDayOfWeekFromYmd(deliveryDateYmd);

  let cutoffYmd: string;
  let cutoffTimeStr: string;

  if (dayOfWeek === 0) {
    // Giao Chủ Nhật -> chốt 17:00 Thứ Bảy (D - 1 ngày)
    cutoffYmd = addDaysToYmd(deliveryDateYmd, -1);
    cutoffTimeStr = config.satTime;
  } else if (dayOfWeek === 1) {
    // Giao Thứ Hai -> chốt 17:00 Thứ Bảy (D - 2 ngày)
    cutoffYmd = addDaysToYmd(deliveryDateYmd, -2);
    cutoffTimeStr = config.satTime;
  } else {
    // Giao Thứ Ba -> Thứ Bảy: chốt 16:30 ngày hôm trước (D - 1 ngày)
    cutoffYmd = addDaysToYmd(deliveryDateYmd, -1);
    cutoffTimeStr = config.time;
  }

  const cutoffDate = createVnDateTime(cutoffYmd, cutoffTimeStr);
  return { cutoffDate, cutoffTimeStr };
}

/**
 * Tìm ngày giao sớm nhất có thể đặt mà KHÔNG bị trễ giờ chốt đơn.
 */
export function calculateEarliestDate(
  now: Date,
  config: OrderCutoffConfig = DEFAULT_CONFIG
): string {
  const vnNow = getVnDateParts(now);
  let candidateYmd = addDaysToYmd(vnNow.ymd, 1); // bắt đầu từ ngày mai

  // Kiểm tra tối đa 7 ngày tiếp theo
  for (let i = 0; i < 7; i++) {
    const { cutoffDate } = getCutoffForDeliveryDate(candidateYmd, config);
    if (now.getTime() <= cutoffDate.getTime()) {
      return candidateYmd;
    }
    candidateYmd = addDaysToYmd(candidateYmd, 1);
  }

  return candidateYmd;
}

/**
 * Hàm tính toán tổng hợp toàn bộ thông tin giờ chốt đơn:
 * @param now Thời điểm hiện tại (Date)
 * @param requestedDeliveryDate Ngày giao khách yêu cầu (chuỗi "YYYY-MM-DD" hoặc Date).
 *                              Nếu không truyền, mặc định lấy ngày giao sớm nhất không trễ.
 * @param config Tùy chọn cấu hình (nếu đã nạp từ DB)
 */
export function getOrderCutoffInfo(
  now: Date = new Date(),
  requestedDeliveryDate?: string | Date,
  config: OrderCutoffConfig = DEFAULT_CONFIG
): OrderCutoffInfo {
  const earliestDate = calculateEarliestDate(now, config);

  let deliveryDateYmd: string;
  if (!requestedDeliveryDate) {
    deliveryDateYmd = earliestDate;
  } else if (typeof requestedDeliveryDate === "string") {
    deliveryDateYmd = requestedDeliveryDate.trim().slice(0, 10);
  } else {
    deliveryDateYmd = getVnDateParts(requestedDeliveryDate).ymd;
  }

  const { cutoffDate, cutoffTimeStr } = getCutoffForDeliveryDate(deliveryDateYmd, config);
  const isLate = now.getTime() > cutoffDate.getTime();
  const minutesLeft = isLate ? 0 : Math.max(0, Math.floor((cutoffDate.getTime() - now.getTime()) / 60000));

  return {
    serverNow: now.toISOString(),
    deliveryDate: deliveryDateYmd,
    earliestDate,
    cutoffAt: cutoffDate.toISOString(),
    cutoffTimeStr,
    minutesLeft,
    isLate,
  };
}
