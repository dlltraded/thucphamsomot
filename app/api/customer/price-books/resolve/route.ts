import { NextRequest, NextResponse } from "next/server";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";
import { resolvePriceBookPrices } from "@/lib/price-book-resolver";

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
    const body = await req.json();
    const token = String(body?.orderSessionToken || "").trim();
    const rawIds = Array.isArray(body?.productIds)
      ? body.productIds
      : String(body?.productIds || "").split(",");
    const productIds: string[] = [...new Set<string>(rawIds.map((id: unknown) => String(id).trim()).filter(Boolean))].slice(0, 500);
    if (!token || !productIds.length) {
      return NextResponse.json({ error: "Thiếu phiên đăng nhập hoặc danh sách sản phẩm" }, { status: 400, headers: corsHeaders });
    }
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (productIds.some((id) => !uuid.test(id))) {
      return NextResponse.json({ error: "Danh sách sản phẩm không hợp lệ" }, { status: 400, headers: corsHeaders });
    }

    const supabase = getCustomerSupabaseAdmin();
    const { data: session, error: sessionError } = await supabase
      .from("customer_sessions")
      .select("customer_id")
      .eq("token", token)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (sessionError || !session) {
      return NextResponse.json({ error: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn" }, { status: 401, headers: corsHeaders });
    }

    const prices = await resolvePriceBookPrices(supabase, session.customer_id, productIds);
    return NextResponse.json({
      data: productIds.map((id) => {
        const item = prices.get(id)!;
        return {
          product_id: id,
          price: item.price,
          price_source: item.priceSource,
          price_book_id: item.priceBookId,
          price_book_code: item.priceBookCode,
          price_book_name: item.priceBookName,
          price_book_version: item.priceBookVersion,
        };
      }),
    }, { headers: corsHeaders });
  } catch (error) {
    console.error("Resolve price books error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không xác định được bảng giá" }, { status: 500, headers: corsHeaders });
  }
}
