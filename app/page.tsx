import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Building2, ClipboardList, ShieldCheck, Truck } from "lucide-react";
import { categories } from "@/lib/content";
import { makeMetadata } from "@/lib/seo";
import { brandAssets, customerHighlights } from "@/lib/brand";
import { siteConfig } from "@/lib/site";

export const metadata = makeMetadata({
  title: "Thực Phẩm Số Một | Cung cấp thực phẩm B2B tại Đồng Nai",
  description:
    "TPS1 cung cấp thực phẩm cho bếp ăn tập thể, nhà máy, trường học, bệnh viện. Danh mục rõ ràng, giao định kỳ, báo giá theo nhu cầu thực tế.",
  path: "/",
});

const servicePillars = [
  {
    icon: ShieldCheck,
    title: "Nguồn hàng rõ ràng",
    text: "Danh mục theo nhóm hàng bếp dùng hàng ngày, dễ so sánh và dễ ra quyết định.",
  },
  {
    icon: Truck,
    title: "Giao đúng lịch",
    text: "Linh hoạt theo ca, theo ngày hoặc theo tuần, phù hợp vận hành bếp công nghiệp.",
  },
  {
    icon: ClipboardList,
    title: "Báo giá theo nhu cầu",
    text: "Mỗi khách có nhu cầu riêng, đội ngũ TPS1 phản hồi phương án phù hợp để chốt đơn nhanh.",
  },
  {
    icon: Building2,
    title: "Kinh nghiệm B2B",
    text: "Phục vụ thực tế cho nhà máy, bếp ăn, bệnh viện và trường học tại Đồng Nai.",
  },
];

const processSteps = [
  {
    title: "1. Chọn nhóm sản phẩm",
    text: "Chọn nhanh theo danh mục: rau củ, thịt cá, đông lạnh, gia vị, thực phẩm chay.",
  },
  {
    title: "2. Gửi yêu cầu",
    text: "Nhập số lượng, khu vực giao, thời gian cần hàng và ghi chú quy cách.",
  },
  {
    title: "3. Nhận phương án",
    text: "Đội kinh doanh phản hồi báo giá và lịch giao phù hợp để khách chốt đơn.",
  },
];

const heroStats = [
  { value: "109+", label: "Khách hàng doanh nghiệp" },
  { value: "24h", label: "Phản hồi yêu cầu báo giá" },
  { value: "4", label: "Nhóm khách B2B trọng tâm" },
];

export default function HomePage() {
  return (
    <main className="home-page">
      <section className="home-hero">
        <div className="container-shell home-hero__grid">
          <div className="home-hero__copy">
            <div className="home-hero__brand">
              <Image src={brandAssets.logoTransparent} alt={siteConfig.name} width={190} height={64} priority />
              <span className="home-hero__brand-tag">Cung cấp thực phẩm B2B tại Đồng Nai và khu vực lân cận</span>
            </div>
            <div className="eyebrow eyebrow-on-dark">Thực Phẩm Số Một</div>
            <h1 className="home-hero__title">
              Đối tác cung ứng thực phẩm cho
              <span>bếp ăn tập thể, nhà máy và suất ăn công nghiệp</span>
            </h1>
            <p className="home-hero__lead">
              Catalog rõ ràng, quy trình đặt hàng gọn và phản hồi nhanh theo nhu cầu vận hành thực tế của từng đơn vị.
            </p>

            <div className="home-hero__actions">
              <Link href="/bao-gia" className="btn-primary btn-on-dark">
                Yêu cầu báo giá <ArrowRight size={18} />
              </Link>
              <Link href="/san-pham" className="btn-secondary btn-on-dark-secondary">
                Xem danh mục sản phẩm <ArrowRight size={18} />
              </Link>
            </div>

            <div className="home-hero__stats">
              {heroStats.map((item) => (
                <div key={item.label} className="home-stat">
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="home-hero__visual">
            <div className="home-mosaic">
              <div className="home-mosaic__tile home-mosaic__tile--large">
                <Image src={brandAssets.warehouseWide} alt="Kho vận TPS1" fill className="home-mosaic__image" />
              </div>
              <div className="home-mosaic__tile">
                <Image src={brandAssets.coverFood} alt="Nhóm thực phẩm TPS1" fill className="home-mosaic__image" />
              </div>
              <div className="home-mosaic__tile home-mosaic__tile--wide">
                <Image src={brandAssets.deliveryTruck} alt="Xe giao hàng TPS1" fill className="home-mosaic__image" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="home-trust">
        <div className="container-shell home-trust__grid">
          {servicePillars.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="home-trust__card">
                <Icon size={22} />
                <h2>{item.title}</h2>
                <p>{item.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="home-catalog">
        <div className="container-shell">
          <div className="section-split">
            <div className="section-heading">
              <div className="eyebrow">Danh mục sản phẩm</div>
              <h2 className="section-heading__title">Nhóm sản phẩm sắp xếp theo cách khách B2B thường mua.</h2>
              <p className="section-heading__description">
                Chọn nhóm hàng phù hợp và gửi yêu cầu trong một luồng thống nhất để đội ngũ xử lý nhanh hơn.
              </p>
            </div>
            <Link href="/san-pham" className="text-link">
              Xem toàn bộ sản phẩm <ArrowRight size={16} />
            </Link>
          </div>

          <div className="home-catalog__grid">
            {categories.map((item, index) => (
              <Link key={item.slug} href={`/danh-muc/${item.slug}`} className="category-card category-card--premium">
                <span className="category-card__index">0{index + 1}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <div className="tag-row">
                  {(item.highlights ?? []).slice(0, 3).map((highlight) => (
                    <span key={highlight}>{highlight}</span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="home-solution container-shell section-pad">
        <div className="section-heading">
          <div className="eyebrow">Quy trình làm việc</div>
          <h2 className="section-heading__title">Một quy trình đơn giản để khách dễ đặt hàng và dễ chốt phương án.</h2>
        </div>

        <div className="solution-grid">
          {processSteps.map((step) => (
            <article key={step.title} className="solution-card">
              <div className="solution-card__tag">TPS1 Workflow</div>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-customers">
        <div className="container-shell">
          <div className="section-split">
            <div className="section-heading">
              <div className="eyebrow">Khách hàng tiêu biểu</div>
              <h2 className="section-heading__title">Đang phục vụ nhiều đơn vị trong nhóm khách B2B tại khu vực công nghiệp.</h2>
            </div>
            <Link href="/bao-gia" className="text-link">
              Gửi yêu cầu mới <ArrowRight size={16} />
            </Link>
          </div>

          <div className="customer-marquee">
            {customerHighlights.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="container-shell section-pad">
        <div className="home-gallery">
          <div className="home-gallery__copy">
            <div className="eyebrow">Hình ảnh thực tế</div>
            <h2 className="section-heading__title">Kho vận, giao nhận và vận hành bếp từ dữ liệu thực tế của TPS1.</h2>
            <p className="section-heading__description">
              Hình ảnh trên website là tư liệu thật của doanh nghiệp để khách hàng đánh giá năng lực rõ ràng hơn.
            </p>
          </div>

          <div className="home-gallery__grid">
            {[brandAssets.warehouseWide, brandAssets.kitchen, brandAssets.deliveryTruck, brandAssets.quality].map((src, index) => (
              <div key={src} className={`home-gallery__card home-gallery__card--${index + 1}`}>
                <Image src={src} alt="TPS1 thực tế" fill className="home-gallery__image" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="home-cta">
        <div className="container-shell home-cta__card">
          <div>
            <div className="eyebrow eyebrow-on-dark">Sẵn sàng nhận yêu cầu</div>
            <h2>Gửi danh mục cần mua để đội ngũ TPS1 phản hồi phương án phù hợp.</h2>
            <p>Nhập thông tin đơn vị, nhóm hàng và thời gian cần giao. Đội kinh doanh sẽ liên hệ để chốt báo giá và lịch giao.</p>
          </div>
          <Link href="/bao-gia" className="btn-primary btn-on-dark">
            Mở form báo giá <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </main>
  );
}
