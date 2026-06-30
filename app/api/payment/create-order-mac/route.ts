import { NextResponse } from 'next/server';
import crypto from 'crypto';

const PRIVATE_KEY = process.env.ZALO_MINI_APP_PRIVATE_KEY || '';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { amount, desc, item, extradata, method } = body;

    // Build the payload for MAC calculation.
    // Zalo requires keys to be sorted alphabetically: amount, desc, extradata, item, method
    // Note: only include keys that are present.
    const macDataObj: Record<string, any> = {};
    if (amount !== undefined) macDataObj.amount = amount;
    if (desc !== undefined) macDataObj.desc = desc;
    if (extradata !== undefined) macDataObj.extradata = typeof extradata === 'string' ? extradata : JSON.stringify(extradata);
    if (item !== undefined) macDataObj.item = typeof item === 'string' ? item : JSON.stringify(item);
    if (method !== undefined) macDataObj.method = typeof method === 'string' ? method : JSON.stringify(method);

    const sortedKeys = Object.keys(macDataObj).sort();
    const macDataString = sortedKeys.map(key => `${key}=${macDataObj[key]}`).join('&');

    const mac = crypto.createHmac('sha256', PRIVATE_KEY).update(macDataString).digest('hex');

    // orderId can be generated here, e.g., a timestamp-based ID
    const orderId = `TPS1_COD_${Date.now()}`;

    return NextResponse.json({ 
      mac, 
      orderId 
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
  } catch (error) {
    console.error("Error creating MAC:", error);
    return NextResponse.json({ error: "Failed to create MAC" }, { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
  }
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
