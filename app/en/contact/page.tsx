import Link from "next/link";
import { ArrowRight, Mail, MapPin, Phone } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { makeMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site";

export const metadata = makeMetadata({
  title: "Contact",
  description: "Contact Thuc Pham So Mot for buying requests, supplier pitches, and B2B food supply information.",
  path: "/en/contact",
});

export default function EnglishContactPage() {
  return (
    <PageShell
      eyebrow="Contact"
      title="Contact TPS1 for buying requests or supplier pitches"
      description="Send your product group, expected quantity, delivery area, and schedule. Our team will follow up with a suitable next step."
      locale="en"
    >
      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="card space-y-4">
          <p className="text-sm font-semibold text-[#5e6d64]">Contact details</p>
          <p className="flex items-center gap-2 text-lg font-black text-[#133127]">
            <Phone size={18} />
            {siteConfig.phone}
          </p>
          <p className="flex items-center gap-2 text-sm text-[#5e6d64]">
            <Mail size={16} />
            {siteConfig.email}
          </p>
          <p className="flex items-center gap-2 text-sm text-[#5e6d64]">
            <MapPin size={16} />
            {siteConfig.englishAddress}
          </p>
        </div>

        <div className="card space-y-4">
          <p className="text-sm font-semibold text-[#5e6d64]">Fastest path</p>
          <h2 className="text-2xl font-black text-[#133127]">Use the English request form</h2>
          <p className="text-sm text-[#5e6d64]">
            Buyers can submit purchasing needs. Suppliers can submit what they want to offer TPS1 for review.
          </p>
          <Link href="/en/bao-gia" className="btn-primary">
            Open English form <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
