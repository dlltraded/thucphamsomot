import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Token",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminAuth(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: 401, headers: corsHeaders });
    }
    if (auth.profile?.role !== "admin") {
      return NextResponse.json(
        { error: "Chỉ Quản trị/Ban giám đốc mới được kích hoạt bảng giá" },
        { status: 403, headers: corsHeaders }
      );
    }

    const body = await req.json();
    const { priceBookId } = body;

    if (!priceBookId) {
      return NextResponse.json({ error: "Thiếu priceBookId" }, { status: 400, headers: corsHeaders });
    }

    const supabase = getCustomerSupabaseAdmin();

    // 1. Fetch the price book to activate
    const { data: targetPb, error: fetchErr } = await supabase
      .from("price_books")
      .select("id, code, name, kind, status, version")
      .eq("id", priceBookId)
      .single();

    if (fetchErr || !targetPb) {
      return NextResponse.json({ error: "Không tìm thấy bảng giá" }, { status: 404, headers: corsHeaders });
    }

    if (targetPb.status === "active") {
      return NextResponse.json({ error: "Bảng giá này hiện đã ở trạng thái active" }, { status: 400, headers: corsHeaders });
    }

    // Base code without version suffix (e.g. PB_CUST_TOYOTA from PB_CUST_TOYOTA_v2)
    const baseCode = targetPb.code.replace(/_v\d+$/, "");
    const now = new Date().toISOString();

    // 2. Archive previous active versions of the same base code
    const { data: previousActive } = await supabase
      .from("price_books")
      .select("id, code")
      .like("code", `${baseCode}%`)
      .eq("status", "active");

    if (previousActive && previousActive.length > 0) {
      for (const prev of previousActive) {
        await supabase
          .from("price_books")
          .update({
            status: "archived",
            valid_to: now,
            updated_at: now,
          })
          .eq("id", prev.id);

        await supabase.from("price_book_audit_logs").insert({
          price_book_id: prev.id,
          action: "archive_replaced",
          performed_by: auth.profile?.name || auth.profile?.id || "admin",
          details: { replacedBy: targetPb.id, replacedAt: now },
        });
      }
    }

    // 3. Activate target price book
    const { error: updateErr } = await supabase
      .from("price_books")
      .update({
        status: "active",
        valid_from: now,
        valid_to: null,
        approved_by: auth.profile?.name || auth.profile?.id || "admin",
        updated_at: now,
      })
      .eq("id", targetPb.id);

    if (updateErr) {
      throw updateErr;
    }

    // 4. Activate any pending customer assignment
    await supabase
      .from("price_book_customer_assignments")
      .update({ valid_from: now })
      .eq("price_book_id", targetPb.id);

    // 5. Audit log
    await supabase.from("price_book_audit_logs").insert({
      price_book_id: targetPb.id,
      action: "activate",
      performed_by: auth.profile?.name || auth.profile?.id || "admin",
      details: { activatedAt: now, previousReplacedCount: previousActive?.length || 0 },
    });

    return NextResponse.json(
      {
        ok: true,
        message: `Đã kích hoạt thành công bảng giá "${targetPb.name}" sang trạng thái ACTIVE!`,
        priceBookId: targetPb.id,
      },
      { headers: corsHeaders }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Lỗi kích hoạt bảng giá" }, { status: 500, headers: corsHeaders });
  }
}
