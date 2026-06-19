import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, FileText, MoveLeft } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { makeMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = makeMetadata({
  title: "Hồ sơ năng lực",
  description: "Xem hồ sơ năng lực TPS1, năng lực cung ứng và thông tin giới thiệu công ty.",
  path: "/ho-so-nang-luc",
});

export default function CompanyProfilePage() {
  return (
    <PageShell
      eyebrow="Hồ sơ năng lực"
      title="Xem nhanh company profile TPS1"
      description="Trang riêng để khách xem hồ sơ năng lực công ty ngay trong site hoặc mở file PDF ở tab mới."
    >
      <div className="company-profile-page">
        <div className="company-profile-page__toolbar">
          <Link href="/" className="btn-secondary">
            <MoveLeft size={16} />
            Về trang chủ
          </Link>
          <a href={siteConfig.profilePdfUrl} target="_blank" rel="noreferrer" className="btn-primary">
            <ExternalLink size={16} />
            Mở file PDF
          </a>
        </div>

        <div className="company-profile-page__frame">
          <iframe
            src={siteConfig.profilePreviewUrl}
            title="Hồ sơ năng lực Thực Phẩm Số Một"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>

        <div className="card company-profile-page__note">
          <div className="eyebrow">
            <FileText size={14} />
            Xem file trực tiếp
          </div>
          <p>
            Nếu trình duyệt chặn preview, anh vẫn có thể mở file PDF gốc ở tab mới để xem đầy đủ hồ sơ năng lực.
          </p>
        </div>
      </div>
    </PageShell>
  );
}
