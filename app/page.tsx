import Link from "next/link";
import { ArrowRight, CheckCircle } from "lucide-react";
import { makeMetadata } from "@/lib/seo";
import { B2BHeroSection } from "@/components/b2b/hero-section";
import { PartnerRibbon } from "@/components/b2b/partner-ribbon";
import { TrustPillars } from "@/components/b2b/trust-pillars";
import { B2BCatalog } from "@/components/b2b/catalog-section";
import { LeadCaptureSection } from "@/components/b2b/lead-capture";
import { QuickQuoteForm } from "@/components/b2b/quick-quote-form";

export const metadata = makeMetadata({
  title: "Nhà cung cấp thực phẩm cho nhà hàng, bếp ăn tại Đồng Nai | TPS1",
  description:
    "Gửi trọn an tâm trong từng bữa ăn. TPS1 cung cấp rau củ, thịt cá, hàng đông lạnh, đồ khô cho nhà hàng, quán ăn, bếp công ty, trường học tại Đồng Nai, TP.HCM.",
  path: "/",
});

const processSteps = [
  {
    num: "01",
    title: "Gửi danh sách hàng",
    desc: "Tải lên file Excel, PDF hoặc ảnh chụp danh sách nguyên liệu cần mua.",
  },
  {
    num: "02",
    title: "Nhận báo giá trong 24 giờ",
    desc: "Đội kinh doanh gửi bảng giá chi tiết, tính theo sản lượng thực tế của từng gian bếp.",
  },
  {
    num: "03",
    title: "Xác nhận và giao hàng",
    desc: "Chốt đơn qua điện thoại hoặc email; hàng về bếp đúng lịch, đúng quy cách đã thỏa thuận.",
  },
];

const industryHighlights = [
  { href: "/nganh-hang/nha-hang-khach-san", label: "Nhà hàng, khách sạn", description: "Hàng hóa đạt chuẩn, đều cỡ cho thực đơn đổi theo mùa, giao đúng giờ mở bếp." },
  { href: "/nganh-hang/quan-an", label: "Quán ăn, chuỗi F&B", description: "Hàng tươi mỗi sáng, lượng vừa đủ cho ngày bán, giao đúng giờ quán cần." },
  { href: "/nganh-hang/bep-an-tap-the", label: "Bếp ăn công ty, nhà máy", description: "Giao theo ca, đúng định mức cho bếp ăn khu công nghiệp và doanh nghiệp." },
  { href: "/nganh-hang/truong-hoc", label: "Trường học", description: "Nguồn hàng an toàn, hồ sơ rõ ràng cho bữa ăn bán trú của các em." },
  { href: "/nganh-hang/benh-vien", label: "Bệnh viện", description: "Kiểm soát an toàn theo ISO 22000 và HACCP cho bếp ăn bệnh viện." },
  { href: "/nganh-hang/suat-an-cong-nghiep", label: "Đơn vị suất ăn", description: "Nguyên liệu ổn định và hỗ trợ thực đơn cho đơn vị cung cấp suất ăn." },
];

const areaHighlights = [
  { href: "/cung-cap-thuc-pham-dong-nai", label: "Đồng Nai" },
  { href: "/cung-cap-thuc-pham-bien-hoa", label: "Biên Hòa" },
  { href: "/cung-cap-thuc-pham-binh-phuoc", label: "Bình Phước" },
  { href: "/cung-cap-thuc-pham-nhon-trach", label: "Nhơn Trạch" },
  { href: "/cung-cap-thuc-pham-long-thanh", label: "Long Thành" },
  { href: "/cung-cap-thuc-pham-trang-bom", label: "Trảng Bom" },
  { href: "/cung-cap-thuc-pham-kcn-amata", label: "KCN Amata" },
  { href: "/cung-cap-thuc-pham-vinh-cuu", label: "Vĩnh Cửu" },
  { href: "/cung-cap-thuc-pham-tam-phuoc", label: "Tam Phước" },
  { href: "/cung-cap-thuc-pham-ho-nai", label: "Hố Nai" },
  { href: "/cung-cap-thuc-pham-binh-duong", label: "Bình Dương" },
  { href: "/cung-cap-thuc-pham-tp-hcm", label: "TP. Hồ Chí Minh" },
  { href: "/cung-cap-thuc-pham-phu-my", label: "Phú Mỹ" },
  { href: "/cung-cap-thuc-pham-ba-ria-vung-tau", label: "Bà Rịa - Vũng Tàu" },
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

      {/* 4b. NGANH HANG – Industries we serve */}
      <section className="b2b-process" aria-labelledby="industries-heading" style={{ background: "#f6faf8" }}>
        <div className="container-shell">
          <div style={{ textAlign: "center", maxWidth: "640px", margin: "0 auto 40px" }}>
            <div className="section-label">Ngành hàng phục vụ</div>
            <h2 id="industries-heading" className="section-title">
              Mỗi gian bếp một nhịp riêng, TPS1 theo kịp từng nhịp.
            </h2>
            <p className="section-desc" style={{ margin: "0 auto" }}>
              Nhà hàng cần hàng chuẩn món, bếp công ty cần đúng ca, trường học cần đủ hồ sơ. Chúng tôi chuẩn bị nguồn hàng theo đúng nhịp ấy.
            </p>
          </div>
          <div className="home-local__grid">
            {industryHighlights.map((item) => (
              <Link key={item.href} href={item.href} className="home-local__card">
                <h3>{item.label}</h3>
                <p>{item.description}</p>
                <span className="home-local__link">
                  Xem trang <ArrowRight size={16} />
                </span>
              </Link>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 28 }}>
            <Link href="/nganh-hang" className="btn-secondary">
              Xem tất cả ngành hàng <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* 4c. KHU VUC – Areas we serve */}
      <section className="b2b-process" aria-labelledby="areas-heading">
        <div className="container-shell">
          <div style={{ textAlign: "center", maxWidth: "640px", margin: "0 auto 40px" }}>
            <div className="section-label">Khu vực phục vụ</div>
            <h2 id="areas-heading" className="section-title">
              Xe lạnh TPS1 có mặt khắp Đồng Nai, TP.HCM và các tỉnh lân cận.
            </h2>
            <p className="section-desc" style={{ margin: "0 auto" }}>
              Các tuyến giao cố định phủ Đồng Nai (gồm cả khu vực Bình Phước cũ), TP.HCM, Bình Dương và Bà Rịa - Vũng Tàu, đưa hàng đến đúng khung giờ mỗi gian bếp cần.
            </p>
          </div>
          <div className="home-local__grid">
            {areaHighlights.map((item) => (
              <Link key={item.href} href={item.href} className="home-local__card">
                <h3>{item.label}</h3>
                <span className="home-local__link">
                  Xem trang <ArrowRight size={16} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 5. PROCESS – How it works */}
      <section className="b2b-process" aria-labelledby="process-heading">
        <div className="container-shell">
          <div style={{ textAlign: "center", maxWidth: "640px", margin: "0 auto 56px" }}>
            <div className="section-label">Quy trình làm việc</div>
            <h2 id="process-heading" className="section-title">
              Ba bước để gian bếp có hàng tươi mỗi ngày
            </h2>
            <p className="section-desc" style={{ margin: "0 auto" }}>
              Quý khách chỉ cần gửi danh sách hàng, phần còn lại TPS1 lo trọn.
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
              Hãy để bữa ăn ngày mai<br />bắt đầu từ chuyến hàng tươi hôm nay.
            </h2>
            <p style={{ color: "rgba(255,255,255,0.62)", fontSize: "1rem", lineHeight: 1.7, maxWidth: "480px", margin: 0 }}>
              Gửi danh sách hàng cần mua, TPS1 xác nhận trong 30 phút và gửi báo giá trong vòng 24 giờ.
              Báo giá hoàn toàn không kèm ràng buộc.
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
