import { getCustomerSupabaseAdmin } from "./customer-supabase-server";
import { chunkArray } from "./products-fetcher";

export interface ResolvedProductPrice {
  price: number;
  basePrice: number;
  priceSource: "contract" | "tier" | "base";
  priceOnRequest: boolean;
}

/**
 * Tính đơn giá theo hợp đồng hoặc hạng khách hàng cho danh sách sản phẩm (F5).
 * Dùng chung giữa app/api/customer/products và app/api/customer/frequent-items.
 * Chỉ tải bảng giá hợp đồng và giá hạng cho đúng các product_id truyền vào,
 * tự động chia lô tối đa 100 ID/lần để tránh URL quá dài.
 */
export async function resolvePricesForProducts(
  supabase: ReturnType<typeof getCustomerSupabaseAdmin>,
  customerId: string,
  products: Array<{ id: string; price_retail?: number | null; price_wholesale?: number | null }>,
  knownTier?: string | null
): Promise<Map<string, ResolvedProductPrice>> {
  const priceMap = new Map<string, ResolvedProductPrice>();
  const productIds = Array.from(new Set(products.map((p) => p.id).filter(Boolean)));
  if (productIds.length === 0) return priceMap;

  // 1. Lấy discount_tier của khách
  let tier = knownTier;
  if (tier === undefined) {
    const { data: customer } = await supabase
      .from("vip_accounts")
      .select("discount_tier")
      .eq("id", customerId)
      .maybeSingle();
    tier = customer?.discount_tier || null;
  }
  const now = new Date();

  // 2. Lấy giá hợp đồng riêng của khách (chỉ lấy cho các productIds cần thiết, chia lô 100)
  const contractChunks = chunkArray(productIds, 100);
  const contractByProduct = new Map<string, number>();

  await Promise.all(contractChunks.map(async (chunk) => {
    try {
      const { data: contractRows } = await supabase
        .from("customer_contract_prices")
        .select("product_id, price, valid_until")
        .eq("customer_id", customerId)
        .in("product_id", chunk);

      for (const c of contractRows || []) {
        if (!c.valid_until || new Date(c.valid_until) > now) {
          contractByProduct.set(c.product_id, Number(c.price));
        }
      }
    } catch (err) {
      console.error("Lỗi tải customer_contract_prices:", err);
    }
  }));

  // 3. Lấy giá theo hạng (nếu khách có tier)
  const tierPriceByProduct = new Map<string, number>();
  if (tier) {
    await Promise.all(contractChunks.map(async (chunk) => {
      try {
        const { data: tierRows } = await supabase
          .from("product_tier_prices")
          .select("product_id, price")
          .eq("tier", tier)
          .in("product_id", chunk);

        for (const t of tierRows || []) {
          tierPriceByProduct.set(t.product_id, Number(t.price));
        }
      } catch (err) {
        console.error("Lỗi tải product_tier_prices:", err);
      }
    }));
  }

  // 4. Áp giá theo thứ tự ưu tiên: Hợp đồng riêng > Giá theo hạng > Giá gốc
  for (const p of products) {
    const base = Number(p.price_retail) || Number(p.price_wholesale) || 0;
    let finalPrice = base;
    let source: "contract" | "tier" | "base" = "base";

    if (contractByProduct.has(p.id)) {
      finalPrice = contractByProduct.get(p.id)!;
      source = "contract";
    } else if (tierPriceByProduct.has(p.id)) {
      finalPrice = tierPriceByProduct.get(p.id)!;
      source = "tier";
    }

    priceMap.set(p.id, {
      price: finalPrice,
      basePrice: base,
      priceSource: source,
      priceOnRequest: finalPrice <= 0,
    });
  }

  return priceMap;
}
