import { siteConfig } from "@/lib/site";

type ArticleJsonLdProps = {
  title: string;
  description: string;
  url: string;
  image: string;
  author?: string;
  datePublished?: string;
  dateModified?: string;
  type?: "Article" | "BlogPosting";
};

export function ArticleJsonLd({
  title,
  description,
  url,
  image,
  author = siteConfig.name,
  datePublished,
  dateModified,
  type = "Article",
}: ArticleJsonLdProps) {
  const payload = {
    "@context": "https://schema.org",
    "@type": type,
    headline: title,
    description,
    image,
    mainEntityOfPage: url,
    author: {
      "@type": "Organization",
      name: author,
    },
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      logo: {
        "@type": "ImageObject",
        url: new URL(siteConfig.shareImage, siteConfig.url).toString(),
      },
    },
    ...(datePublished ? { datePublished } : {}),
    ...(dateModified ? { dateModified } : {}),
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }} />;
}
