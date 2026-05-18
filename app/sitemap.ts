import type { MetadataRoute } from "next";
import { categories, industries, posts, policies, products, services } from "@/lib/content";
import { siteConfig } from "@/lib/site";

const staticPaths = [
  "/",
  "/gioi-thieu",
  "/san-pham",
  "/kien-thuc",
  "/lien-he",
  "/bao-gia",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const pages = staticPaths.map((path) => ({ url: `${siteConfig.url}${path}`, lastModified: now }));
  const dynamic = [
    ...categories.map((item) => `${siteConfig.url}/danh-muc/${item.slug}`),
    ...industries.map((item) => `${siteConfig.url}/nganh-hang/${item.slug}`),
    ...services.map((item) => `${siteConfig.url}/dich-vu/${item.slug}`),
    ...products.map((item) => `${siteConfig.url}/san-pham/${item.slug}`),
    ...posts.map((item) => `${siteConfig.url}/kien-thuc/${item.slug}`),
    ...policies.map((item) => `${siteConfig.url}/chinh-sach/${item.slug}`),
  ].map((url) => ({ url, lastModified: now }));

  return [...pages, ...dynamic];
}
