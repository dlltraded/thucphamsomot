import type { Metadata } from "next";
import "./fonts.css";
import "./page-shell-base.css";
import "./globals.css";
import "./quick-quote.css";
import "./segment-landing.css";
import "./blog-content.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CompanyProfileWidget } from "@/components/company-profile-widget";
import { SeoJsonLd } from "@/components/seo-json-ld";
import { SocialWidget } from "@/components/social-widget";
import { CartProvider } from "@/lib/cart-context";
import { siteConfig } from "@/lib/site";
import { FloatingCart } from "@/components/floating-cart";
import { MetaPixel } from "@/components/meta-pixel";
import { CustomerSessionProvider } from "@/lib/customer-session-context";
import { GoogleAdsTag } from "@/components/google-ads-tag";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.name,
    // Short brand suffix keeps page titles within Google's ~65-character display.
    template: "%s | TPS1",
  },
  description: siteConfig.description,
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    type: "website",
    images: [
      {
        url: new URL(siteConfig.shareImage, siteConfig.url).toString(),
        width: 1200,
        height: 630,
        alt: siteConfig.name,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
    images: [new URL(siteConfig.shareImage, siteConfig.url).toString()],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        {/* Site images are resized by wsrv.nl (lib/image-loader.ts); the hero image is the LCP. */}
        <link rel="preconnect" href="https://wsrv.nl" />
      </head>
      <body>
        <GoogleAdsTag />
        <MetaPixel />
        <CustomerSessionProvider>
          <CartProvider>
            <SeoJsonLd />
            <SiteHeader />
            {children}
            <CompanyProfileWidget />
            <SocialWidget />
            <SiteFooter />
            <FloatingCart />
          </CartProvider>
        </CustomerSessionProvider>
      </body>
    </html>
  );
}
