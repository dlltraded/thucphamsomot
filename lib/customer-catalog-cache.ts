// Cache danh mục sản phẩm cho trang đặt hàng, dùng được khi Vercel chạy nhiều
// instance cùng lúc.
//
// Mỗi instance vẫn giữ danh mục 5.000+ sản phẩm trong bộ nhớ (TTL 5 phút) để
// không phải tải lại toàn bảng ở mỗi request. Điểm khác: mỗi bản cache gắn với
// một "phiên bản danh mục" đọc từ DB (số dòng + updated_at mới nhất của bảng
// products, trigger trg_products_set_updated_at tự cập nhật khi sửa). Khi
// admin sửa mô tả/giá/quy cách ở BẤT KỲ instance nào, phiên bản trong DB đổi,
// các instance khác thấy lệch phiên bản và tải lại thay vì chờ hết TTL.
//
// File này không import gì để chạy được trong kiểm thử node thuần
// (tests/customer-catalog-cache.test.mjs).

export type CatalogProductRow = {
  id: string;
  sku?: string | null;
  name?: string | null;
  category?: string | null;
  unit?: string | null;
  image_url?: string | null;
  thumb_url?: string | null;
  price_retail?: number | null;
  price_wholesale?: number | null;
  packaging_note?: string | null;
  short_description?: string | null;
  min_order_qty?: number | string | null;
  order_step?: number | string | null;
  enforce_order_step?: boolean | null;
  quantity_precision?: number | string | null;
  quantity_adjustment_mode?: string | null;
};

export type CatalogBody = {
  ok: true;
  count: number;
  version: string;
  imageBaseUrl: string;
  items: unknown[];
};

type Options<Ctx> = {
  /** Đọc phiên bản danh mục hiện tại từ DB. Lỗi sẽ rơi về cơ chế TTL cũ. */
  readVersion: () => Promise<string>;
  loadProducts: () => Promise<CatalogProductRow[]>;
  /** Giá theo khách; null = khách vãng lai, dùng giá bán lẻ. */
  resolvePrices: (products: CatalogProductRow[], ctx: Ctx) => Promise<Map<string, { price?: number }>>;
  imageBaseUrl: () => string;
  ttlMs?: number;
  /** Mỗi instance hỏi lại phiên bản DB tối đa một lần trong khoảng này. */
  versionMaxAgeMs?: number;
  now?: () => number;
};

const DEFAULT_TTL_MS = 5 * 60_000;
const DEFAULT_VERSION_MAX_AGE_MS = 5_000;

// [id, sku, name, category, unit, price, priceOnRequest, hasImage, packagingNote, minOrderQty, orderStep, enforceOrderStep, quantityPrecision, quantityAdjustmentMode, shortDescription, imageUrl]
export function toCatalogTuple(product: CatalogProductRow, price: number) {
  return [
    product.id,
    product.sku || "",
    product.name || "",
    product.category || null,
    product.unit || "Kg",
    price,
    price <= 0,
    Boolean(product.thumb_url),
    product.packaging_note || null,
    product.min_order_qty == null ? 1 : Number(product.min_order_qty) || 1,
    product.order_step == null ? 1 : Number(product.order_step) || 1,
    Boolean(product.enforce_order_step),
    product.quantity_precision == null ? 0 : Math.max(0, Number(product.quantity_precision) || 0),
    product.quantity_adjustment_mode === "ceil_to_step" ? "ceil_to_step" : "reject",
    product.short_description || null,
    product.thumb_url || product.image_url || null,
  ];
}

export function createCustomerCatalogCache<Ctx extends { customerId: string } | null>(options: Options<Ctx>) {
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  const versionMaxAgeMs = options.versionMaxAgeMs ?? DEFAULT_VERSION_MAX_AGE_MS;
  const now = options.now ?? Date.now;

  let versionMemo: { version: string; checkedAt: number } | null = null;
  let versionRequest: Promise<string> | null = null;
  let base: { version: string; expiresAt: number; products: CatalogProductRow[] } | null = null;
  let baseRequest: { version: string; promise: Promise<CatalogProductRow[]> } | null = null;
  const bodies = new Map<string, { version: string; expiresAt: number; body: CatalogBody }>();

  async function currentVersion() {
    if (versionMemo && now() - versionMemo.checkedAt < versionMaxAgeMs) return versionMemo.version;
    if (!versionRequest) {
      versionRequest = options
        .readVersion()
        .catch((error) => {
          console.error("Không đọc được phiên bản danh mục, dùng TTL:", error);
          // Đổi theo từng chu kỳ TTL: hành vi giống hệt trước khi có phiên bản.
          return `ttl:${Math.floor(now() / ttlMs)}`;
        })
        .then((version) => {
          versionMemo = { version, checkedAt: now() };
          return version;
        })
        .finally(() => {
          versionRequest = null;
        });
    }
    return versionRequest;
  }

  async function baseProducts(version: string) {
    if (base && base.version === version && base.expiresAt > now()) return base.products;
    // Nhiều request cùng lúc chỉ tải bảng products một lần.
    if (baseRequest?.version !== version) {
      const promise = options.loadProducts().then((products) => {
        base = { version, expiresAt: now() + ttlMs, products };
        return products;
      });
      baseRequest = { version, promise };
      promise.then(
        () => { if (baseRequest?.promise === promise) baseRequest = null; },
        () => { if (baseRequest?.promise === promise) baseRequest = null; }
      );
    }
    return baseRequest.promise;
  }

  async function get(ctx: Ctx) {
    const version = await currentVersion();
    const key = ctx?.customerId || "guest";
    const cached = bodies.get(key);
    if (cached && cached.version === version && cached.expiresAt > now()) {
      return { body: cached.body, cacheStatus: "HIT" as const, version };
    }

    const products = await baseProducts(version);
    const priceMap = ctx ? await options.resolvePrices(products, ctx) : new Map<string, { price?: number }>();
    const items = products.map((product) => {
      const price = ctx
        ? priceMap.get(product.id)?.price ?? (Number(product.price_retail) || Number(product.price_wholesale) || 0)
        : Number(product.price_retail) || 0;
      return toCatalogTuple(product, price);
    });
    const body: CatalogBody = { ok: true, count: items.length, version, imageBaseUrl: options.imageBaseUrl(), items };

    const time = now();
    for (const [entryKey, entry] of bodies) {
      if (entry.expiresAt <= time || entry.version !== version) bodies.delete(entryKey);
    }
    bodies.set(key, { version, expiresAt: time + ttlMs, body });
    return { body, cacheStatus: "MISS" as const, version };
  }

  /** Xóa cache của instance hiện tại; các instance khác tự nhận qua phiên bản DB. */
  function invalidate() {
    versionMemo = null;
    base = null;
    baseRequest = null;
    bodies.clear();
  }

  return { get, currentVersion, invalidate };
}
