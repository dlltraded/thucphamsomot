import { siteConfig } from "@/lib/site";

type SeoJsonLdProps = {
  includeWebsite?: boolean;
};

export function SeoJsonLd({ includeWebsite = true }: SeoJsonLdProps) {
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    alternateName: siteConfig.englishName,
    url: siteConfig.url,
    logo: new URL(siteConfig.shareImage, siteConfig.url).toString(),
    description: siteConfig.description,
    email: siteConfig.email,
    telephone: `+84${siteConfig.zalo.slice(1)}`,
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer service",
        telephone: `+84${siteConfig.zalo.slice(1)}`,
        email: siteConfig.email,
        availableLanguage: ["vi", "en"],
      },
    ],
    address: {
      "@type": "PostalAddress",
      addressLocality: "Đồng Nai",
      addressCountry: "VN",
    },
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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
      />
      {website ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }}
        />
      ) : null}
    </>
  );
}
