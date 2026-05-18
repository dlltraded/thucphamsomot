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
        <div className="card space-y-4">
          <p className="text-sm font-semibold text-[#5e6d64]">Hotline</p>
          <p className="text-2xl font-black text-[#133127]">{siteConfig.phone}</p>
          <p className="text-sm text-[#5e6d64]">Email: {siteConfig.email}</p>
          <p className="text-sm text-[#5e6d64]">Khu vực: {siteConfig.localities.join(", ")}</p>
        </div>
        <LeadForm mode="contact" />
      </div>
    </PageShell>
  );
}
