import { NextRequest, NextResponse } from "next/server";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";
import { verifyAdminAuth } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const {
    customerId, items, deliveryAddress, deliveryName, deliveryPhone, note,
    voucherCode, voucherDiscount, discountPercent, discountAmount, shippingAmount
  } = body;
  
  if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ ok: false, error: "Dữ liệu khách hàng hoặc giỏ hàng không hợp lệ" }, { status: 400 });
  }

  const idempotencyKey = `admin-${customerId}-${Date.now()}`;
  const supabase = getCustomerSupabaseAdmin();

  // If role is sale, they can only create orders for their own customers or any? 
  // RLS might block it inside admin_create_order_full if we don't use service_role.
  // Actually, getCustomerSupabaseAdmin uses service_role. 
  // Let's pass the sales_rep_id to the RPC so it is attached to the order.
  
  const salesRepId = auth.profile?.id === "legacy-admin" ? null : auth.profile?.id;

  const { data, error } = await supabase.rpc("admin_create_order_full", {
    p_customer_id: customerId,
    p_items: items,
    p_voucher_code: voucherCode || null,
    p_voucher_discount: voucherDiscount || 0,
    p_discount_percent: discountPercent || 0,
    p_discount_amount: discountAmount || 0,
    p_shipping_amount: shippingAmount || 0,
    p_delivery_type: 'shipping',
    p_delivery_name: deliveryName || '',
    p_delivery_phone: deliveryPhone || '',
    p_delivery_address: deliveryAddress || '',
    p_note: note || '',
    p_idempotency_key: idempotencyKey,
    p_admin_id: salesRepId
  });

  if (error) {
    console.error("admin create order full error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  const order = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({ ok: true, order });
}
