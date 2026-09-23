import Link from "next/link";
import { ArrowRight, BadgeCheck, Building2, Clock3, PackageCheck, ShieldCheck, Truck } from "lucide-react";
import { makeMetadata } from "@/lib/seo";
import { ProductsGrid } from "./products-grid";

export const metadata = makeMetadata({
  title: "Sản phẩm",
  description:
    "Danh mục sản phẩm chính: rau củ quả, thịt cá hải sản, hàng đông lạnh, gia vị và thực phẩm chay cho bếp ăn B2B.",
  path: "/san-pham",
});

export default function SanPhamPage() {
  return (
    <main className="sp-page">
      <section className="sp-hero">
        <div className="container-shell sp-hero__inner">
          <div className="sp-hero__copy">
            <div className="sp-hero__eyebrow"><BadgeCheck size={16} /> Nguồn hàng cho bếp chuyên nghiệp</div>
            <h1>Danh mục thực phẩm<br /><span>được tuyển chọn mỗi ngày</span></h1>
            <p>
              Rau củ, thịt cá, hàng đông lạnh và gia vị được TPS1 kiểm soát nguồn gốc,
              quy cách và lịch giao theo nhu cầu riêng của từng bếp.
            </p>
            <div className="sp-hero__actions">
              <Link href="#danh-muc" className="sp-hero__primary">
                Khám phá danh mục <ArrowRight size={18} />
              </Link>
              <Link href="/bao-gia" className="sp-hero__secondary">Nhận báo giá B2B</Link>
            </div>
          </div>

          <div className="sp-hero__proof" aria-label="Năng lực cung ứng TPS1">
            <div className="sp-hero__proof-main">
              <ShieldCheck size={28} />
              <div><strong>ISO 22000 & HACCP</strong><span>Quy trình kiểm soát an toàn thực phẩm</span></div>
            </div>
            <div className="sp-hero__proof-grid">
              <div><Building2 size={20} /><strong>109+</strong><span>Khách hàng B2B</span></div>
              <div><Truck size={20} /><strong>4 vùng</strong><span>Phủ tuyến giao</span></div>
              <div><Clock3 size={20} /><strong>Định kỳ</strong><span>Lịch giao linh hoạt</span></div>
              <div><PackageCheck size={20} /><strong>Theo bếp</strong><span>Quy cách riêng</span></div>
            </div>
          </div>
        </div>
      </section>

      <ProductsGrid />

      <div className="container-shell sp-page__cta-wrap">
        <section className="sp-page__cta">
          <div>
            <span className="sp-page__cta-icon"><PackageCheck size={24} /></span>
            <div>
              <span className="sp-page__cta-kicker">TƯ VẤN NGUỒN HÀNG B2B</span>
              <h2>Cần danh mục và quy cách riêng cho bếp?</h2>
              <p>Gửi nhu cầu, sản lượng và khu vực giao. Đội ngũ TPS1 sẽ chuẩn bị bảng giá phù hợp trong thời gian sớm nhất.</p>
            </div>
          </div>
          <Link href="/bao-gia" className="sp-page__cta-button">
            Gửi yêu cầu báo giá <ArrowRight size={18} />
          </Link>
        </section>
      </div>
    </main>
  );
}
