import { resolveOrderPriceBook } from '@/lib/order-price-book';
import { normalizeUnit, validateOrderQuantity } from '@/lib/order-quantity';
import type { ExtractedOrderLine, ProductSuggestion } from './types';
import { canonicalProductKey, compactProductText, normalizeProductText, rankProductCandidates } from './product-match';

type SupabaseAdmin = any;
type ProductRow = {
  id: string; sku: string; name: string; unit: string; active: boolean;
  min_order_qty: number | null; order_step: number | null; enforce_order_step: boolean | null;
  packaging_note: string | null; quantity_precision: number | null;
};

const PRODUCT_CACHE_TTL_MS = 5 * 60_000;
let activeProductCache: { expiresAt: number; rows: ProductRow[] } | null = null;
let activeProductLoad: Promise<ProductRow[]> | null = null;

async function loadAllActiveProducts(supabase: SupabaseAdmin) {
  if (activeProductCache && activeProductCache.expiresAt > Date.now()) return activeProductCache.rows;
  if (activeProductLoad) return activeProductLoad;
  activeProductLoad = (async () => {
    const fields = 'id, sku, name, unit, active, min_order_qty, order_step, enforce_order_step, packaging_note, quantity_precision';
    const pageSize = 1000;
    const first = await supabase.from('products').select(fields, { count: 'exact' })
      .eq('active', true).order('id', { ascending: true }).range(0, pageSize - 1);
    if (first.error) throw first.error;
    const total = first.count || first.data?.length || 0;
    const remaining = await Promise.all(Array.from({ length: Math.max(0, Math.ceil(total / pageSize) - 1) }, (_, index) => {
      const page = index + 1;
      return supabase.from('products').select(fields).eq('active', true)
        .order('id', { ascending: true }).range(page * pageSize, (page + 1) * pageSize - 1);
    }));
    for (const page of remaining) if (page.error) throw page.error;
    const rows = [...(first.data || []), ...remaining.flatMap((page) => page.data || [])] as ProductRow[];
    activeProductCache = { expiresAt: Date.now() + PRODUCT_CACHE_TTL_MS, rows };
    return rows;
  })();
  try { return await activeProductLoad; } finally { activeProductLoad = null; }
}

export async function matchExtractedLines(supabase: SupabaseAdmin, customerId: string, lines: ExtractedOrderLine[]) {
  // PostgREST đang giới hạn 1.000 dòng/truy vấn trong khi TPS1 có hơn 5.000
  // mã đang hoạt động. Tải đủ theo trang và cache ngắn hạn để vừa đúng vừa nhanh.
  const productRows = await loadAllActiveProducts(supabase);
  const [{ data: aliases, error: aliasError }, { data: conversions, error: conversionError }] = await Promise.all([
    supabase.from('product_aliases').select('product_id, customer_id, alias_normalized').or(`customer_id.is.null,customer_id.eq.${customerId}`),
    supabase.from('product_unit_conversions').select('product_id, input_unit, input_unit_normalized, factor_to_order_unit').eq('is_active', true),
  ]);
  if (aliasError && !/does not exist|schema cache/i.test(aliasError.message || '')) throw aliasError;
  if (conversionError && !/does not exist|schema cache/i.test(conversionError.message || '')) throw conversionError;

  const byId = new Map(productRows.map((product) => [product.id, product]));
  const byName = new Map<string, ProductRow[]>();
  const byCompactName = new Map<string, ProductRow[]>();
  for (const product of productRows) {
    const nameKey = canonicalProductKey(product);
    byName.set(nameKey, [...(byName.get(nameKey) || []), product]);
    const key = compactProductText(canonicalProductKey(product));
    byCompactName.set(key, [...(byCompactName.get(key) || []), product]);
  }
  const aliasMap = new Map<string, ProductRow[]>();
  const compactAliasMap = new Map<string, ProductRow[]>();
  for (const alias of aliases || []) {
    const product = byId.get(alias.product_id);
    if (product) {
      const normalizedAlias = normalizeProductText(alias.alias_normalized);
      aliasMap.set(normalizedAlias, [...(aliasMap.get(normalizedAlias) || []), product]);
      const compactAlias = compactProductText(normalizedAlias);
      compactAliasMap.set(compactAlias, [...(compactAliasMap.get(compactAlias) || []), product]);
    }
  }
  const preliminary = lines.map((line) => {
    const nameKey = normalizeProductText(line.name);
    const compactNameKey = compactProductText(nameKey);
    let product: ProductRow | undefined;
    let matchedBy = '';
    let exactCandidates = byName.get(nameKey) || [];
    if (!exactCandidates.length) exactCandidates = byCompactName.get(compactNameKey) || [];
    if (exactCandidates.length === 1) { product = exactCandidates[0]; matchedBy = 'exact_name'; }

    let aliasCandidates: ProductRow[] = [];
    if (!product && !exactCandidates.length) {
      aliasCandidates = aliasMap.get(nameKey) || compactAliasMap.get(compactNameKey) || [];
      if (aliasCandidates.length === 1) { product = aliasCandidates[0]; matchedBy = 'verified_alias'; }
    }

    // SKU do AI đọc được chỉ được lưu để đối chiếu, tuyệt đối không dùng để
    // tự ghép. Nếu một tên có nhiều mã, trả toàn bộ mã để người dùng tự chọn.
    const forcedCandidates = exactCandidates.length > 1 ? exactCandidates : aliasCandidates.length > 1 ? aliasCandidates : [];
    const scored = product ? [] : forcedCandidates.length
      ? forcedCandidates.map((candidate) => ({ product: candidate, score: 1 }))
      : rankProductCandidates(productRows, line.name).slice(0, 10);
    const topNameHasMultipleSkus = scored[0]
      ? (byName.get(canonicalProductKey(scored[0].product)) || []).length > 1
      : false;
    if (!product && !topNameHasMultipleSkus && scored[0] && scored[0].score >= 0.97 && scored[0].score - (scored[1]?.score || 0) >= 0.1) {
      product = scored[0].product;
      matchedBy = 'high_confidence_fuzzy';
    }
    return { line, product, matchedBy, scored };
  });

  const priceProductIds = [...new Set(preliminary.flatMap((entry) => [entry.product?.id, ...entry.scored.map((s) => s.product.id)]).filter(Boolean))] as string[];
  const pricing = priceProductIds.length
    ? await resolveOrderPriceBook(supabase, customerId, priceProductIds.map((productId) => ({ productId, quantity: 1 })))
    : { resolved: [] };
  const prices = new Map(pricing.resolved.map((row) => [row.productId, row]));

  return preliminary.map(({ line, product, matchedBy, scored }) => {
    const suggestions: ProductSuggestion[] = scored.map(({ product: p, score }) => ({
      id: p.id, sku: p.sku, name: p.name, unit: p.unit || '', score: Math.round(score * 1000) / 1000, price: prices.get(p.id)?.price ?? null,
    }));
    if (!product) {
      return {
        source_file: line.sourceFile, source_page: line.sourcePage || null, source_row: line.sourceRow || null,
        raw_text: line.rawText || null, raw_sku: line.sku || null, raw_name: line.name,
        raw_quantity: Number.isFinite(line.quantity) ? line.quantity : null, raw_unit: line.unit || null, raw_note: line.note || null,
        document_price: line.documentPrice || null, extraction_confidence: line.confidence || null,
        selected_product_id: null, matched_by: null, match_score: scored[0]?.score || null,
        converted_quantity: null, conversion_factor: null, resolved_price: null, price_source: null,
        status: suggestions.length ? 'ambiguous' : 'not_found', warnings: suggestions.length ? ['Cần chọn đúng sản phẩm'] : ['Không tìm thấy sản phẩm phù hợp'],
        suggestions, selected: false,
      };
    }
    const productConversions = (conversions || []).filter((conversion: any) => conversion.product_id === product!.id);
    const validation = validateOrderQuantity(product, Number(line.quantity), line.unit || product.unit, productConversions);
    const priceInfo = prices.get(product.id);
    const warnings: string[] = [];
    let status = 'matched';
    if (!validation.ok) { status = validation.code === 'UNIT_CONFLICT' ? 'unit_conflict' : 'invalid_quantity'; warnings.push(validation.message || 'Số lượng không hợp lệ'); }
    if (priceInfo?.price == null) { status = 'missing_price'; warnings.push('Sản phẩm chưa có giá trong bảng giá áp dụng'); }
    const fuzzyScore = matchedBy === 'high_confidence_fuzzy' ? scored[0]?.score || null : 1;
    return {
      source_file: line.sourceFile, source_page: line.sourcePage || null, source_row: line.sourceRow || null,
      raw_text: line.rawText || null, raw_sku: line.sku || null, raw_name: line.name,
      raw_quantity: line.quantity, raw_unit: line.unit || product.unit || null, raw_note: line.note || null,
      document_price: line.documentPrice || null, extraction_confidence: line.confidence || null,
      selected_product_id: product.id, matched_by: matchedBy, match_score: fuzzyScore,
      converted_quantity: validation.quantity, conversion_factor: validation.conversionFactor,
      resolved_price: priceInfo?.price ?? null, price_source: priceInfo?.priceSource || null,
      status, warnings, suggestions: [], selected: status === 'matched',
    };
  });
}

export async function reevaluateImportLine(supabase: SupabaseAdmin, customerId: string, line: any, productId: string, quantity: number, inputUnit: string) {
  const { data: product, error } = await supabase
    .from('products').select('id, sku, name, unit, active, min_order_qty, order_step, enforce_order_step, packaging_note, quantity_precision')
    .eq('id', productId).eq('active', true).maybeSingle();
  if (error || !product) throw new Error('Sản phẩm không tồn tại hoặc đã ngừng kinh doanh');
  const { data: conversions } = await supabase.from('product_unit_conversions')
    .select('input_unit, input_unit_normalized, factor_to_order_unit').eq('product_id', productId).eq('is_active', true);
  const validation = validateOrderQuantity(product, quantity, inputUnit || product.unit, conversions || []);
  const pricing = await resolveOrderPriceBook(supabase, customerId, [{ productId, quantity: validation.quantity || quantity }]);
  const priceInfo = pricing.resolved.find((row) => row.productId === productId);
  const warnings: string[] = [];
  let status = 'matched';
  if (!validation.ok) { status = validation.code === 'UNIT_CONFLICT' ? 'unit_conflict' : 'invalid_quantity'; warnings.push(validation.message || 'Số lượng không hợp lệ'); }
  if (priceInfo?.price == null) { status = 'missing_price'; warnings.push('Sản phẩm chưa có giá trong bảng giá áp dụng'); }
  return {
    selected_product_id: productId, raw_quantity: quantity, raw_unit: inputUnit || product.unit,
    matched_by: 'manual_selection', match_score: 1, converted_quantity: validation.quantity,
    conversion_factor: validation.conversionFactor, resolved_price: priceInfo?.price ?? null,
    price_source: priceInfo?.priceSource || null, status, warnings, selected: status === 'matched',
  };
}
