import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getCustomerSupabase } from '@/lib/customer-supabase-server';

const PRIVATE_KEY = process.env.ZALO_MINI_APP_PRIVATE_KEY || '';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { amount, desc, item, extradata, method, centralOrderId, orderSessionToken } = body;

    if (!centralOrderId || !orderSessionToken) {
      return NextResponse.json(
        { error: 'Missing central order authentication' },
        { status: 401, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const supabase = getCustomerSupabase();
    const { data: customerOrders, error: ordersError } = await supabase.rpc(
      'customer_list_orders',
      { p_session_token: orderSessionToken }
    );
    if (ordersError) throw ordersError;
    const centralOrder = (customerOrders || []).find(
      (order: { id?: string }) => order.id === centralOrderId
    );
    if (!centralOrder) {
      return NextResponse.json(
        { error: 'Central order not found for this customer' },
        { status: 404, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const parsedItems = typeof item === 'string' ? JSON.parse(item) : item;
    const itemsTotal = Array.isArray(parsedItems)
      ? parsedItems.reduce((sum, entry) => sum + Number(entry?.amount || 0), 0)
      : 0;
    const expectedAmount = Math.round(Number(centralOrder.grand_total || 0));
    if (Math.round(Number(amount || 0)) !== expectedAmount || Math.round(itemsTotal) !== expectedAmount) {
      return NextResponse.json(
        { error: 'Payment amount does not match central order' },
        { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

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
    const orderId = centralOrder.order_code;

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
