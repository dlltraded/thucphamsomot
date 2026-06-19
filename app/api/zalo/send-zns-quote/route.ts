import { NextRequest, NextResponse } from 'next/server';
import { sendZNSTemplate } from '@/lib/zalo';

export const dynamic = 'force-dynamic';

const ZNS_QUOTE_SENT_TEMPLATE_ID = process.env.ZNS_QUOTE_SENT_TEMPLATE_ID || '555235'; // Thay bằng ID mẫu tin Zalo duyệt thực tế

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function POST(request: NextRequest) {
  try {
    const { phone, name, quoteId, quoteCode, grandTotal } = await request.json();

    if (!phone || !name || !quoteId) {
      return NextResponse.json(
        { error: 400, message: 'Missing phone, name, or quoteId' }, 
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`Zalo ZNS Quote: Triggering quote notification to ${phone} (Name: ${name}, Quote: ${quoteCode || quoteId})...`);

    const formattedTotal = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(grandTotal || 0);

    // Đường dẫn xem báo giá trực tiếp trên website
    const quoteViewUrl = `https://thucphamsomot.vn/bao-gia/view/${quoteId}`;

    // Dữ liệu tham số cho mẫu ZNS báo giá
    const templateData = {
      ten_khach_hang: name,
      ma_bao_gia: quoteCode || quoteId,
      tong_tien: formattedTotal,
      link_bao_gia: quoteViewUrl, // Nút liên kết trên ZNS sẽ trỏ về liên kết này
    };

    const res = await sendZNSTemplate(phone, ZNS_QUOTE_SENT_TEMPLATE_ID, templateData);

    console.log('Zalo ZNS Quote: Result:', res);

    if (res && res.error === 0) {
      return NextResponse.json({ error: 0, message: 'Success', data: res }, { status: 200, headers: corsHeaders });
    } else {
      return NextResponse.json(
        { error: res?.error || 500, message: res?.message || 'Failed to send ZNS message' }, 
        { status: 400, headers: corsHeaders }
      );
    }

  } catch (error) {
    console.error('Zalo ZNS Quote: Exception occurred:', error);
    return NextResponse.json(
      { error: 500, message: String(error) }, 
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}
