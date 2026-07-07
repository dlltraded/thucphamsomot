import { siteConfig } from "@/lib/site";

type BreadcrumbItem = {
  name: string;
  item: string;
};

type SeoJsonLdProps = {
  includeWebsite?: boolean;
  breadcrumbs?: BreadcrumbItem[];
};

export function SeoJsonLd({ includeWebsite = true, breadcrumbs }: SeoJsonLdProps) {
  const localBusiness = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: siteConfig.name,
    alternateName: siteConfig.englishName,
    url: siteConfig.url,
    logo: new URL(siteConfig.shareImage, siteConfig.url).toString(),
    image: new URL(siteConfig.shareImage, siteConfig.url).toString(),
    description: siteConfig.description,
    email: siteConfig.email,
    telephone: `+84${siteConfig.zalo.slice(1)}`,
    priceRange: "$$",
    address: {
      "@type": "PostalAddress",
      streetAddress: "B19 KP15",
      addressLocality: "Biên Hòa",
      addressRegion: "Đồng Nai",
      addressCountry: "VN",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 10.959005,
      longitude: 106.874411,
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer service",
        telephone: `+84${siteConfig.zalo.slice(1)}`,
        email: siteConfig.email,
        availableLanguage: ["vi", "en"],
      },
    ],
    sameAs: [siteConfig.facebook],
    areaServed: siteConfig.localities,
  };

  const website = includeWebsite
    ? {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: siteConfig.name,
        url: siteConfig.url,
        description: siteConfig.description,
      }
    : null;

  const breadcrumbList = breadcrumbs
    ? {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: breadcrumbs.map((crumb, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: crumb.name,
          item: crumb.item.startsWith("http") ? crumb.item : `${siteConfig.url}${crumb.item}`,
        })),
      }
    : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusiness) }}
      />
      {website ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }}
        />
      ) : null}
      {breadcrumbList ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbList) }}
        />
      ) : null}
    </>
  );
}
