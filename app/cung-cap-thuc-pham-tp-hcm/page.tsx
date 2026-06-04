import { ArrowRight, Building2, MapPin, Truck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/content-page";
import { PageShell } from "@/components/page-shell";
import { SeoJsonLd } from "@/components/seo-json-ld";
import { makeMetadata } from "@/lib/seo";

export const metadata: Metadata = makeMetadata({
  title: "Cung cấp thực phẩm TP.HCM cho bếp ăn, nhà máy và đơn vị suất ăn",
  description:
    "TPS1 nhận cung cấp thực phẩm tại TP.HCM cho bếp ăn tập thể, nhà máy, trường học, bệnh viện và đơn vị cần giao hàng theo tuyến phù hợp.",
  path: "/cung-cap-thuc-pham-tp-hcm",
});

const sections = [
  {
    heading: "TP.HCM phù hợp cho đơn vị cần nguồn hàng theo tuyến",
    body:
      "Trang này phục vụ các khách hàng ở TP.HCM cần nhà cung cấp giao theo tuyến, theo khung giờ và theo lịch nhận hàng đã thống nhất trước. Mục tiêu là giúp họ lấy báo giá nhanh mà vẫn có đủ thông tin để ra quyết định.",
    items: ["Giao theo tuyến phù hợp", "Số lượng linh hoạt", "Báo giá rõ ngay từ đầu"],
  },
  {
    heading: "Nhóm hàng có nhu cầu cao",
    body:
      "Những nhóm hàng thường được hỏi nhiều ở TP.HCM là rau củ quả, thịt cá hải sản, hàng đông lạnh, gia vị và thực phẩm chay cho menu đa dạng.",
    items: ["Rau củ quả tươi", "Thịt cá hải sản", "Hàng đông lạnh", "Gia vị nhà bếp", "Thực phẩm chay"],
  },
  {
    heading: "Cách chốt nhu cầu tại TP.HCM",
    body:
      "Trang nên dẫn khách về form báo giá, hồ sơ năng lực và các nhóm hàng phù hợp. Với khu vực lớn như TP.HCM, nội dung cần rõ về tuyến giao và tần suất giao để giảm trao đổi lại.",
    items: ["CTA báo giá rõ", "Link sang hồ sơ năng lực", "FAQ về tuyến giao và thời gian phản hồi"],
  },
];

const faqs = [
  {
    question: "TPS1 có phục vụ TP.HCM thường xuyên không?",
    answer: "Có, khi tuyến giao và lịch đơn hàng phù hợp với vận hành thực tế của hai bên.",
  },
  {
    question: "Trang này nên nhấn vào điểm gì?",
    answer:
      "Nên nhấn vào khả năng giao theo tuyến, báo giá rõ, danh mục phù hợp bếp ăn và các nhóm khách B2B như nhà máy, trường học, bệnh viện và suất ăn.",
  },
  {
    question: "Có nên dùng trang này cho SEO địa phương không?",
    answer: "Có. Đây là trang riêng cho TP.HCM nên có thể kéo truy vấn địa phương và chuyển về form báo giá.",
  },
];

export default function TpHcmLandingPage() {
  return (
    <PageShell
      eyebrow="TP.HCM"
      title="Cung cấp thực phẩm TP.HCM"
      description="Trang đích local cho khách cần nguồn hàng định kỳ tại TP.HCM, ưu tiên giao theo tuyến và báo giá nhanh."
      compact
    >
      <SeoJsonLd />
      <div className="section-heading" style={{ marginBottom: 20 }}>
        <div className="eyebrow">TP.HCM</div>
        <p className="section-heading__description" style={{ marginTop: 10 }}>
          Phù hợp khách ở TP.HCM cần nguồn hàng đều, giao theo lịch và có báo giá rõ ràng.
        </p>
      </div>
      <div className="content-detail__chips">
        <div className="content-detail__chip">
          <MapPin size={16} /> TP.HCM
        </div>
        <div className="content-detail__chip">
          <Truck size={16} /> Giao theo tuyến
        </div>
        <div className="content-detail__chip">
          <Building2 size={16} /> B2B procurement
        </div>
      </div>

      <ContentPage
        title="Cung cấp thực phẩm TP.HCM"
        description="Giải pháp dành cho khách hàng cần nguồn hàng định kỳ tại TP.HCM, tối ưu để lấy báo giá nhanh và chốt danh mục rõ."
        bullets={["Giao theo tuyến", "Khách B2B", "Báo giá rõ"]}
        sections={sections}
        faqs={faqs}
        ctaLabel="Gửi yêu cầu báo giá"
        quoteItem={{ slug: "thuc-pham-tp-hcm", title: "Cung cấp thực phẩm TP.HCM", summary: "Nhu cầu mua thực phẩm định kỳ tại TP.HCM." }}
      />

      <div style={{ marginTop: 24 }}>
        <Link href="/bao-gia" className="btn-primary">
          Gửi nhu cầu ngay <ArrowRight size={18} />
        </Link>
      </div>

      <section className="content-section" style={{ marginTop: 24 }}>
        <div className="content-section__body">
          <div className="content-section__eyebrow">Nội dung liên quan</div>
          <h2>Bài hỗ trợ cho TP.HCM</h2>
          <p>
            Trang TP.HCM nên có một lớp nội dung vệ tinh để khách đi từ nhu cầu địa phương sang bài phân tích rồi sang form báo giá.
          </p>
          <div className="home-local__grid" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))", marginTop: 14 }}>
            <Link
              href="/kien-thuc/cach-chon-nha-cung-cap-thuc-pham-cho-nha-may-o-tp-hcm"
              className="home-local__card"
              style={{ minHeight: 0 }}
            >
              <h3>Cách chọn nhà cung cấp thực phẩm cho nhà máy ở TP.HCM</h3>
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
    </PageShell>
  );
}
