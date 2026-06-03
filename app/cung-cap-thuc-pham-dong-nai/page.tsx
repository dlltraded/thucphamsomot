import { ArrowRight, CheckCircle2, MapPin, Truck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/content-page";
import { PageShell } from "@/components/page-shell";
import { SeoJsonLd } from "@/components/seo-json-ld";
import { makeMetadata } from "@/lib/seo";

export const metadata: Metadata = makeMetadata({
  title: "Cung cấp thực phẩm Đồng Nai cho bếp ăn tập thể, nhà máy và trường học",
  description:
    "TPS1 cung cấp thực phẩm định kỳ tại Đồng Nai cho bếp ăn tập thể, nhà máy, trường học, bệnh viện và đơn vị cần nguồn hàng ổn định.",
  path: "/cung-cap-thuc-pham-dong-nai",
});

const sections = [
  {
    heading: "Đồng Nai là thị trường cần nguồn hàng ổn định",
    body:
      "Trang này tập trung vào nhu cầu mua thực phẩm định kỳ của bếp ăn tập thể, nhà máy, trường học và bệnh viện tại Đồng Nai. Khách thường cần nhà cung cấp giao đúng lịch, báo giá rõ và xử lý đơn nhanh.",
    items: ["Giao theo khung giờ của bếp", "Danh mục phù hợp mua số lượng lớn", "Phản hồi báo giá theo nhu cầu thực tế"],
  },
  {
    heading: "Nhóm hàng nên nhấn mạnh trên trang",
    body:
      "Tại Đồng Nai, các nhóm hàng thường được quan tâm là rau củ quả, thịt cá hải sản, hàng đông lạnh, gia vị nhà bếp và thực phẩm chay cho menu linh hoạt.",
    items: ["Rau củ quả tươi sống", "Thịt cá hải sản tươi sống", "Hàng đông lạnh cho bếp công nghiệp", "Gia vị nhà bếp và thực phẩm chay"],
  },
  {
    heading: "Cách dẫn khách sang bước báo giá",
    body:
      "Trang nên dẫn người đọc sang form báo giá, hồ sơ năng lực và các trang nhóm hàng liên quan để tăng tin cậy trước khi họ gửi nhu cầu.",
    items: ["CTA báo giá ở đầu và cuối trang", "Link sang trang sản phẩm và ngành hàng", "FAQ về vùng giao, quy cách và thời gian phản hồi"],
  },
];

const faqs = [
  {
    question: "TPS1 có nhận giao định kỳ tại Đồng Nai không?",
    answer: "Có. Trang này phục vụ nhóm khách cần nguồn hàng đều đặn tại Biên Hòa, Nhơn Trạch, Long Thành, Trảng Bom và khu vực lân cận.",
  },
  {
    question: "Trang này nên dùng để kéo keyword nào?",
    answer:
      "Các keyword phù hợp gồm cung cấp thực phẩm Đồng Nai, nhà cung cấp thực phẩm Đồng Nai, báo giá thực phẩm định kỳ và thực phẩm cho bếp ăn tập thể Đồng Nai.",
  },
  {
    question: "Nên đo hiệu quả trang này bằng gì?",
    answer: "Nên đo bằng lượt hiển thị với truy vấn địa phương, lượt click sang form báo giá, số đơn hỏi thật và số cuộc gọi hoặc Zalo phát sinh từ trang.",
  },
];

export default function DongNaiLandingPage() {
  return (
    <PageShell
      eyebrow="Đồng Nai"
      title="Cung cấp thực phẩm Đồng Nai cho nhu cầu B2B"
      description="Trang đích local cho nhóm khách cần nguồn hàng định kỳ, báo giá nhanh và danh mục phù hợp bếp ăn, nhà máy và trường học."
      compact
    >
      <SeoJsonLd />
      <div className="section-heading" style={{ marginBottom: 20 }}>
        <div className="eyebrow">Đồng Nai</div>
        <p className="section-heading__description" style={{ marginTop: 10 }}>
          Trang này tập trung vào nhu cầu mua hàng thật, không phải trang giới thiệu chung chung.
        </p>
      </div>
      <div className="content-detail__chips">
        <div className="content-detail__chip">
          <Truck size={16} /> Giao định kỳ
        </div>
        <div className="content-detail__chip">
          <MapPin size={16} /> Biên Hòa, Nhơn Trạch, Long Thành
        </div>
        <div className="content-detail__chip">
          <CheckCircle2 size={16} /> Danh mục + báo giá
        </div>
      </div>

      <ContentPage
        title="Cung cấp thực phẩm Đồng Nai"
        description="Giải pháp dành cho khách hàng cần nguồn hàng ổn định tại Đồng Nai, không chỉ mua một lần mà mua theo chu kỳ vận hành."
        bullets={["Nguồn hàng định kỳ", "B2B", "Giao theo lịch"]}
        sections={sections}
        faqs={faqs}
        ctaLabel="Gửi yêu cầu báo giá"
        quoteItem={{ slug: "thuc-pham-dong-nai", title: "Cung cấp thực phẩm Đồng Nai", summary: "Báo giá cho nhu cầu mua định kỳ tại Đồng Nai." }}
      />

      <div style={{ marginTop: 24 }}>
        <Link href="/bao-gia" className="btn-primary">
          Gửi nhu cầu ngay <ArrowRight size={18} />
        </Link>
      </div>
    </PageShell>
  );
}
