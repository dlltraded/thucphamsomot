import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { can } from "@/lib/permissions";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";
import { actorIdentity, assertInvoiceWriteAccess } from "@/lib/invoice-access";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status });
}

export async function GET(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) return json({ ok: false, error: auth.error }, 401);
  if (!can(auth.profile?.role, "orders.view")) return json({ ok: false, error: "Không có quyền xem hóa đơn" }, 403);
  const orderId = req.nextUrl.searchParams.get("orderId")?.trim();
  if (!orderId) return json({ ok: false, error: "Thiếu đơn hàng" }, 400);
  const supabase = getCustomerSupabaseAdmin();
  const { data, error } = await supabase.from("sales_returns")
    .select("*, sales_return_items(*)")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });
  if (error) return json({ ok: false, error: error.message }, 500);
  return json({ ok: true, returns: data || [] });
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) return json({ ok: false, error: auth.error }, 401);
  if (!can(auth.profile?.role, "invoices.return")) {
    return json({ ok: false, error: "Chỉ Admin, Trưởng phòng hoặc Kế toán được xác nhận đổi/trả" }, 403);
  }
  const body = await req.json().catch(() => null);
  const orderId = String(body?.orderId || "").trim();
  const reason = String(body?.reason || "").trim();
  const items = Array.isArray(body?.items)
    ? body.items.map((item: any) => ({
        orderItemId: String(item?.orderItemId || "").trim(),
        quantity: Number(item?.quantity),
      })).filter((item: any) => item.orderItemId && Number.isFinite(item.quantity) && item.quantity > 0)
    : [];
  if (!orderId || reason.length < 3 || !items.length) {
    return json({ ok: false, error: "Cần chọn sản phẩm, số lượng và nhập lý do đổi/trả" }, 400);
  }

  const supabase = getCustomerSupabaseAdmin();
  try {
    await assertInvoiceWriteAccess(supabase, auth.profile, orderId);
    const actor = actorIdentity(auth.profile);
    const { data, error } = await supabase.rpc("create_sales_return_secured", {
      p_order_id: orderId,
      p_items: items,
      p_reason: reason,
      p_actor_id: actor.id,
      p_actor_name: actor.name,
      p_actor_role: actor.role,
      p_actor_department_id: actor.departmentId,
    });
    if (error) return json({ ok: false, error: error.message }, 409);
    return json({ ok: true, salesReturn: data });
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : "Không có quyền đổi/trả" }, 403);
  }
}
