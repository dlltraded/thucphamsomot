import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldCheck, Award } from "lucide-react";
import { makeMetadata } from "@/lib/seo";

export const metadata = makeMetadata({
  title: "Giới thiệu Công ty TNHH Thực Phẩm Số Một",
  description: "Từ năm 2017, Thực Phẩm Số Một mang thực phẩm tươi, rõ nguồn gốc đến nhà hàng, quán ăn, bếp công ty, trường học; đạt ISO 22000, HACCP, bảo hiểm sản phẩm 5 tỷ.",
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
              Vững nguồn thực phẩm,<br />
              <span style={{ color: "#4ade80" }}>trọn vẹn từng bữa ăn</span>
            </h1>
            <p className="b2b-about-hero__desc">
              Công ty TNHH Thực Phẩm Số Một (TPS1) chính thức hoạt động từ năm 2017, mang thực phẩm tươi, rõ nguồn gốc
              đến nhà hàng, quán ăn, bếp công ty, trường học, bệnh viện và bếp ăn công nghiệp.
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
                Phía sau mỗi bữa ăn ngon là một gian bếp được chuẩn bị chu đáo
              </h2>
              <p className="section-desc" style={{ marginBottom: "20px" }}>
                Người đứng bếp, dù ở nhà hàng hay bếp ăn công ty, đều cần nguyên liệu tươi, đúng quy cách và về đến nơi đúng giờ. Chỉ một chuyến hàng đến trễ cũng đủ khiến cả một ca nấu bị xáo trộn.
              </p>
              <p className="section-desc" style={{ marginBottom: "32px" }}>
                TPS1 nhận về mình phần lo nguồn hàng ấy. Kho bãi, đội xe lạnh và khâu sơ chế đều hướng về một mục tiêu: hàng đến bếp đúng giờ, đúng quy cách, để người đứng bếp dành trọn tâm sức cho từng món ăn.
              </p>

              <div className="b2b-about-story__values">
                {[
                  "Nguồn gốc minh bạch, kiểm dịch mỗi ngày",
                  "Giao hàng đúng giờ, đúng quy cách",
                  "Bình ổn giá, giúp bếp chủ động kiểm soát chi phí"
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
            <div className="section-label">Chứng nhận & bảo hiểm</div>
            <h2 className="section-title">Chứng nhận đầy đủ, trách nhiệm rõ ràng</h2>
            <p className="section-desc" style={{ margin: "0 auto" }}>
              TPS1 sở hữu giấy chứng nhận cơ sở đủ điều kiện an toàn thực phẩm, ISO 22000:2018, HACCP và hợp đồng bảo hiểm trách nhiệm sản phẩm với tổng hạn mức 5 tỷ đồng. Toàn bộ hồ sơ sẵn sàng được cung cấp khi quý doanh nghiệp, nhà trường cần thẩm định nhà cung cấp.
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
                <p className="b2b-cert-card__desc" style={{ fontSize: "0.9rem" }}>Hệ thống quản lý an toàn thực phẩm.</p>
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
                <p className="b2b-cert-card__desc" style={{ fontSize: "0.9rem" }}>Phân tích mối nguy và kiểm soát điểm tới hạn.</p>
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
                <h3 className="b2b-cert-card__title" style={{ fontSize: "1.1rem" }}>Bảo hiểm trách nhiệm sản phẩm</h3>
                <p className="b2b-cert-card__desc" style={{ fontSize: "0.9rem" }}>Do Bảo hiểm VietinBank (VBI) cấp, tổng hạn mức 5 tỷ đồng.</p>
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
                <p className="b2b-cert-card__desc" style={{ fontSize: "0.9rem" }}>Hạn mức chi tiết cho thiệt hại về người và tài sản.</p>
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
              <div className="section-label">TPS1 qua những con số</div>
              <h2 className="section-title">Năng lực đáp ứng quy mô công nghiệp</h2>
            </div>
            
            <div className="b2b-about-scale__stats">
              <div className="b2b-scale-stat">
                <div className="b2b-scale-stat__num">109+</div>
                <div className="b2b-scale-stat__label">Doanh nghiệp và bếp ăn tin chọn</div>
              </div>
              <div className="b2b-scale-stat">
                <div className="b2b-scale-stat__num">5.000+</div>
                <div className="b2b-scale-stat__label">Mã sản phẩm trong danh mục</div>
              </div>
              <div className="b2b-scale-stat">
                <div className="b2b-scale-stat__num">24/7</div>
                <div className="b2b-scale-stat__label">Đội xe lạnh sẵn sàng giao hàng</div>
              </div>
              <div className="b2b-scale-stat">
                <div className="b2b-scale-stat__num">5 tỷ</div>
                <div className="b2b-scale-stat__label">Bảo hiểm trách nhiệm sản phẩm</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. CTA */}
      <section className="b2b-cta-band">
        <div className="container-shell position-relative z-10" style={{ textAlign: "center" }}>
          <h2 className="section-title-light">Tươi đến bếp, an tâm đến bữa</h2>
          <p className="section-desc" style={{ color: "rgba(255,255,255,0.7)", margin: "0 auto 32px" }}>
            Quý khách chỉ cần gửi danh sách hàng và số lượng dự kiến, TPS1 sẽ gửi báo giá sỉ trong vòng 24 giờ.
          </p>
          <Link href="/lien-he" className="btn-hero-primary" style={{ display: "inline-flex" }}>
            Gửi yêu cầu báo giá <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </main>
  );
}
