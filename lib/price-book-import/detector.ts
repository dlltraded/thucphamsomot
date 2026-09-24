import * as XLSX from 'xlsx';
import { MappingConfig, PriceBookColumnMapping } from './types';

function cleanStr(val: any): string {
  if (val == null) return '';
  return String(val).trim().replace(/\s+/g, ' ');
}

function normalizeHeaderKey(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function extractGroupNames(header: string): string[] {
  // Headers in the KiotViet workbook can contain several groups separated by
  // commas/semicolons, followed by an annotation in parentheses.
  return header
    .replace(/\([^)]*\)/g, '')
    .split(/[,;|]/)
    .map((s) => s.trim().replace(/\s+/g, ' '))
    .filter(Boolean)
    .filter((s) => !/^(bbg|bảng giá|nhóm)\s*$/i.test(s));
}

export function detectSheetMapping(
  sheet: XLSX.WorkSheet,
  sheetName: string
): MappingConfig {
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    blankrows: false,
    defval: '',
  });

  if (rows.length === 0) {
    throw new Error(`Sheet "${sheetName}" không có dữ liệu.`);
  }

  // Scan top 10 rows to locate header row
  let headerRowIdx = -1;
  let subHeaderRowIdx: number | undefined = undefined;
  let skuColIdx = -1;
  let nameColIdx = -1;
  let unitColIdx = -1;
  let categoryColIdx = -1;

  for (let r = 0; r < Math.min(rows.length, 10); r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      const cell = cleanStr(row[c]).toLowerCase();
      if (cell === 'ma hang' || cell === 'mã hàng' || cell === 'mã tp' || cell === 'ma tp' || cell === 'sku') {
        headerRowIdx = r;
        skuColIdx = c;
      }
      if (cell.includes('tên hàng') || cell.includes('ten hang') || cell.includes('tên mặt hàng') || cell.includes('ten mat hang')) {
        nameColIdx = c;
      }
      if (cell === 'đvt' || cell === 'dvt' || cell.includes('đơn vị tính') || cell.includes('don vi tinh')) {
        unitColIdx = c;
      }
      if (cell.includes('nhóm hàng') || cell.includes('nhom hang')) {
        categoryColIdx = c;
      }
    }
    if (headerRowIdx !== -1 && nameColIdx !== -1) {
      break;
    }
  }

  // Fallback defaults if header not found
  if (headerRowIdx === -1) {
    headerRowIdx = 0;
    skuColIdx = 0;
    nameColIdx = 1;
    unitColIdx = 2;
  }

  // Check if there is a subheader row below headerRowIdx (e.g. GIÁ / C.KHẤU)
  const nextRow = rows[headerRowIdx + 1];
  let isMultiLevel = false;
  if (nextRow && Array.isArray(nextRow)) {
    const subText = nextRow.map(c => cleanStr(c).toLowerCase()).join(' ');
    if (subText.includes('giá') || subText.includes('gia') || subText.includes('khấu') || subText.includes('khau')) {
      subHeaderRowIdx = headerRowIdx + 1;
      isMultiLevel = true;
    }
  }

  const primaryHeader = rows[headerRowIdx] || [];
  const subHeader = subHeaderRowIdx !== undefined ? rows[subHeaderRowIdx] || [] : [];
  const priceBooks: PriceBookColumnMapping[] = [];

  if (isMultiLevel && subHeaderRowIdx !== undefined) {
    // Multi-level parsing: Columns grouped by Kitchen / Customer
    let currentKitchen = '';
    const maxCols = Math.max(primaryHeader.length, subHeader.length);

    for (let c = 0; c < maxCols; c++) {
      // Don't treat SKU, Name, Unit, Category columns as price books
      if (c === skuColIdx || c === nameColIdx || c === unitColIdx || c === categoryColIdx) {
        continue;
      }

      const topCell = cleanStr(primaryHeader[c]);
      const subCell = cleanStr(subHeader[c]).toLowerCase();

      if (topCell) {
        currentKitchen = topCell;
      }

      if (!currentKitchen) continue;

      // Ignore metadata columns like "GHI CHÚ" or "STT"
      const normTop = normalizeHeaderKey(currentKitchen);
      if (normTop.includes('ghi_chu') || normTop.includes('stt')) {
        continue;
      }

      const isPrice = subCell.includes('giá') || subCell.includes('gia') || subCell === '';
      const isDiscount = subCell.includes('khấu') || subCell.includes('khau') || subCell.includes('ck');

      if (isPrice && !isDiscount) {
        // Look ahead for corresponding discount column
        let discountColIdx: number | undefined = undefined;
        if (c + 1 < maxCols) {
          const nextSub = cleanStr(subHeader[c + 1]).toLowerCase();
          const nextTop = cleanStr(primaryHeader[c + 1]);
          if (
            (nextTop === '' || nextTop === currentKitchen) &&
            (nextSub.includes('khấu') || nextSub.includes('khau') || nextSub.includes('ck'))
          ) {
            discountColIdx = c + 1;
          }
        }

        const isGeneral = normTop.includes('chung') || normTop.includes('tong_hop');
        const isCancelled = /hủy|huy/i.test(currentKitchen);
        const groupNames = isGeneral || isCancelled ? [] : extractGroupNames(currentKitchen);
        const isGroup = !isGeneral && !isCancelled && groupNames.length > 0;
        const codePrefix = isGeneral ? 'PB_GEN_' : isGroup ? 'PB_GRP_' : 'PB_CUST_';
        const code = codePrefix + normTop.toUpperCase().slice(0, 40);
        const key = 'pb_' + normTop;

        // Prevent duplicate keys
        if (!priceBooks.some(pb => pb.key === key) && !isCancelled) {
          priceBooks.push({
            key,
            code,
            name: `Bảng giá ${currentKitchen}`,
            kind: isGeneral ? 'general' : isGroup ? 'group' : 'customer',
            priceColIndex: c,
            discountColIndex: discountColIdx,
            targetCustomerCode: isGeneral || isGroup ? undefined : currentKitchen.split(/[,;(]/)[0].trim(),
            targetGroupNames: isGroup ? groupNames : undefined,
          });
        }
      }
    }
  } else {
    // Standard template: Each column after SKU/Name/Unit is a price book column
    const maxCols = primaryHeader.length;
    for (let c = 0; c < maxCols; c++) {
      if (c === skuColIdx || c === nameColIdx || c === unitColIdx || c === categoryColIdx) {
        continue;
      }
      const colName = cleanStr(primaryHeader[c]);
      if (!colName) continue;

      const norm = normalizeHeaderKey(colName);
      // Skip non-price columns
      if (norm.includes('ton_kho') || norm.includes('gia_von') || norm.includes('gia_nhap_cuoi') || norm.includes('ghi_chu')) {
        continue;
      }

      const isGeneral = norm.includes('chung');
      priceBooks.push({
        key: 'pb_' + norm + '_' + c,
        code: isGeneral ? 'PB_GEN_' + norm.toUpperCase() : 'PB_CUST_' + norm.toUpperCase(),
        name: colName,
        kind: isGeneral ? 'general' : 'customer',
        priceColIndex: c,
      });
    }
  }

  // Data starts after header and subheader
  // Also check if row immediately following is a category title (e.g. 1, CÔNG CỤ DỤNG CỤ)
  const dataStartRowIdx = subHeaderRowIdx !== undefined ? subHeaderRowIdx + 1 : headerRowIdx + 1;

  return {
    sheetName,
    headerRowIndex: headerRowIdx,
    subHeaderRowIndex: subHeaderRowIdx,
    dataStartRowIndex: dataStartRowIdx,
    skuColIndex: skuColIdx,
    nameColIndex: nameColIdx,
    unitColIndex: unitColIdx !== -1 ? unitColIdx : undefined,
    categoryColIndex: categoryColIdx !== -1 ? categoryColIdx : undefined,
    priceBooks,
    allowZeroPrice: false,
  };
}
