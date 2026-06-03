import { ArrowRight, Building2, MapPin, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/content-page";
import { PageShell } from "@/components/page-shell";
import { SeoJsonLd } from "@/components/seo-json-ld";
import { makeMetadata } from "@/lib/seo";

export const metadata: Metadata = makeMetadata({
  title: "Cung cấp thực phẩm Biên Hòa cho bếp ăn tập thể và nhà máy",
  description:
    "TPS1 nhận cung cấp thực phẩm tại Biên Hòa cho bếp ăn tập thể, nhà máy, trường học và đơn vị cần báo giá rõ ràng, giao đúng lịch.",
  path: "/cung-cap-thuc-pham-bien-hoa",
});

const sections = [
  {
    heading: "Biên Hòa có nhu cầu mua hàng theo lịch vận hành",
    body:
      "Khách tại Biên Hòa thường cần nguồn cung đủ ổn định để bám ca làm việc, giờ giao nhận và menu hàng tuần. Vì vậy trang này cần trả lời rõ về khu vực giao, quy cách và cách lấy báo giá.",
    items: ["Giao theo lịch bếp", "Nhóm hàng dễ so sánh", "Phản hồi nhanh theo nhu cầu thật"],
  },
  {
    heading: "Nội dung nên nhấn mạnh ở Biên Hòa",
    body:
      "Nội dung hiệu quả nên tập trung vào giao nhận, nguồn hàng rõ, quy trình báo giá ngắn và khả năng phục vụ các đơn vị có nhu cầu lặp lại.",
    items: ["Bếp ăn tập thể", "Nhà máy, khu công nghiệp", "Trường học và bệnh viện"],
  },
  {
    heading: "Lộ trình chốt đơn",
    body:
      "Trang này nên nối thẳng sang báo giá và các trang liên quan để khách không phải tìm lại từ đầu. Đây là cách tăng chuyển đổi thay vì chỉ giữ lượt xem.",
    items: ["CTA rõ", "FAQ ngắn gọn", "Liên kết về hồ sơ năng lực"],
  },
];

const faqs = [
  {
    question: "Trang này khác gì trang Đồng Nai tổng?",
    answer: "Trang Biên Hòa tập trung vào nhu cầu tìm kiếm hẹp hơn, dễ tối ưu cho nhóm khách ở thành phố Biên Hòa và các khu công nghiệp lân cận.",
  },
  {
    question: "Có nên lặp keyword trên nhiều trang không?",
    answer: "Không. Trang này nên giữ một nhu cầu chính là cung cấp thực phẩm tại Biên Hòa, còn trang Đồng Nai là cụm rộng hơn.",
  },
];

export default function BienHoaLandingPage() {
  return (
    <PageShell
      eyebrow="Biên Hòa"
      title="Cung cấp thực phẩm Biên Hòa"
      description="Trang đích local cho khách cần nguồn hàng định kỳ tại Biên Hòa, ưu tiên khách hỏi mua thật và quy trình báo giá ngắn."
      compact
    >
      <SeoJsonLd />
      <div className="section-heading" style={{ marginBottom: 20 }}>
        <div className="eyebrow">Biên Hòa</div>
        <p className="section-heading__description" style={{ marginTop: 10 }}>
          Một trang chuyên cho nhu cầu địa phương, dễ đọc và dễ chuyển đổi hơn.
        </p>
      </div>
      <div className="content-detail__chips">
        <div className="content-detail__chip">
          <MapPin size={16} /> Biên Hòa
        </div>
        <div className="content-detail__chip">
          <ShieldCheck size={16} /> Nguồn hàng rõ
        </div>
        <div className="content-detail__chip">
          <Building2 size={16} /> Mua hàng B2B
        </div>
      </div>

      <ContentPage
        title="Cung cấp thực phẩm Biên Hòa"
        description="Giải pháp mua hàng định kỳ cho khách B2B tại Biên Hòa, tối ưu để chuyển đổi sang báo giá nhanh."
        bullets={["Giao đúng lịch", "Nguồn hàng rõ", "Khách B2B"]}
        sections={sections}
        faqs={faqs}
        ctaLabel="Nhận báo giá"
        quoteItem={{ slug: "thuc-pham-bien-hoa", title: "Cung cấp thực phẩm Biên Hòa", summary: "Nhu cầu mua thực phẩm định kỳ tại Biên Hòa." }}
      />

      <div style={{ marginTop: 24 }}>
        <Link href="/bao-gia" className="btn-primary">
          Nhận báo giá <ArrowRight size={18} />
        </Link>
      </div>
    </PageShell>
  );
}
