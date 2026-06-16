import Link from "next/link";
import { ArrowRight, Boxes, BadgeCheck, ClipboardList, Leaf, MapPin, Truck } from "lucide-react";
import { categories } from "@/lib/content";
import { makeMetadata } from "@/lib/seo";
import { buildProductImageMap, readManagedProducts } from "@/lib/products";
import { ProductsGrid } from "./products-grid";

export const metadata = makeMetadata({
  title: "Sản phẩm",
  description:
    "Danh mục sản phẩm chính: rau củ quả, thịt cá hải sản, hàng đông lạnh, gia vị và thực phẩm chay cho bếp ăn B2B.",
  path: "/san-pham",
});

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
    text: "Bài viết giúp chuyển từ menu sang danh mục mua hàng và định mức.",
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

  return (
    <main className="sp-page">
      {/* ── Slim compact header ── */}
      <div className="sp-page__head container-shell">
        <div className="sp-page__head-left">
          <div className="eyebrow">Danh mục sản phẩm</div>
          <h1 className="sp-page__title">Chọn sản phẩm &amp; gửi báo giá</h1>
          <p className="sp-page__desc">
            Thêm mặt hàng vào giỏ, sau đó gửi yêu cầu — đội ngũ phản hồi trong 30 phút.
          </p>
        </div>
        <div className="sp-page__badges">
          <span><ClipboardList size={14} /> Báo giá riêng theo nhóm hàng</span>
          <span><Truck size={14} /> Giao định kỳ toàn vùng Đông Nam Bộ</span>
          <span><BadgeCheck size={14} /> Hàng đúng nhóm, giao đúng nhịp</span>
        </div>
      </div>

      {/* ── SKU Grid từ Supabase ── */}
      <ProductsGrid />

      {/* ── Danh mục ── */}
      <section className="product-category-band">
        <div className="product-category-band__intro">
          <div className="eyebrow">Danh mục sản phẩm</div>
          <h2>Đi từ nhóm hàng lớn đến nhu cầu mua cụ thể của từng bếp.</h2>
          <p>
            Nếu khách chưa có danh sách SKU cố định, có thể bắt đầu từ danh mục này rồi bổ sung số lượng, lịch giao và
            quy cách đóng gói.
          </p>
        </div>
        <div className="product-category-list">
          {categories.map((item) => (
            <Link key={item.slug} href={`/danh-muc/${item.slug}`} className="product-category-link">
              <span><Leaf size={16} />{item.title}</span>
              <ArrowRight size={16} />
            </Link>
          ))}
        </div>
      </section>

      <section className="product-category-band">
        <div className="product-category-band__intro">
          <div className="eyebrow">Khu vực phục vụ</div>
          <h2>Chọn đúng khu vực để xem lịch giao và gửi báo giá nhanh.</h2>
          <p>Khách ở từng địa bàn có thể vào đúng trang khu vực tương ứng, xem lịch giao và gửi báo giá nhanh.</p>
        </div>
        <div className="product-category-list">
          {localCoverageLinks.map((item) => (
            <Link key={item.href} href={item.href} className="product-category-link">
              <span><MapPin size={16} />{item.title}</span>
              <ArrowRight size={16} />
            </Link>
          ))}
        </div>
      </section>

      <section className="product-category-band">
        <div className="product-category-band__intro">
          <div className="eyebrow">Bài nên đọc trước khi báo giá</div>
          <h2>Một vài bài viết giúp khách chốt nhu cầu nhanh hơn.</h2>
          <p>Các bài này giúp chuẩn bị menu, thông tin báo giá và chọn nguồn hàng phù hợp cho bếp B2B.</p>
        </div>
        <div className="product-grid" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
          {guideLinks.map((item) => (
            <Link key={item.href} href={item.href} className="product-card">
              <div className="product-card__body">
                <div className="pill">Kiến thức</div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <div className="product-card__footer">
                  <span className="text-link">Xem bài <ArrowRight size={16} /></span>
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
    </main>
  );
}
