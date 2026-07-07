import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldCheck, Award } from "lucide-react";
import { makeMetadata } from "@/lib/seo";

export const metadata = makeMetadata({
  title: "Giới thiệu - Thực Phẩm Số 1",
  description: "Khám phá quy mô, năng lực cung ứng và các chứng nhận chất lượng (ISO, HACCP) của Thực Phẩm Số 1.",
  path: "/gioi-thieu",
});

export default function GioiThieuPage() {
  return (
    <main className="b2b-about-page">
      {/* 1. HERO SECTION */}
      <section className="b2b-about-hero">
        <Image
          src="/images/about/hero_v2.jpg"
          alt="Thực Phẩm Số 1 - Kho bãi quy mô lớn"
          fill
          className="object-cover b2b-about-hero__bg"
          priority
          sizes="100vw"
        />
        <div className="b2b-about-hero__overlay" />
        <div className="container-shell position-relative z-10">
          <div className="b2b-about-hero__content">
            <div className="section-label" style={{ color: "#4ade80" }}>
              Về Chúng Tôi
            </div>
            <h1 className="b2b-about-hero__title">
              Đối tác vận hành bếp ăn<br />
              <span style={{ color: "#4ade80" }}>đáng tin cậy của bạn</span>
            </h1>
            <p className="b2b-about-hero__desc">
              Hơn 10 năm kinh nghiệm phân phối thực phẩm B2B cho suất ăn công nghiệp,
              trường học, bệnh viện và nhà hàng tại Đồng Nai & khu vực lân cận.
            </p>
          </div>
        </div>
      </section>

      {/* 2. CÂU CHUYỆN & GIÁ TRỊ CỐT LÕI */}
      <section className="b2b-about-story">
        <div className="container-shell">
          <div className="b2b-about-story__grid">
            <div className="b2b-about-story__text">
              <div className="section-label">Câu chuyện TPS1</div>
              <h2 className="section-title" style={{ marginBottom: "24px" }}>
                Không chỉ là nhà cung cấp, chúng tôi là người đồng hành.
              </h2>
              <p className="section-desc" style={{ marginBottom: "20px" }}>
                Tại Thực Phẩm Số Một (TPS1), chúng tôi thấu hiểu áp lực của người quản lý bếp ăn: từ việc cân đối chi phí, đảm bảo định lượng, đến việc tuân thủ tuyệt đối các tiêu chuẩn vệ sinh an toàn thực phẩm.
              </p>
              <p className="section-desc" style={{ marginBottom: "32px" }}>
                Thay vì bán lẻ rời rạc, chúng tôi chọn con đường chuyên biệt hóa B2B. Hệ thống kho bãi, xe lạnh và quy trình sơ chế của TPS1 được xây dựng chỉ để giải quyết một mục tiêu duy nhất: Giúp bếp ăn của bạn vận hành trơn tru mỗi ngày.
              </p>
              
              <div className="b2b-about-story__values">
                {[
                  "Nguồn gốc minh bạch, kiểm dịch mỗi ngày",
                  "Giao hàng đúng giờ, đúng quy cách",
                  "Bình ổn giá, tối ưu chi phí (food cost)"
                ].map((item, i) => (
                  <div key={i} className="b2b-about-story__value">
                    <CheckCircle2 size={24} color="#0f6f4b" className="shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="b2b-about-story__image">
              <Image
                src="/images/about/fleet_v2.png"
                alt="Đội xe vận chuyển Thực Phẩm Số Một"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 3. CHỨNG NHẬN & BẢO HIỂM (Trọng tâm) */}
      <section className="b2b-about-certs">
        <div className="container-shell">
          <div style={{ textAlign: "center", maxWidth: "700px", margin: "0 auto 56px" }}>
            <div className="section-label">Bảo chứng chất lượng</div>
            <h2 className="section-title">An tâm tuyệt đối với pháp lý & bảo hiểm</h2>
            <p className="section-desc" style={{ margin: "0 auto" }}>
              Chúng tôi không chỉ cam kết bằng lời nói. Mọi quy trình từ TPS1 đều được bảo chứng bởi các tiêu chuẩn quốc tế và hợp đồng bảo hiểm rủi ro 5 Tỷ VNĐ.
            </p>
          </div>

          <div className="b2b-about-certs__grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "24px" }}>
            {/* VSATTP */}
            <div className="b2b-cert-card" style={{ height: "100%" }}>
              <div className="b2b-cert-card__img-wrap" style={{ aspectRatio: "1/1.4", padding: "12px", backgroundColor: "#fff" }}>
                <Image
                  src="/images/about/vsattp_cert.jpg"
                  alt="Giấy chứng nhận VSATTP"
                  fill
                  className="object-contain"
                  style={{ padding: "12px" }}
                  sizes="(max-width: 768px) 100vw, 25vw"
                />
                <div className="b2b-cert-card__overlay" style={{ opacity: 0.1 }} />
              </div>
              <div className="b2b-cert-card__content" style={{ padding: "20px" }}>
                <h3 className="b2b-cert-card__title" style={{ fontSize: "1.1rem" }}>VSATTP</h3>
                <p className="b2b-cert-card__desc" style={{ fontSize: "0.9rem" }}>Cơ sở đủ điều kiện an toàn thực phẩm.</p>
              </div>
            </div>

            {/* ISO */}
            <div className="b2b-cert-card" style={{ height: "100%" }}>
              <div className="b2b-cert-card__img-wrap" style={{ aspectRatio: "1/1.4", padding: "12px", backgroundColor: "#fff" }}>
                <Image
                  src="/images/about/iso_cert.jpg"
                  alt="Chứng nhận ISO 22000:2018"
                  fill
                  className="object-contain"
                  style={{ padding: "12px" }}
                  sizes="(max-width: 768px) 100vw, 25vw"
                />
                <div className="b2b-cert-card__overlay" style={{ opacity: 0.1 }} />
              </div>
              <div className="b2b-cert-card__content" style={{ padding: "20px" }}>
                <h3 className="b2b-cert-card__title" style={{ fontSize: "1.1rem" }}>ISO 22000:2018</h3>
                <p className="b2b-cert-card__desc" style={{ fontSize: "0.9rem" }}>Hệ thống quản lý ATTP chuẩn quốc tế.</p>
              </div>
            </div>

            {/* HACCP */}
            <div className="b2b-cert-card" style={{ height: "100%" }}>
              <div className="b2b-cert-card__img-wrap" style={{ aspectRatio: "1/1.4", padding: "12px", backgroundColor: "#fff" }}>
                <Image
                  src="/images/about/haccp_cert.jpg"
                  alt="Chứng nhận HACCP"
                  fill
                  className="object-contain"
                  style={{ padding: "12px" }}
                  sizes="(max-width: 768px) 100vw, 25vw"
                />
                <div className="b2b-cert-card__overlay" style={{ opacity: 0.1 }} />
              </div>
              <div className="b2b-cert-card__content" style={{ padding: "20px" }}>
                <h3 className="b2b-cert-card__title" style={{ fontSize: "1.1rem" }}>HACCP Codex</h3>
                <p className="b2b-cert-card__desc" style={{ fontSize: "0.9rem" }}>Phân tích mối nguy & kiểm soát tới hạn.</p>
              </div>
            </div>

            {/* Bảo hiểm 1 */}
            <div className="b2b-cert-card" style={{ height: "100%" }}>
              <div className="b2b-cert-card__img-wrap" style={{ aspectRatio: "1/1.4", padding: "12px", backgroundColor: "#fff" }}>
                <Image
                  src="/images/about/insurance_1.jpg"
                  alt="Bảo hiểm trách nhiệm sản phẩm"
                  fill
                  className="object-contain"
                  style={{ padding: "12px" }}
                  sizes="(max-width: 768px) 100vw, 25vw"
                />
                <div className="b2b-cert-card__overlay" style={{ opacity: 0.1 }} />
              </div>
              <div className="b2b-cert-card__content" style={{ padding: "20px" }}>
                <h3 className="b2b-cert-card__title" style={{ fontSize: "1.1rem" }}>Bảo hiểm rủi ro</h3>
                <p className="b2b-cert-card__desc" style={{ fontSize: "0.9rem" }}>VietinBank bảo vệ tài chính lên đến 5 Tỷ VNĐ.</p>
              </div>
            </div>

            {/* Bảo hiểm 2 */}
            <div className="b2b-cert-card" style={{ height: "100%" }}>
              <div className="b2b-cert-card__img-wrap" style={{ aspectRatio: "1/1.4", padding: "12px", backgroundColor: "#fff" }}>
                <Image
                  src="/images/about/insurance_2.jpg"
                  alt="Bảo hiểm trách nhiệm sản phẩm - Trang 2"
                  fill
                  className="object-contain"
                  style={{ padding: "12px" }}
                  sizes="(max-width: 768px) 100vw, 25vw"
                />
                <div className="b2b-cert-card__overlay" style={{ opacity: 0.1 }} />
              </div>
              <div className="b2b-cert-card__content" style={{ padding: "20px" }}>
                <h3 className="b2b-cert-card__title" style={{ fontSize: "1.1rem" }}>Mức bồi thường</h3>
                <p className="b2b-cert-card__desc" style={{ fontSize: "0.9rem" }}>Chi tiết các hạn mức bồi thường của VietinBank.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. NĂNG LỰC CUNG ỨNG (Scale) */}
      <section className="b2b-about-scale">
        <div className="container-shell">
          <div className="b2b-about-scale__wrapper">
            <div className="b2b-about-scale__header">
              <div className="section-label">Năng lực của chúng tôi</div>
              <h2 className="section-title">Đáp ứng quy mô công nghiệp</h2>
            </div>
            
            <div className="b2b-about-scale__stats">
              <div className="b2b-scale-stat">
                <div className="b2b-scale-stat__num">109+</div>
                <div className="b2b-scale-stat__label">Đối tác B2B tin dùng</div>
              </div>
              <div className="b2b-scale-stat">
                <div className="b2b-scale-stat__num">2,000+</div>
                <div className="b2b-scale-stat__label">SKU Sản phẩm đa dạng</div>
              </div>
              <div className="b2b-scale-stat">
                <div className="b2b-scale-stat__num">24/7</div>
                <div className="b2b-scale-stat__label">Đội ngũ xe lạnh sẵn sàng</div>
              </div>
              <div className="b2b-scale-stat">
                <div className="b2b-scale-stat__num">5 Tỷ</div>
                <div className="b2b-scale-stat__label">Quỹ bảo hiểm rủi ro</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. CTA */}
      <section className="b2b-cta-band">
        <div className="container-shell position-relative z-10" style={{ textAlign: "center" }}>
          <h2 className="section-title-light">Sẵn sàng nâng cấp chuỗi cung ứng của bạn?</h2>
          <p className="section-desc" style={{ color: "rgba(255,255,255,0.7)", margin: "0 auto 32px" }}>
            Liên hệ ngay với đội ngũ chuyên viên của TPS1 để nhận bảng giá sỉ tốt nhất hôm nay.
          </p>
          <Link href="/lien-he" className="btn-hero-primary" style={{ display: "inline-flex" }}>
            Yêu cầu báo giá ngay <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </main>
  );
}
