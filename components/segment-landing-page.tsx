import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Award, BadgeCheck, MapPin, Phone, ReceiptText, ShieldCheck, Truck } from "lucide-react";
import { FaqJsonLd } from "@/components/faq-json-ld";
import { productGroups, serviceAreas, type SegmentLandingConfig } from "@/lib/segment-landing-content";
import { siteConfig } from "@/lib/site";

const trustIcons = [ShieldCheck, Award, Truck, ReceiptText];

export function SegmentLandingPage({ config }: { config: SegmentLandingConfig }) {
  const phoneHref = `tel:${siteConfig.phone.replace(/\s+/g, "")}`;
  const pageUrl = `${siteConfig.url}${config.path}`;

  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: config.title,
    serviceType: config.serviceType,
    description: config.metaDescription,
    url: pageUrl,
    provider: {
      "@type": "LocalBusiness",
      name: siteConfig.name,
      url: siteConfig.url,
      telephone: `+84${siteConfig.zalo.slice(1)}`,
    },
    areaServed: serviceAreas.map((area) => ({ "@type": "Place", name: area.label })),
    audience: { "@type": "BusinessAudience", audienceType: config.audience },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Trang chủ", item: siteConfig.url },
      { "@type": "ListItem", position: 2, name: config.breadcrumbName, item: pageUrl },
    ],
  };

  return (
    <main className="segment-page">
      <FaqJsonLd faqs={config.faqs} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <section className="local-hero">
        <div className="local-hero__bg">
          <Image src={config.heroImage} alt={config.heroImageAlt} fill sizes="100vw" priority />
        </div>
        <div className="local-hero__overlay" />
        <div className="local-hero__content">
          <nav className="segment-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Trang chủ</Link>
            <span aria-hidden="true">/</span>
            <span>{config.breadcrumbName}</span>
          </nav>
          <span className="local-hero__eyebrow">{config.eyebrow}</span>
          <h1 className="local-hero__title">{config.title}</h1>
          <p className="local-hero__desc">{config.intro}</p>
          <div className="local-hero__actions">
            <Link href="/bao-gia" className="btn-primary">
              Nhận báo giá <ArrowRight size={18} />
            </Link>
            <a href={phoneHref} className="btn-secondary">
              <Phone size={16} /> Gọi {siteConfig.phone}
            </a>
          </div>
        </div>
      </section>

      <section className="local-trust-bar" aria-label="Cam kết của TPS1">
        {config.trust.map((item, index) => {
          const Icon = trustIcons[index % trustIcons.length];
          return (
            <div key={item.title} className="local-trust-item">
              <div className="local-trust-item__icon">
                <Icon size={24} />
              </div>
              <div className="local-trust-item__text">
                <strong>{item.title}</strong>
                <span>{item.text}</span>
              </div>
            </div>
          );
        })}
      </section>

      <section className="segment-block">
        <h2>{config.targetsHeading}</h2>
        <ul className="segment-chips">
          {config.targets.map((target) => (
            <li key={target}>
              <BadgeCheck size={16} /> {target}
            </li>
          ))}
        </ul>
      </section>

      <section className="local-bento">
        {config.sections.map((section, index) => (
          <article
            key={section.heading}
            className={`local-bento__item ${index === 0 ? "local-bento__item--large" : "local-bento__item--medium"}`}
          >
            <div className="local-bento__content">
              <h2>{section.heading}</h2>
              <p>{section.body}</p>
              {section.items && (
                <ul>
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
          </article>
        ))}
      </section>

      <section className="segment-block">
        <h2>{config.productsHeading}</h2>
        <p className="segment-lead">{config.productsIntro}</p>
        <div className="home-local__grid segment-grid">
          {productGroups.map((group) => (
            <Link key={group.href} href={group.href} className="home-local__card segment-card">
              <h3>{group.label}</h3>
              <p>{group.text}</p>
              <span className="home-local__link">
                Xem danh mục <ArrowRight size={16} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="segment-block">
        <h2>{config.stepsHeading}</h2>
        <ol className="segment-steps">
          {config.steps.map((step, index) => (
            <li key={step}>
              <span className="segment-steps__num">{index + 1}</span>
              <p>{step}</p>
            </li>
          ))}
        </ol>
      </section>

      {config.customers && (
        <section className="segment-block">
          <h2>{config.customers.heading}</h2>
          <p className="segment-lead">{config.customers.intro}</p>
          <ul className="segment-chips segment-chips--plain">
            {config.customers.names.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="segment-block">
        <h2>{config.areasHeading}</h2>
        <p className="segment-lead">{config.areasIntro}</p>
        <ul className="segment-chips">
          {serviceAreas.map((area) => (
            <li key={area.href}>
              <Link href={area.href}>
                <MapPin size={16} /> {area.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="faq-list segment-block">
        <h2>Câu hỏi thường gặp</h2>
        {config.faqs.map((faq) => (
          <details key={faq.question}>
            <summary>{faq.question}</summary>
            <p>{faq.answer}</p>
          </details>
        ))}
      </section>

      <section className="segment-cta">
        <h2>{config.ctaTitle}</h2>
        <p>{config.ctaText}</p>
        <div className="local-hero__actions">
          <Link href="/bao-gia" className="btn-primary">
            Mở form báo giá <ArrowRight size={18} />
          </Link>
          <a href={`https://zalo.me/${siteConfig.zalo}`} className="btn-secondary" target="_blank" rel="noreferrer">
            Nhắn Zalo
          </a>
          <a href={phoneHref} className="btn-secondary">
            <Phone size={16} /> {siteConfig.phone}
          </a>
        </div>
      </section>

      <section className="segment-block">
        <h2>Xem thêm</h2>
        <ul className="segment-links">
          {config.relatedLinks.map((link) => (
            <li key={link.href}>
              <Link href={link.href}>
                {link.label} <ArrowRight size={14} />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
