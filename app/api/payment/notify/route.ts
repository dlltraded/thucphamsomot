import { NextResponse } from 'next/server';
import crypto from 'crypto';

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

    if (method === 'COD') {
      console.log(`[Zalo Checkout] Order ${orderId} confirmed with COD.`);
      
      // TODO: In the future, if you want to sync this COD order to Supabase 
      // or send a Zalo ZNS message, you can do it here.
      // Currently, it just acknowledges the Zalo Checkout SDK webhook.
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
