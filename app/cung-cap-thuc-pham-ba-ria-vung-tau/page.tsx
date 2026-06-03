import { ArrowRight, Building2, MapPin, Truck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/content-page";
import { PageShell } from "@/components/page-shell";
import { SeoJsonLd } from "@/components/seo-json-ld";
import { makeMetadata } from "@/lib/seo";

export const metadata: Metadata = makeMetadata({
  title: "Cung cấp thực phẩm Bà Rịa - Vũng Tàu cho doanh nghiệp và bếp ăn",
  description:
    "TPS1 nhận cung cấp thực phẩm tại Bà Rịa - Vũng Tàu cho doanh nghiệp, bếp ăn tập thể, trường học, bệnh viện và đơn vị cần giao hàng theo lịch.",
  path: "/cung-cap-thuc-pham-ba-ria-vung-tau",
});

const sections = [
  {
    heading: "Bà Rịa - Vũng Tàu cần nguồn hàng ổn định cho đơn vị vận hành đều",
    body:
      "Trang này phù hợp với khách ở Bà Rịa - Vũng Tàu đang cần nhà cung cấp giao đều, báo giá rõ và có thể phục vụ theo lịch nhận hàng đã thống nhất.",
    items: ["Giao đúng lịch", "Quy cách rõ", "Báo giá nhanh"],
  },
  {
    heading: "Nhóm hàng phù hợp",
    body:
      "Các nhóm hàng nên đẩy mạnh gồm rau củ quả, thịt cá, hàng đông lạnh, gia vị và thực phẩm chay cho menu của bếp ăn và đơn vị suất ăn.",
    items: ["Rau củ quả", "Thịt cá hải sản", "Hàng đông lạnh", "Gia vị nhà bếp", "Thực phẩm chay"],
  },
  {
    heading: "Cách dẫn sang form báo giá",
    body:
      "Sau khi xem trang, khách nên được dẫn thẳng sang form báo giá hoặc hồ sơ năng lực để chốt nhu cầu nhanh. Trang local chỉ hiệu quả khi đường đi tiếp theo rõ ràng.",
    items: ["CTA báo giá", "Hồ sơ năng lực", "FAQ về giao hàng và vùng phục vụ"],
  },
];

const faqs = [
  {
    question: "TPS1 có thể phục vụ Bà Rịa - Vũng Tàu không?",
    answer: "Có, nếu lịch giao và tuyến đơn phù hợp với vận hành thực tế của khách hàng.",
  },
  {
    question: "Trang này nên nhấn vào điều gì?",
    answer:
      "Nên nhấn vào nguồn hàng ổn định, giao theo lịch, danh mục phù hợp cho bếp ăn và khả năng phản hồi báo giá nhanh.",
  },
  {
    question: "Trang này có nên tách riêng khỏi TP.HCM và Bình Dương không?",
    answer: "Có. Đây là cụm địa phương riêng, tách ra sẽ dễ tối ưu truy vấn và đo chuyển đổi hơn.",
  },
];

export default function BaRiaVungTauLandingPage() {
  return (
    <PageShell
      eyebrow="Bà Rịa - Vũng Tàu"
      title="Cung cấp thực phẩm Bà Rịa - Vũng Tàu"
      description="Trang đích local cho khách cần nguồn hàng định kỳ tại Bà Rịa - Vũng Tàu, ưu tiên giao đều và báo giá rõ."
      compact
    >
      <SeoJsonLd />
      <div className="section-heading" style={{ marginBottom: 20 }}>
        <div className="eyebrow">Bà Rịa - Vũng Tàu</div>
        <p className="section-heading__description" style={{ marginTop: 10 }}>
          Phù hợp đơn vị cần nguồn hàng định kỳ, giao đúng lịch và báo giá rõ ràng.
        </p>
      </div>
      <div className="content-detail__chips">
        <div className="content-detail__chip">
          <MapPin size={16} /> Bà Rịa - Vũng Tàu
        </div>
        <div className="content-detail__chip">
          <Truck size={16} /> Giao theo lịch
        </div>
        <div className="content-detail__chip">
          <Building2 size={16} /> B2B procurement
        </div>
      </div>

      <ContentPage
        title="Cung cấp thực phẩm Bà Rịa - Vũng Tàu"
        description="Giải pháp dành cho khách hàng cần nguồn hàng định kỳ tại Bà Rịa - Vũng Tàu, tối ưu để chốt báo giá nhanh."
        bullets={["Giao theo lịch", "Khách B2B", "Báo giá rõ"]}
        sections={sections}
        faqs={faqs}
        ctaLabel="Gửi yêu cầu báo giá"
        quoteItem={{ slug: "thuc-pham-ba-ria-vung-tau", title: "Cung cấp thực phẩm Bà Rịa - Vũng Tàu", summary: "Nhu cầu mua thực phẩm định kỳ tại Bà Rịa - Vũng Tàu." }}
      />

      <div style={{ marginTop: 24 }}>
        <Link href="/bao-gia" className="btn-primary">
          Gửi nhu cầu ngay <ArrowRight size={18} />
        </Link>
      </div>
    </PageShell>
  );
}
