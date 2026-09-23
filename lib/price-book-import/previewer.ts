import * as XLSX from 'xlsx';
import {
  ImportPreviewResponse,
  ImportPreviewStats,
  MappingConfig,
  RowValidationResult,
} from './types';
import { ProductMatcher } from './matcher';
import { validatePriceAndDiscount } from './validator';

export function generatePreview(
  sheet: XLSX.WorkSheet,
  mapping: MappingConfig,
  matcher: ProductMatcher,
  page: number = 1,
  pageSize: number = 50
): ImportPreviewResponse {
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    blankrows: false,
    defval: '',
  });

  const allResults: RowValidationResult[] = [];

  const stats: ImportPreviewStats = {
    totalRows: 0,
    validRows: 0,
    unmatchedRows: 0,
    ambiguousRows: 0,
    blankPriceRows: 0,
    zeroPriceRows: 0,
    invalidPriceRows: 0,
    skippedCategoryRows: 0,
  };

  const startIdx = Math.max(0, mapping.dataStartRowIndex);

  for (let r = startIdx; r < rows.length; r++) {
    const row = rows[r];
    if (!row || !Array.isArray(row)) continue;

    const rawSku = String(row[mapping.skuColIndex] ?? '').trim();
    const rawName = String(row[mapping.nameColIndex] ?? '').trim();
    const rawUnit = mapping.unitColIndex !== undefined ? String(row[mapping.unitColIndex] ?? '').trim() : '';

    // Ignore completely empty lines
    if (!rawSku && !rawName) continue;

    stats.totalRows++;

    // 1. Match product
    const matchResult = matcher.match(rawSku, rawName, rawUnit);

    if (matchResult.status === 'skipped_category') {
      stats.skippedCategoryRows++;
      allResults.push({
        rowIndex: r + 1,
        rawSku,
        rawName,
        rawUnit,
        matchResult,
        prices: {},
        isValid: false,
        rowErrors: [matchResult.notes || 'Dòng danh mục'],
      });
      continue;
    }

    if (matchResult.status === 'unmatched') {
      stats.unmatchedRows++;
    } else if (matchResult.status === 'ambiguous') {
      stats.ambiguousRows++;
    }

    // 2. Validate prices for each mapped price book
    const prices: RowValidationResult['prices'] = {};
    const rowErrors: string[] = [];
    let hasAnyValidPrice = false;
    let hasZeroPrice = false;
    let hasBlankPrice = false;
    let hasInvalidPrice = false;

    for (const pb of mapping.priceBooks) {
      const rawPrice = row[pb.priceColIndex];
      const rawDiscount = pb.discountColIndex !== undefined ? row[pb.discountColIndex] : null;

      const validated = validatePriceAndDiscount(
        rawPrice,
        rawDiscount,
        pb.key,
        mapping.allowZeroPrice
      );

      prices[pb.key] = validated;

      if (validated.status === 'valid') {
        hasAnyValidPrice = true;
      } else if (validated.status === 'zero_price') {
        hasZeroPrice = true;
        rowErrors.push(`[${pb.name}] Giá bằng 0`);
      } else if (validated.status === 'blank_price') {
        hasBlankPrice = true;
      } else {
        hasInvalidPrice = true;
        rowErrors.push(`[${pb.name}] ${validated.errorNote || 'Lỗi giá'}`);
      }
    }

    if (hasZeroPrice) stats.zeroPriceRows++;
    if (hasBlankPrice && !hasAnyValidPrice) stats.blankPriceRows++;
    if (hasInvalidPrice) stats.invalidPriceRows++;

    const isProductMatched = matchResult.status === 'exact_sku' || matchResult.status === 'exact_name_unit';
    const isRowValid = isProductMatched && hasAnyValidPrice && !hasInvalidPrice;

    if (isRowValid) {
      stats.validRows++;
    }

    if (matchResult.status === 'unmatched') {
      rowErrors.push(matchResult.notes || 'Không tìm thấy sản phẩm');
    } else if (matchResult.status === 'ambiguous') {
      rowErrors.push(matchResult.notes || 'Nhiều sản phẩm trùng khớp');
    }

    allResults.push({
      rowIndex: r + 1,
      rawSku,
      rawName,
      rawUnit,
      matchResult,
      prices,
      isValid: isRowValid,
      rowErrors,
    });
  }

  // Pagination
  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, pageSize);
  const totalCount = allResults.length;
  const totalPages = Math.ceil(totalCount / safePageSize);
  const offset = (safePage - 1) * safePageSize;
  const paginatedRows = allResults.slice(offset, offset + safePageSize);

  return {
    stats,
    priceBooks: mapping.priceBooks,
    rows: paginatedRows,
    pagination: {
      page: safePage,
      pageSize: safePageSize,
      totalPages,
      totalCount,
    },
  };
}
