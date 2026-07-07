"use client";

import { MessageCircle, Phone } from "lucide-react";
import { usePathname } from "next/navigation";
import { siteConfig, type Locale } from "@/lib/site";

const phoneHref = `tel:${siteConfig.phone.replace(/\s+/g, "")}`;
const zaloHref = `https://zalo.me/${siteConfig.zaloOaId}`;

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
        <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
        <span>Facebook</span>
      </a>
    </div>
  );
}
