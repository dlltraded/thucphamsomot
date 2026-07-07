import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { categories } from "@/lib/content";

const imageMap: Record<string, string> = {
  "rau-cu-qua": "/images/categories/rau-cu-qua.png",
  "thit-ca-hai-san": "/images/categories/thit-ca.png",
  "hang-dong-lanh": "/images/categories/dong-lanh.png",
  "gia-vi": "/images/categories/gia-vi.png",
  "thuc-pham-chay": "/images/categories/chay.png",
};

const texts = {
  vi: {
    label: "Danh mục B2B",
    title: <>Đáp ứng mọi nhu cầu <br />nguyên liệu bếp ăn.</>,
    desc: "Không hiển thị giá niêm yết — mỗi đơn hàng được báo giá riêng theo sản lượng thực tế.",
    btnAll: "Xem toàn bộ danh mục",
    btnLink: "/san-pham",
    rfqTag: "Chính sách B2B: Liên hệ để nhận báo giá — không hiển thị giá niêm yết",
    rfqBtn: "Xem & Yêu cầu báo giá",
    catLinkPrefix: "/danh-muc/",
  },
  en: {
    label: "B2B Catalog",
    title: <>Fulfilling all your <br />kitchen ingredient needs.</>,
    desc: "No public pricing — every order gets a custom quote based on actual volume.",
    btnAll: "View full catalog",
    btnLink: "/en/products",
    rfqTag: "B2B Policy: Contact for a quote — no public pricing displayed",
    rfqBtn: "View & Request Quote",
    catLinkPrefix: "/en/category/",
  }
};

const enCategoryOverrides: Record<string, { title: string; description: string; highlights: string[] }> = {
  "rau-cu-qua": {
    title: "Vegetables & Fruits",
    description: "Fresh vegetables for canteens, schools, hospitals, restaurants, and industrial catering.",
    highlights: ["Dalat & West sources", "VietGAP available", "Scheduled delivery"]
  },
  "thit-ca-hai-san": {
    title: "Meat & Seafood",
    description: "High-protein foods for restaurants, hotels, canteens, hospitals, and industrial catering.",
    highlights: ["Daily fresh seafood", "Major meat suppliers", "Custom specs"]
  },
  "hang-dong-lanh": {
    title: "Frozen Foods",
    description: "Frozen foods for kitchens aiming to optimize inventory, maintain quality, and plan ingredients proactively.",
    highlights: ["Cold storage", "Beef, chicken, fish", "For large kitchens"]
  },
  "gia-vi": {
    title: "Seasonings & Spices",
    description: "Asian & Western spices, vegetarian seasonings, and kitchen supplies for professional canteens and restaurants.",
    highlights: ["Chinese cuisine", "Korean cuisine", "Western cuisine", "Full catalog"]
  },
  "thuc-pham-chay": {
    title: "Vegetarian Foods",
    description: "Vegetarian foods and spices for restaurants, canteens, schools, events, and flexible menus.",
    highlights: ["Specialized distributor", "Flexible vegan menus", "Suitable for all"]
  }
};


export function B2BCatalog({ locale = "vi" }: { locale?: "vi" | "en" }) {
  const displayCats = categories.slice(0, 5);
  const t = texts[locale];

  return (
    <section className="b2b-catalog" aria-labelledby="catalog-heading">
      <div className="container-shell">
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px",
            marginBottom: "36px",
          }}
        >
          <div>
            <div className="section-label">{t.label}</div>
            <h2 id="catalog-heading" className="section-title">
              {t.title}
            </h2>
            <p className="section-desc" style={{ marginBottom: 0 }}>
              {t.desc}
            </p>
          </div>
          <Link href={t.btnLink} className="btn-header-internal">
            {t.btnAll} <ArrowRight size={15} />
          </Link>
        </div>

        {/* RFQ notice badge */}
        <div style={{ marginBottom: "24px" }}>
          <span className="b2b-catalog__rfq-tag">
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#c7372f", display: "inline-block" }} />
            {t.rfqTag}
          </span>
        </div>

        {/* Bento grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(12, 1fr)",
            gap: "16px",
          }}
          id="catalog-bento"
        >
          {displayCats.map((baseCat, index) => {
            const bgImage = imageMap[baseCat.slug] || "/images/categories/rau-cu-qua.png";
            // Index 0, 1: 6 cols (Row 1)
            // Index 2, 3, 4: 4 cols (Row 2)
            const colSpan = index < 2 ? "span 6 / span 6" : "span 4 / span 4";
            const minHeight = index < 2 ? "340px" : "260px";

            let title = baseCat.title;
            let description = baseCat.description;
            let highlights = baseCat.highlights ?? [];

            if (locale === "en" && enCategoryOverrides[baseCat.slug]) {
              title = enCategoryOverrides[baseCat.slug].title;
              description = enCategoryOverrides[baseCat.slug].description;
              highlights = enCategoryOverrides[baseCat.slug].highlights;
            }

            return (
              <div
                key={baseCat.slug}
                className="b2b-category-card"
                style={{ gridColumn: colSpan, minHeight }}
              >
                <Image
                  src={bgImage}
                  alt={title}
                  fill
                  className="b2b-category-card__img object-cover"
                  sizes={index < 2 ? "50vw" : "33vw"}
                />
                <div className="b2b-category-card__overlay" />
                <div className="b2b-category-card__content">
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      color: "rgba(255,255,255,0.5)",
                      letterSpacing: "0.06em",
                      display: "block",
                      marginBottom: "4px",
                    }}
                  >
                    0{index + 1}
                  </span>
                  <h3
                    style={{
                      fontSize: index < 2 ? "1.5rem" : "1.05rem",
                      fontWeight: 900,
                      marginBottom: index < 2 ? "10px" : "12px",
                      lineHeight: 1.2,
                    }}
                  >
                    {title}
                  </h3>

                  {index < 2 && description && (
                    <p
                      style={{
                        fontSize: "0.88rem",
                        color: "rgba(255,255,255,0.72)",
                        marginBottom: "16px",
                        lineHeight: 1.6,
                        maxWidth: "320px",
                      }}
                    >
                      {description}
                    </p>
                  )}

                  {/* Highlights */}
                  {highlights.slice(0, index < 2 ? 3 : 2).length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "14px" }}>
                      {highlights.slice(0, index < 2 ? 3 : 2).map((h) => (
                        <span
                          key={h}
                          style={{
                            fontSize: "0.72rem",
                            padding: "3px 9px",
                            borderRadius: "999px",
                            background: "rgba(255,255,255,0.14)",
                            border: "1px solid rgba(255,255,255,0.18)",
                          }}
                        >
                          {h}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* RFQ Button */}
                  <Link href={`${t.catLinkPrefix}${baseCat.slug}`} className="b2b-rfq-btn">
                    {t.rfqBtn} <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile grid 2-col */}
        <style dangerouslySetInnerHTML={{__html: `
          @media (max-width: 768px) {
            #catalog-bento { grid-template-columns: 1fr 1fr !important; }
            #catalog-bento > *:first-child { grid-column: span 2 !important; min-height: 280px !important; }
            #catalog-bento > * { grid-column: span 1 !important; min-height: 180px !important; }
          }
        `}} />
      </div>
    </section>
  );
}
