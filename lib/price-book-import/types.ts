/**
 * Types & Interfaces for G2: Complex Price Book Import
 */

export interface SheetInspection {
  name: string;
  rowCount: number;
  colCount: number;
  previewRows: Array<Array<string | number | null>>;
}

export interface WorkbookInspectionResult {
  fileName: string;
  fileSize: number;
  checksum: string;
  sheets: SheetInspection[];
  detectedType: 'standard_template' | 'multi_level_kitchen' | 'unknown';
}

export interface PriceBookColumnMapping {
  key: string;              // e.g. 'pb_toyota'
  code: string;             // e.g. 'PB_CUST_TOYOTA'
  name: string;             // e.g. 'Báo giá TOYOTA'
  kind: 'general' | 'customer' | 'group';
  priceColIndex: number;    // 0-indexed column in sheet
  discountColIndex?: number;// 0-indexed column in sheet (if discount column exists)
  targetCustomerId?: string;// Supabase vip_account id if known
  targetCustomerCode?: string;// e.g. 'TYT' or 'TOYOTA'
  /** KiotViet customer-group names served by this column. */
  targetGroupNames?: string[];
}

export interface MappingConfig {
  sheetName: string;
  headerRowIndex: number;     // 0-indexed row for primary headers
  subHeaderRowIndex?: number; // 0-indexed row for sub-headers (GIÁ, C.KHẤU)
  dataStartRowIndex: number;  // 0-indexed row where actual data rows start
  skuColIndex: number;
  nameColIndex: number;
  unitColIndex?: number;
  categoryColIndex?: number;
  priceBooks: PriceBookColumnMapping[];
  allowZeroPrice?: boolean;   // default false: flag zero price as warning
}

export type ProductMatchStatus =
  | 'exact_sku'
  | 'exact_name_unit'
  | 'ambiguous'
  | 'unmatched'
  | 'skipped_category';

export interface SystemProductRef {
  id: string;
  sku: string;
  name: string;
  unit: string | null;
  category?: string | null;
}

export interface ProductMatchResult {
  status: ProductMatchStatus;
  product?: SystemProductRef;
  ambiguousCandidates?: SystemProductRef[];
  notes?: string;
}

export type ItemPriceStatus =
  | 'valid'
  | 'blank_price'
  | 'zero_price'
  | 'invalid_price'
  | 'invalid_discount'
  | 'invalid_format';

export interface ResolvedItemPrice {
  priceBookKey: string;
  sourcePrice: number | null;
  discountPercent: number;
  discountAmount: number;
  finalPrice: number | null;
  status: ItemPriceStatus;
  errorNote?: string;
}

export interface RowValidationResult {
  rowIndex: number;           // 1-indexed row number in Excel for display
  rawSku: string;
  rawName: string;
  rawUnit: string;
  matchResult: ProductMatchResult;
  prices: Record<string, ResolvedItemPrice>; // key is PriceBookColumnMapping.key
  isValid: boolean;           // true if product is matched and at least one price is valid
  rowErrors: string[];
}

export interface ImportPreviewStats {
  totalRows: number;
  validRows: number;
  unmatchedRows: number;
  ambiguousRows: number;
  blankPriceRows: number;
  zeroPriceRows: number;
  invalidPriceRows: number;
  skippedCategoryRows: number;
}

export interface ImportPreviewResponse {
  stats: ImportPreviewStats;
  priceBooks: PriceBookColumnMapping[];
  rows: RowValidationResult[];
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
  };
}
