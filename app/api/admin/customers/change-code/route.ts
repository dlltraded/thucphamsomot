import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
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

function removeAccents(str: string): string {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) return json({ ok: false, error: auth.error }, 401);

  // Chỉ admin hoặc truong_phong mới có quyền đổi mã khách hàng
  const role = auth.profile?.role || "";
  if (!["admin", "truong_phong"].includes(role)) {
    return json({ ok: false, error: "Chỉ Trưởng phòng hoặc Admin mới được đổi mã khách hàng" }, 403);
  }

  const body = await req.json().catch(() => null);
  const customerId = String(body?.customerId || "").trim();
  const rawCode = String(body?.newCode || "").trim();

  if (!customerId || !rawCode) {
    return json({ ok: false, error: "Thiếu customerId hoặc newCode" }, 400);
  }

  // Chuẩn hóa: HOA, bỏ dấu tiếng Việt, loại bỏ ký tự lạ
  let normalizedCode = removeAccents(rawCode).toUpperCase().replace(/\s+/g, "");
  if (!normalizedCode.startsWith("TPS1-")) {
    normalizedCode = "TPS1-" + normalizedCode.replace(/^TPS1/i, "").replace(/^-+/, "");
  }

  // Kiểm tra định dạng: ^TPS1-[A-Z0-9]{2,16}$
  const codeRegex = /^TPS1-[A-Z0-9]{2,16}$/;
  if (!codeRegex.test(normalizedCode)) {
    return json(
      {
        ok: false,
        error: `Mã không hợp lệ ("${normalizedCode}"). Mã phải có dạng TPS1-<VIẾTTẮT> (từ 2 đến 16 ký tự chữ số A-Z/0-9 sau tiền tố TPS1-)`,
      },
      400
    );
  }

  const supabase = getCustomerSupabaseAdmin();

  // Kiểm tra khách hàng tồn tại
  const { data: customer, error: custErr } = await supabase
    .from("vip_accounts")
    .select("id, partner_code, name")
    .eq("id", customerId)
    .maybeSingle();

  if (custErr || !customer) {
    return json({ ok: false, error: "Không tìm thấy khách hàng" }, 404);
  }

  const oldCode = customer.partner_code;
  if (oldCode?.toUpperCase() === normalizedCode.toUpperCase()) {
    return json({ ok: true, message: "Mã không thay đổi", oldCode, newCode: normalizedCode });
  }

  // Kiểm tra tính duy nhất (case-insensitive)
  const { data: existing } = await supabase
    .from("vip_accounts")
    .select("id, name")
    .ilike("partner_code", normalizedCode)
    .neq("id", customerId)
    .maybeSingle();

  if (existing) {
    return json(
      {
        ok: false,
        error: `Mã "${normalizedCode}" đã được sử dụng cho khách hàng "${existing.name}". Vui lòng chọn mã khác.`,
      },
      409
    );
  }

  try {
    const { error: updateErr } = await supabase
      .from("vip_accounts")
      .update({
        partner_code: normalizedCode,
        updated_at: new Date().toISOString(),
      })
      .eq("id", customerId);

    if (updateErr) throw updateErr;

    console.log(
      `[CHANGE_CODE] ${auth.profile?.name} (${role}) đã đổi mã khách hàng "${customer.name}" (${customerId}) từ "${oldCode}" thành "${normalizedCode}"`
    );

    return json({
      ok: true,
      customerId,
      oldCode,
      newCode: normalizedCode,
    });
  } catch (err: any) {
    console.error("POST /api/admin/customers/change-code error:", err);
    return json({ ok: false, error: err.message || "Lỗi cập nhật mã đối tác" }, 500);
  }
}
