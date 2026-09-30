import { NextRequest, NextResponse } from "next/server";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { canForProfile } from "@/lib/permissions";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAdminAuth(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    if (!canForProfile(auth.profile, "pricing.view")) {
      return NextResponse.json({ error: "Bạn không có quyền xem bảng giá" }, { status: 403 });
    }

    const { id } = await params;
    const supabase = getCustomerSupabaseAdmin();
    
    const { data: priceBook, error: pbError } = await supabase
      .from("price_books")
      .select("*")
      .eq("id", id)
      .single();

    if (pbError) throw pbError;

    const { data: items, error: itemsError } = await supabase
      .from("price_book_items")
      .select("*")
      .eq("price_book_id", id);

    if (itemsError) throw itemsError;

    return NextResponse.json({ data: { ...priceBook, items } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAdminAuth(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    const session = auth.profile;
    if (!canForProfile(session, "pricing.edit")) {
      return NextResponse.json({ error: "Bạn không có quyền sửa bảng giá" }, { status: 403 });
    }

    const userRole = session.role;
    const { id } = await params;
    const input = await req.json();
    const allowedFields = ["status", "name", "allow_unlisted_products", "valid_from", "valid_to"] as const;
    const body: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(input, field)) body[field] = input[field];
    }
    const status = typeof body.status === "string" ? body.status : undefined;
    if (status && !["draft", "pending_approval", "active", "expired", "archived"].includes(status)) {
      return NextResponse.json({ error: "Trạng thái bảng giá không hợp lệ" }, { status: 400 });
    }

    const supabase = getCustomerSupabaseAdmin();
    
    // Authorization checks based on status changes
    if (status) {
      if (status === "active" && userRole !== "admin" && userRole !== "ban_giam_doc") {
        return NextResponse.json({ error: "Chỉ Quản trị/Ban giám đốc mới được kích hoạt bảng giá" }, { status: 403 });
      }
      
      if (status === "active") {
        body.approved_by = session.email || session.id;
      }
    }

    const { data, error } = await supabase
      .from("price_books")
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    
    // Log audit
    await supabase.from("price_book_audit_logs").insert({
      price_book_id: id,
      action: "UPDATE",
      performed_by: session.email,
      details: body
    });

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
