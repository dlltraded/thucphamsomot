import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Building2, ClipboardList, ShieldCheck, Truck } from "lucide-react";
import { categories } from "@/lib/content";
import { makeMetadata } from "@/lib/seo";
import { brandAssets, customerHighlights } from "@/lib/brand";
import { siteConfig } from "@/lib/site";

export const metadata = makeMetadata({
  title: "ThÃ¡Â»Â±c PhÃ¡ÂºÂ©m SÃ¡Â»â€˜ MÃ¡Â»â„¢t | Cung cÃ¡ÂºÂ¥p thÃ¡Â»Â±c phÃ¡ÂºÂ©m B2B tÃ¡ÂºÂ¡i Ã„ÂÃ¡Â»â€œng Nai",
  description:
    "TPS1 cung cÃ¡ÂºÂ¥p thÃ¡Â»Â±c phÃ¡ÂºÂ©m cho bÃ¡ÂºÂ¿p Ã„Æ’n tÃ¡ÂºÂ­p thÃ¡Â»Æ’, nhÃƒÂ  mÃƒÂ¡y, trÃ†Â°Ã¡Â»Âng hÃ¡Â»Âc, bÃ¡Â»â€¡nh viÃ¡Â»â€¡n. Danh mÃ¡Â»Â¥c rÃƒÂµ rÃƒÂ ng, giao Ã„â€˜Ã¡Â»â€¹nh kÃ¡Â»Â³, bÃƒÂ¡o giÃƒÂ¡ theo nhu cÃ¡ÂºÂ§u thÃ¡Â»Â±c tÃ¡ÂºÂ¿.",
  path: "/",
});

const servicePillars = [
  {
    icon: ShieldCheck,
    title: "NguÃ¡Â»â€œn hÃƒÂ ng rÃƒÂµ rÃƒÂ ng",
    text: "Danh mÃ¡Â»Â¥c theo nhÃƒÂ³m hÃƒÂ ng bÃ¡ÂºÂ¿p dÃƒÂ¹ng hÃƒÂ ng ngÃƒÂ y, dÃ¡Â»â€¦ so sÃƒÂ¡nh vÃƒÂ  dÃ¡Â»â€¦ ra quyÃ¡ÂºÂ¿t Ã„â€˜Ã¡Â»â€¹nh.",
  },
  {
    icon: Truck,
    title: "Giao Ã„â€˜ÃƒÂºng lÃ¡Â»â€¹ch",
    text: "Linh hoÃ¡ÂºÂ¡t theo ca, theo ngÃƒÂ y hoÃ¡ÂºÂ·c theo tuÃ¡ÂºÂ§n, phÃƒÂ¹ hÃ¡Â»Â£p vÃ¡ÂºÂ­n hÃƒÂ nh bÃ¡ÂºÂ¿p cÃƒÂ´ng nghiÃ¡Â»â€¡p.",
  },
  {
    icon: ClipboardList,
    title: "BÃƒÂ¡o giÃƒÂ¡ theo nhu cÃ¡ÂºÂ§u",
    text: "MÃ¡Â»â€”i khÃƒÂ¡ch cÃƒÂ³ nhu cÃ¡ÂºÂ§u riÃƒÂªng, Ã„â€˜Ã¡Â»â„¢i ngÃ…Â© TPS1 phÃ¡ÂºÂ£n hÃ¡Â»â€œi phÃ†Â°Ã†Â¡ng ÃƒÂ¡n phÃƒÂ¹ hÃ¡Â»Â£p Ã„â€˜Ã¡Â»Æ’ chÃ¡Â»â€˜t Ã„â€˜Ã†Â¡n nhanh.",
  },
  {
    icon: Building2,
    title: "Kinh nghiÃ¡Â»â€¡m B2B",
    text: "PhÃ¡Â»Â¥c vÃ¡Â»Â¥ thÃ¡Â»Â±c tÃ¡ÂºÂ¿ cho nhÃƒÂ  mÃƒÂ¡y, bÃ¡ÂºÂ¿p Ã„Æ’n, bÃ¡Â»â€¡nh viÃ¡Â»â€¡n vÃƒÂ  trÃ†Â°Ã¡Â»Âng hÃ¡Â»Âc tÃ¡ÂºÂ¡i Ã„ÂÃ¡Â»â€œng Nai.",
  },
];

const processSteps = [
  {
    title: "1. ChÃ¡Â»Ân nhÃƒÂ³m sÃ¡ÂºÂ£n phÃ¡ÂºÂ©m",
    text: "ChÃ¡Â»Ân nhanh theo danh mÃ¡Â»Â¥c: rau cÃ¡Â»Â§, thÃ¡Â»â€¹t cÃƒÂ¡, Ã„â€˜ÃƒÂ´ng lÃ¡ÂºÂ¡nh, gia vÃ¡Â»â€¹, thÃ¡Â»Â±c phÃ¡ÂºÂ©m chay.",
  },
  {
    title: "2. GÃ¡Â»Â­i yÃƒÂªu cÃ¡ÂºÂ§u",
    text: "NhÃ¡ÂºÂ­p sÃ¡Â»â€˜ lÃ†Â°Ã¡Â»Â£ng, khu vÃ¡Â»Â±c giao, thÃ¡Â»Âi gian cÃ¡ÂºÂ§n hÃƒÂ ng vÃƒÂ  ghi chÃƒÂº quy cÃƒÂ¡ch.",
  },
  {
    title: "3. NhÃ¡ÂºÂ­n phÃ†Â°Ã†Â¡ng ÃƒÂ¡n",
    text: "Ã„ÂÃ¡Â»â„¢i kinh doanh phÃ¡ÂºÂ£n hÃ¡Â»â€œi bÃƒÂ¡o giÃƒÂ¡ vÃƒÂ  lÃ¡Â»â€¹ch giao phÃƒÂ¹ hÃ¡Â»Â£p Ã„â€˜Ã¡Â»Æ’ khÃƒÂ¡ch chÃ¡Â»â€˜t Ã„â€˜Ã†Â¡n.",
  },
];

const heroStats = [
  { value: "109+", label: "KhÃƒÂ¡ch hÃƒÂ ng doanh nghiÃ¡Â»â€¡p" },
  { value: "24h", label: "PhÃ¡ÂºÂ£n hÃ¡Â»â€œi yÃƒÂªu cÃ¡ÂºÂ§u bÃƒÂ¡o giÃƒÂ¡" },
  { value: "4", label: "NhÃƒÂ³m khÃƒÂ¡ch B2B trÃ¡Â»Âng tÃƒÂ¢m" },
];

const galleryImages = [
  { src: brandAssets.warehouseWide, alt: "Kho v?n TPS1" },
  { src: brandAssets.kitchen, alt: "Khu b?p TPS1" },
  { src: "/images/tps1-gallery-warehouse-people.jpg", alt: "Kho v?n TPS1 th?c t?" },
  { src: "/images/tps1-gallery-factory-visit.jpg", alt: "Ho?t d?ng th?c t? TPS1" },
];
const heroWarehouseWide = `${brandAssets.warehouseWide}?v=20260522-1`;
const heroCoverFood = `${brandAssets.coverFood}?v=20260522-1`;

export default function HomePage() {
  return (
    <main className="home-page">
      <section className="home-hero">
        <div className="container-shell home-hero__grid">
          <div className="home-hero__copy">
            <div className="home-hero__brand">
              <Image src={brandAssets.logoTransparent} alt={siteConfig.name} width={190} height={64} priority />
              <span className="home-hero__brand-tag">Cung cÃ¡ÂºÂ¥p thÃ¡Â»Â±c phÃ¡ÂºÂ©m B2B tÃ¡ÂºÂ¡i Ã„ÂÃ¡Â»â€œng Nai vÃƒÂ  khu vÃ¡Â»Â±c lÃƒÂ¢n cÃ¡ÂºÂ­n</span>
            </div>
            <div className="eyebrow eyebrow-on-dark">ThÃ¡Â»Â±c PhÃ¡ÂºÂ©m SÃ¡Â»â€˜ MÃ¡Â»â„¢t</div>
            <h1 className="home-hero__title">
              Ã„ÂÃ¡Â»â€˜i tÃƒÂ¡c cung Ã¡Â»Â©ng thÃ¡Â»Â±c phÃ¡ÂºÂ©m cho
              <span>bÃ¡ÂºÂ¿p Ã„Æ’n tÃ¡ÂºÂ­p thÃ¡Â»Æ’, nhÃƒÂ  mÃƒÂ¡y vÃƒÂ  suÃ¡ÂºÂ¥t Ã„Æ’n cÃƒÂ´ng nghiÃ¡Â»â€¡p</span>
            </h1>
            <p className="home-hero__lead">
              Catalog rÃƒÂµ rÃƒÂ ng, quy trÃƒÂ¬nh Ã„â€˜Ã¡ÂºÂ·t hÃƒÂ ng gÃ¡Â»Ân vÃƒÂ  phÃ¡ÂºÂ£n hÃ¡Â»â€œi nhanh theo nhu cÃ¡ÂºÂ§u vÃ¡ÂºÂ­n hÃƒÂ nh thÃ¡Â»Â±c tÃ¡ÂºÂ¿ cÃ¡Â»Â§a tÃ¡Â»Â«ng Ã„â€˜Ã†Â¡n vÃ¡Â»â€¹.
            </p>

            <div className="home-hero__actions">
              <Link href="/bao-gia" className="btn-primary btn-on-dark">
                YÃƒÂªu cÃ¡ÂºÂ§u bÃƒÂ¡o giÃƒÂ¡ <ArrowRight size={18} />
              </Link>
              <Link href="/san-pham" className="btn-secondary btn-on-dark-secondary">
                Xem danh mÃ¡Â»Â¥c sÃ¡ÂºÂ£n phÃ¡ÂºÂ©m <ArrowRight size={18} />
              </Link>
            </div>

            <div className="home-hero__stats">
              {heroStats.map((item) => (
                <div key={item.label} className="home-stat">
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="home-hero__visual">
            <div className="home-mosaic">
              <div className="home-mosaic__tile home-mosaic__tile--large">
                <Image src={heroWarehouseWide} alt="BÃ¡Â»â„¢ nhÃ¡ÂºÂ­n diÃ¡Â»â€¡n TPS1" fill unoptimized className="home-mosaic__image" />
              </div>
              <div className="home-mosaic__tile">
                <Image src={heroCoverFood} alt="TPS1 thÃ¡Â»Â±c tÃ¡ÂºÂ¿" fill unoptimized className="home-mosaic__image" />
              </div>
              <div className="home-mosaic__tile home-mosaic__tile--wide">
                <Image
                  src={brandAssets.deliveryTruckReal}
                  alt="Xe giao hÃƒÂ ng TPS1 thÃ¡Â»Â±c tÃ¡ÂºÂ¿"
                  fill
                  className="home-mosaic__image home-mosaic__image--truck"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="home-trust">
        <div className="container-shell home-trust__grid">
          {servicePillars.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="home-trust__card">
                <Icon size={22} />
                <h2>{item.title}</h2>
                <p>{item.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="home-catalog">
        <div className="container-shell">
          <div className="section-split">
            <div className="section-heading">
              <div className="eyebrow">Danh mÃ¡Â»Â¥c sÃ¡ÂºÂ£n phÃ¡ÂºÂ©m</div>
              <h2 className="section-heading__title">NhÃƒÂ³m sÃ¡ÂºÂ£n phÃ¡ÂºÂ©m sÃ¡ÂºÂ¯p xÃ¡ÂºÂ¿p theo cÃƒÂ¡ch khÃƒÂ¡ch B2B thÃ†Â°Ã¡Â»Âng mua.</h2>
              <p className="section-heading__description">
                ChÃ¡Â»Ân nhÃƒÂ³m hÃƒÂ ng phÃƒÂ¹ hÃ¡Â»Â£p vÃƒÂ  gÃ¡Â»Â­i yÃƒÂªu cÃ¡ÂºÂ§u trong mÃ¡Â»â„¢t luÃ¡Â»â€œng thÃ¡Â»â€˜ng nhÃ¡ÂºÂ¥t Ã„â€˜Ã¡Â»Æ’ Ã„â€˜Ã¡Â»â„¢i ngÃ…Â© xÃ¡Â»Â­ lÃƒÂ½ nhanh hÃ†Â¡n.
              </p>
            </div>
            <Link href="/san-pham" className="text-link">
              Xem toÃƒÂ n bÃ¡Â»â„¢ sÃ¡ÂºÂ£n phÃ¡ÂºÂ©m <ArrowRight size={16} />
            </Link>
          </div>

          <div className="home-catalog__grid">
            {categories.map((item, index) => (
              <Link key={item.slug} href={`/danh-muc/${item.slug}`} className="category-card category-card--premium">
                <span className="category-card__index">0{index + 1}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <div className="tag-row">
                  {(item.highlights ?? []).slice(0, 3).map((highlight) => (
                    <span key={highlight}>{highlight}</span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="home-solution container-shell section-pad">
        <div className="section-heading">
          <div className="eyebrow">Quy trÃƒÂ¬nh lÃƒÂ m viÃ¡Â»â€¡c</div>
          <h2 className="section-heading__title">MÃ¡Â»â„¢t quy trÃƒÂ¬nh Ã„â€˜Ã†Â¡n giÃ¡ÂºÂ£n Ã„â€˜Ã¡Â»Æ’ khÃƒÂ¡ch dÃ¡Â»â€¦ Ã„â€˜Ã¡ÂºÂ·t hÃƒÂ ng vÃƒÂ  dÃ¡Â»â€¦ chÃ¡Â»â€˜t phÃ†Â°Ã†Â¡ng ÃƒÂ¡n.</h2>
        </div>

        <div className="solution-grid">
          {processSteps.map((step) => (
            <article key={step.title} className="solution-card">
              <div className="solution-card__tag">TPS1 Workflow</div>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-customers">
        <div className="container-shell">
          <div className="section-split">
            <div className="section-heading">
              <div className="eyebrow">KhÃƒÂ¡ch hÃƒÂ ng tiÃƒÂªu biÃ¡Â»Æ’u</div>
              <h2 className="section-heading__title">Ã„Âang phÃ¡Â»Â¥c vÃ¡Â»Â¥ nhiÃ¡Â»Âu Ã„â€˜Ã†Â¡n vÃ¡Â»â€¹ trong nhÃƒÂ³m khÃƒÂ¡ch B2B tÃ¡ÂºÂ¡i khu vÃ¡Â»Â±c cÃƒÂ´ng nghiÃ¡Â»â€¡p.</h2>
            </div>
            <Link href="/bao-gia" className="text-link">
              GÃ¡Â»Â­i yÃƒÂªu cÃ¡ÂºÂ§u mÃ¡Â»â€ºi <ArrowRight size={16} />
            </Link>
          </div>

          <div className="customer-marquee">
            {customerHighlights.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="container-shell section-pad">
        <div className="home-gallery">
          <div className="home-gallery__copy">
            <div className="eyebrow">HÃƒÂ¬nh Ã¡ÂºÂ£nh thÃ¡Â»Â±c tÃ¡ÂºÂ¿</div>
            <h2 className="section-heading__title">Kho vÃ¡ÂºÂ­n, giao nhÃ¡ÂºÂ­n vÃƒÂ  vÃ¡ÂºÂ­n hÃƒÂ nh bÃ¡ÂºÂ¿p tÃ¡Â»Â« dÃ¡Â»Â¯ liÃ¡Â»â€¡u thÃ¡Â»Â±c tÃ¡ÂºÂ¿ cÃ¡Â»Â§a TPS1.</h2>
            <p className="section-heading__description">
              HÃƒÂ¬nh Ã¡ÂºÂ£nh trÃƒÂªn website lÃƒÂ  tÃ†Â° liÃ¡Â»â€¡u thÃ¡ÂºÂ­t cÃ¡Â»Â§a doanh nghiÃ¡Â»â€¡p Ã„â€˜Ã¡Â»Æ’ khÃƒÂ¡ch hÃƒÂ ng Ã„â€˜ÃƒÂ¡nh giÃƒÂ¡ nÃ„Æ’ng lÃ¡Â»Â±c rÃƒÂµ rÃƒÂ ng hÃ†Â¡n.
            </p>
          </div>

          <div className="home-gallery__grid">
            {galleryImages.map((item, index) => (
              <div key={item.src} className={`home-gallery__card home-gallery__card--${index + 1}`}>
                <Image src={item.src} alt={item.alt} fill className="home-gallery__image" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="home-cta">
        <div className="container-shell home-cta__card">
          <div>
            <div className="eyebrow eyebrow-on-dark">SÃ¡ÂºÂµn sÃƒÂ ng nhÃ¡ÂºÂ­n yÃƒÂªu cÃ¡ÂºÂ§u</div>
            <h2>GÃ¡Â»Â­i danh mÃ¡Â»Â¥c cÃ¡ÂºÂ§n mua Ã„â€˜Ã¡Â»Æ’ Ã„â€˜Ã¡Â»â„¢i ngÃ…Â© TPS1 phÃ¡ÂºÂ£n hÃ¡Â»â€œi phÃ†Â°Ã†Â¡ng ÃƒÂ¡n phÃƒÂ¹ hÃ¡Â»Â£p.</h2>
            <p>NhÃ¡ÂºÂ­p thÃƒÂ´ng tin Ã„â€˜Ã†Â¡n vÃ¡Â»â€¹, nhÃƒÂ³m hÃƒÂ ng vÃƒÂ  thÃ¡Â»Âi gian cÃ¡ÂºÂ§n giao. Ã„ÂÃ¡Â»â„¢i kinh doanh sÃ¡ÂºÂ½ liÃƒÂªn hÃ¡Â»â€¡ Ã„â€˜Ã¡Â»Æ’ chÃ¡Â»â€˜t bÃƒÂ¡o giÃƒÂ¡ vÃƒÂ  lÃ¡Â»â€¹ch giao.</p>
          </div>
          <Link href="/bao-gia" className="btn-primary btn-on-dark">
            MÃ¡Â»Å¸ form bÃƒÂ¡o giÃƒÂ¡ <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </main>
  );
}
