import Link from "next/link";
import { ArrowRight, CheckCircle2, MapPin, Truck } from "lucide-react";
import { ContentPage } from "@/components/content-page";
import { PageShell } from "@/components/page-shell";
import { SeoJsonLd } from "@/components/seo-json-ld";
import type { LocalLandingPageConfig } from "@/lib/local-landing-content";

type LocalLandingPageProps = {
  config: LocalLandingPageConfig;
};

const chipIcons = [Truck, MapPin, CheckCircle2];

export function LocalLandingPage({ config }: LocalLandingPageProps) {
  return (
    <PageShell eyebrow={config.eyebrow} title={config.title} description={config.description} compact>
      <SeoJsonLd />

      <div className="section-heading" style={{ marginBottom: 20 }}>
        <div className="eyebrow">{config.eyebrow}</div>
        <p className="section-heading__description" style={{ marginTop: 10 }}>
          {config.intro}
        </p>
      </div>

      <div className="content-detail__chips">
        {config.chips.map((chip, index) => {
          const Icon = chipIcons[index % chipIcons.length];
          return (
            <div key={chip} className="content-detail__chip">
              <Icon size={16} />
              {chip}
            </div>
          );
        })}
      </div>

      <ContentPage
        title={config.title}
        description={config.description}
        bullets={config.chips}
        sections={config.sections}
        faqs={config.faqs}
        ctaLabel={config.ctaLabel}
        quoteItem={{
          slug: config.quoteSlug,
          title: config.quoteTitle,
          summary: config.quoteSummary,
        }}
      />

      {config.relatedLinks.length > 0 ? (
        <section className="content-section" style={{ marginTop: 24 }}>
          <div className="content-section__body">
            <div className="content-section__eyebrow">Trang liên quan</div>
            <h2>Các điểm đi tiếp sau khi xem trang địa phương.</h2>
            <p>
              Người mua thường cần thêm một bước nữa trước khi gửi nhu cầu. Các liên kết dưới đây giúp họ đi đúng hướng
              ngay từ lần đầu.
            </p>
            <div className="home-local__grid" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))", marginTop: 14 }}>
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
      ) : null}

    </PageShell>
  );
}
