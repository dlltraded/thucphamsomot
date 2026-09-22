import CONFIG from "@/config";
import type { Category, Product } from "@/types";
import logoUrl from "@/static/logo.png";

type ApiProduct = {
  id: string;
  sku?: string;
  name: string;
  category?: string | null;
  unit?: string;
  imageUrl?: string | null;
  thumbUrl?: string | null;
  price?: number;
  priceOnRequest?: boolean;
};

type ProductPageResponse = {
  ok: boolean;
  total: number;
  page: number;
  pageSize: number;
  products: ApiProduct[];
  error?: string;
};

export type CatalogCategory = Category & {
  rawCategories: string[];
  priority: number;
  emoji: string;
};

const GROUPS = [
  { id: "veg", name: "Rau củ quả", priority: 1, emoji: "🥬", matches: ["RAU CỦ QUẢ", "RAU CỦ", "RAU"] },
  { id: "fruits", name: "Trái cây", priority: 2, emoji: "🍎", matches: ["TRÁI CÂY"] },
  { id: "seafood", name: "Hải sản", priority: 3, emoji: "🦐", matches: ["HẢI SẢN"] },
  { id: "meat", name: "Thịt & Đông lạnh", priority: 4, emoji: "🥩", matches: ["THỊT", "ĐÔNG LẠNH", "GÀ", "CP"] },
  { id: "bakery", name: "Bánh, Trứng & Sữa", priority: 5, emoji: "🥚", matches: ["BÁNH SỮA", "TRỨNG"] },
  { id: "spices", name: "Gia vị", priority: 6, emoji: "🧂", matches: ["GIA VỊ"] },
  { id: "dried", name: "Đồ khô & Gạo", priority: 7, emoji: "🍚", matches: ["ĐỒ KHÔ", "GẠO", "BÚN"] },
  { id: "vegan", name: "Mặt hàng chay", priority: 8, emoji: "🌱", matches: ["CHAY", "ĐK"] },
  { id: "tools", name: "Công cụ & Vật tư", priority: 9, emoji: "🧰", matches: ["CÔNG CỤ", "NONFOOD"] },
] as const;

export function mapToSuperCategory(rawName = "") {
  const upper = rawName.toUpperCase();
  return GROUPS.find((group) => group.matches.some((match) => upper.includes(match))) || {
    id: "other",
    name: "Khác",
    priority: 10,
    emoji: "📦",
    matches: [] as readonly string[],
  };
}

export function buildCatalogCategories(rawCategories: string[]): CatalogCategory[] {
  const grouped = new Map<string, CatalogCategory>();
  for (const rawName of rawCategories.filter(Boolean)) {
    const group = mapToSuperCategory(rawName);
    const current = grouped.get(group.id);
    if (current) {
      current.rawCategories.push(rawName);
    } else {
      grouped.set(group.id, {
        id: group.id,
        name: group.name,
        image: "",
        rawCategories: [rawName],
        priority: group.priority,
        emoji: group.emoji,
      });
    }
  }
  return [...grouped.values()].sort((a, b) => a.priority - b.priority);
}

function toProduct(item: ApiProduct): Product {
  const group = mapToSuperCategory(item.category || "");
  const price = Number(item.price) || 0;
  return {
    id: item.id,
    sku: item.sku || "",
    name: item.name,
    unit: item.unit || "Kg",
    price,
    originalPrice: price,
    priceOnRequest: Boolean(item.priceOnRequest || price <= 0),
    image: item.thumbUrl || item.imageUrl || logoUrl,
    category: { id: group.id, name: group.name, image: "" },
    categoryId: group.id,
    detail: "",
  };
}

function authHeaders(sessionToken?: string) {
  return sessionToken ? { Authorization: `Bearer ${sessionToken}` } : undefined;
}

export async function fetchCatalogCategories(): Promise<CatalogCategory[]> {
  const response = await fetch(`${CONFIG.API_BASE}/api/customer/products?meta=1`);
  const payload = await response.json();
  if (!response.ok || !payload?.ok) throw new Error(payload?.error || "Không tải được danh mục");
  return buildCatalogCategories(Array.isArray(payload.categories) ? payload.categories : []);
}

export async function fetchProductPage(options: {
  page?: number;
  search?: string;
  category?: CatalogCategory | Category;
  id?: string | number;
  ids?: Array<string | number>;
  sessionToken?: string;
} = {}) {
  const params = new URLSearchParams({ page: String(options.page || 0) });
  if (options.search) params.set("search", options.search.trim());
  if (options.id != null) params.set("id", String(options.id));
  if (options.ids?.length) params.set("ids", options.ids.slice(0, 30).map(String).join(","));
  const rawCategories = (options.category as CatalogCategory | undefined)?.rawCategories;
  if (rawCategories?.length) params.set("categories", rawCategories.join("|"));

  const response = await fetch(`${CONFIG.API_BASE}/api/customer/products?${params}`, {
    headers: authHeaders(options.sessionToken),
  });
  const payload = (await response.json()) as ProductPageResponse;
  if (!response.ok || !payload?.ok) throw new Error(payload?.error || "Không tải được sản phẩm");
  return {
    ...payload,
    products: (payload.products || []).map(toProduct),
  };
}
