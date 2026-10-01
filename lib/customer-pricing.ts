import { getCustomerSupabaseAdmin } from "./customer-supabase-server";
import { resolvePriceBookPrices, type PriceSource } from "./price-book-resolver";

export interface ResolvedProductPrice {
  price: number;
  basePrice: number;
  priceSource: PriceSource;
  priceOnRequest: boolean;
  priceBookId: string | null;
  priceBookCode: string | null;
  priceBookName: string | null;
  priceBookVersion: number | null;
}

/** Adapter tương thích cho danh mục; context VIP cũ bị bỏ qua có chủ đích. */
export async function resolvePricesForProducts(
  supabase: ReturnType<typeof getCustomerSupabaseAdmin>,
  customerId: string,
  products: Array<{ id: string; price_retail?: number | null; price_wholesale?: number | null }>,
  _knownContext?: unknown,
): Promise<Map<string, ResolvedProductPrice>> {
  const resolved = await resolvePriceBookPrices(supabase, customerId, products.map((p) => p.id));
  const result = new Map<string, ResolvedProductPrice>();
  for (const product of products) {
    const item = resolved.get(product.id);
    const basePrice = Number(product.price_retail) || Number(product.price_wholesale) || 0;
    result.set(product.id, {
      price: item?.price == null ? 0 : item.price,
      basePrice,
      priceSource: item?.priceSource || "missing",
      priceOnRequest: item?.price == null || item.price <= 0,
      priceBookId: item?.priceBookId || null,
      priceBookCode: item?.priceBookCode || null,
      priceBookName: item?.priceBookName || null,
      priceBookVersion: item?.priceBookVersion || null,
    });
  }
  return result;
}
