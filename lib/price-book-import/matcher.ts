import { ProductMatchResult, SystemProductRef } from './types';

export function normalizeText(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .normalize('NFC')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

export function isCategoryRow(rawSku: string, rawName: string, rawUnit: string = ''): boolean {
  const cleanSku = rawSku.trim();
  const cleanName = rawName.trim();
  const cleanUnit = rawUnit.trim();

  // If sku is a small index number (1 to 99) AND unit is empty or name is uppercase category header
  if (/^\d{1,2}$/.test(cleanSku) && cleanName.length > 0) {
    if (!cleanUnit || cleanUnit === '0' || cleanName === cleanName.toUpperCase()) {
      return true;
    }
  }

  // If sku is empty and name looks like a category header
  if (!cleanSku && cleanName.length > 0) {
    const norm = cleanName.toLowerCase();
    if (
      norm.startsWith('mặt hàng') ||
      norm.startsWith('nhóm hàng') ||
      norm.startsWith('công cụ dụng cụ') ||
      norm.startsWith('rau củ quả') ||
      norm.startsWith('thịt cá') ||
      (cleanName === cleanName.toUpperCase() && cleanName.length > 5 && !cleanUnit)
    ) {
      return true;
    }
  }

  return false;
}

export class ProductMatcher {
  private skuMap = new Map<string, SystemProductRef>();
  private nameUnitMap = new Map<string, SystemProductRef[]>();

  constructor(products: SystemProductRef[]) {
    for (const p of products) {
      if (p.sku) {
        this.skuMap.set(normalizeText(p.sku), p);
      }
      if (p.name) {
        const key = `${normalizeText(p.name)}|${normalizeText(p.unit)}`;
        if (!this.nameUnitMap.has(key)) {
          this.nameUnitMap.set(key, []);
        }
        this.nameUnitMap.get(key)!.push(p);
      }
    }
  }

  public match(rawSku: string, rawName: string, rawUnit: string): ProductMatchResult {
    const normSku = normalizeText(rawSku);
    const normName = normalizeText(rawName);
    const normUnit = normalizeText(rawUnit);

    // 0. Check category row
    if (isCategoryRow(rawSku, rawName, rawUnit)) {
      return {
        status: 'skipped_category',
        notes: `Dòng tiêu đề nhóm / danh mục: "${rawName}"`,
      };
    }

    if (!normSku && !normName) {
      return {
        status: 'skipped_category',
        notes: 'Dòng trống không có mã hàng và tên hàng',
      };
    }

    // 1. Exact SKU match
    if (normSku && this.skuMap.has(normSku)) {
      return {
        status: 'exact_sku',
        product: this.skuMap.get(normSku)!,
      };
    }

    // 2. Exact Name + Unit match
    const key = `${normName}|${normUnit}`;
    const nameMatches = this.nameUnitMap.get(key) || [];

    if (nameMatches.length === 1) {
      return {
        status: 'exact_name_unit',
        product: nameMatches[0],
      };
    }

    // 3. Ambiguous
    if (nameMatches.length > 1) {
      return {
        status: 'ambiguous',
        ambiguousCandidates: nameMatches,
        notes: `Tìm thấy ${nameMatches.length} sản phẩm trùng tên và đơn vị tính`,
      };
    }

    // 4. Unmatched
    return {
      status: 'unmatched',
      notes: `Không tìm thấy sản phẩm khớp với mã "${rawSku}" hoặc tên "${rawName}" (${rawUnit})`,
    };
  }
}
