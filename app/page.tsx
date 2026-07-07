import Link from "next/link";
import { ArrowRight, CheckCircle } from "lucide-react";
import { makeMetadata } from "@/lib/seo";
import { B2BHeroSection } from "@/components/b2b/hero-section";
import { PartnerRibbon } from "@/components/b2b/partner-ribbon";
import { TrustPillars } from "@/components/b2b/trust-pillars";
import { B2BCatalog } from "@/components/b2b/catalog-section";
import { LeadCaptureSection } from "@/components/b2b/lead-capture";

export const metadata = makeMetadata({
  title: "Nhà Cung Cấp Thực Phẩm Bếp Ăn Công Nghiệp Tại Đồng Nai | TPS1",
  description:
    "Chuyên cung cấp thực phẩm B2B (rau củ, thịt cá, gia vị) cho bếp ăn công nghiệp, nhà máy, xí nghiệp tại Đồng Nai, Nhơn Trạch, Biên Hòa. Chuẩn ISO 22000, HACCP.",
  path: "/",
});

const processSteps = [
  {
    num: "01",
    title: "Gửi danh sách hàng",
    desc: "Upload file Excel, PDF hoặc ảnh chụp danh sách nguyên liệu cần mua.",
  },
  {
    num: "02",
    title: "Nhận báo giá trong 24h",
    desc: "Đội kinh doanh phân tích và gửi bảng giá chi tiết phù hợp sản lượng của bạn.",
  },
  {
    num: "03",
    title: "Xác nhận & Giao hàng",
    desc: "Chốt đơn qua điện thoại hoặc email. Giao đúng lịch, đúng quy cách đã thỏa thuận.",
  },
];

const certifications = [
  { label: "ISO 22000:2018", detail: "Hệ thống quản lý an toàn thực phẩm" },
  { label: "HACCP", detail: "Phân tích mối nguy & Kiểm soát tới hạn" },
  { label: "Bảo hiểm SP", detail: "Trách nhiệm sản phẩm 5.000.000.000 VNĐ" },
  { label: "Hóa đơn VAT", detail: "Xuất hóa đơn điện tử hợp lệ" },
];

export default function HomePage() {
  return (
    <main>
      {/* 1. HERO */}
      <B2BHeroSection />

      {/* 2. SOCIAL PROOF – Partner ribbon */}
      <PartnerRibbon />

      {/* 3. TRUST PILLARS */}
      <TrustPillars />

      {/* 4. B2B CATALOG */}
      <B2BCatalog />

      {/* 5. PROCESS – How it works */}
      <section className="b2b-process" aria-labelledby="process-heading">
        <div className="container-shell">
          <div style={{ textAlign: "center", maxWidth: "640px", margin: "0 auto 56px" }}>
            <div className="section-label">Quy trình làm việc</div>
            <h2 id="process-heading" className="section-title">
              3 bước — Đơn giản &amp; Minh bạch
            </h2>
            <p className="section-desc" style={{ margin: "0 auto" }}>
              Không phức tạp, không phí thời gian. TPS1 tối ưu hóa quy trình để bạn có báo giá nhanh nhất.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "24px",
              position: "relative",
            }}
          >
            {/* Connector line */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                top: "32px",
                left: "16.5%",
                right: "16.5%",
                height: "2px",
                background: "transparent",
                borderTop: "2px dashed rgba(15,111,75,0.3)",
                zIndex: 0,
              }}
            />
            {/* Animated glowing dot */}
            <div
              aria-hidden="true"
              className="process-dot-anim"
              style={{
                position: "absolute",
                top: "30px",
                left: "16.5%",
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#14b87a",
                boxShadow: "0 0 10px #14b87a, 0 0 20px #14b87a",
                zIndex: 1,
              }}
            />
            {processSteps.map((step) => (
              <div key={step.num} className="b2b-process-step" style={{ position: "relative" }}>
                <div className="b2b-process-step__num">{step.num}</div>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 800, marginBottom: "10px", color: "#133127" }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: "0.9rem", color: "#59665f", lineHeight: 1.7, margin: 0 }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Mobile: 1-col */}
          <style>{`
            @media (max-width: 640px) {
              #process-heading ~ div { grid-template-columns: 1fr !important; }
            }
          `}</style>
        </div>
      </section>

      {/* 6. LEAD CAPTURE (Dropzone + Form) */}
      <LeadCaptureSection />


      {/* 8. FINAL CTA BAND */}
      <section className="b2b-cta-band" aria-label="Kêu gọi hành động cuối trang">
        <div className="container-shell" style={{ position: "relative", zIndex: 1 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              gap: "24px",
            }}
          >
            <div className="section-label" style={{ color: "#4ade80" }}>
              Sẵn sàng hợp tác
            </div>
            <h2 className="section-title-light" style={{ maxWidth: "640px", margin: 0 }}>
              Nhận báo giá thực phẩm<br />cho bếp ăn của bạn ngay hôm nay.
            </h2>
            <p style={{ color: "rgba(255,255,255,0.62)", fontSize: "1rem", lineHeight: 1.7, maxWidth: "480px", margin: 0 }}>
              Phản hồi trong 24 giờ. Không cam kết, không ràng buộc.
              Chỉ cần gửi danh sách hàng — TPS1 làm phần còn lại.
            </p>
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "center" }}>
              <Link href="#rfq-form" className="btn-hero-primary" style={{ fontSize: "1rem" }}>
                Gửi yêu cầu báo giá <ArrowRight size={18} />
              </Link>
              <Link href="/gioi-thieu" className="btn-hero-secondary">
                Tải hồ sơ năng lực
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
