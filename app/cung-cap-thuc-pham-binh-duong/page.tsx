import { ArrowRight, Building2, MapPin, Truck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/content-page";
import { PageShell } from "@/components/page-shell";
import { SeoJsonLd } from "@/components/seo-json-ld";
import { makeMetadata } from "@/lib/seo";

export const metadata: Metadata = makeMetadata({
  title: "Cung cấp thực phẩm Bình Dương cho bếp ăn và nhà máy",
  description:
    "TPS1 nhận cung cấp thực phẩm tại Bình Dương cho bếp ăn tập thể, nhà máy, trường học, bệnh viện và đơn vị cần nguồn hàng ổn định.",
  path: "/cung-cap-thuc-pham-binh-duong",
});

const sections = [
  {
    heading: "Bình Dương là thị trường cần giao hàng ổn định",
    body:
      "Trang này hướng tới khách ở Bình Dương thường xuyên mua hàng theo lịch cho bếp ăn, nhà máy và đơn vị suất ăn. Nội dung cần làm rõ tuyến giao, số lượng và cách nhận báo giá.",
    items: ["Giao đúng lịch", "Danh mục rõ", "Báo giá nhanh"],
  },
  {
    heading: "Nhóm hàng thường được hỏi",
    body:
      "Ở Bình Dương, khách thường quan tâm đến rau củ quả, thịt cá, hàng đông lạnh, gia vị và thực phẩm chay cho các menu thay đổi theo ca và theo tuần.",
    items: ["Rau củ quả", "Thịt cá hải sản", "Hàng đông lạnh", "Gia vị", "Thực phẩm chay"],
  },
  {
    heading: "Bước tiếp theo sau khi xem trang",
    body:
      "Sau khi xem nội dung, khách nên có đường đi thẳng sang form báo giá và hồ sơ năng lực để không phải hỏi lại nhiều vòng. Đây là kiểu trang local nên tối ưu cho chuyển đổi.",
    items: ["CTA rõ", "Hồ sơ năng lực", "FAQ ngắn về giao hàng"],
  },
];

const faqs = [
  {
    question: "TPS1 có giao Bình Dương không?",
    answer: "Có, nếu tuyến và lịch giao phù hợp nhu cầu thực tế của đơn vị.",
  },
  {
    question: "Trang này nên tập trung vào gì?",
    answer: "Nên tập trung vào giao hàng đúng lịch, danh mục hàng cho bếp và khả năng báo giá nhanh cho khách B2B.",
  },
  {
    question: "Có nên tách riêng Bình Dương với Đồng Nai không?",
    answer: "Có. Đây là hai cụm tìm kiếm khác nhau và nên có landing page riêng để tránh loãng nội dung.",
  },
];

export default function BinhDuongLandingPage() {
  return (
    <PageShell
      eyebrow="Bình Dương"
      title="Cung cấp thực phẩm Bình Dương"
      description="Trang đích local cho khách cần nguồn hàng định kỳ tại Bình Dương, ưu tiên giao đều và phản hồi báo giá nhanh."
      compact
    >
      <SeoJsonLd />
      <div className="section-heading" style={{ marginBottom: 20 }}>
        <div className="eyebrow">Bình Dương</div>
        <p className="section-heading__description" style={{ marginTop: 10 }}>
          Phù hợp đơn vị ở Bình Dương cần nguồn hàng ổn định, giao đúng lịch và dễ chốt danh mục.
        </p>
      </div>
      <div className="content-detail__chips">
        <div className="content-detail__chip">
          <MapPin size={16} /> Bình Dương
        </div>
        <div className="content-detail__chip">
          <Truck size={16} /> Giao định kỳ
        </div>
        <div className="content-detail__chip">
          <Building2 size={16} /> B2B procurement
        </div>
      </div>

      <ContentPage
        title="Cung cấp thực phẩm Bình Dương"
        description="Giải pháp dành cho khách hàng cần nguồn hàng định kỳ tại Bình Dương, tối ưu để lấy báo giá nhanh và chốt danh mục rõ."
        bullets={["Giao định kỳ", "Khách B2B", "Danh mục rõ"]}
        sections={sections}
        faqs={faqs}
        ctaLabel="Nhận báo giá"
        quoteItem={{ slug: "thuc-pham-binh-duong", title: "Cung cấp thực phẩm Bình Dương", summary: "Nhu cầu mua thực phẩm định kỳ tại Bình Dương." }}
      />

      <div style={{ marginTop: 24 }}>
        <Link href="/bao-gia" className="btn-primary">
          Nhận báo giá <ArrowRight size={18} />
        </Link>
      </div>
    </PageShell>
  );
}
