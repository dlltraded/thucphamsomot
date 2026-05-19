import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";
import { siteConfig } from "@/lib/site";
import { brandAssets, customerHighlights } from "@/lib/brand";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container-shell site-footer__inner">
        <div className="site-footer__brand">
          <Image src={brandAssets.logoTransparent} alt={siteConfig.name} width={180} height={60} />
          <p>
            Website catalog và báo giá riêng cho khách B2B. Tập trung vào bếp ăn, nhà máy, trường học, bệnh viện và các
            đơn vị cần nguồn cung thực phẩm định kỳ.
          </p>
        </div>

        <div>
          <h4>Liên hệ</h4>
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
              <span>{siteConfig.address}</span>
            </li>
          </ul>
        </div>

        <div>
          <h4>Đã phục vụ</h4>
          <ul className="site-footer__links">
            {customerHighlights.slice(0, 5).map((item) => (
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
          <h4>Bản đồ công ty</h4>
          <p>Xem vị trí giao dịch và khu vực phục vụ thực tế của TPS1 tại Đồng Nai.</p>
          <a href={siteConfig.mapPlaceUrl} target="_blank" rel="noreferrer">
            Mở Google Maps
          </a>
        </div>
        <div className="site-footer__map-frame">
          <iframe
            src={siteConfig.mapEmbedUrl}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Bản đồ Thực Phẩm Số Một"
          />
        </div>
      </div>

      <div className="container-shell site-footer__bottom">
        <span>thucphamsomot.vn</span>
        <div className="site-footer__bottom-links">
          <Link href="/bao-gia">Mở form báo giá</Link>
          <Link href="/quan-tri">Quản trị nội dung</Link>
        </div>
      </div>
    </footer>
  );
}
