import Link from "next/link";
import { ArrowRight, DatabaseZap, LayoutGrid } from "lucide-react";
import { makeMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site";
import { PageShell } from "@/components/page-shell";
import { QuotePortal } from "@/components/quote-portal";
import { readManagedProducts } from "@/lib/products";

export const metadata = makeMetadata({
  title: "Báo giá",
  description: "Chọn sản phẩm, nhập nhu cầu và gửi yêu cầu để đội kinh doanh chăm sóc tiếp.",
  path: "/bao-gia",
});

export default async function QuotePage() {
  const products = await readManagedProducts();

  return (
    <PageShell
      eyebrow="Báo giá"
      title="Trang nhận thông tin báo giá"
      description="Khách chọn sản phẩm, điền nhu cầu, nhấn gửi. Thông tin sẽ được chuyển đến đội kinh doanh để tiếp nhận và chăm sóc."
    >
      <div className="quote-page-intro">
        <div className="quote-page-intro__card">
          <LayoutGrid size={20} />
          <div>
            <strong>Chọn hàng trước, báo giá sau</strong>
            <p>Phù hợp khách B2B có nhiều nhóm hàng, cần gom danh mục trước khi chốt phương án.</p>
          </div>
        </div>
        <div className="quote-page-intro__card quote-page-intro__card--accent">
          <DatabaseZap size={20} />
          <div>
            <strong>Chuyển đến bộ phận kinh doanh</strong>
            <p>Thông tin đi qua API để đội kinh doanh phân loại, phản hồi và theo dõi đơn hàng.</p>
          </div>
        </div>
        <Link href="/" className="quote-page-intro__link">
          Quay về trang chủ <ArrowRight size={16} />
        </Link>
      </div>

      <QuotePortal initialProducts={products} />

      <div className="quote-page-note">
        <span>Hotline:</span>
        <a href={`tel:${siteConfig.phone.replace(/\s+/g, "")}`}>{siteConfig.phone}</a>
      </div>
    </PageShell>
  );
}
