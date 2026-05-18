import { MessageCircle, Phone } from "lucide-react";
import { siteConfig } from "@/lib/site";

const phoneHref = `tel:${siteConfig.phone.replace(/\s+/g, "")}`;
const zaloHref = `https://zalo.me/${siteConfig.zalo}`;

export function SocialWidget() {
  return (
    <div className="social-widget" aria-label="Kênh liên hệ nhanh">
      <a className="social-widget__item social-widget__item--phone" href={phoneHref} aria-label={`Gọi ${siteConfig.phone}`}>
        <Phone size={19} />
        <span>Gọi</span>
      </a>
      <a className="social-widget__item social-widget__item--zalo" href={zaloHref} target="_blank" rel="noreferrer" aria-label="Liên hệ Zalo">
        <MessageCircle size={19} />
        <span>Zalo</span>
      </a>
      <a
        className="social-widget__item social-widget__item--facebook"
        href={siteConfig.facebook}
        target="_blank"
        rel="noreferrer"
        aria-label="Liên hệ Facebook"
      >
        <span className="social-widget__brand-mark">f</span>
        <span>Facebook</span>
      </a>
    </div>
  );
}
