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

const industryHighlights = [
  { href: "/nganh-hang/bep-an-tap-the", label: "Bếp ăn tập thể", description: "Khu công nghiệp, nhà máy, doanh nghiệp — 100 đến 5.000 suất/ngày." },
  { href: "/nganh-hang/suat-an-cong-nghiep", label: "Suất ăn công nghiệp", description: "Hỗ trợ nguyên liệu, tư vấn menu cho đơn vị cung cấp suất ăn." },
  { href: "/nganh-hang/truong-hoc", label: "Trường học", description: "Nguồn hàng an toàn, hồ sơ rõ ràng cho bếp ăn bán trú." },
  { href: "/nganh-hang/benh-vien", label: "Bệnh viện", description: "Tiêu chuẩn an toàn thực phẩm khắt khe cho bếp ăn bệnh viện." },
  { href: "/nganh-hang/nha-hang-khach-san", label: "Nhà hàng, khách sạn", description: "Nguồn hàng tươi, đa dạng cho thực đơn thay đổi liên tục." },
];

const areaHighlights = [
  { href: "/cung-cap-thuc-pham-dong-nai", label: "Đồng Nai" },
  { href: "/cung-cap-thuc-pham-bien-hoa", label: "Biên Hòa" },
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
              Cung ứng cho từng loại bếp ăn — không dùng chung một giải pháp.
            </h2>
            <p className="section-desc" style={{ margin: "0 auto" }}>
              Mỗi ngành có yêu cầu riêng về định mức, lịch giao và hồ sơ an toàn thực phẩm.
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
              Có mặt tại các khu công nghiệp và thành phố lớn.
            </h2>
            <p className="section-desc" style={{ margin: "0 auto" }}>
              Đội xe lạnh phục vụ theo tuyến cố định, giao đúng khung giờ bếp cần.
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
