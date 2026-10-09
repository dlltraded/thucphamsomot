import * as XLSX from 'xlsx';
import type { ExtractedOrderLine } from './types';

export function extractOrderLinesFromExcel(bytes: Buffer, fileName: string): ExtractedOrderLine[] {
  const wb = XLSX.read(bytes, { type: 'buffer' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
  if (rows.length > 300) throw new Error('File Excel có quá 300 dòng hàng');
  return rows.map((row, index) => {
    const name = String(row['Tên hoặc Mã hàng'] ?? row['Tên hàng'] ?? row['Sản phẩm'] ?? row['Tên SP'] ?? '').trim();
    const sku = String(row['Mã hàng'] ?? row['SKU'] ?? '').trim();
    return {
      sourceFile: fileName,
      sourceRow: index + 2,
      rawText: [sku, name].filter(Boolean).join(' - '),
      sku: sku || null,
      name: name || sku,
      quantity: Number(row['Số lượng'] ?? row['SL'] ?? row['Quantity']),
      unit: String(row['Đơn vị'] ?? row['ĐVT'] ?? row['Unit'] ?? '').trim() || null,
      note: String(row['Ghi chú'] ?? row['Note'] ?? '').trim() || null,
      documentPrice: Number.isFinite(Number(row['Đơn giá'] ?? row['Giá'])) ? Number(row['Đơn giá'] ?? row['Giá']) : null,
      confidence: 1,
    } satisfies ExtractedOrderLine;
  }).filter((line) => line.name);
}
