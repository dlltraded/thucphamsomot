"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, MoveUpRight, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { siteConfig, type Locale } from "@/lib/site";

const profileText = {
  vi: {
    aria: "Hồ sơ năng lực",
    badge: "Company Profile",
    title: "Hồ sơ năng lực TPS1",
    copy: "Xem nhanh hồ sơ công ty, năng lực cung ứng và cách TPS1 làm việc với khách B2B.",
    primary: "Xem ngay",
    secondary: "Mở tab mới",
  },
  en: {
    aria: "Company profile",
    badge: "Company Profile",
    title: "TPS1 Capability Profile",
    copy: "A quick view of TPS1 company profile, supply capability, and B2B working process.",
    primary: "View now",
    secondary: "Open in new tab",
  },
} satisfies Record<Locale, Record<string, string>>;

export function CompanyProfileWidget() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const locale: Locale = pathname.startsWith("/en") ? "en" : "vi";
  const text = profileText[locale];
  return (
    <>
      <aside className="company-profile-widget" aria-label={text.aria}>
        <div className="company-profile-widget__badge">
          <FileText size={15} />
          {text.badge}
        </div>
        <h2>{text.title}</h2>
        <p>{text.copy}</p>
        <div className="company-profile-widget__actions">
          <Link href={siteConfig.profilePagePath} className="company-profile-widget__button">
            {text.primary} <MoveUpRight size={16} />
          </Link>
          <a
            href={siteConfig.profilePdfUrl}
            target="_blank"
            rel="noreferrer"
            className="company-profile-widget__button company-profile-widget__button--ghost"
          >
            {text.secondary}
          </a>
        </div>
      </aside>

      <div className={`company-profile-fab${mobileOpen ? " is-open" : ""}`} aria-label={text.aria}>
        <button
          type="button"
          className="company-profile-fab__trigger"
          aria-expanded={mobileOpen}
          aria-controls="company-profile-fab-panel"
          onClick={() => setMobileOpen((value) => !value)}
        >
          <span className="company-profile-fab__icon" aria-hidden="true">
            {mobileOpen ? <X size={16} /> : <FileText size={16} />}
          </span>
          <span className="company-profile-fab__sr-only">{mobileOpen ? (locale === "en" ? "Close profile" : "Đóng hồ sơ") : text.badge}</span>
        </button>

        <div id="company-profile-fab-panel" className="company-profile-fab__panel">
          <div className="company-profile-fab__badge">
            <FileText size={14} />
            {text.badge}
          </div>
          <h2>{text.title}</h2>
          <p>{text.copy}</p>
          <div className="company-profile-fab__actions">
            <a
              href="/documents/PROFILE_TPS1_SONGNGU_lite.pdf"
              download="PROFILE_TPS1_SONGNGU_lite.pdf"
              className="company-profile-fab__button"
              onClick={() => setMobileOpen(false)}
            >
              {locale === "en" ? "Download company profile" : "Tải company profile"} <MoveUpRight size={16} />
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
