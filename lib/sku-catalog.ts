// Public product catalog read from the KiotViet-synced Supabase `products` table.
// Shared by the /api/sku-products route (client search) and server-rendered
// catalog pages, so Google sees product names in the initial HTML.

export const SKU_PAGE_SIZE = 24;

export type SkuGroup = {
  slug: string;
  label: string;
  labelEn: string;
  // Exact `products.category` values (KiotViet nhóm hàng) in this group.
  categories: string[];
  image: string;
  // Has its own /danh-muc/[slug] landing page.
  hasPage: boolean;
};

export const SKU_GROUPS: SkuGroup[] = [
  { slug: "rau-cu-qua", label: "Rau củ quả", labelEn: "Produce", categories: ["Rau củ quả", "Trái cây"], image: "/images/tps1-vegetables.jpg", hasPage: true },
  { slug: "thit-heo", label: "Thịt heo", labelEn: "Pork", categories: ["Thịt heo"], image: "/images/tps1-meat-seafood.png", hasPage: true },
  { slug: "thit-bo", label: "Thịt bò", labelEn: "Beef", categories: ["Thịt bò"], image: "/images/tps1-meat-seafood.png", hasPage: true },
  { slug: "gia-cam", label: "Gia cầm", labelEn: "Poultry", categories: ["Gà, vịt"], image: "/images/tps1-meat-seafood.png", hasPage: true },
  { slug: "hai-san", label: "Hải sản", labelEn: "Seafood", categories: ["Hải sản"], image: "/images/tps1-meat-seafood.png", hasPage: true },
  { slug: "hang-dong-lanh", label: "Hàng đông lạnh", labelEn: "Frozen", categories: ["Đông lạnh"], image: "/images/tps1-frozen.png", hasPage: true },
  { slug: "gia-vi", label: "Gia vị", labelEn: "Seasonings", categories: ["Gia vị"], image: "/images/tps1-spices.png", hasPage: true },
  { slug: "do-kho", label: "Đồ khô", labelEn: "Dry goods", categories: ["Đồ khô"], image: "/images/tps1-spices.png", hasPage: true },
  { slug: "thuc-pham-chay", label: "Thực phẩm chay", labelEn: "Vegetarian", categories: ["Chay, chả giò", "Đậu hũ"], image: "/images/tps1-vegan.png", hasPage: true },
  { slug: "thiet-bi-bep", label: "Dụng cụ bếp", labelEn: "Kitchen tools", categories: ["Công cụ dụng cụ"], image: "/images/tps1_tools_placeholder.png", hasPage: false },
];

// Slugs used by the catalog before 10/2026; kept so old links and cached
// clients still filter correctly.
const LEGACY_GROUP_SLUGS: Record<string, string> = {
  "rau-cu": "rau-cu-qua",
  "ga-vit": "gia-cam",
  "dong-lanh": "hang-dong-lanh",
  "gao-mi": "do-kho",
};

export function findSkuGroup(slug: string | null | undefined) {
  if (!slug) return undefined;
  const normalized = LEGACY_GROUP_SLUGS[slug] ?? slug;
  return SKU_GROUPS.find((group) => group.slug === normalized);
}

export interface SkuProduct {
  id: string;
  slug: string;
  name: string;
  category: string;      // group slug: 'rau-cu-qua'
  categoryLabel: string; // KiotViet label: 'Rau củ quả'
  unit: string;
  price: number;
  image: string;
}

export type SkuPage = {
  products: SkuProduct[];
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
};

type RawProduct = {
  id: string | number;
  local_product_id: string | number | null;
  name: string;
  category: string | null;
  unit: string | null;
  price_retail: number | string | null;
  price_wholesale: number | string | null;
  image_url: string | null;
};

function groupForCategory(category: string | null) {
  if (!category) return undefined;
  return SKU_GROUPS.find((group) => group.categories.includes(category));
}

// PostgREST `in.(...)` list with each value double-quoted (values contain commas).
function inList(values: string[]) {
  return `in.(${values.map((value) => `"${value.replace(/"/g, '\\"')}"`).join(",")})`;
}

export function isSkuCatalogConfigured() {
  return Boolean(process.env.SUPABASE_PRODUCTS_URL && process.env.SUPABASE_PRODUCTS_ANON_KEY);
}

export async function getSkuPage(params: {
  group?: string;
  q?: string;
  page?: number;
  // Seconds to cache the Supabase response in the Next.js data cache; 0 = no-store.
  revalidate?: number;
}): Promise<SkuPage> {
  const url = process.env.SUPABASE_PRODUCTS_URL || "";
  const key = process.env.SUPABASE_PRODUCTS_ANON_KEY || "";
  if (!url || !key) throw new Error("Supabase products not configured");

  const page = Math.max(1, Math.floor(params.page ?? 1));
  const offset = (page - 1) * SKU_PAGE_SIZE;

  const qs = new URLSearchParams({
    select: "id,local_product_id,name,category,unit,price_retail,price_wholesale,image_url",
    active: "eq.true",
    order: "category.desc,name.asc",
    limit: String(SKU_PAGE_SIZE),
    offset: String(offset),
  });

  const group = findSkuGroup(params.group);
  if (group) qs.set("category", inList(group.categories));

  const q = params.q?.trim();
  if (q) qs.set("name", `ilike.*${q}*`);

  const revalidate = params.revalidate ?? 0;
  const res = await fetch(`${url}/rest/v1/products?${qs.toString()}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
      Prefer: "count=exact",
    },
    ...(revalidate > 0 ? { next: { revalidate } } : { cache: "no-store" as const }),
  });

  // PostgREST answers 416 when the offset is past the last row.
  if (res.status === 416) {
    const total = res.headers.get("content-range")?.match(/\/(\d+)/);
    const totalCount = total ? parseInt(total[1], 10) : 0;
    return { products: [], totalCount, totalPages: Math.max(1, Math.ceil(totalCount / SKU_PAGE_SIZE)), page, pageSize: SKU_PAGE_SIZE };
  }

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Supabase products ${res.status}: ${txt.slice(0, 200)}`);
  }

  const raw = (await res.json()) as RawProduct[];
  const match = res.headers.get("content-range")?.match(/\/(\d+)/);
  const totalCount = match ? parseInt(match[1], 10) : raw.length;

  const products = raw.map((p): SkuProduct => {
    const rowGroup = groupForCategory(p.category);
    const id = String(p.local_product_id || p.id);
    return {
      id,
      slug: id,
      name: p.name,
      category: rowGroup?.slug ?? "other",
      categoryLabel: p.category || "",
      unit: (p.unit || "kg").toLowerCase(),
      price: Number(p.price_retail) || Number(p.price_wholesale) || 0,
      image: p.image_url || rowGroup?.image || "/images/tps1-cover-food.jpg",
    };
  });

  return {
    products,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / SKU_PAGE_SIZE)),
    page,
    pageSize: SKU_PAGE_SIZE,
  };
}
