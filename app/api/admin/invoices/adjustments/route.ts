import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { can } from "@/lib/permissions";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";
import { actorIdentity, assertInvoiceWriteAccess } from "@/lib/invoice-access";
import { generateInvoiceRevisionDocument } from "@/lib/invoice-document";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });

export async function GET(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) return json({ ok: false, error: auth.error }, 401);
  if (!can(auth.profile?.role, "invoices.view_audit")) return json({ ok: false, error: "Không có quyền xem lịch sử can thiệp" }, 403);
  const orderId = req.nextUrl.searchParams.get("orderId")?.trim();
  if (!orderId) return json({ ok: false, error: "Thiếu hóa đơn" }, 400);
  const supabase = getCustomerSupabaseAdmin();
  try {
    await assertInvoiceWriteAccess(supabase, auth.profile, orderId);
    const { data, error } = await supabase.from("invoice_adjustments")
      .select("id, adjustment_number, revision_from, revision_to, reason, before_snapshot, after_snapshot, total_before, total_after, total_delta, debt_before, debt_after, customer_credit_amount, created_by_name, created_by_role, created_by_department_id, created_at")
      .eq("order_id", orderId).order("revision_to", { ascending: false });
    if (error) throw error;
    return json({ ok: true, adjustments: data || [] });
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : "Không tải được lịch sử" }, 403);
  }
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) return json({ ok: false, error: auth.error }, 401);
  if (!can(auth.profile?.role, "invoices.adjust")) return json({ ok: false, error: "Không có quyền chỉnh sửa hóa đơn" }, 403);
  const body = await req.json().catch(() => null);
  const orderId = String(body?.orderId || "").trim();
  const reason = String(body?.reason || "").trim();
  const expectedRevision = Number(body?.expectedRevision);
  const items = Array.isArray(body?.items) ? body.items : [];
  if (!orderId || reason.length < 3 || !Number.isInteger(expectedRevision) || expectedRevision < 1 || !items.length) {
    return json({ ok: false, error: "Thiếu hóa đơn, phiên bản, sản phẩm hoặc lý do điều chỉnh" }, 400);
  }

  const supabase = getCustomerSupabaseAdmin();
  try {
    await assertInvoiceWriteAccess(supabase, auth.profile, orderId);
    const actor = actorIdentity(auth.profile);
    const normalizedItems = items.map((item: any) => ({
      itemId: item?.itemId ? String(item.itemId) : null,
      productId: item?.productId ? String(item.productId) : null,
      quantity: Number(item?.quantity),
      unitPrice: Number(item?.unitPrice),
      vatRate: Number(item?.vatRate || 0),
      note: String(item?.note || "").trim(),
    }));
    if (normalizedItems.some((item: { quantity: number; unitPrice: number; vatRate: number }) => !Number.isFinite(item.quantity) || item.quantity <= 0 || !Number.isFinite(item.unitPrice) || item.unitPrice < 0 || ![0, 5, 8].includes(item.vatRate))) {
      return json({ ok: false, error: "Số lượng, đơn giá hoặc VAT không hợp lệ" }, 400);
    }
    const { data, error } = await supabase.rpc("adjust_completed_invoice", {
      p_order_id: orderId,
      p_expected_revision: expectedRevision,
      p_items: normalizedItems,
      p_discount_amount: Math.max(0, Number(body?.discountAmount) || 0),
      p_shipping_amount: Math.max(0, Number(body?.shippingAmount) || 0),
      p_note: String(body?.note || ""),
      p_reason: reason,
      p_actor_id: actor.id,
      p_actor_name: actor.name,
      p_actor_role: actor.role,
      p_actor_department_id: actor.departmentId,
    });
    if (error) return json({ ok: false, error: error.message }, /tải lại dữ liệu/i.test(error.message) ? 409 : 400);

    let document = null;
    let warning = null;
    try {
      document = await generateInvoiceRevisionDocument(orderId, actor.name);
    } catch (documentError) {
      warning = `Đã lưu điều chỉnh nhưng chưa tạo được PDF mới: ${documentError instanceof Error ? documentError.message : "Lỗi không xác định"}`;
    }
    return json({ ok: true, result: data, document, warning });
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : "Không chỉnh sửa được hóa đơn" }, 403);
  }
}
