import { makeMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site";
import { PageShell } from "@/components/page-shell";
import { LeadForm } from "@/components/lead-form";

export const metadata = makeMetadata({
  title: "Liên hệ",
  description: "Trang liên hệ, hotline, email và form nhận báo giá cho Thuc Pham So 1.",
  path: "/lien-he",
});

export default function ContactPage() {
  return (
    <PageShell
      eyebrow="Liên hệ"
      title="Gửi yêu cầu báo giá"
      description="Để lại thông tin nhu cầu, nhóm hàng, số lượng dự kiến và khu vực giao để đội ngũ tư vấn phương án phù hợp."
    >
      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="card space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#5e6d64] mb-1">Công ty</p>
            <p className="text-base font-bold text-[#133127]">CÔNG TY TNHH THỰC PHẨM SỐ MỘT</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#5e6d64] mb-1">🏢 Văn phòng</p>
            <p className="text-sm text-[#133127]">{siteConfig.addressFull}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#5e6d64] mb-1">☎️ Hotline</p>
            <p className="text-2xl font-black text-[#133127]">{siteConfig.phone}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#5e6d64] mb-1">📱 Zalo / Viber / WhatsApp</p>
            <p className="text-sm text-[#133127]">{siteConfig.zaloDisplay}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#5e6d64] mb-1">📧 Email</p>
            <p className="text-sm text-[#133127]">{siteConfig.email}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#5e6d64] mb-1">🌐 Website</p>
            <a href={siteConfig.url} target="_blank" rel="noopener noreferrer" className="text-sm text-[#133127] underline underline-offset-2">
              {siteConfig.url}
            </a>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#5e6d64] mb-1">Khu vực phục vụ</p>
            <p className="text-sm text-[#5e6d64]">{siteConfig.localities.join(", ")}</p>
          </div>
        </div>
        <LeadForm mode="contact" />
      </div>
    </PageShell>
  );
}
