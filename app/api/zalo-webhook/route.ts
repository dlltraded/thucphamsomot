import { NextResponse } from 'next/server';
import { sendOAConsultingMessage } from '@/lib/zalo';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Zalo Webhook Event Received:', JSON.stringify(body, null, 2));

    const { event_name, follower, sender, message } = body;

    // 1. Xử lý sự kiện người dùng nhấn "Quan tâm" (follow)
    if (event_name === 'follow' && follower && follower.id) {
      const userId = follower.id;
      const welcomeText = 
        `Chào mừng anh/chị đến với Thực Phẩm Số Một Đồng Nai (TPS1)!\n\n` +
        `Chúng tôi là nhà cung cấp thực phẩm sỉ B2B hàng đầu tại Đồng Nai, chuyên phục vụ bếp ăn tập thể, nhà máy, trường học, bệnh viện, nhà hàng và khách sạn.\n\n` +
        `Để xem danh mục hơn 500 sản phẩm sỉ, tạo yêu cầu báo giá hoặc đặt hàng nhanh chóng, anh/chị vui lòng nhấn vào liên kết bên dưới để mở Zalo Mini App của TPS1:\n` +
        `👉 https://zalo.me/s/3486082144280639442/\n\n` +
        `Đội ngũ hỗ trợ của chúng tôi sẽ liên hệ lại ngay khi nhận được yêu cầu. Chúc anh/chị một ngày tốt lành!`;

      console.log(`Zalo Webhook: User ${userId} followed OA. Sending welcome message...`);
      const res = await sendOAConsultingMessage(userId, welcomeText);
      console.log('Zalo Webhook: Welcome message send result:', res);
    }

    // 2. Xử lý sự kiện người dùng gửi tin nhắn chữ (user_send_text)
    if (event_name === 'user_send_text' && sender && sender.id && message) {
      const userId = sender.id;
      const userText = message.text || '';
      console.log(`Zalo Webhook: User ${userId} sent text: "${userText}"`);

      // Gửi phản hồi tự động nếu cần thiết, ví dụ dẫn về Mini App hoặc Hotline
      const autoReplyText = 
        `Cảm ơn anh/chị đã liên hệ với TPS1.\n\n` +
        `Yêu cầu của anh/chị đã được ghi nhận. Quản trị viên của chúng tôi sẽ trả lời trực tiếp trong chốc lát.\n\n` +
        `Để được báo giá và đặt hàng nhanh hơn, anh/chị cũng có thể mở trực tiếp Mini App của chúng tôi tại đây:\n` +
        `👉 https://zalo.me/s/3486082144280639442/\n\n` +
        `Hoặc liên hệ Hotline/Zalo trực tiếp: 089 890 2222. Xin cảm ơn!`;

      console.log(`Zalo Webhook: Sending auto-reply to user ${userId}...`);
      const res = await sendOAConsultingMessage(userId, autoReplyText);
      console.log('Zalo Webhook: Auto-reply send result:', res);
    }

    // Zalo yêu cầu phản hồi HTTP 200 OK để tránh gửi lặp lại
    return NextResponse.json({ error: 0, message: "Success" }, { status: 200 });
  } catch (error) {
    console.error('Zalo Webhook: Error processing event:', error);
    // Vẫn trả về 200 OK theo tài liệu Zalo để không bị báo lỗi retry
    return NextResponse.json({ error: -1, message: String(error) }, { status: 200 });
  }
}
