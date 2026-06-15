"use client";

import { MessageCircle, Phone } from "lucide-react";
import { usePathname } from "next/navigation";
import { siteConfig, type Locale } from "@/lib/site";

const phoneHref = `tel:${siteConfig.phone.replace(/\s+/g, "")}`;
const zaloHref = `https://zalo.me/${siteConfig.zalo}`;

const socialText = {
  vi: {
    aria: "Kênh liên hệ nhanh",
    phoneAria: `Gọi ${siteConfig.phone}`,
    phoneLabel: "Gọi",
    zaloAria: "Liên hệ Zalo",
    facebookAria: "Liên hệ Facebook",
  },
  en: {
    aria: "Quick contact channels",
    phoneAria: `Call ${siteConfig.phone}`,
    phoneLabel: "Call",
    zaloAria: "Contact via Zalo",
    facebookAria: "Contact via Facebook",
  },
} satisfies Record<Locale, Record<string, string>>;

export function SocialWidget() {
  const pathname = usePathname();
  const locale: Locale = pathname.startsWith("/en") ? "en" : "vi";
  const text = socialText[locale];

  return (
    <div className="social-widget" aria-label={text.aria}>
      <a className="social-widget__item social-widget__item--phone" href={phoneHref} aria-label={text.phoneAria}>
        <Phone size={19} />
        <span>{text.phoneLabel}</span>
      </a>
      <a className="social-widget__item social-widget__item--zalo" href={zaloHref} target="_blank" rel="noreferrer" aria-label={text.zaloAria}>
        <MessageCircle size={19} />
        <span>Zalo</span>
      </a>
      <a
        className="social-widget__item social-widget__item--facebook"
        href={siteConfig.facebook}
        target="_blank"
        rel="noreferrer"
        aria-label={text.facebookAria}
      >
        <span className="social-widget__brand-mark">f</span>
        <span>Facebook</span>
      </a>
    </div>
  );
}
