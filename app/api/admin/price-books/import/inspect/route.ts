import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { canForProfile } from "@/lib/permissions";
import { inspectWorkbookBuffer } from "@/lib/price-book-import/inspector";
import { detectSheetMapping } from "@/lib/price-book-import/detector";
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

    if (!file) {
      return NextResponse.json({ error: "Vui lòng chọn file Excel để tải lên" }, { status: 400, headers: corsHeaders });
    }
    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: "File Excel vượt quá giới hạn 15 MB" }, { status: 413, headers: corsHeaders });
    }

    const fileName = file.name;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const inspection = inspectWorkbookBuffer(buffer, fileName);

    // Read full workbook in memory to detect mappings for all sheets
    const wb = XLSX.read(buffer, { type: "buffer", dense: true });
    const detectedMappings: Record<string, any> = {};

    for (const sheetName of wb.SheetNames) {
      try {
        const sheet = wb.Sheets[sheetName];
        if (sheet) {
          detectedMappings[sheetName] = detectSheetMapping(sheet, sheetName);
        }
      } catch (err: any) {
        detectedMappings[sheetName] = { error: err.message };
      }
    }

    return NextResponse.json(
      {
        ok: true,
        inspection,
        detectedMappings,
      },
      { headers: corsHeaders }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Lỗi đọc file" }, { status: 500, headers: corsHeaders });
  }
}
