import type { MetadataRoute } from "next";
import { categories, industries, policies, products, services } from "@/lib/content";
import { getAllBlogPosts } from "@/lib/blog";
import { siteConfig } from "@/lib/site";

const staticPaths = [
  "/",
  "/en",
  "/en/about",
  "/en/products",
  "/en/ingredients",
  "/en/blog",
  "/en/contact",
  "/gioi-thieu",
  "/san-pham",
  "/blog",
  "/lien-he",
  "/bao-gia",
  "/en/bao-gia",
  "/ho-so-nang-luc",
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
  const now = new Date();
  const pages = staticPaths.map((path) => ({ url: `${siteConfig.url}${path}`, lastModified: now }));
  const blogPosts = await getAllBlogPosts();
  const dynamic = [
    ...categories.map((item) => `${siteConfig.url}/danh-muc/${item.slug}`),
    ...industries.map((item) => `${siteConfig.url}/nganh-hang/${item.slug}`),
    ...services.map((item) => `${siteConfig.url}/dich-vu/${item.slug}`),
    ...products.map((item) => `${siteConfig.url}/san-pham/${item.slug}`),
    ...blogPosts.map((item) => `${siteConfig.url}/blog/${item.slug}`),
    ...policies.map((item) => `${siteConfig.url}/chinh-sach/${item.slug}`),
  ].map((url) => ({ url, lastModified: now }));

  return [...pages, ...dynamic];
}
