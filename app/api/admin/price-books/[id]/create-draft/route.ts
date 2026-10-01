import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { can } from "@/lib/permissions";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Token",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyAdminAuth(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error || "Chưa đăng nhập" }, { status: 401, headers: corsHeaders });
    }

    const role = auth.profile?.role;
    if (!can(role, "pricing.edit") && role !== "admin" && role !== "ke_toan") {
      return NextResponse.json({ error: "Chỉ Admin và Kế toán mới có quyền tạo bản nháp bảng giá" }, { status: 403, headers: corsHeaders });
    }

    const { id } = await params;
    const supabase = getCustomerSupabaseAdmin();

    const { data: sourceBook, error: bookErr } = await supabase
      .from("price_books")
      .select("*")
      .eq("id", id)
      .single();

    if (bookErr || !sourceBook) {
      return NextResponse.json({ error: "Không tìm thấy bảng giá nguồn" }, { status: 404, headers: corsHeaders });
    }

    // New version draft
    const newVersion = (sourceBook.version || 1) + 1;
    const draftCode = `${sourceBook.code}_V${newVersion}_DRAFT`;
    const draftName = `${sourceBook.name} (Bản nháp v${newVersion})`;

    const { data: draftBook, error: draftErr } = await supabase
      .from("price_books")
      .insert({
        code: draftCode,
        name: draftName,
        kind: sourceBook.kind,
        status: "draft",
        version: newVersion,
        source_price_book_id: sourceBook.id,
        created_by: auth.profile?.email || auth.profile?.name || "admin",
        allow_unlisted_products: sourceBook.allow_unlisted_products,
        rounding_rule: sourceBook.rounding_rule,
        valid_from: new Date().toISOString(),
      })
      .select()
      .single();

    if (draftErr || !draftBook) {
      throw draftErr || new Error("Không tạo được bản nháp mới");
    }

    // Copy all items from source
    const { data: sourceItems } = await supabase
      .from("price_book_items")
      .select("*")
      .eq("price_book_id", sourceBook.id);

    if (sourceItems && sourceItems.length > 0) {
      const clonedItems = sourceItems.map(item => ({
        price_book_id: draftBook.id,
        product_id: item.product_id,
        sku_snapshot: item.sku_snapshot,
        name_snapshot: item.name_snapshot,
        unit_snapshot: item.unit_snapshot,
        base_price: item.base_price,
        price: item.price,
        discount_percent: item.discount_percent,
        discount_amount: item.discount_amount,
        min_qty: item.min_qty,
        order_step: item.order_step,
        source_metadata: { cloned_from_id: sourceBook.id, source_version: sourceBook.version }
      }));

      await supabase.from("price_book_items").insert(clonedItems);
    }

    // Audit log
    await supabase.from("price_book_audit_logs").insert({
      price_book_id: draftBook.id,
      action: "draft_version_created",
      performed_by: auth.profile?.email || auth.profile?.name || "admin",
      details: { source_book_id: sourceBook.id, version: newVersion }
    });

    return NextResponse.json({
      ok: true,
      message: `Đã tạo bản nháp v${newVersion} thành công`,
      data: draftBook
    }, { headers: corsHeaders });
  } catch (err: any) {
    console.error("Error creating draft version:", err);
    return NextResponse.json({ error: err.message || "Lỗi tạo bản nháp mới" }, { status: 500, headers: corsHeaders });
  }
}
