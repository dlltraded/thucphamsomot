import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const { customerId, items, deliveryAddress, deliveryName, deliveryPhone, note } = body;
  
  if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ ok: false, error: "Dữ liệu khách hàng hoặc giỏ hàng không hợp lệ" }, { status: 400 });
  }

  const idempotencyKey = `admin-${customerId}-${Date.now()}`;
  const supabase = getAdminSupabase();

  const { data, error } = await supabase.rpc("customer_create_order", {
    p_session_token: null,
    p_source: 'admin',
    p_items: items,
    p_delivery_type: 'shipping',
    p_delivery_alias: null,
    p_delivery_address: deliveryAddress || 'Trống',
    p_delivery_name: deliveryName || 'Trống',
    p_delivery_phone: deliveryPhone || 'Trống',
    p_note: note || '',
    p_idempotency_key: idempotencyKey,
    p_voucher_code: null,
    p_admin_id: 'admin', // You could extract from admin token if needed
    p_customer_id: customerId,
  });

  if (error) {
    console.error("admin create order error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  const order = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({ ok: true, order });
}
