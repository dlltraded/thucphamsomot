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

// Import bảng giá hàng loạt bằng Excel — khớp mục 14.2-3 KE_HOACH: file thật
// KiotViet (MauFileBangGia.xlsx) có cột Mã hàng/Tên hàng rồi N cột "Tên bảng
// giá X". Ở đây thay N bảng giá tùy ý bằng đúng các hạng khách hệ thống đang
// dùng (customer_tiers), cộng thêm Giá vốn + Giá nhập cuối cho khớp 3 cột
// KiotViet thật hay dùng để thu mua đối chiếu biến động giá nhà cung cấp.
export async function GET(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) return new NextResponse(auth.error, { status: 401, headers: corsHeaders });

  try {
    const supabase = getCustomerSupabaseAdmin();
    const { data: tiers } = await supabase.from("customer_tiers").select("code, name").order("code");
    const tierList = tiers && tiers.length ? tiers : [{ code: "VIP0", name: "VIP0" }, { code: "VIP1", name: "VIP1" }, { code: "VIP2", name: "VIP2" }, { code: "VIP3", name: "VIP3" }];

    const header = ["Mã hàng", "Tên hàng", "Giá vốn", "Giá nhập cuối", ...tierList.map((t) => `Giá ${t.code}`)];
    const exampleRow = [
      "VD: k-cafearabica250",
      "(chỉ để đối chiếu, không dùng để khớp)",
      100000,
      105000,
      ...tierList.map(() => 120000),
    ];
    const noteRow = [
      "Cột 'Mã hàng' bắt buộc, dùng để khớp sản phẩm — các cột khác để trống nếu không muốn cập nhật.",
      "Nếu dùng chế độ '% từ giá vốn' khi tải lên, các cột Giá VIPx nhập số % (VD 20 = giá vốn +20%) thay vì số tiền.",
      "",
      "",
      ...tierList.map(() => ""),
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([header, exampleRow, noteRow]);
    ws["!cols"] = [{ wch: 24 }, { wch: 30 }, { wch: 12 }, { wch: 14 }, ...tierList.map(() => ({ wch: 12 }))];
    XLSX.utils.book_append_sheet(wb, ws, "BangGia");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="mau-bang-gia.xlsx"',
      },
    });
  } catch (error) {
    console.error("GET /api/admin/products/import-pricebook lỗi:", error);
    return json({ ok: false, error: "Không tạo được file mẫu" }, 500);
  }
}

interface RowResult {
  row: number;
  sku: string;
  status: "ok" | "not_found" | "no_changes";
  productName?: string;
  updatedFields?: string[];
}

// mode = 'amount': cột Giá VIPx là số tiền trực tiếp.
// mode = 'markup_percent': cột Giá VIPx là % cộng thêm trên Giá vốn hiện có
// của sản phẩm (đúng "option sử dụng công thức nhập % ra giá bán" trong brief).
export async function POST(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) return json({ ok: false, error: auth.error }, 401);
  if (!CAN_EDIT_ROLES.has(auth.profile?.role || "")) {
    return json({ ok: false, error: "Chỉ Quản trị viên hoặc Thu mua được nhập bảng giá hàng loạt" }, 403);
  }

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  const apply = formData?.get("apply") === "1";
  const mode = formData?.get("mode") === "markup_percent" ? "markup_percent" : "amount";
  if (!(file instanceof File)) return json({ ok: false, error: "Thiếu file Excel" }, 400);

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: "buffer" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
    if (rows.length === 0) return json({ ok: false, error: "File không có dữ liệu" }, 400);
    if (rows.length > 3000) return json({ ok: false, error: "File quá nhiều dòng (tối đa 3000/lần)" }, 400);

    const supabase = getCustomerSupabaseAdmin();
    const { data: tiers } = await supabase.from("customer_tiers").select("code").order("code");
    const tierCodes = (tiers && tiers.length ? tiers : [{ code: "VIP0" }, { code: "VIP1" }, { code: "VIP2" }, { code: "VIP3" }]).map((t) => t.code);
    const tierHeaders = tierCodes.map((code) => `Giá ${code}`);

    const skus = rows.map((r) => String(r["Mã hàng"] ?? r["SKU"] ?? "").trim()).filter(Boolean);
    const { data: products, error: productError } = await supabase
      .from("products")
      .select("id, sku, name, cost_price")
      .in("sku", skus);
    if (productError) throw productError;
    const bySku = new Map((products || []).map((p) => [String(p.sku).toLowerCase(), p]));

    const results: RowResult[] = [];
    const tierUpserts: { product_id: string; tier: string; price: number }[] = [];
    const productUpdates: { id: string; cost_price?: number; last_import_price?: number }[] = [];

    rows.forEach((r, idx) => {
      const rowNum = idx + 2;
      const skuRaw = String(r["Mã hàng"] ?? r["SKU"] ?? "").trim();
      if (!skuRaw || /^vd:/i.test(skuRaw)) return; // dòng trống hoặc dòng ví dụ mẫu, bỏ qua âm thầm

      const product = bySku.get(skuRaw.toLowerCase());
      if (!product) {
        results.push({ row: rowNum, sku: skuRaw, status: "not_found" });
        return;
      }

      const updatedFields: string[] = [];
      const costPriceRaw = r["Giá vốn"];
      const lastImportRaw = r["Giá nhập cuối"];
      const productUpdate: { id: string; cost_price?: number; last_import_price?: number } = { id: product.id };
      if (costPriceRaw !== null && costPriceRaw !== undefined && costPriceRaw !== "" && Number.isFinite(Number(costPriceRaw))) {
        productUpdate.cost_price = Number(costPriceRaw);
        updatedFields.push("Giá vốn");
      }
      if (lastImportRaw !== null && lastImportRaw !== undefined && lastImportRaw !== "" && Number.isFinite(Number(lastImportRaw))) {
        productUpdate.last_import_price = Number(lastImportRaw);
        updatedFields.push("Giá nhập cuối");
      }
      if (updatedFields.includes("Giá vốn") || updatedFields.includes("Giá nhập cuối")) {
        productUpdates.push(productUpdate);
      }

      const effectiveCostPrice = productUpdate.cost_price ?? Number(product.cost_price) ?? 0;
      tierCodes.forEach((tier, i) => {
        const cell = r[tierHeaders[i]];
        if (cell === null || cell === undefined || cell === "" || !Number.isFinite(Number(cell))) return;
        const cellNum = Number(cell);
        const price = mode === "markup_percent" ? Math.round(effectiveCostPrice * (1 + cellNum / 100)) : Math.round(cellNum);
        if (price < 0) return;
        tierUpserts.push({ product_id: product.id, tier, price });
        updatedFields.push(`Giá ${tier}`);
      });

      if (updatedFields.length === 0) {
        results.push({ row: rowNum, sku: skuRaw, status: "no_changes", productName: product.name });
        return;
      }
      results.push({ row: rowNum, sku: skuRaw, status: "ok", productName: product.name, updatedFields });
    });

    const summary = {
      total: results.length,
      ok: results.filter((r) => r.status === "ok").length,
      notFound: results.filter((r) => r.status === "not_found").length,
      noChanges: results.filter((r) => r.status === "no_changes").length,
      tierPriceUpdates: tierUpserts.length,
      productFieldUpdates: productUpdates.length,
    };

    if (apply) {
      if (tierUpserts.length) {
        const { error: upsertError } = await supabase
          .from("product_tier_prices")
          .upsert(tierUpserts, { onConflict: "product_id,tier" });
        if (upsertError) throw upsertError;
      }
      for (const update of productUpdates) {
        const { id, ...fields } = update;
        const { error: updateError } = await supabase.from("products").update(fields).eq("id", id);
        if (updateError) throw updateError;
      }
    }

    return json({
      ok: true,
      applied: apply,
      mode,
      summary,
      problems: results.filter((r) => r.status !== "ok").slice(0, 100),
    });
  } catch (error) {
    console.error("POST /api/admin/products/import-pricebook lỗi:", error);
    return json({ ok: false, error: "Không đọc/ghi được file. Kiểm tra đúng định dạng mẫu chưa." }, 500);
  }
}
