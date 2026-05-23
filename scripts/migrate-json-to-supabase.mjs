import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

loadEnvFile(".env.local");
loadEnvFile(".env");

const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const migrations = [
  {
    table: "products",
    file: "products.json",
    key: "products",
    getSlug: (item) => item.slug,
    getTitle: (item) => item.title,
  },
  {
    table: "news",
    file: "news.json",
    key: "articles",
    getSlug: (item) => item.slug,
    getTitle: (item) => item.title,
    getPublishedAt: (item) => item.publishedAt,
    getFeatured: (item) => item.featured,
  },
  {
    table: "knowledge",
    file: "knowledge.json",
    key: "articles",
    getSlug: (item) => item.slug,
    getTitle: (item) => item.title,
  },
];

for (const migration of migrations) {
  const items = await readDataFile(migration.file, migration.key);
  if (!items.length) {
    console.log(`Skip ${migration.table}: data/${migration.file} is missing or empty.`);
    continue;
  }

  await upsertRows(migration, items);
  console.log(`Migrated ${items.length} item(s) to ${migration.table}.`);
}

async function readDataFile(fileName, key) {
  const filePath = path.join(root, "data", fileName);
  if (!existsSync(filePath)) return [];

  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(raw);

  if (Array.isArray(parsed)) return parsed;
  if (parsed && Array.isArray(parsed[key])) return parsed[key];

  return [];
}

async function upsertRows(migration, items) {
  const rows = items.map((item, index) => ({
    slug: migration.getSlug(item),
    title: migration.getTitle(item),
    data: item,
    position: index,
    published_at: migration.getPublishedAt?.(item) ?? null,
    featured: migration.getFeatured?.(item) ?? false,
  }));

  const response = await fetch(`${supabaseUrl}/rest/v1/${migration.table}?on_conflict=slug`, {
    method: "POST",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to migrate ${migration.table}: ${response.status} ${text}`);
  }
}

function loadEnvFile(fileName) {
  const filePath = path.join(root, fileName);
  if (!existsSync(filePath)) return;

  const raw = readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/g)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const index = trimmed.indexOf("=");
    if (index === -1) continue;

    const key = trimmed.slice(0, index).trim();
    const value = trimmed
      .slice(index + 1)
      .trim()
      .replace(/^["']|["']$/g, "");

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}
