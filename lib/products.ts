import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";
import { products as defaultProducts, type ContentItem, findBySlug } from "@/lib/content";

const productSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(2),
  summary: z.string().min(4).optional(),
  features: z.array(z.string()).optional(),
  image: z.string().optional(),
});

export type ManagedProduct = z.infer<typeof productSchema>;

const filePath = path.join(process.cwd(), "data", "products.json");

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toManagedProduct(item: ContentItem): ManagedProduct {
  return {
    slug: item.slug,
    title: item.title,
    summary: item.summary ?? item.description ?? item.title,
    features: item.features ?? [],
  };
}

async function readRawProducts() {
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as { products?: unknown } | unknown;
  if (Array.isArray(parsed)) return parsed;
  if (typeof parsed === "object" && parsed !== null && Array.isArray((parsed as { products?: unknown }).products)) {
    return (parsed as { products: unknown[] }).products;
  }
  return [];
}

export async function readManagedProducts(): Promise<ManagedProduct[]> {
  try {
    const raw = await readRawProducts();
    const parsed = z.array(productSchema).safeParse(raw);
    if (parsed.success && parsed.data.length) {
      return parsed.data;
    }
  } catch {
    // Use fallback.
  }
  return defaultProducts.map(toManagedProduct);
}

export async function saveManagedProducts(products: ManagedProduct[]) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify({ products }, null, 2), "utf8");
}

export async function upsertManagedProduct(input: ManagedProduct) {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Du lieu san pham khong hop le." };
  }

  const products = await readManagedProducts();
  const index = products.findIndex((item) => item.slug === parsed.data.slug);
  const next =
    index >= 0 ? products.map((item) => (item.slug === parsed.data.slug ? parsed.data : item)) : [...products, parsed.data];
  await saveManagedProducts(next);
  return { ok: true as const, products: next };
}

export async function replaceProductsFromCsv(csvText: string) {
  const lines = csvText
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean);

  const rows = lines.slice(1).map((line) => line.split(",").map((part) => part.trim()));
  const mapped: ManagedProduct[] = rows
    .map((cols) => {
      const [title = "", slugRaw = "", summary = "", features = "", image = ""] = cols;
      const slug = slugRaw || slugify(title);
      return {
        slug,
        title,
        summary,
        features: features
          ? features
              .split("|")
              .map((item) => item.trim())
              .filter(Boolean)
          : [],
        image: image || undefined,
      };
    })
    .filter((item) => item.title && item.slug);

  const parsed = z.array(productSchema).safeParse(mapped);
  if (!parsed.success || !parsed.data.length) {
    return { ok: false as const, error: "Danh sach CSV khong hop le." };
  }

  const current = await readManagedProducts();
  const merged = [...current];

  for (const incoming of parsed.data) {
    const index = merged.findIndex((item) => item.slug === incoming.slug);
    if (index >= 0) {
      merged[index] = incoming;
    } else {
      merged.push(incoming);
    }
  }

  await saveManagedProducts(merged);
  return { ok: true as const, products: merged };
}

export function buildProductImageMap(products: ManagedProduct[]) {
  const fallback: Record<string, string> = {
    "rau-cu-qua-tuoi-song": "/images/tps1-vegetables.jpg",
    "thit-ca-hai-san-tuoi-song": "/images/tps1-meat-seafood.png",
    "hang-dong-lanh": "/images/tps1-frozen.png",
    "gia-vi-nha-bep": "/images/tps1-spices.png",
    "thuc-pham-chay": "/images/tps1-vegan.png",
  };

  const map: Record<string, string> = {};
  for (const item of products) {
    map[item.slug] =
      item.image ||
      fallback[item.slug] ||
      fallback["rau-cu-qua-tuoi-song"] ||
      "/images/tps1-cover-food.jpg";
  }
  return map;
}

export function toContentProduct(item: ManagedProduct): ContentItem {
  const base = findBySlug(defaultProducts, item.slug);
  return {
    slug: item.slug,
    title: item.title,
    summary: item.summary,
    features: item.features ?? [],
    sections: base?.sections ?? defaultProducts[0].sections,
    faqs: base?.faqs ?? defaultProducts[0].faqs,
  };
}
