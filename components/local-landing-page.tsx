import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldCheck, HeartHandshake, PackageCheck, Truck, Clock } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { SeoJsonLd } from "@/components/seo-json-ld";
import type { LocalLandingPageConfig } from "@/lib/local-landing-content";
import { brandAssets } from "@/lib/brand";
import { siteConfig } from "@/lib/site";
import { QuoteAddButton } from "@/components/quote-add-button";
import { FaqJsonLd } from "@/components/faq-json-ld";

type LocalLandingPageProps = {
  config: LocalLandingPageConfig;
};

const regionHeroImages: Record<string, string> = {
  "Đồng Nai": brandAssets.deliveryTruckReal,
  "Biên Hòa": brandAssets.warehouseWide,
  "Bình Dương": brandAssets.deliveryLoading,
  "TP.HCM": brandAssets.warehousePeople,
  "Bà Rịa - Vũng Tàu": brandAssets.coverFood,
  "Nhơn Trạch": brandAssets.kitchen,
  "Phú Mỹ": brandAssets.quality,
  "Hố Nai": brandAssets.sourceFarm,
  "Tam Phước": brandAssets.team,
  "Vĩnh Cửu": brandAssets.vegetables,
  "KCN Amata": brandAssets.warehouseWide,
  "Trảng Bom": brandAssets.deliveryTruck,
  "Long Thành": brandAssets.kitchen,
  "Bình Phước": brandAssets.deliveryTruckReal,
};

export function LocalLandingPage({ config }: LocalLandingPageProps) {
  const heroImage = regionHeroImages[config.eyebrow] || brandAssets.coverFood;

  return (
    <PageShell eyebrow={config.eyebrow} title={config.title} description={config.description} compact>
      <SeoJsonLd includeWebsite={false} />
      <FaqJsonLd faqs={config.faqs} />

      {/* Hero Section */}
      <section className="local-hero">
        <div className="local-hero__bg">
          <Image src={heroImage} alt={config.eyebrow} fill sizes="100vw" priority />
        </div>
        <div className="local-hero__overlay" />
        <div className="local-hero__content">
          <span className="local-hero__eyebrow">{config.eyebrow}</span>
          <h1 className="local-hero__title">{config.title}</h1>
          <p className="local-hero__desc">{config.intro}</p>
          <div className="local-hero__actions">
            <Link href="/bao-gia" className="btn-primary">
              {config.ctaLabel} <ArrowRight size={18} />
            </Link>
            <QuoteAddButton
              product={{ slug: config.quoteSlug, title: config.quoteTitle, summary: config.quoteSummary }}
              label="Thêm vào danh sách"
            />
            <a href={`tel:${siteConfig.phone.replace(/\s+/g, "")}`} className="btn-secondary">
              Gọi {siteConfig.phone}
            </a>
          </div>
        </div>
      </section>

      {/* Trust Signals Bar */}
      <section className="local-trust-bar">
        <div className="local-trust-item">
          <div className="local-trust-item__icon"><Truck size={24} /></div>
          <div className="local-trust-item__text">
            <strong>99,8% đơn hàng giao đúng hẹn</strong>
            <span>Lịch giao thống nhất theo khung giờ của từng gian bếp.</span>
          </div>
        </div>
        <div className="local-trust-item">
          <div className="local-trust-item__icon"><ShieldCheck size={24} /></div>
          <div className="local-trust-item__text">
            <strong>Đạt chuẩn ISO 22000 và HACCP</strong>
            <span>Kiểm soát chất lượng từ khâu nhập hàng đến khi giao.</span>
          </div>
        </div>
        <div className="local-trust-item">
          <div className="local-trust-item__icon"><PackageCheck size={24} /></div>
          <div className="local-trust-item__text">
            <strong>Hơn 5.000 mặt hàng</strong>
            <span>Rau củ, thịt cá, hàng đông lạnh, đồ khô và gia vị ở một đầu mối.</span>
          </div>
        </div>
      </section>

      {/* Emotional / Features Bento Grid */}
      <section className="local-bento">
        {config.sections.map((section, idx) => {
          // First section spans full width, others span half
          const isFirst = idx === 0;
          return (
            <div key={idx} className={`local-bento__item ${isFirst ? 'local-bento__item--large' : 'local-bento__item--medium'}`}>
              <div className="local-bento__content">
                {idx === 0 && <HeartHandshake size={32} className="local-bento__icon" />}
                {idx === 1 && <Clock size={32} className="local-bento__icon" />}
                {idx === 2 && <CheckCircle2 size={32} className="local-bento__icon" />}
                
                <h3>{section.heading}</h3>
                <p>{section.body}</p>
                {section.items && (
                  <ul>
                    {section.items.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
              
              {isFirst && (
                <div className="local-bento__image">
                  <Image src={brandAssets.team} alt="Thấu hiểu khách hàng" fill sizes="(max-width: 768px) 100vw, 50vw" style={{ objectFit: 'cover' }} />
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* FAQs */}
      {config.faqs && config.faqs.length > 0 && (
        <section className="faq-list" style={{ marginBottom: 40 }}>
          <h2>Câu hỏi thường gặp</h2>
          {config.faqs.map((faq) => (
            <details key={faq.question}>
              <summary>{faq.question}</summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </section>
      )}

      {/* Related Links */}
      {config.relatedLinks.length > 0 && (
        <section className="content-section content-section--plain" style={{ marginTop: 24 }}>
          <div className="content-section__body">
            <div className="content-section__eyebrow">Trang liên quan</div>
            <h2>Khu vực và ngành hàng liên quan</h2>
            <div className="home-local__grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", marginTop: 14 }}>
              {config.relatedLinks.map((item) => (
                <Link key={item.href} href={item.href} className="home-local__card" style={{ minHeight: 0 }}>
                  <h3>{item.label}</h3>
                  <span className="home-local__link">
                    Xem trang <ArrowRight size={16} />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </PageShell>
  );
}
