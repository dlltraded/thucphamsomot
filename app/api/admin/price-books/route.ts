import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Token",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminAuth(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: 401, headers: corsHeaders });
    }

    const supabase = getCustomerSupabaseAdmin();
    const { data, error } = await supabase
      .from("price_books")
      .select("id, code, name, kind, status, version, valid_from, valid_to, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ ok: true, data: data || [] }, { headers: corsHeaders });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Lỗi lấy danh sách bảng giá" }, { status: 500, headers: corsHeaders });
  }
}
