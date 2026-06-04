import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Boxes, ClipboardList, Leaf, MapPin, Truck } from "lucide-react";
import { categories } from "@/lib/content";
import { makeMetadata } from "@/lib/seo";
import { PageShell } from "@/components/page-shell";
import { QuoteAddButton } from "@/components/quote-add-button";
import { buildProductImageMap, readManagedProducts } from "@/lib/products";

export const metadata = makeMetadata({
  title: "Sản phẩm",
  description:
    "Danh mục sản phẩm chính: rau củ quả, thịt cá hải sản, hàng đông lạnh, gia vị và thực phẩm chay cho bếp ăn B2B.",
  path: "/san-pham",
});

const highlights = [
  {
    icon: ClipboardList,
    title: "Danh mục rõ để chốt phương án nhanh",
    text: "Chia theo nhóm hàng bếp thường mua, dễ gửi nhu cầu số lượng và quy cách.",
  },
  {
    icon: Truck,
    title: "Phù hợp giao định kỳ",
    text: "Ưu tiên lịch giao theo ngày, theo tuần hoặc theo ca nhận hàng của bếp.",
  },
  {
    icon: BadgeCheck,
    title: "Tư vấn theo menu",
    text: "Có thể gợi ý nhóm hàng thay thế khi mùa vụ, giá hoặc định mức thay đổi.",
  },
];

const localCoverageLinks = [
  { href: "/cung-cap-thuc-pham-dong-nai", title: "Cung cấp thực phẩm Đồng Nai" },
  { href: "/cung-cap-thuc-pham-bien-hoa", title: "Cung cấp thực phẩm Biên Hòa" },
  { href: "/cung-cap-thuc-pham-binh-duong", title: "Cung cấp thực phẩm Bình Dương" },
  { href: "/cung-cap-thuc-pham-nhon-trach", title: "Cung cấp thực phẩm Nhơn Trạch" },
  { href: "/cung-cap-thuc-pham-tp-hcm", title: "Cung cấp thực phẩm TP.HCM" },
  { href: "/cung-cap-thuc-pham-ba-ria-vung-tau", title: "Cung cấp thực phẩm Bà Rịa - Vũng Tàu" },
];

const guideLinks = [
  {
    href: "/kien-thuc/cach-lap-menu-bep-an-tap-the",
    title: "Cách lập menu cho bếp ăn tập thể",
    text: "Bài nền tảng để đi từ menu sang danh mục mua hàng và định mức.",
  },
  {
    href: "/kien-thuc/checklist-gui-yeu-cau-bao-gia-nhanh",
    title: "Checklist gửi yêu cầu báo giá nhanh",
    text: "Chuẩn bị đúng thông tin trước khi gửi form để giảm vòng hỏi lại.",
  },
  {
    href: "/kien-thuc/cach-chon-thuc-pham-cho-bep-an-tap-the",
    title: "Cách chọn thực phẩm cho bếp ăn tập thể",
    text: "Bài giúp kiểm soát hao hụt và nhận hàng rõ hơn cho bếp quy mô lớn.",
  },
];

export const dynamic = "force-dynamic";

export default async function SanPhamPage() {
  const products = await readManagedProducts();
  const productImageBySlug = buildProductImageMap(products);

  return (
    <PageShell
      eyebrow="Sản phẩm"
      title="Danh mục thực phẩm cho bếp ăn, nhà hàng và suất ăn công nghiệp"
      description="Chọn nhanh nhóm hàng cần báo giá: rau củ quả, thịt cá hải sản, hàng đông lạnh, gia vị nhà bếp và thực phẩm chay. Mỗi nhóm được trình bày theo cách khách mua B2B dễ gửi nhu cầu và chốt lịch giao."
    >
      <section className="product-intro">
        {highlights.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.title} className="product-intro__item">
              <Icon size={22} />
              <h2>{item.title}</h2>
              <p>{item.text}</p>
            </article>
          );
        })}
      </section>

      <section className="product-showcase">
        <div className="section-split">
          <div>
            <div className="eyebrow">Nhóm hàng chính</div>
            <h2 className="product-section-title">Các dòng sản phẩm đang phục vụ khách mua số lượng lớn.</h2>
          </div>
          <Link href="/bao-gia" className="text-link">
            BÁO GIÁ <ArrowRight size={16} />
          </Link>
        </div>

        <div className="product-grid">
          {products.map((item, index) => (
            <article key={item.slug} className="product-card">
              <div className="product-card__media">
                <Image
                  src={productImageBySlug[item.slug] ?? productImageBySlug["rau-cu-qua-tuoi-song"]}
                  alt={item.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="product-card__image"
                />
                <span className="product-card__index">0{index + 1}</span>
              </div>
              <div className="product-card__body">
                <Link href={`/san-pham/${item.slug}`} className="product-card__title-link">
                  <h3>{item.title}</h3>
                </Link>
                <p>{item.summary}</p>
                <div className="product-card__features">
                  {(item.features ?? []).map((feature) => (
                    <span key={feature}>{feature}</span>
                  ))}
                </div>
                <div className="product-card__footer">
                  <Link href={`/san-pham/${item.slug}`} className="text-link">
                    Xem chi tiết <ArrowRight size={16} />
                  </Link>
                  <QuoteAddButton product={item} label="Thêm vào báo giá" />
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="product-category-band">
        <div className="product-category-band__intro">
          <div className="eyebrow">Danh mục nền tảng</div>
          <h2>Đi từ nhóm hàng lớn đến nhu cầu mua cụ thể của từng bếp.</h2>
          <p>
            Nếu khách chưa có danh sách SKU cố định, có thể bắt đầu từ danh mục nền tảng rồi bổ sung số lượng, lịch giao và
            quy cách đóng gói.
          </p>
        </div>

        <div className="product-category-list">
          {categories.map((item) => (
            <Link key={item.slug} href={`/danh-muc/${item.slug}`} className="product-category-link">
              <span>
                <Leaf size={16} />
                {item.title}
              </span>
              <ArrowRight size={16} />
            </Link>
          ))}
        </div>
      </section>

      <section className="product-category-band">
        <div className="product-category-band__intro">
          <div className="eyebrow">Khu vực phục vụ</div>
          <h2>Chọn đúng khu vực để xem lịch giao và gửi báo giá nhanh.</h2>
          <p>Khách ở từng địa bàn có thể xem ngay trang khu vực tương ứng, không phải tìm lại trên toàn site.</p>
        </div>

        <div className="product-category-list">
          {localCoverageLinks.map((item) => (
            <Link key={item.href} href={item.href} className="product-category-link">
              <span>
                <MapPin size={16} />
                {item.title}
              </span>
              <ArrowRight size={16} />
            </Link>
          ))}
        </div>
      </section>

      <section className="product-category-band">
        <div className="product-category-band__intro">
          <div className="eyebrow">Bài nên đọc trước khi báo giá</div>
          <h2>Một vài hướng dẫn nền tảng giúp khách chốt nhu cầu nhanh hơn.</h2>
          <p>
            Các bài này gắn trực tiếp với cách lập menu, chuẩn bị thông tin báo giá và chọn nguồn hàng phù hợp cho
            bếp B2B.
          </p>
        </div>

        <div className="product-grid" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
          {guideLinks.map((item) => (
            <Link key={item.href} href={item.href} className="product-card">
              <div className="product-card__body">
                <div className="pill">Kiến thức</div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <div className="product-card__footer">
                  <span className="text-link">
                    Xem bài <ArrowRight size={16} />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="product-cta">
        <div>
          <Boxes size={26} />
          <h2>Cần báo giá theo danh mục riêng của bếp?</h2>
          <p>Gửi nhóm hàng, số lượng dự kiến, khu vực giao và tần suất nhận hàng để đội ngũ chuẩn bị phương án phù hợp.</p>
        </div>
        <Link href="/bao-gia" className="btn-primary btn-on-dark">
          Mở form báo giá <ArrowRight size={18} />
        </Link>
      </section>
    </PageShell>
  );
}
