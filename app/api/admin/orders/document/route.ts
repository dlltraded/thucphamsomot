import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const FILE_LABEL: Record<string, string> = {
  order_confirmation: "PHIEU-XAC-NHAN",
  invoice: "HOA-DON",
};

// Tải chứng từ đơn hàng (phiếu xác nhận lúc chốt giá, hoặc hóa đơn bán hàng
// lúc hoàn thành giao hàng) cho nhân viên — trước đây chỉ có bản khách hàng
// tải được qua Mini App (app/api/customer/order-confirmation), staff chưa có
// đường tải lại chứng từ đã tạo.
export async function GET(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: 401, headers: corsHeaders });

  const orderId = req.nextUrl.searchParams.get("orderId");
  const documentType = req.nextUrl.searchParams.get("type") === "invoice" ? "invoice" : "order_confirmation";
  if (!orderId) return NextResponse.json({ ok: false, error: "Thiếu mã đơn hàng" }, { status: 400, headers: corsHeaders });

  try {
    const supabase = getCustomerSupabaseAdmin();
    const { data: order } = await supabase.from("orders").select("order_code").eq("id", orderId).maybeSingle();
    if (!order) return NextResponse.json({ ok: false, error: "Không tìm thấy đơn hàng" }, { status: 404, headers: corsHeaders });

    const { data: document } = await supabase
      .from("order_documents")
      .select("storage_path, revision")
      .eq("order_id", orderId)
      .eq("document_type", documentType)
      .eq("status", "generated")
      .order("revision", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!document) return NextResponse.json({ ok: false, error: "Chưa có chứng từ này cho đơn hàng" }, { status: 404, headers: corsHeaders });

    const { data: file, error } = await supabase.storage.from("order-confirmations").download(document.storage_path);
    if (error || !file) return NextResponse.json({ ok: false, error: "Không tải được chứng từ" }, { status: 500, headers: corsHeaders });

    return new NextResponse(await file.arrayBuffer(), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${FILE_LABEL[documentType]}_${order.order_code}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("GET /api/admin/orders/document lỗi:", error);
    return NextResponse.json({ ok: false, error: "Không tải được chứng từ" }, { status: 500, headers: corsHeaders });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}
