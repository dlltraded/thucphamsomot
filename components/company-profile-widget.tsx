import Link from "next/link";
import { FileText, MoveUpRight } from "lucide-react";
import { siteConfig } from "@/lib/site";

export function CompanyProfileWidget() {
  return (
    <aside className="company-profile-widget" aria-label="Hồ sơ năng lực">
      <div className="company-profile-widget__badge">
        <FileText size={15} />
        Company Profile
      </div>
      <h2>Hồ sơ năng lực TPS1</h2>
      <p>Xem nhanh hồ sơ công ty, năng lực cung ứng và cách TPS1 làm việc với khách B2B.</p>
      <div className="company-profile-widget__actions">
        <Link href={siteConfig.profilePagePath} className="company-profile-widget__button">
          Xem ngay <MoveUpRight size={16} />
        </Link>
        <a
          href={siteConfig.profilePdfUrl}
          target="_blank"
          rel="noreferrer"
          className="company-profile-widget__button company-profile-widget__button--ghost"
        >
          Mở tab mới
        </a>
      </div>
    </aside>
  );
}
