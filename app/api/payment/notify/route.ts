import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getCustomerSupabaseAdmin } from '@/lib/customer-supabase-server';

const PRIVATE_KEY = process.env.ZALO_MINI_APP_PRIVATE_KEY || '';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { data, mac } = body;

    // 1. Authenticate request using HMAC SHA256
    const reqmac = crypto.createHmac('sha256', PRIVATE_KEY).update(data).digest('hex');

    if (reqmac !== mac) {
      return NextResponse.json({ returnCode: -1, returnMessage: "Invalid MAC" });
    }

    // 2. Parse data string (format: 'appId={appId}&orderId={orderId}&method={method}')
    const params = new URLSearchParams(data);
    const orderId = params.get('orderId');
    const method = params.get('method');
    const extradataRaw = params.get('extradata') || '{}';
    let extradata: { centralOrderId?: string; orderCode?: string } = {};
    try {
      extradata = JSON.parse(extradataRaw);
    } catch {
      extradata = {};
    }

    if (method === 'COD') {
      console.log(`[Zalo Checkout] Order ${orderId} confirmed with COD.`);

      if (extradata.centralOrderId) {
        const supabase = getCustomerSupabaseAdmin();
        const { error: updateError } = await supabase
          .from('orders')
          .update({
            payment_status: 'cod',
            external_payment_order_id: orderId,
          })
          .eq('id', extradata.centralOrderId);
        if (updateError) throw updateError;

        const { error: historyError } = await supabase.from('order_history').insert({
          order_id: extradata.centralOrderId,
          action: 'zalo_checkout_confirmed',
          actor: 'zalo_checkout',
          note: `Zalo Checkout xác nhận COD ${orderId || ''}`,
          payload: { orderCode: extradata.orderCode || '', externalOrderId: orderId },
        });
        if (historyError) throw historyError;
      }
    }

    // 3. Return success to Zalo Checkout SDK so it can complete the order
    return NextResponse.json({ returnCode: 1, returnMessage: "success" });

  } catch (error) {
    console.error("Zalo webhook notify error:", error);
    return NextResponse.json({ returnCode: -1, returnMessage: "Error processing request" });
  }
}

export async function GET() {
  return NextResponse.json({ status: "Zalo Payment Notify API is running." });
}
