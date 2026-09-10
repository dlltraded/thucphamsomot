import { NextRequest, NextResponse } from "next/server";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";
import { verifyAdminAuth } from "@/lib/admin-auth";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, X-Admin-Token",
  "Access-Control-Expose-Headers": "Content-Disposition, Content-Type",
};

function json(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: corsHeaders });
}

// LƯU Ý BẢO MẬT (2026-09-09): route này TRƯỚC ĐÂY tự viết một hàm authorized()
// riêng, chỉ so sánh chuỗi tĩnh với `process.env.ADMIN_TOKEN || "19871988"`
// (không hề xác thực JWT thật), trong khi mọi nơi khác trong hệ thống (kể cả
// quanly) đều gửi lên một JWT thật của Supabase Auth qua header này. Ngoài
// việc "19871988" là một khoá vạn năng công khai, cách kiểm tra cũ còn khiến
// việc tải PDF xác nhận đơn hàng thực tế không hoạt động đúng với JWT thật.
// Đã thay bằng verifyAdminAuth() dùng chung với các API admin khác.
export async function GET(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) {
    return json({ ok: false, error: auth.error || "Không có quyền tải chứng từ" }, 401);
  }
  const orderId = req.nextUrl.searchParams.get("orderId");
  if (!orderId) return json({ ok: false, error: "Thiếu mã đơn hàng" }, 400);
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
    return json({ ok: false, error: "Chưa có PDF xác nhận cho đơn này" }, 404);
  }
  const { data: file, error } = await supabase.storage.from("order-confirmations").download(document.storage_path);
  if (error || !file) return json({ ok: false, error: "Không tải được PDF" }, 500);
  return new NextResponse(await file.arrayBuffer(), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="XAC-NHAN-DON-HANG_${order.order_code}_R${document.revision}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}
