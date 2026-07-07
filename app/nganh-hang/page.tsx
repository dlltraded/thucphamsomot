import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Phone } from "lucide-react";
import { makeMetadata } from "@/lib/seo";
import { PageShell } from "@/components/page-shell";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = makeMetadata({
  title: "Ngành hàng chúng tôi phục vụ",
  description:
    "TPS1 cung ứng thực phẩm cho bếp ăn tập thể, suất ăn công nghiệp, trường học, bệnh viện và nhà hàng khách sạn tại Đồng Nai và khu vực lân cận.",
  path: "/nganh-hang",
});

const INDUSTRIES = [
  {
    slug: "bep-an-tap-the",
    emoji: "🏭",
    title: "Bếp ăn tập thể",
    subtitle: "Khu công nghiệp · Nhà máy · Doanh nghiệp",
    description:
      "Cung ứng thực phẩm theo định mức, lịch giao và quy trình rõ ràng cho bếp vận hành hằng ngày. Phục vụ từ 100 đến 5.000 suất/ngày.",
    tags: ["Giao định kỳ", "Định mức rõ", "Lịch bếp ổn định"],
    accent: "#0f6f4b",
    accentBg: "rgba(15,111,75,0.07)",
    accentBorder: "rgba(15,111,75,0.18)",
  },
  {
    slug: "suat-an-cong-nghiep",
    emoji: "🍱",
    title: "Suất ăn công nghiệp",
    subtitle: "Nhà cung cấp suất ăn · Ca sáng trưa tối",
    description:
      "Hỗ trợ nguyên liệu, tư vấn menu và tối ưu chi phí cho đơn vị cung cấp suất ăn số lượng lớn theo hợp đồng dài hạn.",
    tags: ["Số lượng lớn", "Menu chuẩn hóa", "Tối ưu chi phí/suất"],
    accent: "#1a6fa8",
    accentBg: "rgba(26,111,168,0.07)",
    accentBorder: "rgba(26,111,168,0.18)",
  },
  {
    slug: "truong-hoc",
    emoji: "🏫",
    title: "Trường học",
    subtitle: "Mầm non · Tiểu học · Trung học · Nội trú",
    description:
      "Nguyên liệu an toàn, truy xuất rõ ràng, phù hợp bữa ăn cho học sinh. Ưu tiên độ tươi, dinh dưỡng và đúng giờ bếp nhận hàng.",
    tags: ["An toàn thực phẩm", "Truy xuất nguồn gốc", "Dinh dưỡng học đường"],
    accent: "#b45309",
    accentBg: "rgba(180,83,9,0.07)",
    accentBorder: "rgba(180,83,9,0.18)",
  },
  {
    slug: "benh-vien",
    emoji: "🏥",
    title: "Bệnh viện",
    subtitle: "Suất ăn bệnh nhân · Nhân viên y tế · Dinh dưỡng",
    description:
      "Danh mục thực phẩm cần kiểm soát chất lượng và nhịp giao ổn định cho bếp bệnh viện phục vụ nhiều nhóm khẩu phần khác nhau.",
    tags: ["Kiểm soát chất lượng", "Menu đặc thù", "Giao ổn định"],
    accent: "#6d28d9",
    accentBg: "rgba(109,40,217,0.07)",
    accentBorder: "rgba(109,40,217,0.18)",
  },
  {
    slug: "nha-hang-khach-san",
    emoji: "🍽️",
    title: "Nhà hàng, khách sạn",
    subtitle: "Bếp khách sạn · Nhà hàng · Ẩm thực đa phong cách",
    description:
      "Nguồn hàng chuyên nghiệp cho bếp vận hành liên tục — từ rau củ tươi, thịt cá hải sản, hàng đông lạnh đến gia vị Âu Á.",
    tags: ["Danh mục rộng", "Hàng đặc thù", "Phản hồi nhanh"],
    accent: "#be185d",
    accentBg: "rgba(190,24,93,0.07)",
    accentBorder: "rgba(190,24,93,0.18)",
  },
];

const STATS = [
  { value: "100+", label: "Đơn vị đang hợp tác" },
  { value: "5.000+", label: "Suất ăn phục vụ mỗi ngày" },
  { value: "500+", label: "Mặt hàng trong danh mục" },
  { value: "Đồng Nai", label: "Trọng tâm · mở rộng TP.HCM, BD, BR-VT" },
];

export default function NganhHangPage() {
  return (
    <PageShell
      eyebrow="Ngành hàng"
      title="Chúng tôi phục vụ ngành nào?"
      description="TPS1 cung ứng thực phẩm B2B cho các đơn vị vận hành bếp quy mô lớn — từ nhà máy, trường học, bệnh viện đến nhà hàng và dịch vụ suất ăn công nghiệp."
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
            <strong>Chưa tìm thấy ngành phù hợp?</strong>
            <p>Liên hệ trực tiếp — đội kinh doanh sẽ tư vấn danh mục hàng, lịch giao và báo giá theo nhu cầu thực tế của bếp.</p>
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
