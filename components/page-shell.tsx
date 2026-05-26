import Image from "next/image";
import Link from "next/link";
import { ReactNode } from "react";
import { ArrowRight, BadgeCheck, Phone, ShieldCheck } from "lucide-react";
import { siteConfig, type Locale } from "@/lib/site";
import { brandAssets } from "@/lib/brand";

type PageShellProps = {
  eyebrow: string;
  title: string;
  description?: string;
  compact?: boolean;
  locale?: Locale;
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
  About: brandAssets.team,
  Products: brandAssets.coverFood,
  Ingredients: brandAssets.warehouseWide,
  Recipes: brandAssets.coverFood,
  News: brandAssets.quality,
  Contact: brandAssets.deliveryTruck,
  "Quote form": brandAssets.warehousePeople,
};

const shellText = {
  vi: {
    quoteHref: "/bao-gia",
    quoteLabel: "Mở form báo giá",
    tagsLabel: "Điểm mạnh dịch vụ",
    tags: ["B2B", "Giao định kỳ", "An toàn thực phẩm", "Báo giá riêng", "Đồng Nai"],
    visualLabel: "Minh họa dịch vụ",
    brandAlt: "Thực Phẩm Số Một",
    badge: "Hồ sơ, chứng từ, quy trình rõ ràng",
    cardTitle: "Hàng đúng nhóm, giao đúng nhịp",
    cardCopy:
      "Tập trung vào nhu cầu mua số lượng lớn: danh mục rõ, lịch giao dễ thống nhất và phản hồi nhanh khi cần báo giá.",
  },
  en: {
    quoteHref: "/en/bao-gia",
    quoteLabel: "Open quote form",
    tagsLabel: "Service strengths",
    tags: ["B2B", "Scheduled delivery", "Food safety", "Custom quotes", "Dong Nai"],
    visualLabel: "Service visual",
    brandAlt: "Thuc Pham So Mot",
    badge: "Clear documents, process, and operating standards",
    cardTitle: "Right category, right delivery rhythm",
    cardCopy:
      "Built for recurring B2B buying needs: clear categories, practical delivery planning, and quick quote responses.",
  },
} satisfies Record<
  Locale,
  {
    quoteHref: string;
    quoteLabel: string;
    tagsLabel: string;
    tags: string[];
    visualLabel: string;
    brandAlt: string;
    badge: string;
    cardTitle: string;
    cardCopy: string;
  }
>;

export function PageShell({ eyebrow, title, description, compact = false, locale = "vi", children }: PageShellProps) {
  const visual = pageVisuals[eyebrow] ?? brandAssets.coverFood;
  const text = shellText[locale];

  if (compact) {
    return (
      <main className="page-shell">
        <section className="container-shell section-pad">{children}</section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="container-shell page-hero">
        <div className="page-hero__copy">
          <div className="eyebrow">{eyebrow}</div>
          <h1 className="page-hero__title">{title}</h1>
          {description ? <p className="page-hero__description">{description}</p> : null}
          <div className="page-hero__actions">
            <Link href={text.quoteHref} className="btn-primary">
              {text.quoteLabel} <ArrowRight size={18} />
            </Link>
            <a href={`tel:${siteConfig.phone.replace(/\s+/g, "")}`} className="btn-secondary">
              <Phone size={16} />
              {siteConfig.phone}
            </a>
          </div>
          <div className="page-hero__tags" aria-label={text.tagsLabel}>
            {text.tags.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>

        <aside className="page-hero__visual" aria-label={text.visualLabel}>
          <Image
            src={visual}
            alt={`${eyebrow} ${text.brandAlt}`}
            fill
            sizes="(max-width: 1024px) 100vw, 42vw"
            className="page-hero__image"
          />
          <div className="page-hero__shade" />
          <div className="page-hero__visual-copy">
            <div className="page-hero__panel-badge">
              <ShieldCheck size={16} />
              {text.badge}
            </div>
            <div className="page-hero__panel-card">
              <BadgeCheck size={18} />
              <strong>{text.cardTitle}</strong>
              <span>{text.cardCopy}</span>
            </div>
          </div>
        </aside>
      </section>

      <section className="container-shell section-pad">{children}</section>
    </main>
  );
}
