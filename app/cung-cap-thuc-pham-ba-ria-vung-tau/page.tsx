import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { makeMetadata } from "@/lib/seo";
import { localLandingPages } from "@/lib/local-landing-content";
import { LocalLandingPage } from "@/components/local-landing-page";

export const metadata: Metadata = makeMetadata({
  title: "Cung cấp thực phẩm Bà Rịa - Vũng Tàu cho bếp ăn",
  description:
    "Nguồn thực phẩm theo lịch định kỳ cho doanh nghiệp, xí nghiệp và bếp ăn tập thể tại Bà Rịa - Vũng Tàu; báo giá rõ ràng, có hóa đơn VAT đầy đủ.",
  path: "/cung-cap-thuc-pham-ba-ria-vung-tau",
  ogTitle: "Cung Cấp Thực Phẩm",
  ogSubtitle: "Tại Bà Rịa - Vũng Tàu",
});

export default function BaRiaVungTauLandingPage() {
  return (
    <>
      <LocalLandingPage config={localLandingPages.baRiaVungTau} />
      <section className="content-section" style={{ marginTop: 24 }}>
        <div className="content-section__body">
          <div className="content-section__eyebrow">Nội dung liên quan</div>
          <h2>Doanh nghiệp tại Bà Rịa - Vũng Tàu nên xem thêm</h2>
          <p>
            Quy trình báo giá, nhóm hàng và chứng từ dành cho bếp ăn nhà máy, xí nghiệp.
          </p>
          <div className="home-local__grid" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))", marginTop: 14 }}>
            <Link href="/cung-cap-thuc-pham-cho-nha-may" className="home-local__card" style={{ minHeight: 0 }}>
              <h3>Cung cấp thực phẩm cho nhà máy, xí nghiệp</h3>
              <span className="home-local__link">
                Xem trang <ArrowRight size={16} />
              </span>
            </Link>
            <Link href="/bao-gia" className="home-local__card" style={{ minHeight: 0 }}>
              <h3>Mở form báo giá</h3>
              <span className="home-local__link">
                Gửi nhu cầu <ArrowRight size={16} />
              </span>
            </Link>
            <Link href="/san-pham" className="home-local__card" style={{ minHeight: 0 }}>
              <h3>Xem danh mục sản phẩm</h3>
              <span className="home-local__link">
                Đi tiếp <ArrowRight size={16} />
              </span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
