import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: corsHeaders });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

const CAN_EDIT_ROLES = new Set(["admin", "thu_mua"]);

// Tải file mẫu Excel (2 cột bắt buộc + 1 cột ghi chú tùy chọn) để phòng thu
// mua điền theo mỗi khi nhập hàng thật về kho.
export async function GET(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) return new NextResponse(auth.error, { status: 401, headers: corsHeaders });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ["Mã hàng", "Số lượng nhập", "Ghi chú"],
    ["VD: k-cafearabica250", 20, "Nhập từ NCC ABC, phiếu #123"],
  ]);
  ws["!cols"] = [{ wch: 24 }, { wch: 14 }, { wch: 36 }];
  XLSX.utils.book_append_sheet(wb, ws, "Nhap kho");
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="mau-nhap-kho.xlsx"',
    },
  });
}

interface RowResult {
  row: number;
  sku: string;
  quantity: number;
  status: "ok" | "not_found" | "not_tracked" | "invalid_quantity";
  productName?: string;
}

// Đọc file Excel nhập kho: cột "Mã hàng" + "Số lượng nhập" (+ "Ghi chú" tùy
// chọn). Luôn khớp + kiểm tra trước; chỉ ghi thật vào inventory_transactions
// khi form gửi kèm apply=1 (giống nguyên tắc dry-run của
// scripts/sync-kiotviet-products.mjs — không ghi nhầm hàng loạt).
export async function POST(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) return json({ ok: false, error: auth.error }, 401);
  if (!CAN_EDIT_ROLES.has(auth.profile?.role || "")) {
    return json({ ok: false, error: "Chỉ Quản trị viên hoặc Thu mua được nhập kho hàng loạt" }, 403);
  }

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  const apply = formData?.get("apply") === "1";
  if (!(file instanceof File)) return json({ ok: false, error: "Thiếu file Excel" }, 400);

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: "buffer" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });

    if (rows.length === 0) return json({ ok: false, error: "File không có dữ liệu" }, 400);
    if (rows.length > 2000) return json({ ok: false, error: "File quá nhiều dòng (tối đa 2000/lần)" }, 400);

    const skus = rows
      .map((r) => String(r["Mã hàng"] ?? r["SKU"] ?? r["Mã hàng "] ?? "").trim())
      .filter(Boolean);

    const supabase = getCustomerSupabaseAdmin();
    const { data: products, error: productError } = await supabase
      .from("products")
      .select("id, sku, name, track_inventory")
      .in("sku", skus);
    if (productError) throw productError;

    const bySku = new Map((products || []).map((p) => [String(p.sku).toLowerCase(), p]));

    const results: RowResult[] = [];
    const toInsert: { product_id: string; type: "in"; quantity: number; note: string; created_by: string | null }[] = [];
    const noteTag = `Nhập kho từ file "${file.name}" (${new Date().toLocaleDateString("vi-VN")})`;
    const createdBy = auth.profile?.id !== "legacy-admin" ? auth.profile?.id ?? null : null;

    rows.forEach((r, idx) => {
      const skuRaw = String(r["Mã hàng"] ?? r["SKU"] ?? r["Mã hàng "] ?? "").trim();
      const qtyRaw = r["Số lượng nhập"] ?? r["Số lượng"] ?? r["Quantity"];
      const noteRaw = r["Ghi chú"] ?? r["Note"] ?? "";
      const rowNum = idx + 2; // dòng 1 là header

      if (!skuRaw) return; // dòng trống, bỏ qua âm thầm
      const quantity = Number(qtyRaw);
      const product = bySku.get(skuRaw.toLowerCase());

      if (!product) {
        results.push({ row: rowNum, sku: skuRaw, quantity, status: "not_found" });
        return;
      }
      if (!Number.isFinite(quantity) || quantity <= 0) {
        results.push({ row: rowNum, sku: skuRaw, quantity, status: "invalid_quantity", productName: product.name });
        return;
      }
      if (!product.track_inventory) {
        results.push({ row: rowNum, sku: skuRaw, quantity, status: "not_tracked", productName: product.name });
        return;
      }

      results.push({ row: rowNum, sku: skuRaw, quantity, status: "ok", productName: product.name });
      toInsert.push({
        product_id: product.id,
        type: "in",
        quantity,
        note: noteRaw ? `${noteTag} — ${noteRaw}` : noteTag,
        created_by: createdBy,
      });
    });

    const summary = {
      total: results.length,
      ok: results.filter((r) => r.status === "ok").length,
      notFound: results.filter((r) => r.status === "not_found").length,
      notTracked: results.filter((r) => r.status === "not_tracked").length,
      invalidQuantity: results.filter((r) => r.status === "invalid_quantity").length,
    };

    if (apply && toInsert.length) {
      const { error: insertError } = await supabase.from("inventory_transactions").insert(toInsert);
      if (insertError) throw insertError;
    }

    return json({
      ok: true,
      applied: apply,
      summary,
      // Chỉ trả về các dòng có vấn đề để hiển thị — dòng "ok" quá nhiều
      // (có thể hàng ngàn) không cần liệt kê hết.
      problems: results.filter((r) => r.status !== "ok").slice(0, 100),
    });
  } catch (error) {
    console.error("POST /api/admin/products/import-inventory lỗi:", error);
    return json({ ok: false, error: "Không đọc/ghi được file. Kiểm tra đúng định dạng mẫu chưa." }, 500);
  }
}
