import Link from "next/link";
import { ArrowRight, BadgeCheck, Building2, Clock3, PackageCheck, ShieldCheck, Truck } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { makeMetadata } from "@/lib/seo";
import { getSkuPage, SKU_GROUPS, type SkuPage } from "@/lib/sku-catalog";
import { ProductsGrid } from "./products-grid";

type PageProps = { searchParams: Promise<{ trang?: string }> };

function parsePage(value: string | undefined) {
  const page = parseInt(value ?? "1", 10);
  return Number.isFinite(page) && page > 1 ? page : 1;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const page = parsePage((await searchParams).trang);
  return makeMetadata({
    title: page > 1
      ? `Danh mục 5.000+ thực phẩm cho nhà hàng, bếp ăn – trang ${page}`
      : "Danh mục 5.000+ thực phẩm cho nhà hàng, bếp ăn",
    description:
      "Hơn 5.000 mặt hàng: rau củ quả, thịt heo, thịt bò, gia cầm, hải sản, hàng đông lạnh, gia vị, đồ khô cho nhà hàng, quán ăn, bếp ăn tại Đồng Nai, TP.HCM.",
    path: page > 1 ? `/san-pham?trang=${page}` : "/san-pham",
  });
}

export default async function SanPhamPage({ searchParams }: PageProps) {
  const page = parsePage((await searchParams).trang);
  let initialData: SkuPage | undefined;
  try {
    initialData = await getSkuPage({ page, revalidate: 3600 });
  } catch (error) {
    // Fall back to client-side loading; the page must still render.
    console.error("[san-pham] server catalog fetch failed", error);
  }
  if (initialData && page > initialData.totalPages) notFound();

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

      <nav className="sku-group-links" aria-labelledby="sku-group-links-title">
        <h2 id="sku-group-links-title">Nhóm hàng</h2>
        <ul>
          {SKU_GROUPS.filter((group) => group.hasPage).map((group) => (
            <li key={group.slug}>
              <Link href={`/danh-muc/${group.slug}`} className="sku-tab">{group.label}</Link>
            </li>
          ))}
        </ul>
      </nav>

      <ProductsGrid initialData={initialData} basePath="/san-pham" />

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
