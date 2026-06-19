import { NextRequest, NextResponse } from 'next/server';
import { sendZNSTemplate } from '@/lib/zalo';

export const dynamic = 'force-dynamic';

const ZNS_LEAD_RECEIVED_TEMPLATE_ID = process.env.ZNS_LEAD_RECEIVED_TEMPLATE_ID || '555234'; // Thay bằng ID mẫu tin Zalo duyệt thực tế

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function POST(request: NextRequest) {
  try {
    const { phone, name, source } = await request.json();

    if (!phone || !name) {
      return NextResponse.json(
        { error: 400, message: 'Missing phone or name' }, 
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`Zalo ZNS Lead: Triggering confirmation message to ${phone} (Name: ${name}, Source: ${source})...`);

    // Dữ liệu tham số cho mẫu ZNS đã đăng ký
    const templateData = {
      ten_khach_hang: name,
      nguon_dang_ky: source || 'Hệ thống TPS1',
      thoi_gian: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
    };

    const res = await sendZNSTemplate(phone, ZNS_LEAD_RECEIVED_TEMPLATE_ID, templateData);

    console.log('Zalo ZNS Lead: Result:', res);

    if (res && res.error === 0) {
      return NextResponse.json({ error: 0, message: 'Success', data: res }, { status: 200, headers: corsHeaders });
    } else {
      return NextResponse.json(
        { error: res?.error || 500, message: res?.message || 'Failed to send ZNS message' }, 
        { status: 400, headers: corsHeaders }
      );
    }

  } catch (error) {
    console.error('Zalo ZNS Lead: Exception occurred:', error);
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
