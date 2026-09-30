import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { canForProfile } from "@/lib/permissions";
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
    if (!canForProfile(auth.profile, "pricing.edit")) {
      return NextResponse.json({ error: "Bạn không có quyền nhập bảng giá" }, { status: 403, headers: corsHeaders });
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
    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: "File Excel vượt quá giới hạn 15 MB" }, { status: 413, headers: corsHeaders });
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
    const preview = generatePreview(sheet, mapping, matcher, page, pageSize);

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
