import crypto from 'crypto';
import * as XLSX from 'xlsx';
import { SheetInspection, WorkbookInspectionResult } from './types';

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB limit

export function computeFileChecksum(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export function inspectWorkbookBuffer(
  buffer: Buffer,
  fileName: string
): WorkbookInspectionResult {
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(`Dung lượng file vượt quá giới hạn cho phép (${(MAX_FILE_SIZE / (1024 * 1024)).toFixed(0)}MB).`);
  }

  const checksum = computeFileChecksum(buffer);

  // Read workbook structure with limited rows per sheet for fast inspection
  const wb = XLSX.read(buffer, { type: 'buffer', dense: true, sheetRows: 20 });
  if (!wb.SheetNames || wb.SheetNames.length === 0) {
    throw new Error('File Excel không có bất kỳ sheet nào hợp lệ.');
  }

  const sheets: SheetInspection[] = [];
  let detectedType: 'standard_template' | 'multi_level_kitchen' | 'unknown' = 'unknown';

  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name];
    if (!sheet) continue;

    const rows: Array<Array<string | number | null>> = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      blankrows: false,
      defval: null,
    });

    const rowCount = rows.length;
    let colCount = 0;
    rows.forEach(r => {
      if (Array.isArray(r) && r.length > colCount) colCount = r.length;
    });

    sheets.push({
      name,
      rowCount,
      colCount,
      previewRows: rows.slice(0, 10),
    });

    // Heuristics for type detection:
    // Multi-level kitchen: usually has subheaders like "GIÁ" and "C.KHẤU" in row 2 or 3, or colCount > 15
    if (detectedType === 'unknown' && rows.length >= 3) {
      const row2Text = (rows[1] || []).map(c => String(c || '').toLowerCase()).join(' ');
      const row3Text = (rows[2] || []).map(c => String(c || '').toLowerCase()).join(' ');
      if (
        (row2Text.includes('giá') || row3Text.includes('giá')) &&
        (row2Text.includes('khấu') || row3Text.includes('khấu'))
      ) {
        detectedType = 'multi_level_kitchen';
      } else if (
        row2Text.includes('mã hàng') ||
        (rows[0] && rows[0].some(c => String(c || '').toLowerCase().includes('mã hàng')))
      ) {
        detectedType = 'standard_template';
      }
    }
  }

  if (detectedType === 'unknown' && sheets.some(s => s.colCount > 10)) {
    detectedType = 'multi_level_kitchen';
  } else if (detectedType === 'unknown') {
    detectedType = 'standard_template';
  }

  return {
    fileName,
    fileSize: buffer.length,
    checksum,
    sheets,
    detectedType,
  };
}
