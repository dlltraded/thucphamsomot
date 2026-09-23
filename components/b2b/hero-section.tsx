import Image from "next/image";
import { BadgeCheck, FileCheck2, Truck } from "lucide-react";
import { DeferredThreeBackground } from "./deferred-three-background";
import { QuickQuoteForm } from "@/components/b2b/quick-quote-form";

const copy = {
  vi: {
    eyebrow: "NGUỒN NGUYÊN LIỆU B2B · HỒ SƠ RÕ RÀNG · GIAO ĐỊNH KỲ",
    titleLines: ["Đối tác cung ứng", "thực phẩm B2B", "chuyên nghiệp", "tại Đồng Nai"],
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
    titleLines: ["Professional", "B2B food supply", "partner", "in Dong Nai"],
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
          quality={80}
          className="object-cover object-center"
          sizes="100vw"
        />
      </div>
      <div className="b2b-hero__overlay" style={{ background: "linear-gradient(90deg, rgba(4,20,15,0.95) 0%, rgba(4,20,15,0.85) 45%, rgba(4,20,15,0.4) 100%)" }} />
      <DeferredThreeBackground />

      <div className="b2b-hero__content">
        <div className="container-shell">
          <div className="b2b-hero__layout">
            <div className="b2b-hero__intro">
              <div className="b2b-hero__cert-badge" style={{ marginLeft: 0, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.8rem", color: "#fef08a", borderColor: "rgba(254,240,138,0.3)", background: "rgba(254,240,138,0.1)" }}>
                <BadgeCheck size={15} /> {text.eyebrow}
              </div>
              <h1 id="home-hero-title" className="b2b-hero__title" style={{ marginLeft: 0, textAlign: "left", display: "flex", flexDirection: "column", gap: "2px", margin: "24px 0", letterSpacing: "-0.03em" }}>
                <span style={{ fontSize: "clamp(2.5rem, 5vw, 4.2rem)" }}>{text.titleLines[0]}</span>
                <span style={{ fontSize: "clamp(2.5rem, 5vw, 4.2rem)" }}>{text.titleLines[1]}</span>
                <span style={{ fontSize: "clamp(2.8rem, 6vw, 4.8rem)", color: "#4ade80", textShadow: "0 0 40px rgba(74,222,128,0.4)" }}>{text.titleLines[2]}</span>
                <span style={{ fontSize: "clamp(2.5rem, 5vw, 4.2rem)" }}>{text.titleLines[3]}</span>
              </h1>
              <p className="b2b-hero__sub" style={{ marginLeft: 0, textAlign: "left", fontSize: "1.15rem", color: "rgba(255,255,255,0.85)", lineHeight: 1.6, maxWidth: "580px" }}>
                {text.description}
              </p>
              
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "32px", marginBottom: "48px" }}>
                {text.pills.map(({ icon: Icon, text: pillText }) => (
                  <div key={pillText} style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "8px 18px", borderRadius: "100px", border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.03)", backdropFilter: "blur(10px)", color: "#f8fafc", fontSize: "0.9rem", fontWeight: 500, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                    <Icon size={16} color="#4ade80" /> {pillText}
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "24px", paddingTop: "32px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                {text.stats.map(({ value, label }) => (
                  <div key={label} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <span style={{ fontSize: "2.2rem", fontWeight: 900, color: "#fff", lineHeight: 1, letterSpacing: "-0.02em" }}>{value}</span>
                    <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.6)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", lineHeight: 1.4 }}>{label}</span>
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
