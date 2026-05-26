"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Menu, Phone, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { navItemsByLocale, siteConfig, type Locale } from "@/lib/site";
import { brandAssets } from "@/lib/brand";

function localeFromPath(pathname: string): Locale {
  return pathname.startsWith("/en") ? "en" : "vi";
}

function swapLocalePath(pathname: string, nextLocale: Locale) {
  const cleanPath = pathname === "/" ? "" : pathname;
  if (nextLocale === "en") {
    if (cleanPath.startsWith("/en")) return cleanPath || "/en";
    if (cleanPath === "/bao-gia") return "/en/bao-gia";
    if (cleanPath === "/gioi-thieu") return "/en/about";
    if (cleanPath === "/san-pham") return "/en/products";
    if (cleanPath === "/tin-tuc") return "/en/news";
    if (cleanPath === "/lien-he") return "/en/contact";
    if (cleanPath.startsWith("/nganh-hang") || cleanPath.startsWith("/danh-muc")) return "/en/ingredients";
    if (cleanPath.startsWith("/kien-thuc")) return "/en/recipes";
    return "/en";
  }

  if (!cleanPath.startsWith("/en")) return cleanPath || "/";
  if (cleanPath === "/en/bao-gia") return "/bao-gia";
  if (cleanPath === "/en/about") return "/gioi-thieu";
  if (cleanPath === "/en/products") return "/san-pham";
  if (cleanPath === "/en/news") return "/tin-tuc";
  if (cleanPath === "/en/contact") return "/lien-he";
  if (cleanPath === "/en/ingredients") return "/nganh-hang/bep-an-tap-the";
  if (cleanPath === "/en/recipes") return "/kien-thuc";
  return "/";
}

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const locale = localeFromPath(pathname);
  const isEnglish = locale === "en";
  const navItems = navItemsByLocale[locale];

  return (
    <header key={pathname} className="site-header">
      <div className="container-shell site-header__inner">
        <Link href={isEnglish ? "/en" : "/"} className="site-brand" aria-label={siteConfig.englishName}>
          <span className="site-brand__mark">
            <Image src={brandAssets.logoTransparent} alt="TPS1" width={160} height={52} priority />
          </span>
          <span className="site-brand__copy">
            <span className="site-brand__name">{isEnglish ? siteConfig.englishName : siteConfig.name}</span>
            <span className="site-brand__tag">
              {isEnglish ? "B2B food supply · scheduled delivery · request-based quotes" : "Thực phẩm B2B · giao định kỳ · đặt hàng theo nhu cầu"}
            </span>
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
          <span>{menuOpen ? (isEnglish ? "Close" : "Đóng") : "Menu"}</span>
        </button>

        <nav className="site-nav" aria-label={isEnglish ? "Main navigation" : "Điều hướng chính"}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={item.href.endsWith("/bao-gia") ? "site-nav__link site-nav__link--order" : "site-nav__link"}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="site-header__actions">
          <div className="site-header__languages" aria-label={isEnglish ? "Choose language" : "Chọn ngôn ngữ"}>
            <Link
              href={swapLocalePath(pathname, "en")}
              className={`site-language-pill${isEnglish ? " is-active" : ""}`}
              aria-current={isEnglish ? "page" : undefined}
              title="English"
            >
              <Image className="site-language-pill__flag" src="/images/flag-en.svg" alt="" width={24} height={18} />
              <span className="site-language-pill__code">EN</span>
            </Link>
            <Link
              href={swapLocalePath(pathname, "vi")}
              className={`site-language-pill${!isEnglish ? " is-active" : ""}`}
              aria-current={!isEnglish ? "page" : undefined}
              title="Tiếng Việt"
            >
              <Image className="site-language-pill__flag" src="/images/flag-vi.svg" alt="" width={24} height={18} />
              <span className="site-language-pill__code">VI</span>
            </Link>
          </div>
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
              className={item.href.endsWith("/bao-gia") ? "site-mobile-nav__link site-mobile-nav__link--order" : "site-mobile-nav__link"}
              onClick={() => setMenuOpen(false)}
            >
              <span>{item.label}</span>
              {item.href.endsWith("/bao-gia") ? (
                <span className="site-mobile-nav__hint">{isEnglish ? "Send request / quote" : "Gửi yêu cầu / báo giá"}</span>
              ) : null}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
