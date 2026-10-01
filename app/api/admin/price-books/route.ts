import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { can } from "@/lib/permissions";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminAuth(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error || "Chưa đăng nhập" }, { status: 401, headers: corsHeaders });
    }

    const role = auth.profile?.role;
    if (!can(role, "pricing.edit") && role !== "admin" && role !== "ke_toan") {
      return NextResponse.json({ error: "Chỉ Admin và Kế toán mới có quyền tạo bảng giá" }, { status: 403, headers: corsHeaders });
    }

    const body = await req.json().catch(() => ({}));
    const name = String(body.name || "").trim();
    let code = String(body.code || "").trim();
    const kind = ["general", "customer", "group"].includes(body.kind) ? body.kind : "customer";
    const sourcePriceBookId = body.sourcePriceBookId ? String(body.sourcePriceBookId) : null;
    const customerId = body.customerId ? String(body.customerId) : null;
    const groupName = body.groupName ? String(body.groupName).trim() : null;

    if (!name) {
      return NextResponse.json({ error: "Tên bảng giá không được để trống" }, { status: 400, headers: corsHeaders });
    }

    if (!code) {
      // Auto-generate code from name
      const clean = name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]/g, "_")
        .toUpperCase()
        .replace(/_+/g, "_")
        .slice(0, 20);
      code = `PB_${clean}_${Date.now().toString().slice(-4)}`;
    }

    const supabase = getCustomerSupabaseAdmin();

    // Check code uniqueness
    const { data: existCode } = await supabase.from("price_books").select("id").eq("code", code).maybeSingle();
    if (existCode) {
      code = `${code}_${Math.floor(Math.random() * 1000)}`;
    }

    // Insert price book in 'draft' status
    const { data: newBook, error: insertErr } = await supabase
      .from("price_books")
      .insert({
        name,
        code,
        kind,
        status: "draft",
        source_price_book_id: sourcePriceBookId,
        created_by: auth.profile?.email || auth.profile?.name || "admin",
        version: 1,
        valid_from: body.validFrom || null,
        valid_to: body.validTo || null,
      })
      .select()
      .single();

    if (insertErr || !newBook) throw insertErr || new Error("Không tạo được bảng giá");

    // Copy items from source price book if selected
    if (sourcePriceBookId) {
      const { data: sourceItems } = await supabase
        .from("price_book_items")
        .select("product_id, sku_snapshot, name_snapshot, unit_snapshot, base_price, price, discount_percent, min_qty, order_step")
        .eq("price_book_id", sourcePriceBookId);

      if (sourceItems && sourceItems.length > 0) {
        const clonedItems = sourceItems.map(item => ({
          price_book_id: newBook.id,
          product_id: item.product_id,
          sku_snapshot: item.sku_snapshot,
          name_snapshot: item.name_snapshot,
          unit_snapshot: item.unit_snapshot,
          base_price: item.base_price,
          price: item.price,
          discount_percent: item.discount_percent,
          min_qty: item.min_qty,
          order_step: item.order_step,
          source_metadata: { source_price_book_id: sourcePriceBookId, cloned_at: new Date().toISOString() }
        }));

        await supabase.from("price_book_items").insert(clonedItems);
      }
    }

    // Customer assignment if provided
    if (customerId && kind === "customer") {
      await supabase.from("price_book_customer_assignments").insert({
        price_book_id: newBook.id,
        customer_id: customerId,
        priority: 1,
        created_by: auth.profile?.email || "admin"
      });
    }

    // Group assignment if provided
    if (groupName && kind === "group") {
      await supabase.from("price_book_customer_group_assignments").insert({
        price_book_id: newBook.id,
        group_name: groupName,
        priority: 5,
        created_by: auth.profile?.email || "admin"
      });
    }

    // Audit log
    await supabase.from("price_book_audit_logs").insert({
      price_book_id: newBook.id,
      action: "price_book_created",
      performed_by: auth.profile?.email || auth.profile?.name || "admin",
      details: { name, code, kind, sourcePriceBookId, customerId, groupName }
    });

    return NextResponse.json({ ok: true, data: newBook }, { headers: corsHeaders });
  } catch (err: any) {
    console.error("Error creating price book:", err);
    return NextResponse.json({ error: err.message || "Lỗi tạo bảng giá" }, { status: 500, headers: corsHeaders });
  }
}
