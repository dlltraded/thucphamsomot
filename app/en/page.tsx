import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Building2, ClipboardList, ShieldCheck, Truck } from "lucide-react";
import { makeMetadata } from "@/lib/seo";
import { brandAssets } from "@/lib/brand";
import { siteConfig } from "@/lib/site";

export const metadata = makeMetadata({
  title: "Thuc Pham So Mot | B2B food supplier in Dong Nai",
  description:
    "TPS1 supplies food ingredients for canteens, factories, schools, hospitals, restaurants, and industrial catering operators in Dong Nai.",
  path: "/en",
});

const servicePillars = [
  {
    icon: ShieldCheck,
    title: "Clear supply sources",
    text: "Product groups are organized for recurring B2B buying, making it easier to compare and plan.",
  },
  {
    icon: Truck,
    title: "Scheduled delivery",
    text: "Delivery can be coordinated by shift, day, or week to match canteen and kitchen operations.",
  },
  {
    icon: ClipboardList,
    title: "Quotes by real demand",
    text: "Each customer has a different volume, location, and specification, so TPS1 responds with a tailored plan.",
  },
  {
    icon: Building2,
    title: "B2B operating focus",
    text: "Serving factories, canteens, hospitals, schools, restaurants, and hospitality buyers in Dong Nai.",
  },
];

const categories = ["Fresh vegetables", "Meat and seafood", "Frozen food", "Kitchen seasonings", "Vegan products"];
const heroStats = [
  { value: "109+", label: "B2B customers served" },
  { value: "24h", label: "Quote response target" },
  { value: "5", label: "Core product groups" },
];

const partnerLogoPanels = [{ src: "/images/partners/tps1-partner-logos-all.png", alt: "TPS1 representative partner and client logos" }];

export default function EnglishHomePage() {
  return (
    <main className="home-page">
      <section className="home-hero">
        <div className="container-shell home-hero__grid">
          <div className="home-hero__copy">
            <div className="home-hero__brand">
              <Image src={brandAssets.logoTransparent} alt={siteConfig.englishName} width={190} height={64} priority />
              <span className="home-hero__brand-tag">B2B food supply in Dong Nai and nearby areas</span>
            </div>
            <div className="eyebrow eyebrow-on-dark">Thuc Pham So Mot</div>
            <h1 className="home-hero__title">
              A food supply partner for
              <span>canteens, factories, and industrial catering operators</span>
            </h1>
            <p className="home-hero__lead">
              Clear catalog, simple request flow, and fast quote follow-up based on the real operating needs of each organization.
            </p>

            <div className="home-hero__actions">
              <Link href="/en/bao-gia" className="btn-primary btn-on-dark">
                Send request <ArrowRight size={18} />
              </Link>
              <Link href="/en/products" className="btn-secondary btn-on-dark-secondary">
                View products <ArrowRight size={18} />
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
                <Image src={brandAssets.warehouseWide} alt="TPS1 warehouse" fill className="home-mosaic__image" />
              </div>
              <div className="home-mosaic__tile">
                <Image src={brandAssets.coverFood} alt="TPS1 food ingredients" fill className="home-mosaic__image" />
              </div>
              <div className="home-mosaic__tile home-mosaic__tile--wide">
                <Image src={brandAssets.deliveryTruckReal} alt="TPS1 delivery truck" fill className="home-mosaic__image home-mosaic__image--truck" />
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
              <div className="eyebrow">Product groups</div>
              <h2 className="section-heading__title">Categories arranged the way B2B kitchens usually buy.</h2>
              <p className="section-heading__description">
                Start from a product group, then send quantity, delivery area, frequency, and required specifications.
              </p>
            </div>
            <Link href="/en/products" className="text-link">
              View all products <ArrowRight size={16} />
            </Link>
          </div>

          <div className="home-catalog__grid">
            {categories.map((item, index) => (
              <Link key={item} href="/en/products" className="category-card category-card--premium">
                <span className="category-card__index">0{index + 1}</span>
                <h3>{item}</h3>
                <p>Suitable for recurring orders, kitchen planning, and B2B quote requests.</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="home-partners">
        <div className="container-shell">
          <div className="section-split">
            <div className="section-heading">
              <div className="eyebrow">Partners & clients</div>
            </div>
          </div>

          <div className="home-partners__grid">
            {partnerLogoPanels.map((item) => (
              <div key={item.src} className="home-partners__panel">
                <Image src={item.src} alt={item.alt} fill className="home-partners__image" sizes="(max-width: 960px) 100vw, 1180px" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="home-cta">
        <div className="container-shell home-cta__card">
          <div>
            <div className="eyebrow eyebrow-on-dark">Ready to receive your request</div>
            <h2>Send your buying list and TPS1 will respond with a suitable quote plan.</h2>
            <p>Share your product group, expected quantity, delivery area, and timing. Our team will follow up to confirm details.</p>
          </div>
          <Link href="/en/bao-gia" className="btn-primary btn-on-dark">
            Open quote form <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </main>
  );
}
