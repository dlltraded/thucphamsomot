import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { can } from "@/lib/permissions";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";
import { invalidateAdminCatalogCache } from "@/app/api/admin/products/route";
import { invalidateCustomerCatalogCache } from "@/app/api/customer/products/route";

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

// 1. Tải file mẫu Excel quy cách hàng hóa (G1 — Mục 3.4)
export async function GET(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) return new NextResponse(auth.error, { status: 401, headers: corsHeaders });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ["Mã hàng", "Tên hàng (đối chiếu)", "Quy cách đóng gói", "Số lượng tối thiểu", "Bước đặt hàng", "Bật kiểm tra"],
    ["SP-RAU-CAI-THIA", "Cải thìa sạch Đà Lạt", "Bịch 0,5kg", 0.5, 0.5, "CÓ"],
    ["SP-TRUNG-GA-30", "Trứng gà ta chọn lọc", "Khay 30 quả", 1, 1, "CÓ"],
    ["SP-HANH-LA", "Hành lá tươi", "Bó 1kg", 1, 1, "KHÔNG"],
  ]);
  ws["!cols"] = [
    { wch: 22 }, // Mã hàng
    { wch: 32 }, // Tên hàng (đối chiếu)
    { wch: 25 }, // Quy cách đóng gói
    { wch: 18 }, // Số lượng tối thiểu
    { wch: 18 }, // Bước đặt hàng
    { wch: 15 }, // Bật kiểm tra
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Quy cach hang hoa");
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="mau-quy-cach-hang-hoa.xlsx"',
    },
  });
}

export interface SpecRowResult {
  row: number;
  sku: string;
  name?: string;
  packagingNote: string | null;
  minOrderQty: number;
  orderStep: number;
  enforceOrderStep: boolean;
  status: "valid" | "not_found" | "duplicate_sku" | "invalid_data";
  reason?: string;
}

function parseBool(val: unknown): boolean {
  if (val == null) return false;
  const s = String(val).trim().toLowerCase();
  return ["có", "co", "true", "1", "yes", "bật", "bat", "x"].includes(s);
}

// 2. Upload file Excel quy cách (2 bước: Preview & Xác nhận commit)
export async function POST(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) return json({ ok: false, error: auth.error }, 401);
  if (!can(auth.profile?.role, "products.edit")) {
    return json({ ok: false, error: "Chỉ Quản trị viên, Thu mua hoặc Kế toán được thiết lập quy cách hàng hóa" }, 403);
  }

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  const apply = formData?.get("apply") === "1";
  if (!(file instanceof File)) return json({ ok: false, error: "Vui lòng chọn file Excel quy cách (.xlsx)" }, 400);

  // Giới hạn kích thước file 5MB
  if (file.size > 5 * 1024 * 1024) {
    return json({ ok: false, error: "Kích thước file không được vượt quá 5MB" }, 400);
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: "buffer" });
    const firstSheetName = wb.SheetNames[0];
    if (!firstSheetName) return json({ ok: false, error: "File Excel không có trang tính nào" }, 400);

    const sheet = wb.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });

    if (rows.length === 0) return json({ ok: false, error: "File Excel không có dữ liệu hàng hóa" }, 400);
    if (rows.length > 2000) return json({ ok: false, error: "Số dòng vượt quá giới hạn (tối đa 2.000 dòng mỗi lần nhập)" }, 400);

    // Thu thập danh sách SKU từ file
    const rawSkus: string[] = [];
    const skuOccurrence = new Map<string, number>();

    rows.forEach((r) => {
      const sku = String(r["Mã hàng"] ?? r["SKU"] ?? r["Mã sản phẩm"] ?? r["Mã SP"] ?? "").trim();
      if (sku) {
        rawSkus.push(sku);
        const lower = sku.toLowerCase();
        skuOccurrence.set(lower, (skuOccurrence.get(lower) || 0) + 1);
      }
    });

    const supabase = getCustomerSupabaseAdmin();
    const uniqueSkus = Array.from(new Set(rawSkus));

    // Truy vấn sản phẩm theo SKU chính xác
    const { data: dbProducts, error: dbError } = await supabase
      .from("products")
      .select("id, sku, name, unit, packaging_note, min_order_qty, order_step, enforce_order_step")
      .in("sku", uniqueSkus);

    if (dbError) throw dbError;

    const productBySku = new Map<string, any>();
    for (const p of dbProducts || []) {
      if (p.sku) productBySku.set(String(p.sku).trim().toLowerCase(), p);
    }

    const seenSkusInFile = new Set<string>();
    const results: SpecRowResult[] = [];
    const validRowsToCommit: Array<{
      id: string;
      sku: string;
      row: number;
      packaging_note: string | null;
      min_order_qty: number;
      order_step: number;
      enforce_order_step: boolean;
    }> = [];

    rows.forEach((r, idx) => {
      const rowNum = idx + 2; // Dòng 1 là tiêu đề
      const skuRaw = String(r["Mã hàng"] ?? r["SKU"] ?? r["Mã sản phẩm"] ?? r["Mã SP"] ?? "").trim();
      if (!skuRaw) return; // Bỏ qua dòng trống

      const skuKey = skuRaw.toLowerCase();
      const product = productBySku.get(skuKey);

      // 1. Kiểm tra trùng SKU trong chính file import
      if (seenSkusInFile.has(skuKey)) {
        results.push({
          row: rowNum,
          sku: skuRaw,
          name: product?.name || String(r["Tên hàng (đối chiếu)"] || r["Tên hàng"] || ""),
          packagingNote: null,
          minOrderQty: 1,
          orderStep: 1,
          enforceOrderStep: false,
          status: "duplicate_sku",
          reason: "Mã hàng bị lặp lại nhiều lần trong file",
        });
        return;
      }
      seenSkusInFile.add(skuKey);

      // 2. Kiểm tra SKU tồn tại trong hệ thống
      if (!product) {
        results.push({
          row: rowNum,
          sku: skuRaw,
          name: String(r["Tên hàng (đối chiếu)"] ?? r["Tên hàng"] ?? "").trim() || undefined,
          packagingNote: null,
          minOrderQty: 1,
          orderStep: 1,
          enforceOrderStep: false,
          status: "not_found",
          reason: "Không tìm thấy mã hàng trong cơ sở dữ liệu",
        });
        return;
      }

      // 3. Phân tích và kiểm tra tính hợp lệ của dữ liệu
      const packagingRaw = r["Quy cách đóng gói"] ?? r["Quy cách"] ?? r["Packaging"] ?? "";
      const packagingNote = packagingRaw ? String(packagingRaw).trim() : null;

      const minQtyRaw = r["Số lượng tối thiểu"] ?? r["Tối thiểu"] ?? r["Min"] ?? product.min_order_qty ?? 1;
      const stepRaw = r["Bước đặt hàng"] ?? r["Bước nhảy"] ?? r["Step"] ?? product.order_step ?? 1;
      const enforceRaw = r["Bật kiểm tra"] ?? r["Kiểm tra"] ?? r["Enforce"] ?? product.enforce_order_step ?? false;

      const minOrderQty = Number(minQtyRaw);
      const orderStep = Number(stepRaw);
      const enforceOrderStep = parseBool(enforceRaw);

      // Kiểm tra quy tắc validation
      let invalidReason: string | null = null;

      if (packagingNote && packagingNote.length > 120) {
        invalidReason = "Quy cách đóng gói vượt quá 120 ký tự";
      } else if (!Number.isFinite(minOrderQty) || minOrderQty < 0) {
        invalidReason = "Số lượng tối thiểu không hợp lệ hoặc bị âm";
      } else if (Math.round(minOrderQty * 1000) !== minOrderQty * 1000) {
        invalidReason = "Số lượng tối thiểu chỉ cho phép tối đa 3 chữ số thập phân";
      } else if (!Number.isFinite(orderStep) || orderStep < 0) {
        invalidReason = "Bước đặt hàng không hợp lệ hoặc bị âm";
      } else if (Math.round(orderStep * 1000) !== orderStep * 1000) {
        invalidReason = "Bước đặt hàng chỉ cho phép tối đa 3 chữ số thập phân";
      } else if (enforceOrderStep && (minOrderQty <= 0 || orderStep <= 0)) {
        invalidReason = "Khi bật kiểm tra quy cách, số lượng tối thiểu và bước nhảy phải lớn hơn 0";
      }

      if (invalidReason) {
        results.push({
          row: rowNum,
          sku: skuRaw,
          name: product.name,
          packagingNote,
          minOrderQty: Number.isFinite(minOrderQty) ? minOrderQty : 1,
          orderStep: Number.isFinite(orderStep) ? orderStep : 1,
          enforceOrderStep,
          status: "invalid_data",
          reason: invalidReason,
        });
        return;
      }

      // Hợp lệ
      results.push({
        row: rowNum,
        sku: skuRaw,
        name: product.name,
        packagingNote,
        minOrderQty,
        orderStep,
        enforceOrderStep,
        status: "valid",
      });

      validRowsToCommit.push({
        id: product.id,
        sku: skuRaw,
        row: rowNum,
        packaging_note: packagingNote,
        min_order_qty: minOrderQty,
        order_step: orderStep,
        enforce_order_step: enforceOrderStep,
      });
    });

    const summary = {
      total: results.length,
      valid: results.filter((r) => r.status === "valid").length,
      notFound: results.filter((r) => r.status === "not_found").length,
      duplicateSku: results.filter((r) => r.status === "duplicate_sku").length,
      invalidData: results.filter((r) => r.status === "invalid_data").length,
    };

    const invalidRows = results.filter((r) => r.status !== "valid");
    const failedDetails: Array<{ row: number; sku: string; reason: string }> = invalidRows.map((r) => ({
      row: r.row,
      sku: r.sku,
      reason: r.reason || (r.status === "not_found" ? "SKU không tồn tại trong hệ thống" : r.status === "duplicate_sku" ? "Trùng SKU trong file" : "Dữ liệu không hợp lệ"),
    }));

    // Bước 1: Xem trước (Dry Run) — Không ghi gì vào cơ sở dữ liệu
    if (!apply) {
      return json({
        ok: true,
        dryRun: true,
        summary: {
          ...summary,
          failed: failedDetails.length,
        },
        preview: results,
        failedDetails,
      });
    }

    // Bước 2: Người dùng xác nhận lưu thật — Chỉ ghi các dòng hợp lệ
    if (validRowsToCommit.length === 0) {
      return json({
        ok: false,
        error: "Không có dòng dữ liệu hợp lệ nào để lưu",
        summary: {
          ...summary,
          applied: 0,
          failed: failedDetails.length,
        },
        failedDetails,
      }, 400);
    }

    // Thực hiện cập nhật từng sản phẩm hợp lệ và theo dõi chính xác từng dòng
    let appliedCount = 0;
    const commitErrors: Array<{ row: number; sku: string; reason: string }> = [];

    for (const item of validRowsToCommit) {
      const { error: updateError } = await supabase
        .from("products")
        .update({
          packaging_note: item.packaging_note,
          min_order_qty: item.min_order_qty,
          order_step: item.order_step,
          enforce_order_step: item.enforce_order_step,
        })
        .eq("id", item.id);

      if (updateError) {
        console.error(`Lỗi cập nhật quy cách sản phẩm ${item.sku} (${item.id}):`, updateError);
        commitErrors.push({
          row: item.row,
          sku: item.sku,
          reason: `Lỗi CSDL: ${updateError.message}`,
        });
      } else {
        appliedCount++;
      }
    }

    if (appliedCount > 0) {
      // Xóa cache catalog ngay sau khi ghi thành công ít nhất 1 dòng
      invalidateAdminCatalogCache();
      invalidateCustomerCatalogCache();
    }

    const allFailedDetails = [...failedDetails, ...commitErrors];
    const totalFailed = allFailedDetails.length;

    if (appliedCount === 0) {
      return json({
        ok: false,
        error: "Không có mã hàng nào được cập nhật thành công",
        summary: {
          ...summary,
          applied: 0,
          failed: totalFailed,
        },
        failedDetails: allFailedDetails,
      }, 400);
    }

    const isPartial = totalFailed > 0;
    const message = isPartial
      ? `Cập nhật một phần: Đã áp dụng thành công ${appliedCount} mã hàng, có ${totalFailed} mã hàng không thể cập nhật (xem chi tiết bên dưới).`
      : `Đã thiết lập quy cách thành công cho toàn bộ ${appliedCount} mã hàng.`;

    return json({
      ok: true,
      dryRun: false,
      partial: isPartial,
      summary: {
        ...summary,
        applied: appliedCount,
        failed: totalFailed,
      },
      message,
      failedDetails: allFailedDetails,
    });
  } catch (error) {
    console.error("POST /api/admin/products/import-specs error:", error);
    return json({
      ok: false,
      error: error instanceof Error ? error.message : "Không xử lý được file quy cách hàng hóa",
    }, 500);
  }
}
