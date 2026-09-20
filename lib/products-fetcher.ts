import { getCustomerSupabaseAdmin } from "./customer-supabase-server";

/**
 * Chia nhỏ mảng thành các phần tử có kích thước tối đa chunkSize.
 */
export function chunkArray<T>(items: T[], chunkSize = 100): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Tải danh sách sản phẩm theo danh sách ID, tự động chia lô tối đa 100 ID/lần
 * để tránh lỗi HTTP 414 / URI Too Long khi danh sách có hàng trăm mặt hàng (F4).
 */
export async function fetchProductsByIds(
  supabase: ReturnType<typeof getCustomerSupabaseAdmin>,
  productIds: string[],
  selectFields = "id, sku, name, category, unit, price_retail, price_wholesale, image_url, track_inventory, stock_qty"
): Promise<any[]> {
  const uniqueIds = Array.from(new Set(productIds.filter(Boolean)));
  if (uniqueIds.length === 0) return [];

  const chunks = chunkArray(uniqueIds, 100);
  const results: any[] = [];

  for (const chunk of chunks) {
    try {
      const { data, error } = await supabase
        .from("products")
        .select(selectFields)
        .in("id", chunk);

      if (error) {
        // Fallback: nếu selectFields có trường mới chưa migrate (như thumb_url),
        // thử lại với các trường cơ bản an toàn để không làm sập API
        if (selectFields.includes("thumb_url")) {
          const safeFields = selectFields.replace(/,?\s*thumb_url/g, "");
          const retry = await supabase
            .from("products")
            .select(safeFields)
            .in("id", chunk);
          if (!retry.error && retry.data) {
            results.push(...retry.data);
            continue;
          }
        }
        throw error;
      }

      if (data) {
        results.push(...data);
      }
    } catch (err) {
      console.error("fetchProductsByIds chunk error:", err);
    }
  }

  return results;
}
