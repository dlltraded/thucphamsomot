import { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, FileCheck2, Phone, ShieldCheck, Truck, Clock, Sparkles } from "lucide-react";
import { makeMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site";
import { QuickQuoteForm } from "@/components/b2b/quick-quote-form";
import { LeadCaptureSection } from "@/components/b2b/lead-capture";
import { PartnerRibbon } from "@/components/b2b/partner-ribbon";

export const metadata: Metadata = makeMetadata({
  title: "Nhận Báo Giá Thực Phẩm B2B Trong 24h | Bếp Ăn & Doanh Nghiệp | TPS1",
  description:
    "Nhận báo giá thực phẩm sỉ cho bếp ăn công nghiệp, nhà máy, trường học, bệnh viện trong 24 giờ. Rau củ quả, thịt cá, hàng đông lạnh chuẩn ISO 22000, HACCP tại Đồng Nai, TP.HCM.",
  path: "/nhan-bao-gia",
});

const benefits = [
  {
    icon: Truck,
    title: "Giao đúng khung giờ bếp",
    desc: "Đội xe chuyên dụng và tuyến giao định kỳ tại Đồng Nai, Bình Dương, TP.HCM, đảm bảo nguyên liệu tươi mới kịp giờ sơ chế.",
  },
  {
    icon: FileCheck2,
    title: "Hồ sơ pháp lý & VAT đầy đủ",
    desc: "100% hàng hóa có chứng từ nguồn gốc, kiểm nghiệm an toàn thực phẩm theo lô, xuất hóa đơn VAT điện tử hợp lệ.",
  },
  {
    icon: ShieldCheck,
    title: "Chuẩn ISO 22000 & Bảo hiểm 5 tỷ",
    desc: "Quy trình sơ chế - đóng gói - bảo quản đạt chuẩn ISO 22000:2018 và HACCP, kèm bảo hiểm trách nhiệm sản phẩm trị giá 5.000.000.000 VNĐ.",
  },
];

const customerTypes = [
  { title: "Bếp ăn tập thể & Nhà máy", desc: "100 - 5.000 suất/ngày tại các KCN Biên Hòa, Amata, Nhơn Trạch, Long Thành." },
  { title: "Đơn vị suất ăn công nghiệp", desc: "Cung cấp nguyên liệu số lượng lớn, bình ổn giá theo hợp đồng dài hạn." },
  { title: "Trường học & Đại học", desc: "Tiêu chuẩn an toàn khắt khe, lưu mẫu 24h và hồ sơ minh bạch phục vụ bếp ăn bán trú." },
  { title: "Bệnh viện & Phòng khám", desc: "Phân loại dinh dưỡng chuyên biệt, rau củ quả chuẩn VietGAP và thực phẩm sạch." },
];

const steps = [
  {
    step: "01",
    title: "Để lại nhu cầu",
    desc: "Chỉ mất 30 giây điền 3 thông tin cơ bản: tên bếp, số điện thoại và nhóm hàng cần mua.",
  },
  {
    step: "02",
    title: "Nhận báo giá trong 24h",
    desc: "Chuyên viên TPS1 liên hệ trong 30 phút để xác nhận quy cách và gửi bảng giá chi tiết tối ưu theo sản lượng.",
  },
  {
    step: "03",
    title: "Giao thử & Hợp đồng",
    desc: "Giao đơn mẫu để kiểm tra chất lượng thực tế. Ký hợp đồng ổn định giá và xếp lịch giao hàng định kỳ.",
  },
];

export default function NhanBaoGiaPage() {
  return (
    <main className="landing-quote-page">
      {/* 1. HERO SECTION */}
      <section className="b2b-hero" style={{ minHeight: "auto", padding: "40px 0 60px" }}>
        <div className="b2b-hero__overlay" />

        <div className="b2b-hero__content" style={{ padding: "40px 0 20px" }}>
          <div className="container-shell">
            <div className="b2b-hero__layout">
              {/* Left Column: Headlines & Trust Proof */}
              <div className="b2b-hero__intro">
                <div className="b2b-hero__cert-badge" style={{ marginLeft: 0 }}>
                  <BadgeCheck size={15} /> Báo giá thực phẩm B2B trong 24h · Chuẩn ISO 22000
                </div>

                <h1 className="b2b-hero__title" style={{ marginLeft: 0, textAlign: "left", fontSize: "clamp(2rem, 4.5vw, 3.4rem)" }}>
                  Nguồn thực phẩm ổn định cho <span style={{ color: "#4ade80" }}>bếp ăn chuyên nghiệp.</span>
                </h1>

                <p className="b2b-hero__sub" style={{ marginLeft: 0, textAlign: "left", maxWidth: 640 }}>
                  TPS1 là đối tác cung ứng rau củ, thịt cá tươi sống, hải sản, gia vị và hàng đông lạnh cho hàng trăm nhà máy,
                  trường học, bệnh viện tại Đồng Nai, TP.HCM và vùng phụ cận.
                </p>

                <div style={{ display: "grid", gap: 12, margin: "24px 0", maxWidth: 560 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, color: "rgba(255,255,255,0.9)", fontSize: "0.92rem" }}>
                    <span style={{ color: "#4ade80", fontWeight: 800 }}>✓</span> Giá sỉ tối ưu theo quy mô suất ăn, ổn định theo kỳ
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, color: "rgba(255,255,255,0.9)", fontSize: "0.92rem" }}>
                    <span style={{ color: "#4ade80", fontWeight: 800 }}>✓</span> Đội xe lạnh giao trước giờ sơ chế, đổi trả ngay tại chỗ nếu chưa đạt
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, color: "rgba(255,255,255,0.9)", fontSize: "0.92rem" }}>
                    <span style={{ color: "#4ade80", fontWeight: 800 }}>✓</span> Xuất hóa đơn VAT, đầy đủ phiếu kiểm nghiệm an toàn thực phẩm
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 24, flexWrap: "wrap" }}>
                  <a
                    href={`tel:${siteConfig.phone.replace(/\s+/g, "")}`}
                    className="b2b-hero__hotline"
                    style={{ fontWeight: 700, fontSize: "1rem" }}
                  >
                    <Phone size={18} /> Hotline tư vấn: <strong>{siteConfig.phone}</strong>
                  </a>
                  <a
                    href={`https://zalo.me/${siteConfig.zalo}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-hero-secondary"
                    style={{ padding: "10px 20px", fontSize: "0.9rem" }}
                  >
                    Chat Zalo Báo Giá
                  </a>
                </div>
              </div>

              {/* Right Column: Quick Quote Form */}
              <div className="b2b-hero__form-wrap">
                <QuickQuoteForm variant="hero" sourceContext="google_ads_landing" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. PARTNERS / CLIENTS RIBBON */}
      <PartnerRibbon />

      {/* 3. 3 CORE BENEFITS */}
      <section style={{ padding: "70px 0", background: "#ffffff" }}>
        <div className="container-shell">
          <div style={{ textAlign: "center", maxWidth: 660, margin: "0 auto 44px" }}>
            <div className="section-label" style={{ color: "#0f6f4b" }}>Ưu thế vượt trội</div>
            <h2 className="section-title" style={{ color: "#133127" }}>
              Giải pháp cung ứng thực phẩm an tâm tuyệt đối cho quản lý bếp
            </h2>
            <p className="section-desc" style={{ margin: "0 auto" }}>
              Chúng tôi hiểu rằng mỗi bữa ăn là uy tín của quý công ty. TPS1 cam kết chất lượng đồng đều và trách nhiệm cao nhất.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 28,
            }}
          >
            {benefits.map((b) => {
              const Icon = b.icon;
              return (
                <div
                  key={b.title}
                  style={{
                    padding: "32px 28px",
                    borderRadius: 16,
                    background: "#f9fcfb",
                    border: "1px solid #e1eee7",
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: "rgba(20,184,122,0.12)",
                      color: "#0f6f4b",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon size={24} />
                  </div>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#133127", margin: 0 }}>
                    {b.title}
                  </h3>
                  <p style={{ fontSize: "0.92rem", color: "#59665f", lineHeight: 1.6, margin: 0 }}>
                    {b.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. CUSTOMER SEGMENTS */}
      <section style={{ padding: "70px 0", background: "#f6faf8" }}>
        <div className="container-shell">
          <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 40px" }}>
            <div className="section-label">Khách hàng mục tiêu</div>
            <h2 className="section-title">Phục vụ linh hoạt theo từng mô hình bếp</h2>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 20,
            }}
          >
            {customerTypes.map((c) => (
              <div
                key={c.title}
                style={{
                  background: "#ffffff",
                  padding: "24px 22px",
                  borderRadius: 14,
                  border: "1px solid #e6f0eb",
                  boxShadow: "0 6px 16px rgba(0,0,0,0.03)",
                }}
              >
                <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#133127", marginBottom: 8 }}>
                  {c.title}
                </h3>
                <p style={{ fontSize: "0.88rem", color: "#59665f", lineHeight: 1.55, margin: 0 }}>
                  {c.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. 3-STEP PROCESS */}
      <section style={{ padding: "70px 0", background: "#ffffff" }}>
        <div className="container-shell">
          <div style={{ textAlign: "center", maxWidth: 600, margin: "0 auto 44px" }}>
            <div className="section-label">Quy trình làm việc</div>
            <h2 className="section-title">Nhận báo giá chỉ trong 3 bước</h2>
            <p className="section-desc" style={{ margin: "0 auto" }}>
              Nhanh chóng, minh bạch và không phát sinh bất kỳ ràng buộc nào.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 24,
            }}
          >
            {steps.map((s) => (
              <div
                key={s.step}
                style={{
                  padding: "28px 24px",
                  borderRadius: 16,
                  background: "#fdfefe",
                  border: "1px dashed rgba(15,111,75,0.25)",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    fontSize: "2rem",
                    fontWeight: 900,
                    color: "#14b87a",
                    lineHeight: 1,
                    marginBottom: 12,
                  }}
                >
                  {s.step}
                </div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#133127", marginBottom: 8 }}>
                  {s.title}
                </h3>
                <p style={{ fontSize: "0.9rem", color: "#59665f", lineHeight: 1.6, margin: 0 }}>
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. DETAILED RFQ FORM SECTION (Optional for visitors with Excel files) */}
      <div id="rfq-form">
        <LeadCaptureSection />
      </div>

      {/* 7. BOTTOM CALL TO ACTION */}
      <section
        style={{
          background: "linear-gradient(135deg, #092c20, #04140d)",
          padding: "60px 0",
          textAlign: "center",
          color: "#ffffff",
        }}
      >
        <div className="container-shell">
          <div style={{ maxWidth: 640, margin: "0 auto" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#4ade80", fontSize: "0.85rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
              <Sparkles size={16} /> Liên hệ nhanh với TPS1
            </div>
            <h2 style={{ fontSize: "clamp(1.7rem, 3.5vw, 2.4rem)", fontWeight: 850, margin: "0 0 16px" }}>
              Cần bảng giá thực phẩm ngay trong ngày?
            </h2>
            <p style={{ fontSize: "1rem", color: "rgba(255,255,255,0.76)", lineHeight: 1.6, margin: "0 0 28px" }}>
              Đội ngũ kinh doanh TPS1 luôn sẵn sàng hỗ trợ khảo sát thực đơn và lập bảng giá dự toán phù hợp nhất cho đơn vị của bạn.
            </p>
            <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
              <a
                href="#quick-quote"
                className="btn-hero-primary"
                style={{ fontSize: "0.95rem", padding: "14px 28px" }}
              >
                Điền form báo giá nhanh <ArrowRight size={17} />
              </a>
              <a
                href={`tel:${siteConfig.phone.replace(/\s+/g, "")}`}
                className="btn-hero-secondary"
                style={{ fontSize: "0.95rem", padding: "14px 28px" }}
              >
                <Phone size={17} /> Gọi: {siteConfig.phone}
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
