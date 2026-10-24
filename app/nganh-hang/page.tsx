import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Phone } from "lucide-react";
import { makeMetadata } from "@/lib/seo";
import { PageShell } from "@/components/page-shell";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = makeMetadata({
  title: "Thực phẩm cho nhà hàng, quán ăn, bếp ăn, trường học",
  description:
    "TPS1 cung cấp thực phẩm tươi, rõ nguồn gốc cho nhà hàng, quán ăn, bếp công ty, trường học, bệnh viện và đơn vị suất ăn tại Đồng Nai, TP.HCM và tỉnh lân cận.",
  path: "/nganh-hang",
});

const INDUSTRIES = [
  {
    slug: "nha-hang-khach-san",
    emoji: "🍽️",
    title: "Nhà hàng, khách sạn",
    subtitle: "Nhà hàng · Khách sạn · Tiệc cưới · Resort",
    description:
      "Mỗi món ăn ngon bắt đầu từ nguyên liệu chuẩn. TPS1 chọn hàng tươi, đều cỡ, đúng quy cách để bếp trưởng yên tâm giữ trọn hương vị cho từng đĩa ăn.",
    tags: ["Hàng hóa đạt chuẩn", "Linh hoạt thanh toán", "Giao đúng giờ mở bếp"],
    accent: "#be185d",
    accentBg: "rgba(190,24,93,0.07)",
    accentBorder: "rgba(190,24,93,0.18)",
  },
  {
    slug: "quan-an",
    emoji: "🥢",
    title: "Quán ăn, chuỗi F&B",
    subtitle: "Quán cơm · Phở, bún, hủ tiếu · Chuỗi cửa hàng",
    description:
      "Quán ăn cần hàng tươi mỗi sáng, lượng vừa đủ cho ngày bán. TPS1 giao đúng giờ quán cần, để chủ quán dành trọn tâm sức cho nồi nước dùng và những vị khách quen.",
    tags: ["Hàng tươi mỗi sáng", "Linh hoạt thanh toán", "Giao đúng lịch trình"],
    accent: "#c2410c",
    accentBg: "rgba(194,65,12,0.07)",
    accentBorder: "rgba(194,65,12,0.18)",
  },
  {
    slug: "bep-an-tap-the",
    emoji: "🏭",
    title: "Bếp ăn công ty, nhà máy",
    subtitle: "Khu công nghiệp · Nhà máy · Văn phòng",
    description:
      "Bếp công ty nấu theo ca, theo định mức và không được phép trễ giờ. TPS1 lập lịch giao theo từng ca bếp, để bữa cơm của người lao động luôn nóng và đủ đầy.",
    tags: ["Giao đúng từng ca", "Định mức rõ ràng", "Hóa đơn VAT đầy đủ"],
    accent: "#0f6f4b",
    accentBg: "rgba(15,111,75,0.07)",
    accentBorder: "rgba(15,111,75,0.18)",
  },
  {
    slug: "truong-hoc",
    emoji: "🏫",
    title: "Trường học",
    subtitle: "Mầm non · Tiểu học · Trung học · Nội trú",
    description:
      "Bữa ăn bán trú cần sự cẩn trọng gấp đôi. TPS1 cung cấp hàng rõ nguồn gốc, đủ hồ sơ an toàn thực phẩm, giao đúng giờ để nhà trường an tâm trao từng phần cơm đến các em.",
    tags: ["Nguồn gốc rõ ràng", "Hồ sơ an toàn đầy đủ", "Giao đúng giờ bếp nhận"],
    accent: "#b45309",
    accentBg: "rgba(180,83,9,0.07)",
    accentBorder: "rgba(180,83,9,0.18)",
  },
  {
    slug: "benh-vien",
    emoji: "🏥",
    title: "Bệnh viện",
    subtitle: "Suất ăn người bệnh · Nhân viên y tế",
    description:
      "Bếp bệnh viện phục vụ nhiều chế độ ăn khác nhau. TPS1 giữ nhịp giao ổn định và kiểm soát an toàn theo ISO 22000, HACCP, để mỗi khay cơm đến tay người bệnh đều được chuẩn bị chu đáo.",
    tags: ["Đạt chuẩn ISO 22000, HACCP", "Đa dạng nhóm hàng", "Giao hàng ổn định"],
    accent: "#6d28d9",
    accentBg: "rgba(109,40,217,0.07)",
    accentBorder: "rgba(109,40,217,0.18)",
  },
  {
    slug: "suat-an-cong-nghiep",
    emoji: "🍱",
    title: "Đơn vị suất ăn",
    subtitle: "Nhà thầu suất ăn · Căng tin doanh nghiệp",
    description:
      "Nhà thầu suất ăn cần quy cách đồng đều để giữ chi phí mỗi suất. TPS1 cung cấp hàng chuẩn quy cách, báo trước biến động giá và gợi ý món thay thế theo mùa.",
    tags: ["Quy cách đồng đều", "Giá sỉ theo sản lượng", "Hỗ trợ xây dựng thực đơn"],
    accent: "#1a6fa8",
    accentBg: "rgba(26,111,168,0.07)",
    accentBorder: "rgba(26,111,168,0.18)",
  },
];

const STATS = [
  { value: "109+", label: "Doanh nghiệp và bếp ăn đang hợp tác" },
  { value: "5.000+", label: "Mã sản phẩm trong danh mục" },
  { value: "99,8%", label: "Đơn hàng giao đúng hẹn" },
  { value: "Từ 2017", label: "Phục vụ Đồng Nai, TP.HCM và tỉnh lân cận" },
];

export default function NganhHangPage() {
  return (
    <PageShell
      eyebrow="Ngành hàng"
      title="Mỗi gian bếp một nhịp riêng"
      description="Nhà hàng cần hàng chuẩn món, quán ăn cần lượng vừa đủ mỗi sáng, bếp công ty cần đúng ca, trường học cần đủ hồ sơ. TPS1 chuẩn bị nguồn hàng theo đúng nhịp của từng gian bếp."
    >
      <div className="nganh-hub">

        {/* Stats strip */}
        <div className="nganh-hub__stats">
          {STATS.map((s) => (
            <div key={s.label} className="nganh-hub__stat">
              <strong>{s.value}</strong>
              <span>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Industry cards grid */}
        <div className="nganh-hub__grid">
          {INDUSTRIES.map((ind) => (
            <Link
              key={ind.slug}
              href={`/nganh-hang/${ind.slug}`}
              className="nganh-hub__card"
              style={{
                "--card-accent": ind.accent,
                "--card-bg": ind.accentBg,
                "--card-border": ind.accentBorder,
              } as React.CSSProperties}
            >
              <div className="nganh-hub__card-icon">{ind.emoji}</div>
              <div className="nganh-hub__card-body">
                <p className="nganh-hub__card-sub">{ind.subtitle}</p>
                <h2 className="nganh-hub__card-title">{ind.title}</h2>
                <p className="nganh-hub__card-desc">{ind.description}</p>
                <div className="nganh-hub__tags">
                  {ind.tags.map((t) => (
                    <span key={t} className="nganh-hub__tag">{t}</span>
                  ))}
                </div>
              </div>
              <span className="nganh-hub__card-cta">
                Xem chi tiết <ArrowRight size={15} />
              </span>
            </Link>
          ))}
        </div>

        {/* CTA band */}
        <div className="nganh-hub__cta">
          <div className="nganh-hub__cta-copy">
            <strong>Chưa thấy gian bếp của mình trong danh sách?</strong>
            <p>Hãy gọi cho TPS1. Đội kinh doanh sẽ lắng nghe nhu cầu và đề xuất danh mục hàng, lịch giao, báo giá phù hợp với gian bếp của quý khách.</p>
          </div>
          <div className="nganh-hub__cta-actions">
            <Link href="/bao-gia" className="btn-primary">
              Gửi yêu cầu báo giá <ArrowRight size={17} />
            </Link>
            <a href={`tel:${siteConfig.phone.replace(/\s+/g, "")}`} className="btn-secondary">
              <Phone size={16} /> {siteConfig.phone}
            </a>
          </div>
        </div>

      </div>
    </PageShell>
  );
}
