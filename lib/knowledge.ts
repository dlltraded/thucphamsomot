import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";
import { posts as defaultKnowledgeSource } from "@/lib/content";

const knowledgeSectionSchema = z.object({
  heading: z.string().min(1),
  body: z.string().min(1),
  items: z.array(z.string().min(1)).optional(),
});

const knowledgeFaqSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
});

const knowledgeItemSchema = z.object({
  slug: z.string().min(1).optional(),
  title: z.string().min(3),
  description: z.string().min(10),
  sections: z.array(knowledgeSectionSchema).default([]),
  faqs: z.array(knowledgeFaqSchema).default([]),
});

export type KnowledgeSection = z.infer<typeof knowledgeSectionSchema>;
export type KnowledgeFaq = z.infer<typeof knowledgeFaqSchema>;
export type KnowledgeArticle = z.infer<typeof knowledgeItemSchema> & {
  slug: string;
};

export const knowledgeArticleInputSchema = knowledgeItemSchema;

const knowledgeFile = path.join(process.cwd(), "data", "knowledge.json");

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeKnowledgeArticle(raw: z.infer<typeof knowledgeItemSchema>): KnowledgeArticle {
  return {
    ...raw,
    slug: raw.slug?.trim() || slugify(raw.title),
    sections: raw.sections ?? [],
    faqs: raw.faqs ?? [],
  };
}

function cloneDefaultKnowledgeArticles(): KnowledgeArticle[] {
  return defaultKnowledgeSource.map((item) =>
    normalizeKnowledgeArticle({
      slug: item.slug,
      title: item.title,
      description: item.description ?? item.title,
      sections: item.sections ?? [],
      faqs: item.faqs ?? [],
    }),
  );
}

async function readJsonFile() {
  const raw = await fs.readFile(knowledgeFile, "utf8");
  const parsed = JSON.parse(raw) as { articles?: unknown } | unknown;
  const articles = Array.isArray(parsed)
    ? parsed
    : typeof parsed === "object" && parsed !== null && Array.isArray((parsed as { articles?: unknown }).articles)
      ? (parsed as { articles: unknown[] }).articles
      : [];
  return articles;
}

export async function readKnowledgeArticles(): Promise<KnowledgeArticle[]> {
  try {
    const rawArticles = await readJsonFile();
    const parsed = z.array(knowledgeItemSchema).safeParse(rawArticles);
    if (parsed.success) {
      return parsed.data.map(normalizeKnowledgeArticle);
    }
  } catch {
    // Fallback below.
  }

  return cloneDefaultKnowledgeArticles();
}

export async function readKnowledgeArticle(slug: string): Promise<KnowledgeArticle | null> {
  const articles = await readKnowledgeArticles();
  return articles.find((article) => article.slug === slug) ?? null;
}

export async function saveKnowledgeArticles(articles: KnowledgeArticle[]) {
  await fs.mkdir(path.dirname(knowledgeFile), { recursive: true });
  await fs.writeFile(knowledgeFile, JSON.stringify({ articles }, null, 2), "utf8");
}

export async function upsertKnowledgeArticle(input: z.infer<typeof knowledgeItemSchema>) {
  const article = normalizeKnowledgeArticle(input);
  const articles = await readKnowledgeArticles();
  const index = articles.findIndex((item) => item.slug === article.slug);
  const next = index >= 0 ? articles.map((item) => (item.slug === article.slug ? article : item)) : [article, ...articles];
  await saveKnowledgeArticles(next);
  return article;
}

export async function deleteKnowledgeArticle(slug: string) {
  const articles = await readKnowledgeArticles();
  const next = articles.filter((article) => article.slug !== slug);
  await saveKnowledgeArticles(next);
  return next.length !== articles.length;
}

