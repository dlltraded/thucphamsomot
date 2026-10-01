import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";
import { ProductMatcher } from "@/lib/price-book-import/matcher";
import { generatePreview } from "@/lib/price-book-import/previewer";
import { detectSheetMapping } from "@/lib/price-book-import/detector";
import { MappingConfig, SystemProductRef } from "@/lib/price-book-import/types";
import * as XLSX from "xlsx";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Token",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminAuth(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: 401, headers: corsHeaders });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const sheetName = formData.get("sheetName") as string | null;
    const mappingConfigRaw = formData.get("mappingConfig") as string | null;
    const page = parseInt((formData.get("page") as string) || "1", 10);
    const pageSize = parseInt((formData.get("pageSize") as string) || "50", 10);
    const allowZeroPrice = formData.get("allowZeroPrice") === "true";

    if (!file) {
      return NextResponse.json({ error: "Thiếu file Excel" }, { status: 400, headers: corsHeaders });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const wb = XLSX.read(buffer, { type: "buffer", dense: true });

    const targetSheetName = sheetName || wb.SheetNames[0];
    const sheet = wb.Sheets[targetSheetName];

    if (!sheet) {
      return NextResponse.json(
        { error: `Sheet "${targetSheetName}" không tồn tại trong file Excel` },
        { status: 400, headers: corsHeaders }
      );
    }

    let mapping: MappingConfig;
    if (mappingConfigRaw) {
      try {
        mapping = JSON.parse(mappingConfigRaw);
      } catch {
        return NextResponse.json({ error: "Cấu hình mappingConfig không hợp lệ" }, { status: 400, headers: corsHeaders });
      }
    } else {
      mapping = detectSheetMapping(sheet, targetSheetName);
    }

    mapping.allowZeroPrice = allowZeroPrice;

    // Load products from DB for matching
    const supabase = getCustomerSupabaseAdmin();
    const allProducts: SystemProductRef[] = [];
    let from = 0;
    const step = 1000;

    while (true) {
      const { data, error } = await supabase
        .from("products")
        .select("id, sku, name, unit, category")
        .range(from, from + step - 1);

      if (error) throw error;
      if (!data || data.length === 0) break;
      allProducts.push(...data);
      if (data.length < step) break;
      from += step;
    }

    const matcher = new ProductMatcher(allProducts);
    // Tính đối chiếu trên toàn bộ file để thẻ tổng hợp không chỉ phản ánh trang đầu.
    const fullPreview = generatePreview(sheet, mapping, matcher, 1, 100000);

    // Đối chiếu từng giá mới với đúng phiên bản đang áp dụng của cùng bảng giá.
    const comparison = { increased: 0, decreased: 0, unchanged: 0, newPrices: 0, missingPrices: 0 };
    for (const pbMap of mapping.priceBooks) {
      const baseCode = pbMap.code.replace(/_v\d+$/, "");
      const { data: activeBooks } = await supabase
        .from("price_books")
        .select("id, code, name, version, valid_from")
        .like("code", `${baseCode}%`)
        .eq("status", "active")
        .order("version", { ascending: false })
        .limit(1);

      const activeBook = activeBooks?.[0] || null;
      const currentPrices = new Map<string, number>();
      if (activeBook) {
        const { data: activeItems, error: activeItemsError } = await supabase
          .from("price_book_items")
          .select("product_id, price")
          .eq("price_book_id", activeBook.id);
        if (activeItemsError) throw activeItemsError;
        for (const item of activeItems || []) currentPrices.set(item.product_id, Number(item.price));
      }

      for (const row of fullPreview.rows) {
        const next = row.prices[pbMap.key];
        if (!next) continue;
        const productId = row.matchResult.product?.id;
        const previous = productId ? currentPrices.get(productId) : undefined;
        next.previousPrice = previous ?? null;

        if (next.finalPrice == null) {
          next.comparisonStatus = 'missing';
          comparison.missingPrices++;
          continue;
        }
        if (previous == null) {
          next.comparisonStatus = 'new';
          next.differenceAmount = next.finalPrice;
          next.differencePercent = null;
          comparison.newPrices++;
          continue;
        }

        const difference = next.finalPrice - previous;
        next.differenceAmount = difference;
        next.differencePercent = previous === 0 ? null : (difference / previous) * 100;
        if (difference > 0) {
          next.comparisonStatus = 'increase';
          comparison.increased++;
        } else if (difference < 0) {
          next.comparisonStatus = 'decrease';
          comparison.decreased++;
        } else {
          next.comparisonStatus = 'unchanged';
          comparison.unchanged++;
        }
      }
    }
    const safePage = Math.max(1, page);
    const safePageSize = Math.max(1, pageSize);
    const totalCount = fullPreview.rows.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / safePageSize));
    const offset = (safePage - 1) * safePageSize;
    const preview = {
      ...fullPreview,
      rows: fullPreview.rows.slice(offset, offset + safePageSize),
      pagination: { page: safePage, pageSize: safePageSize, totalPages, totalCount },
      comparison,
    };

    return NextResponse.json(
      {
        ok: true,
        sheetName: targetSheetName,
        mapping,
        preview,
      },
      { headers: corsHeaders }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Lỗi tạo preview" }, { status: 500, headers: corsHeaders });
  }
}
