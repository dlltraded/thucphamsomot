import Image from "next/image";
import Link from "next/link";
import { ReactNode } from "react";
import { ArrowRight, BadgeCheck, Phone, ShieldCheck } from "lucide-react";
import { siteConfig } from "@/lib/site";
import { brandAssets } from "@/lib/brand";

type PageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

const pageVisuals: Record<string, string> = {
  "Giới thiệu": brandAssets.team,
  "Sản phẩm": brandAssets.coverFood,
  "Danh mục": brandAssets.warehouseWide,
  "Ngành hàng": brandAssets.kitchen,
  "Dịch vụ": brandAssets.quality,
  "Kiến thức": brandAssets.coverFood,
  "Chính sách": brandAssets.quality,
  "Báo giá": brandAssets.warehousePeople,
  "Liên hệ": brandAssets.deliveryTruck,
  "Portal báo giá": brandAssets.warehousePeople,
};

export function PageShell({ eyebrow, title, description, children }: PageShellProps) {
  const visual = pageVisuals[eyebrow] ?? brandAssets.coverFood;

  return (
    <main className="page-shell">
      <section className="container-shell page-hero">
        <div className="page-hero__copy">
          <div className="eyebrow">{eyebrow}</div>
          <h1 className="page-hero__title">{title}</h1>
          <p className="page-hero__description">{description}</p>
          <div className="page-hero__actions">
            <Link href="/bao-gia" className="btn-primary">
              Mở form báo giá <ArrowRight size={18} />
            </Link>
            <a href={`tel:${siteConfig.phone.replace(/\s+/g, "")}`} className="btn-secondary">
              <Phone size={16} />
              {siteConfig.phone}
            </a>
          </div>
          <div className="page-hero__tags" aria-label="Điểm mạnh dịch vụ">
            {["B2B", "Giao định kỳ", "An toàn thực phẩm", "Báo giá riêng", "Đồng Nai"].map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>

        <aside className="page-hero__visual" aria-label="Minh hoạ dịch vụ">
          <Image
            src={visual}
            alt={`${eyebrow} Thực Phẩm Số Một`}
            fill
            sizes="(max-width: 1024px) 100vw, 42vw"
            className="page-hero__image"
          />
          <div className="page-hero__shade" />
          <div className="page-hero__visual-copy">
            <div className="page-hero__panel-badge">
              <ShieldCheck size={16} />
              Hồ sơ, chứng từ, quy trình rõ ràng
            </div>
            <div className="page-hero__panel-card">
              <BadgeCheck size={18} />
              <strong>Hàng đúng nhóm, giao đúng nhịp</strong>
              <span>
                Tập trung vào nhu cầu mua số lượng lớn: danh mục rõ, lịch giao dễ thống nhất và phản hồi nhanh khi cần báo
                giá.
              </span>
            </div>
          </div>
        </aside>
      </section>

      <section className="container-shell section-pad">{children}</section>
    </main>
  );
}
