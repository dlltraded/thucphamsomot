import type { MetadataRoute } from "next";
import { categories, industries, policies, products, services } from "@/lib/content";
import { readKnowledgeArticles } from "@/lib/knowledge";
import { siteConfig } from "@/lib/site";

const staticPaths = [
  "/",
  "/gioi-thieu",
  "/san-pham",
  "/kien-thuc",
  "/lien-he",
  "/bao-gia",
  "/ho-so-nang-luc",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const pages = staticPaths.map((path) => ({ url: `${siteConfig.url}${path}`, lastModified: now }));
  const knowledgePosts = await readKnowledgeArticles();
  const dynamic = [
    ...categories.map((item) => `${siteConfig.url}/danh-muc/${item.slug}`),
    ...industries.map((item) => `${siteConfig.url}/nganh-hang/${item.slug}`),
    ...services.map((item) => `${siteConfig.url}/dich-vu/${item.slug}`),
    ...products.map((item) => `${siteConfig.url}/san-pham/${item.slug}`),
    ...knowledgePosts.map((item) => `${siteConfig.url}/kien-thuc/${item.slug}`),
    ...policies.map((item) => `${siteConfig.url}/chinh-sach/${item.slug}`),
  ].map((url) => ({ url, lastModified: now }));

  return [...pages, ...dynamic];
}
