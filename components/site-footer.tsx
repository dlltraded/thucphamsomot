"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";
import { usePathname } from "next/navigation";
import { siteConfig, type Locale } from "@/lib/site";
import { brandAssets, customerHighlights } from "@/lib/brand";

const footerText = {
  vi: {
    description:
      "Website catalog và báo giá riêng cho khách B2B. Tập trung vào bếp ăn, nhà máy, trường học, bệnh viện và các đơn vị cần nguồn cung thực phẩm định kỳ.",
    contact: "Liên hệ",
    served: "Đã phục vụ",
    mapTitle: "Bản đồ công ty",
    mapCopy: "Xem vị trí giao dịch và khu vực phục vụ thực tế của TPS1 tại Đồng Nai.",
    mapLink: "Mở Google Maps",
    mapIframeTitle: "Bản đồ Thực Phẩm Số Một",
    quoteHref: "/bao-gia",
    quoteLabel: "Mở form báo giá",
    adminLabel: "Quản trị nội dung",
    address: siteConfig.address,
    customers: customerHighlights.slice(0, 5),
  },
  en: {
    description:
      "A B2B food catalog and quote-request website for canteens, factories, schools, hospitals, and organizations that need recurring food supply.",
    contact: "Contact",
    served: "Serving",
    mapTitle: "Company map",
    mapCopy: "View TPS1 location and service area in Dong Nai.",
    mapLink: "Open Google Maps",
    mapIframeTitle: "Thuc Pham So Mot map",
    quoteHref: "/en/bao-gia",
    quoteLabel: "Open quote form",
    adminLabel: "Content admin",
    address: siteConfig.englishAddress,
    customers: ["Factories", "Canteens", "Schools", "Hospitals", "Restaurants"],
  },
} satisfies Record<
  Locale,
  {
    description: string;
    contact: string;
    served: string;
    mapTitle: string;
    mapCopy: string;
    mapLink: string;
    mapIframeTitle: string;
    quoteHref: string;
    quoteLabel: string;
    adminLabel: string;
    address: string;
    customers: string[];
  }
>;

export function SiteFooter() {
  const pathname = usePathname();
  const locale: Locale = pathname.startsWith("/en") ? "en" : "vi";
  const text = footerText[locale];

  return (
    <footer className="site-footer">
      <div className="container-shell site-footer__inner">
        <div className="site-footer__brand">
          <Image src={brandAssets.logoTransparent} alt={siteConfig.name} width={180} height={60} />
          <p>{text.description}</p>
        </div>

        <div>
          <h4>{text.contact}</h4>
          <ul className="site-footer__links">
            <li>
              <Phone size={14} />
              <a href={`tel:${siteConfig.phone.replace(/\s+/g, "")}`}>{siteConfig.phone}</a>
            </li>
            <li>
              <Mail size={14} />
              <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>
            </li>
            <li>
              <MapPin size={14} />
              <span>{text.address}</span>
            </li>
          </ul>
        </div>

        <div>
          <h4>{text.served}</h4>
          <ul className="site-footer__links">
            {text.customers.map((item) => (
              <li key={item}>
                <ArrowUpRight size={14} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="container-shell site-footer__map">
        <div className="site-footer__map-copy">
          <h4>{text.mapTitle}</h4>
          <p>{text.mapCopy}</p>
          <a href={siteConfig.mapPlaceUrl} target="_blank" rel="noreferrer">
            {text.mapLink}
          </a>
        </div>
        <div className="site-footer__map-frame">
          <iframe
            src={siteConfig.mapEmbedUrl}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title={text.mapIframeTitle}
          />
        </div>
      </div>

      <div className="container-shell site-footer__bottom">
        <span>thucphamsomot.vn</span>
        <div className="site-footer__bottom-links">
          <Link href={text.quoteHref}>{text.quoteLabel}</Link>
          <Link href="/quan-tri">{text.adminLabel}</Link>
        </div>
      </div>
    </footer>
  );
}
