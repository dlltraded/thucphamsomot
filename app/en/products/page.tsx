import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, ClipboardList, Truck } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { makeMetadata } from "@/lib/seo";
import { productImageBySlug } from "@/lib/content";

export const metadata = makeMetadata({
  title: "Products",
  description: "Core product groups supplied by TPS1 for B2B kitchens and food service operators.",
  path: "/en/products",
});

const highlights = [
  {
    icon: ClipboardList,
    title: "Clear groups for faster quoting",
    text: "Products are grouped the way kitchens usually buy: fresh, chilled, frozen, seasoning, and vegan categories.",
  },
  {
    icon: Truck,
    title: "Suitable for scheduled delivery",
    text: "Requests can include frequency, delivery area, and kitchen receiving time.",
  },
  {
    icon: BadgeCheck,
    title: "Quote by requirement",
    text: "TPS1 follows up with practical options based on quantity and specification.",
  },
];

const products = [
  {
    slug: "fresh-vegetables",
    title: "Fresh vegetables",
    summary: "Seasonal vegetables and fruit for canteens, schools, hospitals, and industrial kitchens.",
    image: productImageBySlug["rau-cu-qua-tuoi-song"],
    features: ["Fresh supply", "Recurring delivery", "Kitchen-friendly categories"],
  },
  {
    slug: "meat-seafood",
    title: "Meat and seafood",
    summary: "Protein product groups for restaurants, hotels, canteens, and catering operations.",
    image: productImageBySlug["thit-ca-hai-san-tuoi-song"],
    features: ["Clear specifications", "Bulk demand", "Kitchen planning"],
  },
  {
    slug: "frozen-food",
    title: "Frozen food",
    summary: "Frozen products for inventory planning and stable kitchen operations.",
    image: productImageBySlug["hang-dong-lanh"],
    features: ["Cold storage", "Planned delivery", "Operational stability"],
  },
  {
    slug: "seasonings",
    title: "Kitchen seasonings",
    summary: "Seasonings and kitchen supplies for professional food preparation.",
    image: productImageBySlug["gia-vi-nha-bep"],
    features: ["Wide range", "Menu support", "Cost control"],
  },
  {
    slug: "vegan-products",
    title: "Vegan products",
    summary: "Vegan ingredients and seasonings for flexible menus and special meal plans.",
    image: productImageBySlug["thuc-pham-chay"],
    features: ["Flexible menu", "Special demand", "Recurring supply"],
  },
];

export default function EnglishProductsPage() {
  return (
    <PageShell
      eyebrow="Products"
      title="Food product groups for canteens, restaurants, and industrial catering"
      description="Browse the main groups and send a request with expected quantity, delivery area, and specifications."
      locale="en"
    >
      <section className="product-intro">
        {highlights.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.title} className="product-intro__item">
              <Icon size={22} />
              <h2>{item.title}</h2>
              <p>{item.text}</p>
            </article>
          );
        })}
      </section>

      <section className="product-showcase">
        <div className="section-split">
          <div>
            <div className="eyebrow">Core categories</div>
            <h2 className="product-section-title">Product groups currently serving bulk and recurring B2B buying needs.</h2>
          </div>
          <Link href="/en/bao-gia" className="text-link">
            Open quote form <ArrowRight size={16} />
          </Link>
        </div>

        <div className="product-grid">
          {products.map((item, index) => (
            <article key={item.slug} className="product-card">
              <div className="product-card__media">
                <Image src={item.image} alt={item.title} fill sizes="(max-width: 768px) 100vw, 33vw" className="product-card__image" />
                <span className="product-card__index">0{index + 1}</span>
              </div>
              <div className="product-card__body">
                <h3>{item.title}</h3>
                <p>{item.summary}</p>
                <div className="product-card__features">
                  {item.features.map((feature) => (
                    <span key={feature}>{feature}</span>
                  ))}
                </div>
                <div className="product-card__footer">
                  <Link href="/en/bao-gia" className="text-link">
                    Request quote <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
