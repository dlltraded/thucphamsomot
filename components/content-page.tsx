import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpenText, CheckCircle2, ClipboardCheck } from "lucide-react";
import type { ContentSection, FaqItem } from "@/lib/content";
import { siteConfig } from "@/lib/site";
import { QuoteAddButton } from "@/components/quote-add-button";
import { brandAssets } from "@/lib/brand";

type ContentPageProps = {
  title: string;
  description: string;
  bullets?: string[];
  sections?: ContentSection[];
  faqs?: FaqItem[];
  ctaHref?: string;
  ctaLabel?: string;
  quoteItem?: {
    slug: string;
    title: string;
    summary?: string;
  };
};

const sectionImages = [brandAssets.coverFood, brandAssets.kitchen, brandAssets.warehouseWide, brandAssets.team];

export function ContentPage({
  title,
  description,
  bullets = [],
  sections = [],
  faqs = [],
  ctaHref = "/bao-gia",
  ctaLabel = "Mở form báo giá",
  quoteItem,
}: ContentPageProps) {
  return (
    <article className="content-detail">
      <div className="content-detail__hero">
        <div className="content-detail__copy">
          <div className="pill">thucphamsomot.vn</div>
          <h1 className="content-detail__title">{title}</h1>
          <p className="content-detail__description">{description}</p>
          <div className="content-detail__actions">
            <Link href={ctaHref} className="btn-primary">
              {ctaLabel} <ArrowRight size={18} />
            </Link>
            {quoteItem ? <QuoteAddButton product={quoteItem} label="Thêm vào báo giá" /> : null}
            <a href={`tel:${siteConfig.phone.replace(/\s+/g, "")}`} className="btn-secondary">
              Gọi {siteConfig.phone}
            </a>
          </div>
        </div>

        <aside className="content-detail__aside">
          <div className="content-detail__aside-card content-detail__aside-card--accent">
            <ClipboardCheck size={18} />
            <strong>Thông tin cần chuẩn bị</strong>
            <span>Nhóm hàng cần mua, số lượng dự kiến, địa điểm giao, tần suất giao và yêu cầu sơ chế hoặc đóng gói.</span>
          </div>
          <div className="content-detail__aside-card">
            <CheckCircle2 size={18} />
            <strong>Phù hợp khách mua định kỳ</strong>
            <span>Dành cho bếp ăn, trường học, bệnh viện, nhà hàng và đơn vị suất ăn cần nguồn hàng ổn định.</span>
          </div>
        </aside>
      </div>

      {bullets.length > 0 ? (
        <div className="content-detail__chips">
          {bullets.map((bullet) => (
            <div key={bullet} className="content-detail__chip">
              {bullet}
            </div>
          ))}
        </div>
      ) : null}

      {sections.length > 0 ? (
        <div className="content-sections">
          {sections.map((section, index) => (
            <section key={section.heading} className="content-section">
              <div className="content-section__media">
                <Image
                  src={sectionImages[index % sectionImages.length]}
                  alt={section.heading}
                  fill
                  sizes="(max-width: 768px) 100vw, 34vw"
                  className="content-section__image"
                />
              </div>
              <div className="content-section__body">
                <div className="content-section__eyebrow">Nội dung chính</div>
                <h2>{section.heading}</h2>
                <p>{section.body}</p>
                {section.items?.length ? (
                  <ul>
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </section>
          ))}
        </div>
      ) : null}

      {faqs.length > 0 ? (
        <section className="faq-list">
          <h2>Câu hỏi thường gặp</h2>
          {faqs.map((faq) => (
            <details key={faq.question}>
              <summary>{faq.question}</summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </section>
      ) : null}

      <div className="content-detail__footer">
        <Link href={ctaHref} className="btn-primary">
          {ctaLabel} <BookOpenText size={18} />
        </Link>
        {quoteItem ? <QuoteAddButton product={quoteItem} label="Thêm vào báo giá" /> : null}
        <a href={`tel:${siteConfig.phone.replace(/\s+/g, "")}`} className="btn-secondary">
          Gọi {siteConfig.phone}
        </a>
      </div>
    </article>
  );
}
