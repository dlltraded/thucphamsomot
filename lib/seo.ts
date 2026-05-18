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
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}
