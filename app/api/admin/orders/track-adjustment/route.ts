import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { can } from "@/lib/permissions";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: corsHeaders });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export interface ItemChange {
  type: "qty" | "removed" | "added" | "replaced";
  productName: string;
  orderedQty?: number | null;
  oldQty?: number;
  newQty?: number;
  reason?: string;
  agreedWithCustomer?: boolean;
}

// WP6: Ghi nhận truy vết điều chỉnh mặt hàng/số lượng khi nhân viên xử lý/sửa đơn
export async function POST(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) return json({ ok: false, error: auth.error }, 401);
  if (!can(auth.profile?.role, "orders.edit")) {
    return json({ ok: false, error: "Bạn không có quyền sửa đơn hàng" }, 403);
  }

  const body = await req.json().catch(() => null);
  const orderId = String(body?.orderId || "").trim();
  const itemChanges: ItemChange[] = Array.isArray(body?.itemChanges) ? body.itemChanges : [];
  const note = String(body?.note || "").trim();
  const actor = String(auth.profile?.name || auth.profile?.email || "Nhân viên Vận hành").trim();

  if (!orderId) {
    return json({ ok: false, error: "Thiếu mã đơn hàng" }, 400);
  }
  if (itemChanges.length === 0) {
    return json({ ok: true, message: "Không có thay đổi nào cần ghi vết" });
  }

  try {
    const supabase = getCustomerSupabaseAdmin();

    const changeSummary = itemChanges
      .map((c) => {
        if (c.type === "qty") return `${c.productName}: ${c.oldQty} -> ${c.newQty} (${c.reason || "chỉnh SL"})`;
        if (c.type === "removed") return `Xóa ${c.productName} (SL cũ: ${c.oldQty}, lý do: ${c.reason || "xóa"})`;
        if (c.type === "added") return `Thêm ${c.productName} (SL: ${c.newQty}, lý do: ${c.reason || "thêm mới"})`;
        if (c.type === "replaced") return `Thay ${c.productName} (SL: ${c.newQty}, lý do: ${c.reason || "thay thế"})`;
        return `${c.productName}`;
      })
      .join("; ");

    const finalNote = note ? `${note}. ${changeSummary}` : `Điều chỉnh mặt hàng: ${changeSummary}`;

    const { error: insertError } = await supabase.from("order_history").insert({
      order_id: orderId,
      action: "items_changed",
      actor,
      note: finalNote.slice(0, 500),
      payload: {
        itemChanges,
        changedAt: new Date().toISOString(),
        actorId: auth.profile?.id || null,
      },
    });

    if (insertError) {
      console.error("Ghi order_history items_changed lỗi:", insertError);
      return json({ ok: false, error: "Lỗi ghi nhận lịch sử điều chỉnh: " + insertError.message }, 500);
    }

    return json({ ok: true, changeCount: itemChanges.length });
  } catch (err: any) {
    console.error("Lỗi track-adjustment:", err);
    return json({ ok: false, error: err.message || "Không ghi được vết điều chỉnh" }, 500);
  }
}
