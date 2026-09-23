import Image from "next/image";
import { BadgeCheck, FileCheck2, Truck } from "lucide-react";
import { DeferredThreeBackground } from "./deferred-three-background";
import { QuickQuoteForm } from "@/components/b2b/quick-quote-form";

const copy = {
  vi: {
    eyebrow: "NGUỒN NGUYÊN LIỆU B2B · HỒ SƠ RÕ RÀNG · GIAO ĐỊNH KỲ",
    title: "Đối tác cung ứng thực phẩm B2B",
    titleHighlight: "chuyên nghiệp",
    titleEnd: "tại Đồng Nai",
    description: "Phục vụ bếp ăn tập thể, nhà máy, trường học và bệnh viện. Báo giá trong 24h - Giao định kỳ - Hóa đơn VAT đầy đủ.",
    pills: [
      { icon: FileCheck2, text: "Hồ sơ ATTP theo yêu cầu" },
      { icon: BadgeCheck, text: "Báo giá theo sản lượng" },
      { icon: Truck, text: "Giao định kỳ theo thỏa thuận" },
    ],
    stats: [
      { value: "24h", label: "HOÀN THÀNH BÁO GIÁ" },
      { value: "30'", label: "XÁC NHẬN YÊU CẦU" },
      { value: "B2B", label: "BÁO GIÁ THEO SẢN LƯỢNG" },
      { value: "VAT", label: "CHỨNG TỪ ĐẦY ĐỦ" },
    ],
    imageAlt: "Kho thực phẩm và năng lực cung ứng B2B của TPS1",
  },
  en: {
    eyebrow: "B2B FOOD SUPPLY · CLEAR DOCUMENTATION · SCHEDULED DELIVERY",
    title: "Professional B2B food supply partner",
    titleHighlight: "in Dong Nai",
    titleEnd: "",
    description: "Serving industrial caterers, factories, schools and hospitals. 24h quotes - Scheduled delivery - VAT invoices.",
    pills: [
      { icon: FileCheck2, text: "Food safety docs available" },
      { icon: BadgeCheck, text: "Volume-based pricing" },
      { icon: Truck, text: "Agreed delivery schedule" },
    ],
    stats: [
      { value: "24h", label: "QUOTE TURNAROUND" },
      { value: "30'", label: "REQUEST CONFIRMATION" },
      { value: "B2B", label: "VOLUME PRICING" },
      { value: "VAT", label: "FULL DOCUMENTATION" },
    ],
    imageAlt: "TPS1 warehouse and B2B food supply capability",
  },
} as const;

export function B2BHeroSection({ locale = "vi" }: { locale?: "vi" | "en" }) {
  const text = copy[locale];

  return (
    <section className="b2b-hero" aria-labelledby="home-hero-title">
      <div className="b2b-hero__bg">
        <Image
          src="/images/hero-warehouse.webp"
          alt={text.imageAlt}
          fill
          priority
          fetchPriority="high"
          quality={75}
          className="object-cover object-center"
          sizes="100vw"
        />
      </div>
      <div className="b2b-hero__overlay" />
      <DeferredThreeBackground />

      <div className="b2b-hero__content">
        <div className="container-shell">
          <div className="b2b-hero__layout">
            <div className="b2b-hero__intro">
              <div className="b2b-hero__cert-badge" style={{ marginLeft: 0, textTransform: "uppercase" }}>
                <BadgeCheck size={15} /> {text.eyebrow}
              </div>
              <h1 id="home-hero-title" className="b2b-hero__title" style={{ marginLeft: 0, textAlign: "left" }}>
                {text.title} <span style={{ color: "#4ade80" }}>{text.titleHighlight}</span> {text.titleEnd}
              </h1>
              <p className="b2b-hero__sub" style={{ marginLeft: 0, textAlign: "left" }}>
                {text.description}
              </p>
              
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "24px", marginBottom: "40px" }}>
                {text.pills.map(({ icon: Icon, text: pillText }) => (
                  <div key={pillText} style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "8px 16px", borderRadius: "100px", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.05)", color: "white", fontSize: "0.85rem", fontWeight: 600 }}>
                    <Icon size={16} color="#4ade80" /> {pillText}
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: "40px", flexWrap: "wrap", paddingTop: "32px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                {text.stats.map(({ value, label }) => (
                  <div key={label} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <span style={{ fontSize: "2rem", fontWeight: 900, color: "#fff", lineHeight: 1 }}>{value}</span>
                    <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.6)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="b2b-hero__form-wrap">
              <QuickQuoteForm variant="hero" sourceContext="homepage_hero" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
