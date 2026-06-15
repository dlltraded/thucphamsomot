type SupabaseRow<T> = {
  slug: string;
  title?: string;
  data: T;
  position?: number | null;
  published_at?: string | null;
  featured?: boolean | null;
};

type UpsertOptions<T> = {
  getSlug: (item: T) => string;
  getTitle?: (item: T) => string;
  getPublishedAt?: (item: T) => string | undefined;
  getFeatured?: (item: T) => boolean | undefined;
};

const tableNames = {
  products: "products",
  news: "news",
  knowledge: "knowledge",
} as const;

export type ContentTable = keyof typeof tableNames;

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !key) return null;

  return {
    url: url.replace(/\/+$/, ""),
    key,
  };
}

export function isSupabaseContentEnabled() {
  return Boolean(getSupabaseConfig());
}

function getRestUrl(table: ContentTable, query = "") {
  const config = getSupabaseConfig();
  if (!config) return null;
  return `${config.url}/rest/v1/${tableNames[table]}${query}`;
}

function getHeaders(extra?: HeadersInit) {
  const config = getSupabaseConfig();
  if (!config) return null;

  return {
    apikey: config.key,
    Authorization: `Bearer ${config.key}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function requestSupabase<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Supabase request failed ${response.status}: ${text.slice(0, 300)}`);
  }

  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export async function readSupabaseItems<T>(table: ContentTable): Promise<T[] | null> {
  const url = getRestUrl(table, "?select=data,position,published_at,featured&order=position.asc.nullslast");
  const headers = getHeaders();
  if (!url || !headers) return null;

  const rows = await requestSupabase<Array<SupabaseRow<T>>>(url, { method: "GET", headers });
  return rows.map((row) => row.data);
}

export async function saveSupabaseItems<T>(
  table: ContentTable,
  items: T[],
  options: UpsertOptions<T>,
): Promise<void> {
  const url = getRestUrl(table, "?on_conflict=slug");
  const headers = getHeaders({ Prefer: "resolution=merge-duplicates,return=minimal" });
  if (!url || !headers) throw new Error("Missing Supabase configuration.");

  const rows = items.map((item, index) => ({
    slug: options.getSlug(item),
    title: options.getTitle?.(item) ?? options.getSlug(item),
    data: item,
    position: index,
    published_at: options.getPublishedAt?.(item) ?? null,
    featured: options.getFeatured?.(item) ?? false,
  }));

  await requestSupabase<void>(url, {
    method: "POST",
    headers,
    body: JSON.stringify(rows),
  });
}

export async function upsertSupabaseItem<T>(
  table: ContentTable,
  item: T,
  position: number,
  options: UpsertOptions<T>,
): Promise<void> {
  const url = getRestUrl(table, "?on_conflict=slug");
  const headers = getHeaders({ Prefer: "resolution=merge-duplicates,return=minimal" });
  if (!url || !headers) throw new Error("Missing Supabase configuration.");

  const row = {
    slug: options.getSlug(item),
    title: options.getTitle?.(item) ?? options.getSlug(item),
    data: item,
    position,
    published_at: options.getPublishedAt?.(item) ?? null,
    featured: options.getFeatured?.(item) ?? false,
  };

  await requestSupabase<void>(url, {
    method: "POST",
    headers,
    body: JSON.stringify(row),
  });
}

export async function deleteSupabaseItem(table: ContentTable, slug: string): Promise<boolean> {
  const url = getRestUrl(table, `?slug=eq.${encodeURIComponent(slug)}`);
  const headers = getHeaders({ Prefer: "return=representation" });
  if (!url || !headers) throw new Error("Missing Supabase configuration.");

  const deleted = await requestSupabase<Array<{ slug: string }>>(url, { method: "DELETE", headers });
  return deleted.length > 0;
}
