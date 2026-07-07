import type { Metadata } from "next";
import { siteConfig } from "@/lib/site";

const languageAlternates: Record<string, Record<string, string>> = {
  "/": { vi: "/", en: "/en" },
  "/en": { vi: "/", en: "/en" },
  "/gioi-thieu": { vi: "/gioi-thieu", en: "/en/about" },
  "/en/about": { vi: "/gioi-thieu", en: "/en/about" },
  "/san-pham": { vi: "/san-pham", en: "/en/products" },
  "/en/products": { vi: "/san-pham", en: "/en/products" },
  "/nganh-hang/bep-an-tap-the": { vi: "/nganh-hang/bep-an-tap-the", en: "/en/ingredients" },
  "/en/ingredients": { vi: "/nganh-hang/bep-an-tap-the", en: "/en/ingredients" },
  "/kien-thuc": { vi: "/kien-thuc", en: "/en/recipes" },
  "/en/recipes": { vi: "/kien-thuc", en: "/en/recipes" },
  "/tin-tuc": { vi: "/tin-tuc", en: "/en/news" },
  "/en/news": { vi: "/tin-tuc", en: "/en/news" },
  "/lien-he": { vi: "/lien-he", en: "/en/contact" },
  "/en/contact": { vi: "/lien-he", en: "/en/contact" },
  "/bao-gia": { vi: "/bao-gia", en: "/en/bao-gia" },
  "/en/bao-gia": { vi: "/bao-gia", en: "/en/bao-gia" },
};

function buildAlternateLanguages(path: string | undefined) {
  if (!path) return undefined;
  const alternate = languageAlternates[path];
  if (!alternate) return undefined;
  return alternate;
}

export function makeMetadata(params: {
  title: string;
  description?: string;
  path?: string;
  robots?: Metadata["robots"];
  ogTitle?: string;
  ogSubtitle?: string;
}): Metadata {
  const title = params.title;
  const description = params.description ?? siteConfig.description;
  const url = new URL(params.path ?? "/", siteConfig.url).toString();
  
  // Use dynamic OG image if ogTitle is provided
  let image = new URL(siteConfig.shareImage, siteConfig.url).toString();
  if (params.ogTitle) {
    const ogUrl = new URL("/api/og", siteConfig.url);
    ogUrl.searchParams.set("title", params.ogTitle);
    if (params.ogSubtitle) {
      ogUrl.searchParams.set("subtitle", params.ogSubtitle);
    }
    image = ogUrl.toString();
  }

  const alternateLanguages = buildAlternateLanguages(params.path);
  const locale = params.path?.startsWith("/en") ? "en_US" : "vi_VN";
  const alternateLocale = locale === "en_US" ? ["vi_VN"] : ["en_US"];

  return {
    title,
    description,
    robots: params.robots,
    openGraph: {
      title,
      description,
      url,
      siteName: siteConfig.name,
      type: "website",
      locale,
      alternateLocale,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    alternates: {
      canonical: url,
      languages: alternateLanguages,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}
