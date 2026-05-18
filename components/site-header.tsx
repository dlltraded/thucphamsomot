import Image from "next/image";
import Link from "next/link";
import { Phone } from "lucide-react";
import { navItems, siteConfig } from "@/lib/site";
import { brandAssets } from "@/lib/brand";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container-shell site-header__inner">
        <Link href="/" className="site-brand" aria-label="Thực Phẩm Số Một">
          <span className="site-brand__mark">
            <Image src={brandAssets.logoTransparent} alt="TPS1" width={160} height={52} priority />
          </span>
          <span className="site-brand__copy">
            <span className="site-brand__name">{siteConfig.name}</span>
            <span className="site-brand__tag">Thực phẩm B2B · giao định kỳ · đặt hàng theo nhu cầu</span>
          </span>
        </Link>

        <nav className="site-nav">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={item.href === "/bao-gia" ? "site-nav__link site-nav__link--order" : "site-nav__link"}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="site-header__actions">
          <a className="btn-primary site-header__call" href={`tel:${siteConfig.phone.replace(/\s+/g, "")}`}>
            <Phone size={17} />
            {siteConfig.phone}
          </a>
        </div>
      </div>
    </header>
  );
}
