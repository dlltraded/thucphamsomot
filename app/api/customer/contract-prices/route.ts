import { NextRequest, NextResponse } from "next/server";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    const { orderSessionToken } = await req.json();
    if (!orderSessionToken) {
      return NextResponse.json({ ok: true, data: {} }, { headers: corsHeaders });
    }

    const supabase = getCustomerSupabaseAdmin();

    // Lấy customer_id từ orderSessionToken
    const { data: session } = await supabase
      .from("customer_sessions")
      .select("customer_id")
      .eq("token", orderSessionToken)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (!session) {
      return NextResponse.json({ ok: false, error: "Phiên đăng nhập không hợp lệ" }, { status: 401, headers: corsHeaders });
    }

    // Lấy danh sách giá hợp đồng
    const { data: contractPrices } = await supabase
      .from("customer_contract_prices")
      .select("product_id, price")
      .eq("customer_id", session.customer_id);

    // Chuyển thành dạng object map
    const priceMap: Record<string, number> = {};
    if (contractPrices) {
      for (const item of contractPrices) {
        priceMap[item.product_id] = Number(item.price);
      }
    }

    return NextResponse.json({ ok: true, data: priceMap }, { headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ ok: false, error: "Lỗi hệ thống" }, { status: 500, headers: corsHeaders });
  }
}
