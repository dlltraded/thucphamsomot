import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Boxes, ClipboardList, Leaf, Truck } from "lucide-react";
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
            Mở form báo giá <ArrowRight size={16} />
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
