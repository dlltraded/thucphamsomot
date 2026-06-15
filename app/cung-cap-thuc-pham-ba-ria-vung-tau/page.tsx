import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { makeMetadata } from "@/lib/seo";
import { localLandingPages } from "@/lib/local-landing-content";
import { LocalLandingPage } from "@/components/local-landing-page";

export const metadata: Metadata = makeMetadata({
  title: "Cung cấp thực phẩm Bà Rịa - Vũng Tàu cho doanh nghiệp, bếp ăn và đơn vị suất ăn",
  description:
    "TPS1 nhận cung cấp thực phẩm tại Bà Rịa - Vũng Tàu cho doanh nghiệp, bếp ăn tập thể, trường học, bệnh viện và đơn vị cần giao hàng theo lịch.",
  path: "/cung-cap-thuc-pham-ba-ria-vung-tau",
});

export default function BaRiaVungTauLandingPage() {
  return (
    <>
      <LocalLandingPage config={localLandingPages.baRiaVungTau} />
      <section className="content-section" style={{ marginTop: 24 }}>
        <div className="content-section__body">
          <div className="content-section__eyebrow">Nội dung liên quan</div>
          <h2>Bài hỗ trợ cho Bà Rịa - Vũng Tàu</h2>
          <p>
            Có thêm bài vệ tinh để người đọc đi từ nhu cầu khu vực sang bài phân tích rồi mới sang form báo giá.
          </p>
          <div className="home-local__grid" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))", marginTop: 14 }}>
            <Link
              href="/kien-thuc/bao-gia-thuc-pham-cho-bep-an-tap-the-o-ba-ria-vung-tau"
              className="home-local__card"
              style={{ minHeight: 0 }}
            >
              <h3>Báo giá thực phẩm cho bếp ăn tập thể ở Bà Rịa - Vũng Tàu</h3>
              <span className="home-local__link">
                Xem bài <ArrowRight size={16} />
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
