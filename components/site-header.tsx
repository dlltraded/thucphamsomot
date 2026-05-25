"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Menu, Phone, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { navItems, siteConfig } from "@/lib/site";
import { brandAssets } from "@/lib/brand";

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header key={pathname} className="site-header">
      <div className="container-shell site-header__inner">
        <Link href="/" className="site-brand" aria-label="Thuc Pham So Mot">
          <span className="site-brand__mark">
            <Image src={brandAssets.logoTransparent} alt="TPS1" width={160} height={52} priority />
          </span>
          <span className="site-brand__copy">
            <span className="site-brand__name">{siteConfig.name}</span>
            <span className="site-brand__tag">Thực phẩm B2B · giao định kỳ · đặt hàng theo nhu cầu</span>
          </span>
        </Link>

        <button
          type="button"
          className="site-menu-toggle"
          aria-expanded={menuOpen}
          aria-controls="site-mobile-nav"
          onClick={() => setMenuOpen((value) => !value)}
        >
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
          <span>{menuOpen ? "Đóng" : "Menu"}</span>
        </button>

        <nav className="site-nav" aria-label="Điều hướng chính">
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

      <div id="site-mobile-nav" className={`site-mobile-nav${menuOpen ? " is-open" : ""}`}>
        <div className="container-shell site-mobile-nav__panel">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={item.href === "/bao-gia" ? "site-mobile-nav__link site-mobile-nav__link--order" : "site-mobile-nav__link"}
              onClick={() => setMenuOpen(false)}
            >
              <span>{item.label}</span>
              {item.href === "/bao-gia" ? <span className="site-mobile-nav__hint">Gửi yêu cầu / báo giá</span> : null}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
