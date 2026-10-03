const CATEGORY_ALIASES = new Map<string, string>([
  ["THỊT HEO", "Thịt heo"],
  ["MẶT HÀNG THỊT HEO TS", "Thịt heo"],
  ["MẶT HÀNG THỊT HEO CP", "Thịt heo"],
]);

export function normalizeProductCategory(value?: string | null): string {
  const cleaned = String(value || "").trim().replace(/\s+/g, " ");
  if (!cleaned) return "Khác";
  return CATEGORY_ALIASES.get(cleaned.toLocaleUpperCase("vi-VN")) || cleaned;
}

/**
 * SKU là định danh nghiệp vụ. Hai UUID cũ trỏ cùng một SKU phải được cộng chung,
 * nhưng SKU hàng thường và hàng đặc biệt (ví dụ hậu tố "db") vẫn hoàn toàn tách biệt.
 */
export function productAggregationKey(input: {
  sku?: string | null;
  productId?: string | null;
  name?: string | null;
}): string {
  const sku = String(input.sku || "").trim().toLocaleLowerCase("vi-VN");
  if (sku) return `sku:${sku}`;
  if (input.productId) return `id:${input.productId}`;
  return `name:${String(input.name || "").trim().toLocaleLowerCase("vi-VN")}`;
}
