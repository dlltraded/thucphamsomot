import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";

// Nhập hàng loạt giá cố định riêng theo hợp đồng cho 1 khách hàng bằng Excel
// (mục 23 kế hoạch, 14/09/2026) — thay vì thêm tay từng dòng qua prompt() ở
// CustomerDetailPage. Ca dùng chính: khách có hợp đồng chốt giá cố định
// nhiều mặt hàng cùng lúc (vd FORMUSA: thịt heo 100k/kg suốt 1 năm).
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

export async function GET(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) return new NextResponse(auth.error, { status: 401, headers: corsHeaders });

  const header = ["Mã hàng", "Tên hàng (chỉ để đối chiếu)", "Giá cố định", "Hết hạn (để trống = theo hạn hợp đồng)"];
  const exampleRow = ["VD: tuoi-thitheo", "Thịt heo tươi", 100000, ""];
  const noteRow = [
    "Cột 'Mã hàng' bắt buộc, dùng để khớp sản phẩm.",
    "Không dùng để khớp, chỉ để dễ đối chiếu khi điền file.",
    "Giá tuyệt đối (đồng), không phải %.",
    "Định dạng ngày YYYY-MM-DD, để trống nếu dùng chung hạn hợp đồng của khách.",
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([header, exampleRow, noteRow]);
  ws["!cols"] = [{ wch: 22 }, { wch: 30 }, { wch: 14 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, ws, "GiaCoDinh");
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="mau-gia-co-dinh-hop-dong.xlsx"',
    },
  });
}

interface RowResult {
  row: number;
  sku: string;
  status: "ok" | "not_found" | "invalid_price";
  productName?: string;
  price?: number;
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) return json({ ok: false, error: auth.error }, 401);

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  const customerId = String(formData?.get("customerId") || "").trim();
  const apply = formData?.get("apply") === "1";
  if (!(file instanceof File)) return json({ ok: false, error: "Thiếu file Excel" }, 400);
  if (!customerId) return json({ ok: false, error: "Thiếu mã khách hàng" }, 400);

  try {
    const supabase = getCustomerSupabaseAdmin();

    const { data: customer, error: customerError } = await supabase
      .from("vip_accounts")
      .select("id, tier_expiry_date")
      .eq("id", customerId)
      .single();
    if (customerError || !customer) return json({ ok: false, error: "Không tìm thấy khách hàng" }, 404);

    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
    if (rows.length === 0) return json({ ok: false, error: "File không có dữ liệu" }, 400);
    if (rows.length > 1000) return json({ ok: false, error: "File quá nhiều dòng (tối đa 1000/lần)" }, 400);

    const skus = rows
      .map((r) => String(r["Mã hàng"] ?? r["SKU"] ?? "").trim())
      .filter((s) => s && !/^vd:/i.test(s));
    const { data: products, error: productError } = await supabase
      .from("products")
      .select("id, sku, name")
      .in("sku", skus);
    if (productError) throw productError;
    const bySku = new Map((products || []).map((p) => [String(p.sku).toLowerCase(), p]));

    const results: RowResult[] = [];
    const items: { product_id: string; price: number; valid_until: string | null }[] = [];

    rows.forEach((r, idx) => {
      const rowNum = idx + 2;
      const skuRaw = String(r["Mã hàng"] ?? r["SKU"] ?? "").trim();
      if (!skuRaw || /^vd:/i.test(skuRaw)) return;

      const product = bySku.get(skuRaw.toLowerCase());
      if (!product) {
        results.push({ row: rowNum, sku: skuRaw, status: "not_found" });
        return;
      }

      const priceRaw = r["Giá cố định"];
      const price = Number(priceRaw);
      if (priceRaw === null || priceRaw === undefined || priceRaw === "" || !Number.isFinite(price) || price < 0) {
        results.push({ row: rowNum, sku: skuRaw, status: "invalid_price", productName: product.name });
        return;
      }

      const expiryRaw = r["Hết hạn (để trống = theo hạn hợp đồng)"];
      let validUntil: string | null = null;
      if (expiryRaw instanceof Date && !Number.isNaN(expiryRaw.getTime())) {
        validUntil = expiryRaw.toISOString().slice(0, 10);
      } else if (typeof expiryRaw === "string" && expiryRaw.trim()) {
        const parsed = new Date(expiryRaw.trim());
        if (!Number.isNaN(parsed.getTime())) validUntil = parsed.toISOString().slice(0, 10);
      }

      items.push({ product_id: product.id, price: Math.round(price), valid_until: validUntil ?? customer.tier_expiry_date ?? null });
      results.push({ row: rowNum, sku: skuRaw, status: "ok", productName: product.name, price: Math.round(price) });
    });

    const summary = {
      total: results.length,
      ok: results.filter((r) => r.status === "ok").length,
      notFound: results.filter((r) => r.status === "not_found").length,
      invalidPrice: results.filter((r) => r.status === "invalid_price").length,
    };

    if (apply && items.length) {
      const { error: rpcError } = await supabase.rpc("admin_bulk_set_contract_prices", {
        p_customer_id: customerId,
        p_items: items,
      });
      if (rpcError) throw rpcError;
    }

    return json({ ok: true, applied: apply, summary, problems: results.filter((r) => r.status !== "ok").slice(0, 100) });
  } catch (error) {
    console.error("POST /api/admin/customers/import-contract-prices lỗi:", error);
    return json({ ok: false, error: "Không đọc/ghi được file. Kiểm tra đúng định dạng mẫu chưa." }, 500);
  }
}
