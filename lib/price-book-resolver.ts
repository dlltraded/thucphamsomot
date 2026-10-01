import { getCustomerSupabaseAdmin } from "./customer-supabase-server";

type SupabaseAdmin = ReturnType<typeof getCustomerSupabaseAdmin>;

export type PriceSource =
  | "customer_price_book"
  | "group_price_book"
  | "general_price_book"
  | "general_fallback"
  | "missing";

export interface ResolvedPriceBookPrice {
  productId: string;
  price: number | null;
  priceSource: PriceSource;
  priceBookId: string | null;
  priceBookCode: string | null;
  priceBookName: string | null;
  priceBookVersion: number | null;
}

interface ActiveBook {
  id: string;
  code: string;
  name: string;
  version: number;
  kind: string;
  created_at: string;
}

function isCurrentlyEffective(row: Record<string, any>, now: Date) {
  return (!row.valid_from || new Date(row.valid_from) <= now) &&
    (!row.valid_to || new Date(row.valid_to) >= now);
}

/** Nguồn sự thật duy nhất: khách hàng -> nhóm bếp -> bảng giá chung. */
export async function resolvePriceBookPrices(
  supabase: SupabaseAdmin,
  customerId: string,
  productIdsInput: string[],
): Promise<Map<string, ResolvedPriceBookPrice>> {
  const productIds = [...new Set(productIdsInput.filter(Boolean))].slice(0, 1000);
  const result = new Map<string, ResolvedPriceBookPrice>();
  if (!productIds.length) return result;

  const now = new Date();
  const { data: customer, error: customerError } = await supabase
    .from("vip_accounts")
    .select("id, customer_group")
    .eq("id", customerId)
    .maybeSingle();
  if (customerError) throw customerError;
  if (!customer) throw new Error("Không tìm thấy khách hàng để xác định bảng giá");

  const [{ data: directRows, error: directError }, { data: generalRows, error: generalError }] = await Promise.all([
    supabase
      .from("price_book_customer_assignments")
      .select("price_book_id, priority, valid_from, valid_to, created_at, price_books!inner(id, code, name, version, kind, status, valid_from, valid_to, created_at)")
      .eq("customer_id", customerId)
      .eq("price_books.status", "active"),
    supabase
      .from("price_books")
      .select("id, code, name, version, kind, status, valid_from, valid_to, created_at")
      .eq("kind", "general")
      .eq("status", "active"),
  ]);
  if (directError) throw directError;
  if (generalError) throw generalError;

  const direct = (directRows || [])
    .filter((row: any) => isCurrentlyEffective(row, now) && isCurrentlyEffective(row.price_books, now))
    .sort((a: any, b: any) => Number(b.priority) - Number(a.priority) ||
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] as any;

  let group: any = null;
  if (customer.customer_group) {
    const { data: groupRows, error: groupError } = await supabase
      .from("price_book_customer_group_assignments")
      .select("price_book_id, priority, valid_from, valid_to, created_at, price_books!inner(id, code, name, version, kind, status, valid_from, valid_to, created_at)")
      .ilike("group_name", String(customer.customer_group).trim())
      .eq("price_books.status", "active");
    if (groupError) throw groupError;
    group = (groupRows || [])
      .filter((row: any) => isCurrentlyEffective(row, now) && isCurrentlyEffective(row.price_books, now))
      .sort((a: any, b: any) => Number(b.priority) - Number(a.priority) ||
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] || null;
  }

  const general = (generalRows || [])
    .filter((row: any) => isCurrentlyEffective(row, now))
    .sort((a: any, b: any) => Number(b.version) - Number(a.version) ||
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] as ActiveBook | undefined;

  const orderedBooks: Array<{ book: ActiveBook; source: PriceSource }> = [];
  if (direct?.price_books) orderedBooks.push({ book: direct.price_books, source: "customer_price_book" });
  if (group?.price_books && group.price_book_id !== direct?.price_book_id) {
    orderedBooks.push({ book: group.price_books, source: "group_price_book" });
  }
  if (general && !orderedBooks.some((entry) => entry.book.id === general.id)) {
    orderedBooks.push({ book: general, source: direct || group ? "general_fallback" : "general_price_book" });
  }

  const itemByBookAndProduct = new Map<string, any>();
  if (orderedBooks.length) {
    const { data: items, error: itemError } = await supabase
      .from("price_book_items")
      .select("price_book_id, product_id, price, effective_from, effective_to")
      .in("price_book_id", orderedBooks.map((entry) => entry.book.id))
      .in("product_id", productIds);
    if (itemError) throw itemError;
    for (const item of items || []) {
      if (isCurrentlyEffective({ valid_from: item.effective_from, valid_to: item.effective_to }, now)) {
        itemByBookAndProduct.set(`${item.price_book_id}:${item.product_id}`, item);
      }
    }
  }

  for (const productId of productIds) {
    let resolved: ResolvedPriceBookPrice | null = null;
    for (const entry of orderedBooks) {
      const item = itemByBookAndProduct.get(`${entry.book.id}:${productId}`);
      // Giá 0 trong file nhập được xem là chưa có giá, không phải hàng miễn
      // phí. Chặn từ resolver để website, Mini App và POS cùng fail closed.
      if (!item || !Number.isFinite(Number(item.price)) || Number(item.price) <= 0) continue;
      resolved = {
        productId,
        price: Number(item.price),
        priceSource: entry.source,
        priceBookId: entry.book.id,
        priceBookCode: entry.book.code,
        priceBookName: entry.book.name,
        priceBookVersion: Number(entry.book.version) || 1,
      };
      break;
    }
    result.set(productId, resolved || {
      productId,
      price: null,
      priceSource: "missing",
      priceBookId: null,
      priceBookCode: null,
      priceBookName: null,
      priceBookVersion: null,
    });
  }
  return result;
}
