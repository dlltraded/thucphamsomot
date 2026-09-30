import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { canForProfile } from "@/lib/permissions";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401 });
  if (!canForProfile(auth.profile, "pricing.edit")) return NextResponse.json({ ok: false, error: "Bạn không có quyền sửa bảng giá" }, { status: 403 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const productId = String(body.productId || "");
  const price = Number(body.price);
  if (!productId || !Number.isFinite(price) || price < 0) return NextResponse.json({ ok: false, error: "Sản phẩm hoặc giá không hợp lệ" }, { status: 400 });
  const supabase = getCustomerSupabaseAdmin();
  const { data: book, error: bookError } = await supabase.from("price_books").select("id, status, version, name").eq("id", id).single();
  if (bookError || !book) return NextResponse.json({ ok: false, error: "Không tìm thấy bảng giá" }, { status: 404 });
  if (book.status === "active") return NextResponse.json({ ok: false, error: "Bảng giá đang áp dụng. Hãy tạo phiên bản nháp trước khi chỉnh." }, { status: 409 });
  const { data: old } = await supabase.from("price_book_items").select("price, base_price, sku_snapshot, name_snapshot, unit_snapshot").eq("price_book_id", id).eq("product_id", productId).maybeSingle();
  const { data: product } = await supabase.from("products").select("sku, name, unit, price_retail").eq("id", productId).single();
  const { error } = await supabase.from("price_book_items").upsert({
    price_book_id: id, product_id: productId, price, base_price: old?.base_price ?? product?.price_retail ?? null,
    sku_snapshot: old?.sku_snapshot ?? product?.sku ?? null, name_snapshot: old?.name_snapshot ?? product?.name ?? null,
    unit_snapshot: old?.unit_snapshot ?? product?.unit ?? null, updated_at: new Date().toISOString(),
    source_metadata: { source: "manual", reason: String(body.reason || "") },
  }, { onConflict: "price_book_id,product_id" });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  await supabase.from("price_book_audit_logs").insert({ price_book_id: id, action: "item_price_updated", performed_by: auth.profile?.id || auth.profile?.email || "admin", details: { product_id: productId, old_price: old?.price ?? null, new_price: price, reason: body.reason || null } });
  return NextResponse.json({ ok: true, priceBookId: id, productId, oldPrice: old?.price ?? null, newPrice: price });
}

