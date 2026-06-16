import Link from "next/link";
import { ArrowRight, Boxes, BadgeCheck, ClipboardList, Leaf, MapPin, Truck } from "lucide-react";
import { categories } from "@/lib/content";
import { makeMetadata } from "@/lib/seo";
import { ProductsGrid } from "@/app/san-pham/products-grid";

export const metadata = makeMetadata({
  title: "Products",
  description: "Core product groups supplied by TPS1 for B2B kitchens and food service operators.",
  path: "/en/products",
});

const localCoverageLinks = [
  { href: "/en/contact", title: "Dong Nai" },
  { href: "/en/contact", title: "Bien Hoa" },
  { href: "/en/contact", title: "Binh Duong" },
  { href: "/en/contact", title: "Nhon Trach" },
  { href: "/en/contact", title: "Ho Chi Minh City" },
  { href: "/en/contact", title: "Ba Ria - Vung Tau" },
];

const guideLinks = [
  {
    href: "/en/news",
    title: "How to plan menus for industrial catering",
    text: "Convert your menus into purchase lists and standardized portions.",
  },
  {
    href: "/en/news",
    title: "Quick quote request checklist",
    text: "Prepare the right information before submitting your quote request.",
  },
  {
    href: "/en/news",
    title: "How to select food for catering",
    text: "Control shrinkage and understand quality standards for bulk buying.",
  },
];

export const dynamic = "force-dynamic";

export default async function EnglishProductsPage() {
  return (
    <main className="sp-page">
      {/* ── Slim compact header ── */}
      <div className="sp-page__head container-shell">
        <div className="sp-page__head-left">
          <div className="eyebrow">Product Catalog</div>
          <h1 className="sp-page__title">Select products &amp; request quote</h1>
          <p className="sp-page__desc">
            Add items to your quote cart and submit your request — our team responds within 30 minutes.
          </p>
        </div>
        <div className="sp-page__badges">
          <span><ClipboardList size={14} /> Custom quotes by category</span>
          <span><Truck size={14} /> Scheduled delivery across Southeast region</span>
          <span><BadgeCheck size={14} /> Right products, right timing</span>
        </div>
      </div>

      {/* ── SKU Grid từ Supabase ── */}
      <ProductsGrid locale="en" />

      {/* ── Danh mục ── */}
      <section className="product-category-band">
        <div className="product-category-band__intro">
          <div className="eyebrow">Product Categories</div>
          <h2>From broad groups to specific kitchen needs.</h2>
          <p>
            If you don't have a fixed SKU list yet, you can start from these categories and add quantities, delivery schedule, and packaging requirements later.
          </p>
        </div>
        <div className="product-category-list">
          {categories.map((item) => (
            <Link key={item.slug} href={`/en/products`} className="product-category-link">
              <span><Leaf size={16} />{item.titleEn}</span>
              <ArrowRight size={16} />
            </Link>
          ))}
        </div>
      </section>

      <section className="product-category-band">
        <div className="product-category-band__intro">
          <div className="eyebrow">Coverage Area</div>
          <h2>Choose your location for delivery schedules and fast quotes.</h2>
          <p>Clients in different areas can find specific delivery schedules and request fast quotes based on their location.</p>
        </div>
        <div className="product-category-list">
          {localCoverageLinks.map((item) => (
            <Link key={item.title} href={item.href} className="product-category-link">
              <span><MapPin size={16} />{item.title}</span>
              <ArrowRight size={16} />
            </Link>
          ))}
        </div>
      </section>

      <section className="product-category-band">
        <div className="product-category-band__intro">
          <div className="eyebrow">Recommended Reading</div>
          <h2>A few guides to help you finalize your buying needs faster.</h2>
          <p>These articles help you prepare menus, quote information, and choose the right sources for B2B kitchens.</p>
        </div>
        <div className="product-grid" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
          {guideLinks.map((item) => (
            <Link key={item.title} href={item.href} className="product-card">
              <div className="product-card__body">
                <div className="pill">Knowledge Base</div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <div className="product-card__footer">
                  <span className="text-link">Read more <ArrowRight size={16} /></span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="product-cta">
        <div>
          <Boxes size={26} />
          <h2>Need a quote for your specific menu?</h2>
          <p>Send us your product groups, expected quantities, delivery area, and frequency. Our team will prepare a tailored proposal.</p>
        </div>
        <Link href="/en/bao-gia" className="btn-primary btn-on-dark">
          Open Quote Form <ArrowRight size={18} />
        </Link>
      </section>
    </main>
  );
}
