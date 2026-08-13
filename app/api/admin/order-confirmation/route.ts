import { NextRequest, NextResponse } from "next/server";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";

function authorized(req: NextRequest) {
  const expected = process.env.ADMIN_TOKEN?.trim() || "19871988";
  const supplied = req.headers.get("x-admin-token") || req.nextUrl.searchParams.get("token") || req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return Boolean(supplied && supplied === expected);
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "Không có quyền tải chứng từ" }, { status: 401 });
  }
  const orderId = req.nextUrl.searchParams.get("orderId");
  if (!orderId) return NextResponse.json({ ok: false, error: "Thiếu mã đơn hàng" }, { status: 400 });
  const supabase = getCustomerSupabaseAdmin();
  const { data: order } = await supabase
    .from("orders")
    .select("id, order_code")
    .eq("id", orderId)
    .maybeSingle();
  const { data: document } = await supabase
    .from("order_documents")
    .select("storage_path, revision")
    .eq("order_id", orderId)
    .eq("status", "generated")
    .order("revision", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!order || !document) {
    return NextResponse.json({ ok: false, error: "Chưa có PDF xác nhận cho đơn này" }, { status: 404 });
  }
  const { data: file, error } = await supabase.storage.from("order-confirmations").download(document.storage_path);
  if (error || !file) return NextResponse.json({ ok: false, error: "Không tải được PDF" }, { status: 500 });
  return new NextResponse(await file.arrayBuffer(), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="XAC-NHAN-DON-HANG_${order.order_code}_R${document.revision}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
