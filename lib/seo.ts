import type { Metadata } from "next";
import { siteConfig } from "@/lib/site";

export function makeMetadata(params: {
  title: string;
  description?: string;
  path?: string;
}): Metadata {
  const title = params.title;
  const description = params.description ?? siteConfig.description;
  const url = new URL(params.path ?? "/", siteConfig.url).toString();
  const image = new URL(siteConfig.shareImage, siteConfig.url).toString();

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: siteConfig.name,
      type: "website",
      images: [
        {
          url: image,
          width: 3000,
          height: 1688,
          alt: siteConfig.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}
