import type { MetadataRoute } from "next";
import { categories, industries, policies, services } from "@/lib/content";
import { getAllBlogPosts } from "@/lib/blog";
import { siteConfig } from "@/lib/site";

// Date the page content last changed. Bump it when editing static pages or
// lib/content.ts — Google ignores lastmod values that change on every request.
const CONTENT_UPDATED = new Date("2026-10-22");

const staticPaths = [
  "/",
  "/en",
  "/en/about",
  "/en/products",
  "/en/ingredients",
  "/en/news",
  "/en/recipes",
  "/nganh-hang",
  "/quy-trinh",
  "/chinh-sach-bao-mat",
  "/en/contact",
  "/gioi-thieu",
  "/san-pham",
  "/blog",
  "/lien-he",
  "/bao-gia",
  "/en/bao-gia",
  "/ho-so-nang-luc",
  "/cung-cap-thuc-pham-cho-truong-hoc",
  "/cung-cap-thuc-pham-cho-nha-may",
  "/cung-cap-thuc-pham-cho-co-quan",
  "/cung-cap-thuc-pham-dong-nai",
  "/cung-cap-thuc-pham-bien-hoa",
  "/cung-cap-thuc-pham-nhon-trach",
  "/cung-cap-thuc-pham-tp-hcm",
  "/cung-cap-thuc-pham-binh-duong",
  "/cung-cap-thuc-pham-ba-ria-vung-tau",
  "/cung-cap-thuc-pham-phu-my",
  "/cung-cap-thuc-pham-ho-nai",
  "/cung-cap-thuc-pham-tam-phuoc",
  "/cung-cap-thuc-pham-vinh-cuu",
  "/cung-cap-thuc-pham-kcn-amata",
  "/cung-cap-thuc-pham-trang-bom",
  "/cung-cap-thuc-pham-long-thanh",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entry = (path: string, lastModified: Date = CONTENT_UPDATED) => ({
    url: `${siteConfig.url}${path}`,
    lastModified,
  });
  const blogPosts = await getAllBlogPosts();

  // /san-pham/[slug] group pages now 308 to /danh-muc, so they are not listed.
  return [
    ...staticPaths.map((path) => entry(path)),
    ...categories.map((item) => entry(`/danh-muc/${item.slug}`)),
    ...industries.map((item) => entry(`/nganh-hang/${item.slug}`)),
    ...services.map((item) => entry(`/dich-vu/${item.slug}`)),
    ...blogPosts.map((item) => entry(`/blog/${item.slug}`, new Date(item.publishedAt))),
    ...policies.map((item) => entry(`/chinh-sach/${item.slug}`)),
  ];
}
