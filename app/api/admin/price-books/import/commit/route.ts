import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";
import { ProductMatcher } from "@/lib/price-book-import/matcher";
import { generatePreview } from "@/lib/price-book-import/previewer";
import { detectSheetMapping } from "@/lib/price-book-import/detector";
import { computeFileChecksum } from "@/lib/price-book-import/inspector";
import { commitImportJob } from "@/lib/price-book-import/committer";
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
    const validOnly = formData.get("validOnly") !== "false";
    const allowZeroPrice = formData.get("allowZeroPrice") === "true";

    if (!file) {
      return NextResponse.json({ error: "Thiếu file Excel" }, { status: 400, headers: corsHeaders });
    }

    const fileName = file.name;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileChecksum = computeFileChecksum(buffer);

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

    // Full unpaginated preview for commit
    const fullPreview = generatePreview(sheet, mapping, matcher, 1, 100000);

    const commitResult = await commitImportJob(supabase, {
      fileName,
      fileChecksum,
      sheetName: targetSheetName,
      mapping,
      allRows: fullPreview.rows,
      stats: fullPreview.stats,
      importedBy: auth.profile?.name || auth.profile?.id || "admin",
      validOnly,
    });

    return NextResponse.json(
      {
        ok: true,
        ...commitResult,
      },
      { headers: corsHeaders }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Lỗi commit dữ liệu" }, { status: 500, headers: corsHeaders });
  }
}
