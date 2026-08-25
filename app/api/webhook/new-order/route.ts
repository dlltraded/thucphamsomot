import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Supabase webhook secret (set in Vercel env as SUPABASE_WEBHOOK_SECRET)
const WEBHOOK_SECRET = process.env.SUPABASE_WEBHOOK_SECRET || "";
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";

function formatMoney(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n || 0) + "đ";
}

function formatDateTime(d: string) {
  return new Date(d).toLocaleString("vi-VN", {
    hour: "2-digit", minute: "2-digit",
    day: "2-digit", month: "2-digit", year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh"
  });
}

async function sendTelegram(message: string) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn("Telegram not configured");
    return;
  }
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: "HTML",
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("Telegram error:", err);
  }
}

export async function POST(req: NextRequest) {
  try {
    // Verify webhook secret
    const secret = req.headers.get("x-webhook-secret") || req.headers.get("x-supabase-secret");
    if (WEBHOOK_SECRET && secret !== WEBHOOK_SECRET) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    
    // Supabase database webhook sends: { type, table, record, old_record, schema }
    const { type, table, record, old_record } = body;

    // Handle orders table changes
    if (table === "orders") {
      const order = record;
      
      if (type === "INSERT") {
        // Đơn hàng mới từ KH
        const sourceLabel: Record<string, string> = {
          website: "🌐 Website",
          zalo_mini_app: "📱 Zalo Mini App",
          admin: "🧑‍💼 Admin/Sale",
          miniapp: "📱 Mini App",
        };
        const source = sourceLabel[order.source] || order.source;
        
        const message = `
🛒 <b>ĐƠN HÀNG MỚI!</b>
━━━━━━━━━━━━━━━━━
📋 Mã đơn: <code>${order.order_code || "—"}</code>
${source ? `📍 Nguồn: ${source}` : ""}
👤 Khách: <b>${order.customer_name || "—"}</b>
📞 SĐT: ${order.customer_phone || "—"}
🏢 Công ty: ${order.customer_company || "—"}
💰 Tổng tiền: <b>${formatMoney(order.final_amount)}</b>
📦 Trạng thái: ${order.status === "draft" ? "📝 Nháp (chờ KH xác nhận)" : "🔔 Chờ xử lý"}
🕐 Lúc: ${formatDateTime(order.created_at)}
━━━━━━━━━━━━━━━━━
👉 Vào quanly để xử lý!`.trim();

        await sendTelegram(message);
      } 
      
      if (type === "UPDATE" && old_record) {
        // KH xác nhận đơn nháp (draft → pending)
        if (old_record.status === "draft" && record.status === "pending") {
          const message = `
✅ <b>KHÁCH XÁC NHẬN ĐƠN!</b>
━━━━━━━━━━━━━━━━━
📋 Mã đơn: <code>${record.order_code || "—"}</code>
👤 Khách: <b>${record.customer_name || "—"}</b>
📞 SĐT: ${record.customer_phone || "—"}
💰 Tổng tiền: <b>${formatMoney(record.final_amount)}</b>
🕐 Xác nhận lúc: ${formatDateTime(record.updated_at)}
━━━━━━━━━━━━━━━━━
👉 Đơn đang chờ chuẩn bị!`.trim();

          await sendTelegram(message);
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

// Test endpoint
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  if (url.searchParams.get("test") === "1") {
    await sendTelegram("🔔 <b>Test thông báo từ TPS1!</b>\n✅ Kết nối Telegram đang hoạt động tốt.");
    return NextResponse.json({ ok: true, message: "Test sent!" });
  }
  return NextResponse.json({ ok: true, message: "Webhook endpoint active" });
}
