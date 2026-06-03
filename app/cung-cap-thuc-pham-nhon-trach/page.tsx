import { ArrowRight, Factory, MapPin, Truck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/content-page";
import { PageShell } from "@/components/page-shell";
import { SeoJsonLd } from "@/components/seo-json-ld";
import { makeMetadata } from "@/lib/seo";

export const metadata: Metadata = makeMetadata({
  title: "Cung cấp thực phẩm Nhơn Trạch cho khu công nghiệp và bếp ăn",
  description:
    "TPS1 nhận cung cấp thực phẩm tại Nhơn Trạch cho khu công nghiệp, bếp ăn tập thể, trường học và nhà máy cần giao định kỳ.",
  path: "/cung-cap-thuc-pham-nhon-trach",
});

const sections = [
  {
    heading: "Nhơn Trạch là nơi khách mua theo ca, theo chuyến và theo hợp đồng",
    body:
      "Đây là khu vực có nhiều nhu cầu lặp lại, nên trang khu vực phải gắn chặt vào bài toán giao theo lịch, theo số lượng và theo đầu mối duyệt hàng.",
    items: ["Giao đúng khung giờ", "Có thể mua định kỳ", "Hỗ trợ báo giá theo nhu cầu"],
  },
  {
    heading: "Nhu cầu tìm kiếm chính của khách",
    body:
      "Người mua tại Nhơn Trạch thường tìm nhà cung cấp thực phẩm gần khu công nghiệp, có thể giao định kỳ và báo giá theo danh mục hàng thực tế của bếp.",
    items: ["KCN Nhơn Trạch", "Bếp ăn tập thể", "Nhà máy, văn phòng, trường học"],
  },
  {
    heading: "Mục tiêu của trang",
    body:
      "Không phải thu hút mọi lượt xem. Mục tiêu là đưa khách đến form báo giá, hồ sơ năng lực và những trang hàng hóa đúng nhóm họ cần mua.",
    items: ["Dẫn về báo giá", "Tăng tin cậy", "Giảm việc khách phải tìm lại"],
  },
];

const faqs = [
  {
    question: "TPS1 có thể dùng trang này cho tìm kiếm tự nhiên và quảng cáo không?",
    answer: "Có. Đây là một trang local đủ rõ nhu cầu để dùng cho cả tìm kiếm tự nhiên và quảng cáo nếu cần test chuyển đổi.",
  },
  {
    question: "Trang này có nên nói nhiều về suất ăn công nghiệp không?",
    answer: "Không nên. Nên giữ trọng tâm là nguồn thực phẩm, còn suất ăn công nghiệp chỉ là bối cảnh sử dụng.",
  },
];

export default function NhonTrachLandingPage() {
  return (
    <PageShell
      eyebrow="Nhơn Trạch"
      title="Cung cấp thực phẩm Nhơn Trạch"
      description="Trang đích local cho nhóm khách ở Nhơn Trạch cần nguồn hàng định kỳ và phản hồi báo giá ngắn gọn."
      compact
    >
      <SeoJsonLd />
      <div className="section-heading" style={{ marginBottom: 20 }}>
        <div className="eyebrow">Nhơn Trạch</div>
        <p className="section-heading__description" style={{ marginTop: 10 }}>
          Tập trung vào khu công nghiệp và các đơn vị mua lặp lại theo lịch vận hành.
        </p>
      </div>
      <div className="content-detail__chips">
        <div className="content-detail__chip">
          <MapPin size={16} /> Nhơn Trạch
        </div>
        <div className="content-detail__chip">
          <Factory size={16} /> Khu công nghiệp
        </div>
        <div className="content-detail__chip">
          <Truck size={16} /> Giao định kỳ
        </div>
      </div>

      <ContentPage
        title="Cung cấp thực phẩm Nhơn Trạch"
        description="Dành cho các đơn vị cần nguồn hàng ổn định tại Nhơn Trạch, tối ưu để chuyển đổi sang báo giá."
        bullets={["Khu công nghiệp", "Hợp đồng định kỳ", "Khách B2B"]}
        sections={sections}
        faqs={faqs}
        ctaLabel="Yêu cầu báo giá"
        quoteItem={{ slug: "thuc-pham-nhon-trach", title: "Cung cấp thực phẩm Nhơn Trạch", summary: "Nhu cầu mua thực phẩm định kỳ tại Nhơn Trạch." }}
      />

      <div style={{ marginTop: 24 }}>
        <Link href="/bao-gia" className="btn-primary">
          Yêu cầu báo giá <ArrowRight size={18} />
        </Link>
      </div>
    </PageShell>
  );
}
