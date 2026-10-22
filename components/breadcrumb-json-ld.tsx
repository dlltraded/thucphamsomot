import { siteConfig } from "@/lib/site";

export type BreadcrumbItem = {
  name: string;
  // Absolute URL or site path ("/danh-muc").
  item: string;
};

export function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }) {
  if (items.length === 0) return null;

  const payload = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: crumb.item.startsWith("http") ? crumb.item : `${siteConfig.url}${crumb.item}`,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
